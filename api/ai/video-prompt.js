import { getDynamicKnowledgeContext } from '../../server/ai/knowledge.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    productName = '',
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
    : productImageUrl || '(Gunakan fisik produk sesuai referensi gambar/deskripsi dari database knowledge)';

  const activeProductLabel = productName || 'Produk Sesuai Database / Brief';

  const prompt = `
Peran Anda: Lead Commercial Film Director & Google Flow (Veo 3.1) Technical Prompt Architect.
Tugas Mutlak: Mengubah referensi produk nyata menjadi prompt video iklan vertikal 9:16 yang ANTI-HALUSINASI, SANGAT TEKNIS, dan FOTOREALISTIS.

BASIS DATA RESMI PRODUK DARI DATABASE (JANGAN MENGARANG NAMA/SPEK/HARGA):
${baseKnowledge}

ASET & BRIEF KAMPANYE:
- Nama Produk: ${activeProductLabel}
- Galeri Foto Mentahan Asli:
${imagesListText}
- Brief / Angle Kampanye: ${customAngle || 'Iklan promosi produk berbasis data resmi knowledge base untuk target pasar lokal Indonesia'}

ATURAN ANTI-HALUSINASI & ANTI-TOLOL UNTUK GOOGLE FLOW / VEO / KLING:
1. JANGAN MEMBUAT PROMPT SEPERTI PUISI ATAU DONGENG. AI video generatif membutuhkan instruksi sinematik teknis:
   - Gerakan Kamera: [Static close-up / Slow dolly push-in / Pan left / 35mm lens / Macro 50mm / Shallow depth of field / f/2.8].
   - Subjek & Kecepatan: Gerakan tubuh dan tangan harus natural, tidak terburu-buru, tanpa gerakan akrobatik.
   - Kontinuitas Objek Fisik: Bentuk fisik produk harus persis seperti foto mentahan dan deskripsi database. Dilarang mendeskripsikan bentuk meleleh, morphing, atau teks melayang tanpa perangkat fisik.
2. CASTING INDONESIA WAJIB & KONSISTEN:
   - Karakter harus explicitly didefinisikan: "authentic Indonesian Southeast Asian male/female, natural warm skin tone, Indonesian facial anatomy".
   - Setting: Konteks toko, kafe, kantor, atau tempat usaha modern lokal Indonesia.
3. TEKNIK IMAGE-TO-VIDEO KEYFRAME:
   - Ingatkan bahwa gambar mentahan produk pengguna HARUS dijadikan First Frame (Image input).
   - Prompt mendeskripsikan transisi gerakan dari foto mentahan tersebut, BUKAN menggambar ulang produk dari nol.

Struktur 3 Bagian:
1. Scene 1 - Hook (0-3 detik): Pemilik usaha atau target persona lokal Indonesia sedang menghadapi masalah nyata yang diselesaikan produk ini.
2. Scene 2 - Action & Demo (3-8 detik): Close-up sudut 45 derajat atau macro shot, interaksi nyata pengguna dengan produk ${activeProductLabel} secara jelas dan tajam.
3. Scene 3 - Showcase & CTA (8-12 detik): Produk tertata rapi di showcase profesional dengan pencahayaan komersial, highlight nilai produk dari database, dan ajakan bertindak (CTA).

Format output WAJIB JSON murni tanpa markdown wrapper/backtick:
{
  "title": "Judul Kampanye Ringkas & Tajam",
  "concept_overview": "Konsep 2 kalimat jelas dalam Bahasa Indonesia",
  "scenes": [
    {
      "scene_number": 1,
      "name": "Hook Problem",
      "duration": "0-3s",
      "reference_image_used": "Nama gambar referensi atau visual pembuka",
      "storyboard_id": "Deskripsi adegan dalam Bahasa Indonesia yang realistis",
      "voiceover_id": "Teks naskah pengisi suara / subtitle dalam Bahasa Indonesia yang luwes",
      "prompt_english": "Cinematic 9:16 vertical video. Authentic Indonesian Southeast Asian person, casual modern outfit. Medium close-up, 50mm lens. Engaging relatable facial expression matching the problem hook. Soft ambient warm lighting, realistic interior. Photorealistic, 4K, realistic skin texture, zero blur.",
      "negative_prompt": "western faces, caucasian, blurry, cartoon, 3d animation, deformed fingers, warped text, rapid jerky camera, morphing objects"
    },
    {
      "scene_number": 2,
      "name": "Product Action & Demo",
      "duration": "3-8s",
      "reference_image_used": "Foto produk asli yang digunakan sebagai keyframe",
      "storyboard_id": "Interaksi langsung dan demo cara kerja produk...",
      "voiceover_id": "Penjelasan solusi instan dari produk...",
      "prompt_english": "Extreme close-up macro shot, 45-degree angle. Natural Southeast Asian Indonesian hands interacting smoothly with the product ${activeProductLabel}. Crisp focus on authentic product details matching reference image, f/2.8 shallow depth of field, natural lighting, high-end commercial aesthetic, 9:16 vertical.",
      "negative_prompt": "extra fingers, mutated hands, distorted product, glitch, floating objects, caucasian skin"
    },
    {
      "scene_number": 3,
      "name": "Offer & CTA Climax",
      "duration": "8-12s",
      "reference_image_used": "Display produk atau foto showcase utama",
      "storyboard_id": "Tampilan produk elegan dan ajakan bertindak...",
      "voiceover_id": "Ajakan pemesanan langsung / CTA...",
      "prompt_english": "Slow smooth dolly-in shot. Hero product showcase of ${activeProductLabel} in premium setting. Soft background bokeh featuring smiling Indonesian actor. Commercial lighting, luxury minimal branding, crisp 4K vertical 9:16 commercial video.",
      "negative_prompt": "oversaturated, amateur video, flickering, unstable frame, western models, cheap distorted look"
    }
  ],
  "full_flow_prompt": "Prompt kontinu Google Flow / Veo yang menggabungkan Hook, Demo aksi produk ${activeProductLabel}, dan Showcase akhir dalam satu continuous single-take vertikal 9:16 fotorealistis.",
  "agent_instructions": {
    "google_flow": "1. Buka flow.google. 2. Pilih mode 'Image to Video' dan unggah foto mentahan produk sebagai Frame 1. 3. Masukkan prompt adegan atau full_flow_prompt. 4. Set format 9:16 vertical.",
    "image_prompt_reference": "Photorealistic commercial keyframe: ${activeProductLabel} in clean professional Indonesian business setting, 85mm lens"
  }
}
`;

  const models = [
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-2.5-flash',
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
