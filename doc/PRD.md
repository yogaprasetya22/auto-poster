# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Omnichannel Social Media Auto-Poster Engine (OSM-APE)

---

### Dokumen Metadata
* **Proyek:** Omnichannel Social Media Auto-Poster Engine (OSM-APE)
* **Versi Dokumen:** 2.0.0
* **Status:** Approved / Production Ready
* **Tanggal Rilis:** 2026-10-03
* **Tech Stack Baseline:** React 19, Vite 8, TypeScript, Tailwind CSS v4, Shadcn UI, Zustand, Supabase (DB & Auth), Google Drive (Storage API v3), Vercel Serverless
* **Target Audience:** Product Manager, UI/UX Designer, Frontend & Backend Engineers

---

## 1. Persona Pengguna & Alur Kerja

### 1.1 Profil Persona
* **Nama:** Farhan (Solo Digital Marketer & Tech Content Creator)
* **Karakteristik:** Memproduksi konten review teknologi dan tutorial coding harian secara independen.
* **Kebutuhan Utama:** Memiliki rekaman video review vertikal setiap pagi, dan ingin mendistribusikannya ke TikTok, Instagram Reels, Facebook Page Video, dan Threads pada jam-jam sibuk (*peak hours*: 08:00, 11:30, 14:00, 17:30, dan 20:00 WIB) tanpa harus membuka dan mengunggah ulang secara manual di masing-masing aplikasi ponsel.
* **Pain Points:** 
  1. Terlalu banyak waktu terbuang untuk proses repetitif: *copy-paste caption*, re-upload video berukuran besar, dan menyesuaikan tag.
  2. Tools otomatisasi populer berbayar (seperti Buffer, Hootsuite, Later) membebankan biaya langganan bulanan mahal untuk integrasi multi-kanal dan multi-platform video.

### 1.2 User Journey Workflow
```
[ Rekam Video / Siapkan Materi ]
               │
               ▼
[ Buka Dashboard OSM-APE (/composer) ]
               │
               ├─► 1. Unggah Media (Direct Multipart ke Google Drive via /api/upload)
               ├─► 2. Tulis Caption Universal & Kustomisasi Platform-Specific
               ├─► 3. Pilih Platform Target (FB Page, IG Reels, Threads, TikTok)
               └─► 4. Tetapkan Jadwal Terbit (Atau "Publish Now")
               │
               ▼
[ Validasi Otomatis (Durasi, Rasio, Ukuran File via Zod) ]
               │
               ▼
[ Antrean Terdaftar: Status SCHEDULED di Supabase DB ]
               │
               ▼
[ Engine Serverless Memproses Konten via Background Cron Dispatcher ]
               │
               ▼
[ Konten Live di Semua Kanal + Audit Log Tersimpan ]
```

---

## 2. Arsitektur Informasi & Navigasi Antarmuka

Struktur navigasi web application didesain ramping, berbasis Shadcn UI & Tailwind v4, fokus pada efisiensi entri data, dan memberikan kejelasan visibilitas status konten:

```
[ Dashboard Utama - React Vite SPA ]
  ├── / (Overview)
  │     ├── Ringkasan Metrik (Total Scheduled, Published Hari Ini, Failed Posts)
  │     ├── Jadwal Posting Hari Ini (Timeline View)
  │     └── Health Check Status Akun Terhubung (Meta & TikTok Token Validity)
  │
  ├── /composer (Content Studio)
  │     ├── Google Drive Media Uploader (Drag-and-drop, validasi durasi & ukuran instan)
  │     ├── Form Input Konten (Universal Caption, character counters, & platform override)
  │     ├── Live Preview Simulator (Preview feed IG, Reels 9:16, FB Video, Threads, TikTok)
  │     └── Target Platform Selector & Scheduling Date-Time Picker
  │
  ├── /schedule (Calendar & Queue Management)
  │     ├── Kalender Mingguan / Bulanan
  │     ├── Daftar Antrean Penjadwalan Konten (Queue List)
  │     └── Aksi Cepat: Edit Draft, Reschedule, Batalkan Jadwal
  │
  ├── /history (Execution Log & Analytics)
  │     ├── Audit Log Eksekusi Tiap Platform
  │     ├── Status Hasil Eksekusi (SUCCESS, FAILED, PARTIALLY_FAILED)
  │     ├── Direct Public Link ke Konten yang Berhasil Terbit
  │     └── Tombol Manual Retry untuk Platform yang Gagal
  │
  └── /settings (Account & Integrasi API)
        ├── OAuth Connections: Facebook Page, Instagram Professional, Threads, TikTok
        ├── Refresh Token Status Monitor & Force Re-auth Button
        ├── Google Drive Storage Connection Status (OAuth2 Refresh Token)
        └── Konfigurasi Sistem (Default Post Interval, Jitter Setting)
```

---

## 3. User Stories & Acceptance Criteria (Format BDD / Gherkin)

### US-01: OAuth Multi-Platform Connection

```gherkin
Feature: Autentikasi dan Otorisasi Akun
  As a User
  I want to connect my Meta and TikTok accounts via OAuth 2.0
  So that the application can publish content on my behalf securely.

  Scenario: Menghubungkan Akun Meta (Instagram & Facebook)
    Given Pengguna berada di halaman "/settings"
    When Pengguna menekan tombol "Connect Meta Account"
    Then Sistem mengarahkan ke dialog OAuth resmi Meta dengan scope yang ditentukan
    And Setelah otorisasi disetujui, callback URL menerima authorization code
    And Backend menukarkan code menjadi Long-Lived User Access Token (masa aktif 60 hari)
    And Backend mengambil daftar Page dan IG Business ID, lalu menyimpannya terenkripsi ke database Supabase
    And Antarmuka menampilkan status "Connected" dengan nama akun dan avatar.
```

### US-02: Content Composition & Validation

```gherkin
Feature: Validasi dan Pembuatan Draft Konten
  As a User
  I want to upload media to Google Drive and set platform-specific captions
  So that my post complies with each platform's constraints before scheduling.

  Scenario: Validasi Durasi dan Ukuran Video
    Given Pengguna memilih media berformat MP4 dengan durasi 120 detik
    When Pengguna memilih target platform termasuk "Instagram Reels"
    Then Sistem menampilkan peringatan "Durasi Reels maksimal 90 detik via API"
    And Tombol "Schedule Post" berada dalam keadaan nonaktif (disabled)
    Until Pengguna mengganti media yang memenuhi spesifikasi durasi (3-90 detik).
```

---

## 4. Matriks Kompatibilitas Format Media

Setiap platform media sosial memiliki spesifikasi dan limitasi teknis yang ketat. Klien Composer wajib menerapkan validasi sebelum pendaftaran ke antrean:

| Parameter Media | Instagram Reels | Facebook Page Video | Threads Media | TikTok Direct Post |
| :--- | :--- | :--- | :--- | :--- |
| **Tipe Konten** | Video Vertikal (9:16) | Video Bebas (16:9, 1:1, 9:16) | Teks / Gambar / Video | Video Vertikal (9:16) |
| **Max File Size** | 100 MB (via GDrive Stream) | 1 GB (via GDrive Stream) | 50 MB | 50 MB |
| **Durasi Video** | 3 detik – 90 detik | 1 detik – 240 menit | Max 5 menit | 3 detik – 600 detik |
| **Container & Codec** | MP4, MOV (H.264 + AAC) | MP4, MOV (H.264 + AAC) | MP4, MOV (H.264) | MP4, WebM (H.264 + AAC) |
| **Format Gambar** | JPG, PNG (Max 8 MB) | JPG, PNG (Max 10 MB) | JPG, PNG (Max 8 MB) | N/A (Fokus Video) |
| **Max Karakter Teks** | 2,200 karakter | 63,206 karakter | 500 karakter | 2,200 karakter |
| **Aspek Rasio Rekomendasi**| 9:16 (1080x1920 px) | 16:9, 1:1, atau 9:16 | Bebas (1:1, 16:9, 9:16) | 9:16 (1080x1920 px) |
| **Video Bitrate Max** | $\le 25\text{ Mbps}$ | $\le 30\text{ Mbps}$ | $\le 25\text{ Mbps}$ | $\le 50\text{ Mbps}$ |
| **Audio Format** | AAC, 48kHz, stereo | AAC, 44.1kHz / 48kHz | AAC | AAC |
