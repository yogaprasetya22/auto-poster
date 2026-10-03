import { useState } from 'react'
import { Sparkles, Loader2, ArrowRight } from 'lucide-react'
import { useComposerStore } from '../store/use-composer-store'
import { toast } from 'sonner'

const QUICK_PRESETS = [
  {
    label: '🔥 Promo JAGRES Reseller',
    prompt: 'Promo peluang usaha agen reseller JAGRES Google Review Card modal 1 jutaan profit jutaan',
  },
  {
    label: '⭐ Solusi Rating Toko Sepi',
    prompt: 'Edukasi cara menaikkan rating bintang 5 Google Maps tanpa ribet pakai kartu NFC JAGRES',
  },
  {
    label: '🚀 Fitur Sekali Tap Review',
    prompt: 'Review kecanggihan teknologi kartu review NFC JAGRES sekali tempel langsung buka link review',
  },
  {
    label: '💡 Tips UMKM Ramai Pembeli',
    prompt: 'Strategi psikologi bisnis kenapa ulasan Google Maps mempengaruhi 90 persen keputusan pembeli',
  },
]

export function AutopilotCommandBar() {
  const { setTitle, setContentText, setMedia, setScheduledAt } = useComposerStore()
  const [prompt, setPrompt] = useState('')
  const [isRunning, setIsRunning] = useState(false)

  async function handleRunAutopilot(customText?: string) {
    const textToRun = (customText || prompt).trim()
    if (!textToRun) {
      toast.error('Ketik instruksi konten atau pilih salah satu preset di bawah!')
      return
    }

    setIsRunning(true)
    const toastId = toast.loading('Gemini AI sedang menyusun Naskah Caption & Judul...')

    try {
      // 1. Generate Caption & Title via Gemini 3.5 Flash Lite
      const res = await fetch('/api/ai/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: textToRun }),
      })
      const captionRes = await res.json()

      // Pasang Judul & Caption
      setTitle(textToRun.slice(0, 60))
      if (captionRes.success && captionRes.data?.caption) {
        setContentText(captionRes.data.caption)
      }

      // Set schedule ke waktu optimal (+15 menit dari sekarang)
      setScheduledAt(new Date(Date.now() + 15 * 60000).toISOString())

      toast.success('✨ Autopilot selesai! Siap ditinjau & dijadwalkan.', { id: toastId })
      setPrompt('')
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Gagal menjalankan autopilot', { id: toastId })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white text-black p-5 border border-[#E5E7EB] shadow-xs">
      <div className="flex flex-col gap-3">
        {/* Header Tag */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-[#F3F4F6] flex items-center justify-center border border-[#E5E7EB]">
              <Sparkles className="size-3.5 text-amber-500 animate-pulse" />
            </div>
            <span className="text-xs font-bold tracking-wide uppercase text-black">
              1-Prompt Studio Autopilot
            </span>
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
              KNOWLEDGE CONNECTED
            </span>
          </div>
          <span className="font-mono text-[10px] text-[#9CA3AF]">GEMINI 3.5 FLASH LITE</span>
        </div>

        {/* Input Bar */}
        <div className="relative flex items-center">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isRunning && handleRunAutopilot()}
            placeholder="Ketik ide postingan (misal: 'Edukasi cara menaikkan rating resto pakai kartu review JAGRES')..."
            className="w-full bg-[#F9FAFB] hover:bg-white focus:bg-white border border-[#E5E7EB] focus:border-black rounded-xl px-4 py-2.5 text-xs text-black placeholder:text-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-black transition-all pr-24 font-normal"
            disabled={isRunning}
          />
          <button
            type="button"
            onClick={() => handleRunAutopilot()}
            disabled={isRunning}
            className="absolute right-1.5 px-3 py-1.5 rounded-lg bg-black text-white text-xs font-semibold hover:bg-[#262626] transition-all cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <Loader2 className="size-3 animate-spin" />
                <span>Membuat...</span>
              </>
            ) : (
              <>
                <span>Generate</span>
                <ArrowRight className="size-3" />
              </>
            )}
          </button>
        </div>

        {/* Quick Preset Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] text-[#6B7280] font-mono mr-1">Preset Cepat:</span>
          {QUICK_PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isRunning}
              onClick={() => handleRunAutopilot(p.prompt)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] hover:border-black text-[#374151] hover:text-black transition-all cursor-pointer truncate max-w-full font-medium"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
