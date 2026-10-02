# Dokumentasi Arsitektur Omnichannel Social Media Auto-Poster Engine (OSM-APE)

Folder ini berisi spesifikasi teknis dan produk tingkat *enterprise* untuk platform otomatisasi distribusi konten multi-kanal tanpa perantara berbayar.

Standar arsitektur, modularitas, dan konvensi kode diadopsi langsung dari repository referensi: [`/home/yoga/Dokumen/nfc-google-review`](file:///home/yoga/Dokumen/nfc-google-review).

---

## Ringkasan Stack & Metodologi

* **Frontend:** React 19 + Vite 8 + TypeScript + Tailwind CSS v4 + Shadcn UI
* **State Management:** Zustand (atomic selector pattern, zero prop-drilling)
* **Database & Auth:** Supabase PostgreSQL (Row Level Security, `pgcrypto` token encryption, JWT Auth)
* **Media Storage Engine:** Google Drive API v3 (15 GB kuota gratis, bypass egress Supabase, HTTP 206 byte-range video streaming)
* **Backend Serverless:** Vercel Serverless Functions (`/api/*`) dengan limit eksekusi < 10 detik (Hobby Tier)
* **Cron Dispatcher:** cron-job.org external heartbeat triggering `/api/cron/dispatcher` (State-Machine Asynchronous Polling)
* **Metodologi:** Ponytail (Lean, YAGNI, < 150 baris per file) & Graphify Knowledge Architecture

---

## Daftar Dokumen Spesifikasi

1. **[BRD (Business Requirements Document) v2.0.0](file:///home/yoga/Dokumen/auto-poster/doc/BRD.md)**
   * **Project Charter & Analisis Zero-Cost:** Mengombinasikan React Vite TS, Google Drive 15 GB, Supabase Free Tier, dan cron-job.org untuk penghematan $216–$588/tahun.
   * **Stakeholder Matrix:** Matriks tata kelola peran Content Creator, Lead Software Engineer, dan Security/Compliance.
   * **Business Rules (BR-01 s/d BR-04):** Batasan legalitas API resmi, anti-spam jitter (5–15 detik), independensi transaksi platform (fault isolation), dan token renewal autonomy.
   * **Risk Assessment Framework:** Mitigasi limit 10s Vercel, Meta long-lived token expiry, dan eliminasi bottleneck kuota storage menggunakan Google Drive.

2. **[PRD (Product Requirements Document) v2.0.0](file:///home/yoga/Dokumen/auto-poster/doc/PRD.md)**
   * **User Persona & Journey:** Solusi untuk solo creator (Farhan) mendistribusikan konten video harian ke 4 kanal secara simultan via Google Drive uploader.
   * **Arsitektur Informasi & Navigasi:** Struktur antarmuka mencakup `/`, `/composer`, `/schedule`, `/history`, dan `/settings`.
   * **User Stories & Acceptance Criteria:** Skenario BDD/Gherkin untuk OAuth connect dan validasi komposisi media sebelum penjadwalan.
   * **Matriks Kompatibilitas Format Media:** Spesifikasi format resolusi, durasi, aspek rasio (9:16), bitrate, dan ukuran file untuk Reels, FB Video, Threads, dan TikTok.

3. **[TSD (Technical Specification Document) v2.0.0](file:///home/yoga/Dokumen/auto-poster/doc/TSD.md)**
   * **Executive Summary & Ponytail Analysis:** Perbandingan Next.js vs Vite SPA, target metrik (< 150 baris per komponen, bundle < 180 KB), dan prinsip rekayasa YAGNI.
   * **Component Decomposition Hierarchy:** Struktur modul direktori (`src/features/*`, `src/shared/*`, `api/*`).
   * **Strict Data Contracts (Zod):** Schema `GDriveMediaAssetSchema`, `CreatePostPayloadSchema`, `PlatformSchema`, dll.
   * **State Management (Zustand):** `useComposerStore` untuk form draft, media asset, upload progress, dan platform toggles.
   * **Supabase PostgreSQL DDL:** Tabel `connected_accounts` (enkripsi AES-256 pgcrypto), `posts` (referensi Google Drive file ID & stream URL), `post_targets`, `audit_logs`, trigger otomatis `updated_at`, RPC encrypt/decrypt, dan RLS policies.
   * **Google Drive Storage Engine:** Multipart upload handler (`api/upload.ts`), pembuatan subfolder bertingkat, izin reader publik, dan HTTP 206 Partial Content Stream Proxy (`api/gdrive-media.ts`) yang kompatibel dengan bot pengunduh Meta Reels dan TikTok.
   * **Decoupled State Machine Dispatcher:** TypeScript production implementation untuk cron worker yang berjalan di bawah 10 detik pada Vercel Hobby Tier.
   * **Vite Config & Dev Middleware:** `vite.config.ts` dengan serverless middleware shim untuk pengujian lokal instan (`rtk npm run dev`).
   * **Environment Variables & Setup Guide:** Konfigurasi `.env.production` lengkap untuk Supabase, Google Drive OAuth2, Meta, dan TikTok.
   * **Graphify Knowledge Graph:** Pemetaan 5 kluster komunitas modularitas dan strategi anti god-node.
   * **Panduan Operasional RTK:** Perintah token-conscious CLI untuk instalasi, dev, oxlint, build, dan git.
