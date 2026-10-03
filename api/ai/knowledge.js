/**
 * AI TUNING & KNOWLEDGE ENGINE
 * Prinsip: Ponytail (Lean, Zero Hardcode, 100% Database-Driven, In-Memory Cached)
 * Seluruh data pengetahuan diambil murni dari tabel Supabase `ai_tuning_knowledge`.
 */

import { createClient } from "@supabase/supabase-js";

// In-Memory Cache Global (Sub-millisecond RAM Cache dengan TTL 5 Menit)
let cachedKnowledgeString = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

function getSupabaseClient() {
    const supabaseUrl =
        process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY ||
        "";
    if (!supabaseUrl || !supabaseKey) return null;
    return createClient(supabaseUrl, supabaseKey);
}

/**
 * Invalidate cache saat data diubah melalui UI atau webhook
 */
export function invalidateKnowledgeCache() {
    cachedKnowledgeString = null;
    lastCacheTime = 0;
}

/**
 * Mengambil Base Knowledge 100% dari Database Supabase (Cached In-Memory)
 */
export async function getDynamicKnowledgeContext(additionalInstructions = "") {
    const now = Date.now();

    // 1. Return dari RAM Cache jika masih dalam window TTL (< 5 menit)
    if (cachedKnowledgeString && now - lastCacheTime < CACHE_TTL_MS) {
        return additionalInstructions
            ? `${cachedKnowledgeString}\nCatatan Tambahan: ${additionalInstructions}`.trim()
            : cachedKnowledgeString;
    }

    // 2. Fetch 100% dari tabel database Supabase: ai_tuning_knowledge
    const supabase = getSupabaseClient();
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from("ai_tuning_knowledge")
                .select("category, title, content")
                .eq("is_active", true)
                .order("created_at", { ascending: true });

            if (!error && data && data.length > 0) {
                const entries = data
                    .map(
                        (item) =>
                            `- [${item.category.toUpperCase()}] ${item.title}: ${item.content}`,
                    )
                    .join("\n");

                cachedKnowledgeString = `
Konteks Pengetahuan Resmi (Tersinkronisasi 100% dari Database Cloud):
${entries}
- Aturan Mutlak: JANGAN MENGARANG ATAU HALUSINASI. Selalu gunakan fakta dan angka resmi di atas atau yang tertera pada produk.
`.trim();
                lastCacheTime = now;

                return additionalInstructions
                    ? `${cachedKnowledgeString}\nCatatan Tambahan: ${additionalInstructions}`.trim()
                    : cachedKnowledgeString;
            }

            // Fallback: Baca dari storage audit_logs jika ai_tuning_knowledge belum dibuat
            const { data: auditData } = await supabase
                .from("audit_logs")
                .select("response_body")
                .eq("event_type", "AI_KNOWLEDGE_STORE")
                .order("id", { ascending: false })
                .limit(1);

            if (auditData && auditData.length > 0 && Array.isArray(auditData[0]?.response_body?.items)) {
                const items = auditData[0].response_body.items;
                const entries = items
                    .map(
                        (item) =>
                            `- [${(item.category || "GENERAL").toUpperCase()}] ${item.title}: ${item.content}`,
                    )
                    .join("\n");

                cachedKnowledgeString = `
Konteks Pengetahuan Resmi (Tersinkronisasi 100% dari Database Cloud):
${entries}
- Aturan Mutlak: JANGAN MENGARANG ATAU HALUSINASI. Selalu gunakan fakta dan angka resmi di atas atau yang tertera pada produk.
`.trim();
                lastCacheTime = now;

                return additionalInstructions
                    ? `${cachedKnowledgeString}\nCatatan Tambahan: ${additionalInstructions}`.trim()
                    : cachedKnowledgeString;
            }
        } catch (err) {
            console.warn(
                "Gagal membaca tabel ai_tuning_knowledge:",
                err.message,
            );
        }
    }

    // 3. Jika tabel kosong sama sekali, kembalikan instruksi dasar universal (bukan hardcoded brand)
    const defaultBase = `
                            Konteks Pengetahuan:
                            - Mode: Brand Promotion & Content Scheduling
                            - Aturan Mutlak: JANGAN MENGARANG ATAU HALUSINASI. Baca teks, harga, dan fitur asli secara presisi dari materi yang diberikan.
                            `.trim();

    return additionalInstructions
        ? `${defaultBase}\nCatatan Tambahan: ${additionalInstructions}`.trim()
        : defaultBase;
}
