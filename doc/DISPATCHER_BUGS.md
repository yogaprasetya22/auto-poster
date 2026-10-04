# Dispatcher Bug Tracker

> Status: **AKTIF** — Dokumen ini mencatat semua bug yang diketahui di [`dispatcher.js`](file:///home/yoga/Dokumen/auto-poster/api/cron/dispatcher.js).
> Terakhir diperbarui: 2026-10-04

---

## Bug Overview

| # | Bug | Platform | Severity | Status | Root Cause |
|---|-----|----------|----------|--------|------------|
| 1 | [Transcoding Timeout False-Positive](#1-transcoding-timeout-false-positive) | Instagram | 🔴 Critical | **OPEN** | `executed_at` di-overwrite saat FAILED, timestamp awal hilang |
| 2 | [Google Drive URL Tidak Dapat Diunduh Meta](#2-google-drive-url-tidak-dapat-diunduh-meta) | Instagram | 🔴 Critical | **OPEN** | Google Drive sharing permission / redirect chain |
| 3 | [TikTok `spam_risk_too_many_posts`](#3-tiktok-spam_risk_too_many_posts) | TikTok | 🟡 Medium | **OPEN** | Platform-side rate limit, bukan bug kode |
| 4 | [Parent Post Status Tidak Sinkron](#4-parent-post-status-tidak-sinkron) | All | 🟡 Medium | **PARTIALLY FIXED** | Race condition antara Phase 1 dan Phase 2 |
| 5 | [Vercel 10s Timeout vs Polling](#5-vercel-10s-timeout-vs-polling) | All | 🟠 Architectural | **BY DESIGN** | Hobby tier limit, mitigasi via multi-tick |
| 6 | [TikTok Token Expired Tanpa Refresh](#6-tiktok-token-expired-tanpa-refresh) | TikTok | 🟢 Fixed | **FIXED** | `getValidToken()` sudah di-add |

---

## 1. Transcoding Timeout False-Positive

**Gejala:**
- Container Instagram berstatus `FINISHED` di Meta API, tapi dispatcher menandai `FAILED` dengan pesan `Meta transcoding timeout (>15 menit waktu nyata)`.
- Di Supabase, `post_targets.status = 'FAILED'` padahal video sudah siap publish.

**Root Cause:**
```
Timestamp flow yang rusak:
1. initTarget() → set executed_at = NOW, status = IN_PROGRESS  ✅
2. pollTarget() catch → set executed_at = NOW, status = FAILED   ❌ BUG
3. Cron tick berikutnya → target sudah FAILED, tidak di-poll lagi
```

Masalah utama: di `catch` block `pollTarget()` (line ~394), `executed_at` di-overwrite ke waktu error. Ini bukan masalah langsung timeout, tapi menghapus jejak kapan container pertama kali dibuat.

**Masalah kedua:** Timeout 15 menit dihitung dari `executed_at`, tapi jika cron-job.org terlambat atau ada gap, waktu bisa melompat dan langsung trigger timeout di tick pertama setelah gap.

**Fix yang dibutuhkan:**
1. Tambah kolom `container_created_at` terpisah yang TIDAK pernah di-overwrite.
2. Di catch block `pollTarget()`, jangan overwrite `executed_at`.
3. Naikkan timeout dari 15 → 30 menit (Meta transcoding video besar bisa lama).
4. Tambah retry: jika timeout, cek sekali lagi ke Meta API sebelum mark FAILED.

**Evidence:**
- Container `18107662199229708` → status `FINISHED` di Meta API, tapi `FAILED` di Supabase.

---

## 2. Google Drive URL Tidak Dapat Diunduh Meta

**Gejala:**
- Instagram container creation berhasil (dapat `id`), tapi transcoding gagal.
- Meta server tidak bisa download video dari Google Drive URL.

**Root Cause:**
URL `https://drive.usercontent.google.com/download?id=XXX&export=download` memiliki beberapa masalah:
1. **Sharing permission:** File harus "Anyone with the link" (public). Jika private, Meta mendapat 403.
2. **File size limit:** Google Drive menampilkan halaman konfirmasi "virus scan" untuk file > 25 MB, yang menghasilkan HTML bukan video binary.
3. **Rate limiting:** Google Drive membatasi download frequency. Jika banyak post bersamaan, URL bisa return 429.

**Fix yang dibutuhkan:**
1. Saat upload ke Google Drive, pastikan permission di-set `anyoneWithLink`.
2. Untuk file besar, gunakan URL dengan `confirm=t` parameter: `&confirm=t`.
3. Alternatif: gunakan `lh3.googleusercontent.com` URL (thumbnail/stream) yang tidak kena batasan download.
4. Fallback: jika container ERROR karena "URL not accessible", auto-retry dengan URL format berbeda.

**Kode terkait:**
```js
// dispatcher.js line 177-178
if (post.gdrive_file_id && !post.gdrive_file_id.startsWith('local-')) {
  bodyPayload.video_url = `https://drive.usercontent.google.com/download?id=${post.gdrive_file_id}&export=download`;
}
```

---

## 3. TikTok `spam_risk_too_many_posts`

**Gejala:**
- TikTok menolak publish dengan `fail_reason: "spam_risk_too_many_posts"`.
- Terjadi meskipun hanya 1-2 posting per hari.

**Root Cause:**
Ini bukan bug kode. TikTok Sandbox app memiliki batasan ketat:
- Sandbox: maksimum ~3-5 video per hari.
- Content yang terlalu mirip (caption/durasi sama) bisa trigger spam filter.
- Akun baru atau app baru memiliki threshold lebih rendah.

**Mitigasi (bukan fix):**
1. Rate limiter internal: jangan kirim > 3 TikTok post per 24 jam.
2. Variasi caption: tambahkan timestamp atau variasi di `post_info.title`.
3. Jangan mark sebagai `FAILED` permanen — mark sebagai `RATE_LIMITED` dan retry setelah cooldown 1-6 jam.
4. Setelah app di-approve (bukan sandbox), limit akan naik signifikan.

**Status saat ini:**
- Dispatcher sudah handle `rate_limit_exceeded` di polling (line 366-372).
- BELUM handle `spam_risk_too_many_posts` di init phase — ini langsung throw dan FAILED.

---

## 4. Parent Post Status Tidak Sinkron

**Gejala:**
- `posts.status` tetap `PROCESSING` meskipun semua `post_targets` sudah `SUCCESS` atau `FAILED`.
- History page menampilkan post sebagai "sedang diproses" padahal sudah selesai.

**Root Cause:**
Sinkronisasi parent post terjadi di 2 tempat yang bisa race:
1. Di akhir `handler()` Phase 2 (line 87-103) — hanya jalan jika `pendingTargets` kosong.
2. Di akhir `pollTarget()` (line 399-418) — jalan setiap poll.

Jika Phase 2 memproses target dan langsung selesai tanpa melewati Phase 1 polling, parent sync bisa terlewat.

**Fix yang dibutuhkan:**
1. Pindahkan parent sync ke satu fungsi `syncParentStatus(postId)` dan panggil secara konsisten di setiap state transition.

---

## 5. Vercel 10s Timeout vs Polling

**Gejala:**
- Dispatcher harus menangani init + polling dalam 10 detik per invocation.
- Video besar butuh 5-30 menit transcoding, tapi setiap tick hanya 10 detik.

**Arsitektur saat ini:**
```
cron-job.org → GET /api/cron/dispatcher → 10s max
  ├── Phase 1: Poll IN_PROGRESS targets (max 2, budget 7s)
  └── Phase 2: Init PENDING targets (max 2, budget 8s)
```

**Ini bukan bug, tapi constraint arsitektural.** Mitigasi sudah dilakukan:
- Time budget guards (line 41, 47, 59).
- Backoff 15 detik antar poll per target (line 312-316).
- Limit 2 targets per phase.

**Risiko:**
- Jika cron interval > 1 menit, transcoding timeout bisa trigger karena gap terlalu besar.
- Jika banyak target bersamaan, antrian bisa bottleneck.

**Rekomendasi:**
- Set cron interval ke 30 detik (bukan 1 menit).
- Pertimbangkan Vercel Pro (maxDuration: 60s) jika volume naik.

---

## 6. TikTok Token Expired Tanpa Refresh

**Gejala:**
- TikTok posting gagal dengan `invalid_token` atau `access_token_invalid`.

**Root Cause:**
Token TikTok expire dalam 24 jam. Sebelumnya tidak ada auto-refresh.

**Status: ✅ FIXED**

Fix: `getValidToken()` (line 441-501) sekarang otomatis:
1. Cek `token_expires_at` — jika < 5 menit tersisa, refresh.
2. Call TikTok OAuth refresh endpoint.
3. Encrypt dan simpan token baru ke `connected_accounts`.

---

## Prioritas Fix Berikutnya

1. **🔴 Bug #1** — Fix timestamp handling di `pollTarget()` catch block. Jangan overwrite `executed_at`. Tambah final-check sebelum mark FAILED.
2. **🔴 Bug #2** — Tambah `&confirm=t` ke Google Drive URL. Verify sharing permission saat upload.
3. **🟡 Bug #3** — Handle `spam_risk` di init phase — retry dengan delay, bukan langsung FAILED.
4. **🟡 Bug #4** — Refactor parent sync ke fungsi tunggal.

---

## Catatan Debugging

### Cara Cek Status Container Instagram Manual
```bash
curl "https://graph.facebook.com/v19.0/{CONTAINER_ID}?fields=status_code,status,error_message&access_token={TOKEN}"
```

### Cara Cek Status Publish TikTok Manual
```bash
curl -X POST "https://open.tiktokapis.com/v2/post/publish/status/fetch/" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"publish_id": "{PUBLISH_ID}"}'
```

### Cara Reset Target yang Stuck
```sql
UPDATE post_targets
SET status = 'PENDING', error_payload = NULL, executed_at = NULL, polling_attempts = 0
WHERE id = '{TARGET_ID}';
```
