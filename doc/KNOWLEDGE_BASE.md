# KNOWLEDGE BASE: SISTEM AUTO-POSTER & PRODUK JAGRES

Dokumen ini adalah basis pengetahuan (Knowledge Base) resmi yang digunakan oleh AI Copywriting Engine, Content Scheduler, dan Tim Pengembang Auto-Poster.

---

## 1. PROFIL PRODUK UTAMA: JAGRES GOOGLE REVIEW CARD

### 1.1 Deskripsi Produk
- **Nama Produk**: JAGRES Smart Google Review Card (Kartu Review Google Pintar).
- **Fungsi Utama**: Membantu pemilik bisnis (kafe, restoran, klinik, hotel, salon, toko retail, dll.) mengumpulkan ulasan bintang 5 di Google Maps secara instan tanpa ribet.
- **Teknologi**:
  - **Dual Chip NFC**: Tap smartphone pelanggan di bagian atas kartu, langsung membuka halaman form review bintang 5 bisnis Anda dalam 1 detik.
  - **Dynamic QR Code**: Alternatif scan kamera untuk smartphone pelanggan yang tidak memiliki fitur NFC.
- **Keunggulan Kompetitif**:
  - Tanpa baterai & tahan air (waterproof).
  - Tanpa biaya langganan bulanan (One-time payment, lifetime use).
  - Pelanggan tidak perlu download aplikasi apapun.
  - Link Google Maps dapat di-update kapan saja jika bisnis pindah lokasi.

### 1.2 Target Audiens Bisnis (B2B)
- **Hospitality & F&B**: Coffee shop, resto, bakery, lounge, bar, hotel, villa.
- **Jasa & Layanan**: Barbershop, salon kecantikan, klinik estetika & gigi, bengkel motor/mobil, studio foto.
- **Kesehatan & Edukasi**: Apotek, laboratorium, bimbel, daycare.
- **Retail & Showroom**: Toko baju, dealer kendaraan, toko furniture, toko elektronik.

### 1.3 Paket Penawaran & Harga (Pricelist Resmi)
1. **Paket Satuan (Retail Bisnis)**:
   - Harga Normal: Rp129.000 / kartu.
   - Harga Promo: Rp79.000 / kartu (Termasuk setup link gratis).
2. **Paket Bundle Merchant (Isi 3 Kartu)**:
   - Harga Promo: Rp199.000 (Cocok untuk kasir 1, kasir 2, dan meja resepsionis).
3. **Paket Reseller & Agen**:
   - Modal Mulai: Rp150.000 (Paket Starter siap jual).
   - Margin Keuntungan: 100% – 200% per kartu.
   - Fasilitas: Marketing kit, template video promosi, panduan jualan, dan garansi penggantian kartu jika chip rusak.

---

## 2. PANDUAN COPYWRITING & BRAND VOICE (AI TUNING)

### 2.1 Gaya Bahasa & Karakteristik
- **Tone**: Edukatif, persuasif, santai namun profesional (*friendly business-to-business*).
- **Gaya Hook**: Mengangkat keresahan pemilik usaha (contoh: *"Pelanggan rame tapi ulasan Google sepi?"*, *"Susah minta review bintang 5 ke customer?"*).
- **Struktur Copywriting**:
  1. **Hook**: Masalah rating Google Maps yang rendah atau ulasan yang minim.
  2. **Problem**: Customer sering malas ngetik atau cari nama toko manual di Google Maps.
  3. **Solution**: Solusi 1 Detik Tinggal Tap pakai JAGRES Card.
  4. **Call To Action (CTA)**: Ajak komen *"MAU"*, klik link di bio, atau hubungi WhatsApp/DM untuk pemesanan.

### 2.2 Guardrails & Larangan Keras (Anti-Halusinasi)
- **DILARANG** menjanjikan "beli review bot / ulasan palsu". JAGRES murni alat perangkat keras untuk meminta review jujur dari customer nyata.
- **DILARANG** mengarang harga sembarangan. Selalu gunakan harga acuan di atas atau angka yang tercantum pada materi gambar/video promo.
- **WAJIB** sertakan hashtag relevan: `#reviewgoogle #googlemapsreview #bisnisowner #tipsumkm #restorankekinian #coffeeshopindonesia #kulinerindonesia`.

---

## 3. ARSITEKTUR TEKNIS SISTEM AUTO-POSTER

### 3.1 Komponen & Alur Data
1. **Frontend**: Vite + React + Tailwind CSS + Lucide Icons.
2. **Database & Auth**: Supabase PostgreSQL + Row Level Security (RLS).
3. **Media Storage**: Google Drive API via OAuth2 Streaming Serverless Proxy (15 GB gratis, hemat bandwidth).
4. **Distribusi Media**:
   - **Instagram**: Meta Graph API v19.0 (Reels & Feed Image, direct video URL via Google Drive).
   - **Facebook Page**: Meta Graph API v19.0 (Direct Upload Video & Photo via Graph endpoint).
   - **TikTok**: TikTok Open API Direct Post v2 (Chunked Stream Upload).
5. **Scheduler & Queue**:
   - Status Queue: `PENDING` -> `IN_PROGRESS` (Container ID) -> `POLLING` -> `SUCCESS` / `FAILED`.
   - Consumer: Serverless function `/api/cron/dispatcher.js`.
   - Heartbeat Eksternal: `cron-job.org` memanggil dispatcher tiap 1 menit via Authorization Bearer token.
6. **Limit Proteksi Harian (Safe Guard)**:
   - Instagram: Maks 5 post aman / hari (Limit API: 25 post/hari).
   - Facebook Page: Maks 5 post aman / hari (Limit API: 50 post/hari).
   - TikTok: Maks 5 video aman / hari.
