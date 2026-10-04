import { getDynamicKnowledgeContext } from './knowledge.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    productName = 'JAGRES Google Review Card',
    productImageUrl = '',
    productImages = [], // Array of { name, url }
    targetPlatform = 'all',
    customAngle = '',
  } = req.body || {};

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY belum dikonfigurasi di server' });
  }

  const baseKnowledge = await getDynamicKnowledgeContext();

  // Susun daftar referensi gambar produk
  const imagesListText = productImages && productImages.length > 0
    ? productImages.map((img, i) => `Gambar ${i + 1} (${img.name}): ${img.url}`).join('\n')
    : productImageUrl || '(Gunakan deskripsi fisik kartu PVC NFC hitam matte standar ATM)';

  const prompt = `
Peran Anda adalah AI Director & Creative Prompt Engineer spesialis Video Iklan Komersial Generatif (Google Flow / flow.google.com, Kling AI, Runway Gen-3, Luma Dream Machine, Midjourney).

Basis Pengetahuan Resmi Produk & Brand:
${baseKnowledge}

Informasi Produk Kampanye:
- Nama Produk: ${productName}
- Galeri Referensi Mentahan Gambar Produk Asli:
${imagesListText}
- Angle Khusus / Brief: ${customAngle || 'Iklan promosi harga promo mulai 25 ribu untuk pemilik resto/kafe/klinik agar ulasan Google Maps ramai'}

ATURAN WAJIB & TUNING SPESIFIK (INDONESIAN LOCAL CONTEXT):
1. **Wajah & Karakter (Indonesian Cast)**: Semua pemeran/karakter dalam video HARUS berwajah Indonesia (Indonesian face, Southeast Asian ethnicity, natural Southeast Asian facial features). JANGAN gunakan bule atau model barat. Deskripsikan misalnya "authentic Indonesian male cafe owner in his late 20s" atau "young Indonesian female customer wearing casual modest outfit".
2. **Bahasa & Voiceover**: Seluruh teks judul, visual aksi (storyboard_id), dan VOICEOVER (voiceover_id) HARUS 100% menggunakan Bahasa Indonesia yang luwes, alami, persuasif, seperti kreator TikTok/Reels lokal Indonesia.
3. **Latar / Suasana (Setting)**: Kafe, kedai kopi, resto, atau kasir UMKM modern Indonesia yang hangat dan otentik.
4. **Prompt Generator Video (English)**: Bagian "prompt_english" dan "full_flow_prompt" tetap dalam Bahasa Inggris profesional agar AI generator (Google Flow/Kling/Runway) paham secara presisi, TETAPI WAJIB secara eksplisit mencantumkan: "authentic Indonesian person, Southeast Asian features, cozy Indonesian modern cafe interior".

PENTING TENTANG MULTI-IMAGE REFERENSI:
Jika terdapat beberapa gambar produk yang diunggah (misal: tampak depan kartu, kartu di meja kasir, akrilik standee, atau tap HP):
- Sesuaikan alur cerita (Scene 1, Scene 2, Scene 3) agar selaras dengan gambar-gambar tersebut.
- Di setiap adegan sertakan field "reference_image_used": sebutkan nama gambar yang paling cocok dijadikan keyframe adegan tersebut.

Tugas Anda:
Buat Multi-Scene Video Storyboard 3 Bagian (Format Vertikal 9:16 untuk Reels & TikTok) lengkap dengan Prompt AI Generatif yang SANGAT DETAIL, fotorealistis, dan langsung siap di-copy-paste ke agent video (Google Flow / Kling / Runway).

Struktur 3 Bagian:
1. Scene 1 - Hook (0-3 detik): Masalah pemilik bisnis lokal Indonesia (pemilik kafe/resto berwajah Indonesia cemas melihat rating Google Maps sepi atau kalah saing).
2. Scene 2 - Demo Produk (3-8 detik): Close-up tangan pelanggan/kasir Indonesia menempelkan smartphone (NFC tap) ke kartu produk ${productName}. Layar smartphone langsung memunculkan pop-up bintang 5 Google Maps. Tampilkan kartu produk secara jelas dan tajam.
3. Scene 3 - CTA & Penawaran (8-12 detik): Visual kartu produk dengan acrylic standee di meja kasir elegan, teks harga promo mulai Rp25.000, pemilik kafe tersenyum puas, dan ajakan bertindak (Order sekarang / link di bio).

Keluarkan HANYA JSON murni tanpa markdown wrapper/backtick dengan struktur:
{
  "title": "Judul Konsep Kampanye Video",
  "concept_overview": "Ringkasan konsep iklan dalam 2 kalimat Bahasa Indonesia",
  "scenes": [
    {
      "scene_number": 1,
      "name": "Hook Problem",
      "duration": "0-3s",
      "reference_image_used": "Nama gambar referensi yang cocok (atau 'Stock Cafe Scene')",
      "storyboard_id": "Visual aksi dan suasana adegan dalam Bahasa Indonesia (eksplisit sebut karakter lokal Indonesia)",
      "voiceover_id": "Teks naskah pengisi suara / subtitle dalam Bahasa Indonesia yang luwes",
      "prompt_english": "Ultra-detailed prompt in English for AI video generator. Explicitly include: authentic Indonesian person/actor, Southeast Asian features, camera motion, lighting, 4k photorealistic cinematic commercial 9:16 vertical, shallow depth of field.",
      "negative_prompt": "caucasian, western face, blurry, distorted text, low quality, cartoon, 3d render"
    },
    {
      "scene_number": 2,
      "name": "Product Action & NFC Demo",
      "duration": "3-8s",
      "reference_image_used": "Nama gambar referensi foto produk yang dipakai",
      "storyboard_id": "Tangan pelanggan/kasir Indonesia memegang smartphone mendekatkan ke kartu produk di meja kasir...",
      "voiceover_id": "Cukup tap 1 detik, langsung keluar bintang lima...",
      "prompt_english": "Macro shot, authentic Southeast Asian Indonesian hands holding modern smartphone tapping onto the black matte NFC smart review card placed on wooden cafe counter. Clean seamless tap, phone screen lights up with Google Maps 5-star review modal, cinematic warm cafe lighting, 8k commercial cinematography, vertical 9:16.",
      "negative_prompt": "caucasian, deformed fingers, extra limbs, bad anatomy, glitch, blurry"
    },
    {
      "scene_number": 3,
      "name": "Offer & CTA Climax",
      "duration": "8-12s",
      "reference_image_used": "Nama gambar referensi standee/paket jika ada",
      "storyboard_id": "Tampilan produk kartu dengan standee akrilik dan highlight harga promo mulai 25 ribu...",
      "voiceover_id": "Mulai 25 ribu aja, upgrade toko kamu sekarang! Klik link di bio.",
      "prompt_english": "Hero product commercial showcase, friendly Indonesian cafe owner smiling proudly in background, the smart review card on sleek acrylic standee next to cafe espresso machine, soft bokeh lights, commercial grade slow camera push-in, clean premium aesthetics, 9:16 vertical video.",
      "negative_prompt": "caucasian, low resolution, oversaturated, amateur footage"
    }
  ],
  "full_flow_prompt": "Prompt 1 BLOK langsung dieksekusi oleh AI Video (Google Flow / Veo / Kling). WAJIB diawali kalimat imperatif: 'Generate a continuous 9:16 vertical commercial video now. Do not reply with text or explanations.' Diikuti alur visual adegan secara padat, deskripsi aktor Indonesia otentik, pencahayaan kafe lokal, dan link foto referensi produk.",
  "agent_instructions": {
    "google_flow": "Panduan langkah memasukkan prompt ke flow.google.com atau Kling AI dengan setting cast lokal Indonesia",
    "image_prompt_reference": "Deskripsi prompt gambar awal untuk Midjourney/Flux (Indonesian portrait keyframe)"
  }
}
`;

  const models = [
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-flash-latest',
  ];

  let lastError = null;
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        lastError = new Error(data.error?.message || `Error calling ${model}`);
        continue;
      }

      let textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      textOutput = textOutput.replace(/```json/gi, '').replace(/```/g, '').trim();

      const parsed = JSON.parse(textOutput);
      return res.status(200).json({ success: true, data: parsed, modelUsed: model });
    } catch (err) {
      lastError = err;
    }
  }

  return res.status(500).json({
    success: false,
    error: lastError?.message || 'Gagal menghasilkan prompt video storyboard dari AI',
  });
}
