# 🚀 OSM-APE (Auto-Poster Engine) — Panduan Setup & Integrasi Pihak ke-3

Panduan komprehensif langkah demi langkah untuk menghubungkan seluruh layanan pihak ketiga (**Google Cloud & Drive**, **Supabase Database**, **Meta Developer Platform**, **TikTok Developer Portal**, dan **Cron Scheduler**) ke aplikasi Auto-Poster.

---

## 📋 Daftar Isi
1. [Arsitektur & Konfigurasi Lingkungan (`.env`)](#1-arsitektur--konfigurasi-lingkungan-env)
2. [Setup Google Cloud Console & Google Drive Storage](#2-setup-google-cloud-console--google-drive-storage)
3. [Setup Supabase (Database, Auth & Realtime)](#3-setup-supabase-database-auth--realtime)
4. [Setup Meta Developer Platform (Facebook Page & Instagram Reels)](#4-setup-meta-developer-platform-facebook-page--instagram-reels)
5. [Setup TikTok Developer Portal (Direct Post API v2)](#5-setup-tiktok-developer-portal-direct-post-api-v2)
6. [Setup Scheduler Otomatis (cron-job.org)](#6-setup-scheduler-otomatis-cron-joborg)
7. [Checklist Deployment Production (Vercel)](#7-checklist-deployment-production-vercel)

---

## 1. Arsitektur & Konfigurasi Lingkungan (`.env`)

Duplikat template environment variabel dari `.env.example`:
```bash
cp .env.example .env
```

Berikut ringkasan variabel yang dibutuhkan:

```env
# --- SUPABASE ---
VITE_SUPABASE_URL=https://<your-project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5c...
SUPABASE_URL=https://<your-project-id>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5c...
ENCRYPTION_MASTER_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# --- DOMAIN & CRON ---
NEXT_PUBLIC_APP_URL=https://auto-poster-blush.vercel.app
CRON_SECRET_KEY=kunci-rahasia-cron-kamu-32-karakter

# --- GOOGLE DRIVE STORAGE ---
GDRIVE_CLIENT_ID=552932390881-xxxxxx.apps.googleusercontent.com
GDRIVE_CLIENT_SECRET=GOCSPX-xxxxxx
GDRIVE_REFRESH_TOKEN=1//0gCU8fVlnxxxxxx
GDRIVE_FOLDER_ID=15z6fpJ3z96iQEUfJMspSTmYPghnIHW9S

# --- META DEVELOPER (IG & FB) ---
META_APP_ID=1234567890123456
META_APP_SECRET=abcdef0123456789abcdef0123456789
META_REDIRECT_URI=https://auto-poster-blush.vercel.app/api/auth/meta-callback

# --- TIKTOK DEVELOPER ---
TIKTOK_CLIENT_KEY=awxxxxxx
TIKTOK_CLIENT_SECRET=xxxxxx
TIKTOK_REDIRECT_URI=https://auto-poster-blush.vercel.app/api/auth/tiktok-callback

# --- GOOGLE GEMINI AI ---
GEMINI_API_KEY=AIzaSy...
```

---

## 2. Setup Google Cloud Console & Google Drive Storage

Aplikasi ini menggunakan **100% Google Drive sebagai penyimpanan media utama** (tanpa batasan 4.5 MB Vercel Serverless melalui fitur *Direct Resumable Upload*).

### Langkah 1: Buat Project & Aktifkan API
1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat project baru (atau pilih project yang sudah ada).
3. Buka menu **APIs & Services** > **Library**.
4. Cari **Google Drive API**, lalu klik **Enable** (Aktifkan).

### Langkah 2: Konfigurasi OAuth Consent Screen
1. Masuk ke **APIs & Services** > **OAuth consent screen**.
2. Pilih User Type: **External** > klik **Create**.
3. Isi informasi aplikasi:
   - **App name**: `Auto Poster Engine`
   - **User support email**: Email akun Google kamu
   - **Developer contact information**: Email akun Google kamu
4. Pada step **Scopes**, tambahkan scope:
   - `https://www.googleapis.com/auth/drive` (atau `https://www.googleapis.com/auth/drive.file`)
5. Pada step **Test users**, tambahkan email Google kamu sendiri (akun pemilik Google Drive).
6. Simpan konfigurasi.

### Langkah 3: Buat OAuth 2.0 Client ID & Setting Origins
1. Buka **APIs & Services** > **Credentials**.
2. Klik **+ CREATE CREDENTIALS** > pilih **OAuth client ID**.
3. Application type: **Web application**.
4. Beri nama: `Auto Poster Web Client`.
5. **Authorized JavaScript origins** (PENTING untuk CORS Resumable Upload):
   - `http://localhost:5173` (untuk dev lokal)
   - `https://auto-poster-blush.vercel.app` (domain Vercel kamu)
6. **Authorized redirect URIs**:
   - `https://developers.google.com/oauthplayground` (untuk generate refresh token)
   - `http://localhost:5173/api/auth/gdrive-callback`
   - `https://auto-poster-blush.vercel.app/api/auth/gdrive-callback`
7. Klik **Create**. Salin:
   - **Client ID** &rarr; simpan ke `GDRIVE_CLIENT_ID`
   - **Client Secret** &rarr; simpan ke `GDRIVE_CLIENT_SECRET`

### Langkah 4: Dapatkan `GDRIVE_REFRESH_TOKEN` (via OAuth Playground)
1. Buka [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. Di pojok kanan atas, klik icon gerigi (**OAuth 2.0 configuration**):
   - Centang **Use your own OAuth credentials**.
   - Masukkan **OAuth Client ID** & **OAuth Client secret** yang baru kamu buat.
3. Di kolom kiri (**Step 1: Select & authorize APIs**):
   - Di input text bawah, ketik: `https://www.googleapis.com/auth/drive`
   - Klik **Authorize APIs**.
   - Login menggunakan akun Google Drive kamu dan setujui izinnya.
4. Pada **Step 2: Exchange authorization code for tokens**:
   - Klik **Exchange authorization code for tokens**.
   - Salin nilai **Refresh token** &rarr; simpan ke `GDRIVE_REFRESH_TOKEN`.

### Langkah 5: Dapatkan `GDRIVE_FOLDER_ID`
1. Buka [Google Drive](https://drive.google.com/).
2. Buat folder baru (misalnya `AutoPosterUploads`).
3. Buka folder tersebut, perhatikan URL di browser:
   `https://drive.google.com/drive/folders/15z6fpJ3z96iQEUfJMspSTmYPghnIHW9S`
4. Bagian teks setelah `/folders/` adalah Folder ID (`15z6fpJ3z96iQEUfJMspSTmYPghnIHW9S`) &rarr; simpan ke `GDRIVE_FOLDER_ID`.

---

## 3. Setup Supabase (Database, Auth & Realtime)

Supabase bertindak sebagai database metadata postingan, log riwayat eksekusi, enkripsi token akun media sosial, dan realtime dispatcher.

### Langkah 1: Buat Project Supabase
1. Buka [Supabase Dashboard](https://supabase.com/dashboard).
2. Buat project baru, pilih region terdekat (misalnya `Singapore (ap-southeast-1)`).
3. Catat **Database Password** kamu.

### Langkah 2: Ambil Kunci Akses (API Credentials)
1. Buka **Project Settings** > **API**.
2. Salin:
   - **Project URL** &rarr; `VITE_SUPABASE_URL` dan `SUPABASE_URL`
   - **anon / public key** &rarr; `VITE_SUPABASE_ANON_KEY`
   - **service_role key** (Secret) &rarr; `SUPABASE_SERVICE_ROLE_KEY`

### Langkah 3: Eksekusi Skema Database
1. Buka menu **SQL Editor** di dashboard Supabase.
2. Jalankan skrip migrasi database (membuat tabel `posts`, `post_targets`, `connected_accounts`):
   - Pastikan extension `pgcrypto` aktif:
     ```sql
     create extension if not exists pgcrypto;
     ```
   - Buat fungsi enkripsi/dekripsi token akun menggunakan kunci `ENCRYPTION_MASTER_KEY`.
3. Aktifkan **Realtime** untuk tabel `post_targets`:
   - Buka **Database** > **Replication**.
   - Pastikan tabel `post_targets` tercentang aktif untuk publikasi Realtime.

### Langkah 4: Generate `ENCRYPTION_MASTER_KEY`
Buat string acak 32-byte hexadecimal di terminal kamu:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Simpan hasilnya ke `ENCRYPTION_MASTER_KEY` di file `.env` dan di Vercel Environment Variables.

---

## 4. Setup Meta Developer Platform (Facebook Page & Instagram Reels)

### Langkah 1: Buat Akun & Aplikasi di Meta for Developers
1. Kunjungi [Meta for Developers](https://developers.facebook.com/).
2. Login dan klik **My Apps** > **Create App**.
3. Pilih use case: **Other** > Tipe aplikasi: **Business**.
4. Beri nama aplikasi (misal: `Auto Poster Multi-Platform`).

### Langkah 2: Ambil App ID & App Secret
1. Masuk ke **App settings** > **Basic**.
2. Salin:
   - **App ID** &rarr; simpan ke `META_APP_ID`
   - **App Secret** (klik *Show*) &rarr; simpan ke `META_APP_SECRET`
3. Isi kolom **Privacy Policy URL** dan **Terms of Service URL**:
   - `https://auto-poster-blush.vercel.app/privacy`
   - `https://auto-poster-blush.vercel.app/terms`

### Langkah 3: Konfigurasi Facebook Login for Business
1. Pada menu kiri, klik **Add Product** > pilih **Facebook Login for Business** > **Set Up**.
2. Buka **Facebook Login for Business** > **Settings**.
3. Pada **Valid OAuth Redirect URIs**, masukkan:
   - `http://localhost:5173/api/auth/meta-callback`
   - `https://auto-poster-blush.vercel.app/api/auth/meta-callback`
4. Simpan perubahan.

### Langkah 4: Izin (Permissions) yang Diperlukan
Aplikasi ini otomatis meminta permissions berikut saat tombol koneksi di klik:
- `pages_show_list`
- `pages_read_engagement`
- `pages_manage_posts`
- `instagram_basic`
- `instagram_content_publish`

> **Catatan Pengujian (Dev Mode):**
> Saat aplikasi masih berstatus *In Development*, akun Facebook yang bisa dikoneksikan harus sudah terdaftar sebagai **Admin/Developer/Tester** pada menu **App Roles** di dashboard Meta.

---

## 5. Setup TikTok Developer Portal (Direct Post API v2)

### Langkah 1: Buat Aplikasi di TikTok for Developers
1. Kunjungi [TikTok for Developers](https://developers.tiktok.com/).
2. Masuk ke **Manage apps** > **Create an app**.
3. Beri nama aplikasi dan unggah icon aplikasi.

### Langkah 2: Verifikasi Kepemilikan Domain
1. Di pengaturan aplikasi TikTok, cari tab **Domain Verification**.
2. Unduh file verifikasi yang diberikan oleh TikTok (contoh: `tiktoknHtwOvb6UIzVzqtJ0jcpQUhunhpHwOLA.txt`).
3. Simpan file tersebut di folder `public/` proyek ini.
4. Deploy ke domain kamu, lalu klik tombol **Verify** di portal TikTok (harus bisa diakses di `https://auto-poster-blush.vercel.app/<file-tiktok>.txt`).

### Langkah 3: Tambahkan Produk & Scopes
1. Tambahkan produk **Login Kit** dan **Content Posting API**.
2. Aktifkan scopes:
   - `user.info.basic`
   - `video.publish` (untuk posting video langsung ke feed)
3. Pada **Redirect URL**, masukkan:
   - `http://localhost:5173/api/auth/tiktok-callback`
   - `https://auto-poster-blush.vercel.app/api/auth/tiktok-callback`

### Langkah 4: Ambil Kunci Klien
1. Salin **Client Key** &rarr; simpan ke `TIKTOK_CLIENT_KEY`.
2. Salin **Client Secret** &rarr; simpan ke `TIKTOK_CLIENT_SECRET`.

---

## 6. Setup Google Gemini AI (`GEMINI_API_KEY`)

Aplikasi memanfaatkan Google Gemini AI (model `gemini-1.5-flash` / `gemini-1.5-pro`) untuk fitur **Autopilot Composer**:
- Generate konsep konten video viral (`/api/ai/concept-generator`)
- Generate prompt naskah video cinematic (`/api/ai/video-prompt`)
- Generate caption, hook, CTA, dan hashtag multi-channel (`/api/ai/caption`)

### Cara Mendapatkan API Key Gemini:
1. Buka [Google AI Studio](https://aistudio.google.com/).
2. Login menggunakan akun Google kamu.
3. Klik tombol **Get API key** di pojok kiri atas.
4. Klik **Create API key in new project** (atau pilih project Google Cloud yang sudah ada).
5. Salin API Key yang dihasilkan (diawali dengan `AIzaSy...`).
6. Masukkan ke file `.env` lokal:
   ```env
   GEMINI_API_KEY=AIzaSy...
   ```
7. Masukkan juga ke **Environment Variables di Vercel Dashboard** untuk environment Production & Preview.

---

## 7. Setup Scheduler Otomatis (cron-job.org)

Karena Vercel Hobby Plan membatasi cron jobs internal, aplikasi menggunakan layanan eksternal gratis yang lebih fleksibel: [cron-job.org](https://console.cron-job.org/).

1. Buat akun di [cron-job.org](https://console.cron-job.org/).
2. Klik **Create Cronjob**.
3. Pengaturan Cronjob:
   - **Title**: `Auto Poster Dispatcher Heartbeat`
   - **URL**: `https://auto-poster-blush.vercel.app/api/cron/dispatcher?key=NILAI_CRON_SECRET_KEY_KAMU`
   - **Schedule**: Setiap 1 menit (`* * * * *`) atau 2 menit.
   - **Request Method**: `GET`
   - **Headers** (opsional):
     `Authorization: Bearer NILAI_CRON_SECRET_KEY_KAMU`
4. Klik **Save**.
5. Cronjob ini akan secara otomatis memicu antrean video dan memproses postingan saat jadwalnya tiba.

---

## 8. Checklist Deployment Production (Vercel)

1. **Environment Variables di Vercel**:
   - Masuk ke **Vercel Dashboard** > Pilih Proyek `auto-poster` > **Settings** > **Environment Variables**.
   - Masukkan seluruh variabel dari file `.env` di atas (Production & Preview).
2. **Batas Serverless Function Vercel (Hobby Tier)**:
   - Proyek ini telah dioptimalkan dengan tepat **12 serverless functions** di folder `api/` agar tidak terkena limit Hobby Plan. Helper internal berada di `server/`.
3. **Validasi Build**:
   ```bash
   npm run build
   ```
4. **Deploy**:
   ```bash
   git push origin main
   ```

Aplikasi siap digunakan secara penuh di production! 🚀
