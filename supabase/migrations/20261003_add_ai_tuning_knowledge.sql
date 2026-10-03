-- ==============================================================================
-- 5. TABEL AI TUNING & KNOWLEDGE BASE (Autonomous Brand Learning)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ai_tuning_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL DEFAULT 'product', -- 'product', 'brand_voice', 'guardrail', 'hook'
    title VARCHAR(150) NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing & RLS Policies
CREATE INDEX IF NOT EXISTS idx_ai_tuning_category ON public.ai_tuning_knowledge(category, is_active);

ALTER TABLE public.ai_tuning_knowledge ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Public development read access for ai_tuning_knowledge" ON public.ai_tuning_knowledge;
    CREATE POLICY "Public development read access for ai_tuning_knowledge" 
    ON public.ai_tuning_knowledge FOR ALL USING (true) WITH CHECK (true);
END $$;

-- Enable Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE ai_tuning_knowledge;

-- Default Seed Data untuk JAGRES Google Review Card
INSERT INTO public.ai_tuning_knowledge (category, title, content, tags) VALUES
(
    'product',
    'Google Review Card (Smart NFC & QR)',
    'Produk kartu pintar akrilik dan PVC untuk membantu bisnis offline mendapatkan review bintang 5 di Google Maps dalam 1 detik hanya dengan 1 tap HP atau scan QR. Bekerja tanpa aplikasi tambahan di semua HP Android & iPhone.',
    ARRAY['google review', 'nfc', 'qr', 'jagres']
),
(
    'product',
    'Paket Starter Reseller JAGRES',
    'Modal awal Rp150.000 sudah mendapatkan produk Google Review Card untuk langsung dijual kembali. Target pasar sangat luas mencakup kafe, resto, barbershop, klinik, dan toko retail.',
    ARRAY['reseller', 'modal 150rb', 'untung tinggi', 'jagres']
),
(
    'brand_voice',
    'Gaya Komunikasi JAGRES',
    'Gunakan gaya bahasa Indonesia yang persuasif, santai, solutif, dan bisnis to-the-point. Hindari kata-kata kaku atau robotik. Selalu fokus pada solusi menaikkan omset dan rating bisnis lokal.',
    ARRAY['tone', 'brand voice', 'persuasif', 'jagres']
),
(
    'guardrail',
    'Batasan Klaim Produk (Anti-Halu)',
    'Dilarang menjanjikan review palsu/bot. Semua ulasan murni dari pelanggan asli yang datang dan melakukan tap. Jangan mengarang harga jika sudah ada angka yang tertera jelas pada poster.',
    ARRAY['anti-halu', 'guardrail', 'etika']
)
ON CONFLICT DO NOTHING;
