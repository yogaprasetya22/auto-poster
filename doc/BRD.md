# BUSINESS REQUIREMENTS DOCUMENT (BRD)
## Omnichannel Social Media Auto-Poster Engine (OSM-APE)

---

### Dokumen Metadata
* **Proyek:** Omnichannel Social Media Auto-Poster Engine (OSM-APE)
* **Versi Dokumen:** 2.0.0
* **Status:** Approved / Production Ready
* **Tanggal Rilis:** 2026-10-03
* **Tech Stack Baseline:** React Vite TS, Shadcn UI, Supabase (DB & Auth), Google Drive (15 GB Media Engine), Vercel Serverless
* **Klasifikasi:** Internal Engineering & Product Spec

---

## 1. Ringkasan Eksekutif & Project Charter

### 1.1 Project Charter & Business Case
* **Nama Proyek:** Omnichannel Social Media Auto-Poster Engine (OSM-APE).
* **Ringkasan Eksekutif:**  
  Platform otomatisasi distribusi konten multi-kanal tanpa perantara berbayar pihak ketiga (seperti Buffer, Hootsuite, atau Zapier). Platform ini mengorkestrasi publikasi silang konten video pendek (9:16 vertical), gambar tunggal, dan teks secara serentak ke 4 platform utama:
  1. **Facebook Page**
  2. **Instagram Professional / Creator**
  3. **Threads**
  4. **TikTok**

* **Analisis Finansial (Zero-Cost Architecture):**
  * **Biaya SaaS Eksisting:** Rata-rata $18 – $49/bulan untuk 4 profil sosial dengan kuota 150 postingan/bulan.
  * **Biaya Proyek Ini:** **$0.00/bulan (Zero-Cost)** dengan mengombinasikan React Vite TS di Vercel Hobby Tier, Supabase Free Tier (PostgreSQL & Auth), Google Drive Free Tier (15 GB Media Storage via OAuth2 v3), cron-job.org, dan integrasi API Developer Resmi.
  * **Return on Investment (ROI):** Penghematan biaya operasional software tahunan $216 – $588 per akun bisnis dengan efisiensi waktu rilis konten hingga 90%.

---

## 2. Stakeholder Matrix & Tata Kelola

| Peran Stakeholder | Tanggung Jawab Utama | Kriteria Keberhasilan |
| :--- | :--- | :--- |
| **Content Creator / Operator** | Mengunggah aset media ke Google Drive, menyusun caption, menentukan platform target, dan menetapkan jadwal posting. | Form input selesai dalam < 3 menit; eliminasi total *manual re-posting*. |
| **Lead Software Engineer** | Menjaga stabilitas pipeline API, token lifecycle & rotation, optimasi eksekusi serverless (< 10s), dan reliabilitas cron worker. | Uptime webhook & cron dispatcher $\ge 99.5\%$, *zero credential leakage*. |
| **Compliance & Security** | Memastikan keselarasan penuh dengan Meta Developer Terms & TikTok Developer Terms of Service (ToS). | $0\%$ insiden penalti akun (*shadowban*, *rate ban*, atau *app review suspension*). |

---

## 3. Detailed Business Rules (Aturan Bisnis & Batasan Hukum)

1. **BR-01 (Integritas API Resmi):**  
   Seluruh komunikasi data keluar **wajib** menggunakan REST API resmi berizin OAuth 2.0. Dilarang keras menggunakan *private API*, *web scraping*, atau *headless browser automation* (seperti Puppeteer/Playwright) yang melanggar ketentuan anti-automasi Meta dan TikTok.

2. **BR-02 (Anti-Spam & Human Behavior Simulation):**
   * **Batas Maksimal Harian:** Maksimal 5 batch postingan per 24 jam.
   * **Stagger Interval:** Postingan ke platform berbeda untuk konten yang sama diberikan jeda acak (*jitter*) sebesar 5 – 15 detik.
   * **Jeda Minimal Antar-Postingan:** Jeda minimal antar-postingan yang berbeda pada platform yang sama adalah 60 menit.

3. **BR-03 (Fault Isolation Guarantee):**  
   Setiap target platform merupakan transaksi independen. Kegagalan API salah satu platform (misal: TikTok menolak audio karena lisensi hak cipta atau durasi melampaui batas) tidak boleh membatalkan (*rollback*) status publikasi di Instagram, Facebook, atau Threads.

4. **BR-04 (Token Renewal Autonomy):**  
   Token OAuth pihak ketiga yang mendekati masa kedaluwarsa ($T - 7\text{ hari}$) harus diperpanjang secara otomatis oleh sistem di latar belakang tanpa memerlukan intervensi *login* ulang dari pengguna.

---

## 4. Risk Assessment & Mitigation Framework

| ID Risiko | Dampak | Probabilitas | Strategi Mitigasi Teknis |
| :--- | :--- | :--- | :--- |
| **R-01: Expiration of Meta Long-Lived Token** | Tinggi | Sedang | Background cron otomatis memeriksa kolom `token_expires_at` dan menembak endpoint `fb_exchange_token` saat sisa masa aktif < 10 hari. |
| **R-02: Vercel 10s Execution Timeout** | Kritis | Tinggi | Membagi alur publikasi menjadi pola *State Machine* (`Init` $\rightarrow$ `Status Polling` $\rightarrow$ `Publish`) yang dieksekusi lintas siklus cron, bukan dalam 1 *blocking request loop*. |
| **R-03: TikTok Video Transcoding Delay** | Sedang | Tinggi | Menghindari sinkronisasi *inline*; TikTok API dijalankan secara asinkron via `PULL_FROM_URL` lalu status diperiksa pada *next tick cron*. |
| **R-04: Media Storage & Bandwidth Bottleneck** | Tinggi | Rendah | Mengalihkan seluruh penyimpanan media (video & image) ke **Google Drive API v3 (15 GB Kuota Gratis)** dengan endpoint streaming byte-range (`/api/gdrive-media`), sehingga kuota egress Supabase tetap 0 MB untuk aset media dan sistem terlindungi dari biaya langganan tambahan. |
