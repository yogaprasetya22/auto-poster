import { getDynamicKnowledgeContext } from './knowledge.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    productName = 'JAGRES Google Review Card',
    productImageUrl = '',
    targetPlatform = 'all', // flow.google.com, kling, runway, midjourney
    customAngle = '',
  } = req.body || {};

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY belum dikonfigurasi di server' });
  }

  const baseKnowledge = await getDynamicKnowledgeContext();

  const prompt = `
Peran Anda adalah AI Director & Creative Prompt Engineer spesialis Video Iklan Komersial Generatif (Google Flow / flow.google.com, Kling AI, Runway Gen-3, Luma Dream Machine, Midjourney).

Basis Pengetahuan Resmi Produk & Brand:
${baseKnowledge}

Informasi Produk Kampanye:
- Nama Produk: ${productName}
- URL Mentahan Gambar Produk Asli: ${productImageUrl || '(Gunakan deskripsi fisik kartu PVC NFC hitam matte standar ATM)'}
- Angle Khusus / Brief: ${customAngle || 'Iklan promosi harga promo mulai 25 ribu untuk pemilik resto/kafe/klinik agar ulasan Google Maps ramai'}

Tugas Anda:
Buat Multi-Scene Video Storyboard 3 Bagian (Format Vertikal 9:16 untuk Reels & TikTok) lengkap dengan Prompt AI Generatif yang SANGAT DETAIL, fotorealistis, dan langsung siap di-copy-paste ke agent video (Google Flow / Kling / Runway).

Struktur 3 Bagian:
1. Scene 1 - Hook (0-3 detik): Masalah pemilik bisnis (kafe/resto ramai tapi review Google Maps sepi atau rating kalah dari kompetitor).
2. Scene 2 - Demo Produk (3-8 detik): Close-up tangan kasir atau pelanggan menempelkan smartphone (NFC tap) ke kartu produk ${productName}. Layar smartphone langsung memunculkan pop-up bintang 5 Google Maps. Tampilkan kartu produk secara jelas dan tajam.
3. Scene 3 - CTA & Penawaran (8-12 detik): Visual kartu produk dengan acrylic standee di meja kasir elegan, teks harga promo mulai Rp25.000, dan ajakan bertindak (Order sekarang / link di bio).

Keluarkan HANYA JSON murni tanpa markdown wrapper/backtick dengan struktur:
{
  "title": "Judul Konsep Kampanye Video",
  "concept_overview": "Ringkasan konsep iklan dalam 2 kalimat Bahasa Indonesia",
  "scenes": [
    {
      "scene_number": 1,
      "name": "Hook Problem",
      "duration": "0-3s",
      "storyboard_id": "Visual aksi dan suasana adegan dalam Bahasa Indonesia",
      "voiceover_id": "Teks naskah pengisi suara / subtitle dalam Bahasa Indonesia",
      "prompt_english": "Ultra-detailed prompt in English for AI video generator (Kling/Runway/Google Flow). Include camera motion, lighting, 4k photorealistic cinematic commercial 9:16 vertical, shallow depth of field.",
      "negative_prompt": "blurry, distorted text, low quality, cartoon, 3d render"
    },
    {
      "scene_number": 2,
      "name": "Product Action & NFC Demo",
      "duration": "3-8s",
      "storyboard_id": "Tangan memegang smartphone mendekatkan ke kartu produk di meja kasir...",
      "voiceover_id": "Cukup tap 1 detik, langsung keluar bintang lima...",
      "prompt_english": "Macro shot, customer holding modern smartphone tapping onto the black matte NFC smart review card placed on wooden cafe counter. Clean seamless tap, phone screen lights up with Google Maps 5-star review modal, cinematic warm cafe lighting, 8k commercial cinematography, vertical 9:16.",
      "negative_prompt": "deformed fingers, extra limbs, bad anatomy, glitch, blurry"
    },
    {
      "scene_number": 3,
      "name": "Offer & CTA Climax",
      "duration": "8-12s",
      "storyboard_id": "Tampilan produk kartu dengan standee akrilik dan highlight harga promo mulai 25 ribu...",
      "voiceover_id": "Mulai 25 ribu aja, upgrade toko kamu sekarang! Klik link di bio.",
      "prompt_english": "Hero product commercial showcase, the smart review card on sleek acrylic standee next to cafe espresso machine, soft bokeh lights, commercial grade slow camera push-in, clean premium aesthetics, 9:16 vertical video.",
      "negative_prompt": "low resolution, oversaturated, amateur footage"
    }
  ],
  "agent_instructions": {
    "google_flow": "Panduan langkah memasukkan prompt ke flow.google.com atau Kling AI",
    "image_prompt_reference": "Deskripsi prompt gambar awal untuk Midjourney/Flux jika butuh generate keyframe awal sebelum di-animate"
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
