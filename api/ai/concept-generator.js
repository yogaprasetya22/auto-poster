import { getDynamicKnowledgeContext } from './knowledge.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    productName = 'JAGRES Google Review Card',
    instruction = '', // User prompt / tuningan khusus
    tone = 'commercial', // commercial, edu-viral, storytelling, soft-selling
    targetAudience = 'all', // umkm, cafe-resto, klinik-salon, umum
  } = req.body || {};

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY belum dikonfigurasi di server' });
  }

  const baseKnowledge = await getDynamicKnowledgeContext();

  const prompt = `
Peran Anda adalah AI Creative Strategist & Marketing Director spesialis video konten pendek (TikTok, Instagram Reels, Short Ads).

Konteks Produk & Brand (Gunakan data resmi):
${baseKnowledge}

Parameter Request:
- Produk: ${productName}
- Target Audiens: ${targetAudience} (Konteks pebisnis, UMKM, resto/kafe lokal Indonesia)
- Tone Gaya: ${tone}
- Prompt / Tuningan / Instruksi Khusus User: "${instruction || 'Buatkan konsep iklan video promo yang kuat, memancing rasa penasaran, dan fokus pada manfaat'}"

ATURAN WAJIB LOKAL INDONESIA:
- Karakter & Pemeran: Orang Indonesia asli (wajah lokal, barista/owner kafe lokal, pelanggan lokal).
- Bahasa: 100% Bahasa Indonesia luwes, percakapan sehari-hari yang persuasif (bukan kaku seperti terjemahan).
- Latar: Kafe, resto, atau toko UMKM lokal Indonesia.

Tugas:
Tuliskan 1 Draf Konsep / Brief Iklan (Markdown) yang siap dipakai sebagai acuan Storyboard & Video Prompt. 
Gunakan format markdown yang rapi, padat, dan persuasif.

Struktur Markdown:
### [Judul Konsep Singkat & Menarik]
- **Target**: (Siapa pemilik bisnis / audiens lokal Indonesia yang disasar)
- **Problem**: (Pain point yang diangkat - contoh: resto ramai tapi ulasan Google Maps sepi)
- **Hook Utama**: (Kalimat atau aksi pembuka 3 detik pertama pemeran lokal)
- **Alur Cerita**: (Ringkasan cerita video dengan karakter orang Indonesia)
- **Penawaran / Promo**: (Highlight harga resmi atau promo mulai Rp25.000)
- **Call to Action**: (Ajakan tindakan akhir dalam Bahasa Indonesia)

Berikan HANYA teks markdown tersebut, tanpa basa-basi atau kata pembuka/penutup.
`;

  const models = [
    'gemini-3.5-flash-lite',
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

      let markdownOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      markdownOutput = markdownOutput.trim();

      return res.status(200).json({
        success: true,
        concept: markdownOutput,
        modelUsed: model,
      });
    } catch (err) {
      lastError = err;
    }
  }

  return res.status(500).json({
    success: false,
    error: lastError?.message || 'Gagal menghasilkan konsep video dari AI',
  });
}
