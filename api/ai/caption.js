import { getDynamicKnowledgeContext } from '../../server/ai/knowledge.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { topic, tone = 'engaging', platform = 'all' } = req.body || {};
  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    return res.status(400).json({ error: 'Topik konten wajib diisi' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY belum dikonfigurasi di server' });
  }

  const baseContext = await getDynamicKnowledgeContext();

  const prompt = `
Peran Anda adalah Social Media Copywriter profesional dan spesialis konten viral (TikTok, Instagram Reels, Facebook).
Gunakan acuan dasar produk berikut:
${baseContext}

Tolong buatkan caption konten media sosial berdasarkan topik berikut:
"${topic.trim()}"

Target Nada/Tone: ${tone}
Target Format: Vertikal short-form video & post sosial media (Bahasa Indonesia yang luwes, natural, dan menarik perhatian).

Keluarkan HANYA JSON murni tanpa markdown wrapper/backtick dengan struktur:
{
  "caption": "Teks caption lengkap dengan hook pembuka yang kuat, cerita/pesan inti, Call to Action (CTA), dan 3-5 hashtag relevan di akhir.",
  "hook": "Kalimat pembuka 1 baris yang memancing penasaran (hook 3 detik pertama)",
  "hashtags": ["#tag1", "#tag2", "#tag3"]
}
`;

  const models = [
    'gemini-3.8-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-2.5-flash',
    'gemini-flash-latest'
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
        continue; // coba model berikutnya
      }

      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return res.status(200).json({
        success: true,
        modelUsed: model,
        data: parsed,
      });
    } catch (err) {
      lastError = err;
    }
  }

  return res.status(500).json({
    success: false,
    error: lastError?.message || 'Semua model Gemini sedang sibuk. Silakan coba sesaat lagi.',
  });
}
