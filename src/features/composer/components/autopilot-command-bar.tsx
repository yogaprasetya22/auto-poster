import { useState } from 'react'
import { Wand2, Loader2, ArrowRight } from 'lucide-react'
import { useComposerStore } from '../store/use-composer-store'
import { toast } from 'sonner'

const QUICK_PRESETS = [
  {
    label: 'Promo Reseller JAGRES',
    prompt: 'Peluang usaha reseller JAGRES Google Review Card modal terjangkau profit optimal',
  },
  {
    label: 'Solusi Rating Toko',
    prompt: 'Edukasi cara menaikkan rating bintang 5 Google Maps tanpa ribet pakai kartu NFC JAGRES',
  },
  {
    label: 'Demonstrasi Sekali Tap',
    prompt: 'Demonstrasi kecanggihan teknologi kartu review NFC JAGRES sekali tempel langsung buka link review',
  },
  {
    label: 'Strategi Ulasan Google',
    prompt: 'Strategi bisnis kenapa ulasan Google Maps mempengaruhi keputusan pembeli',
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
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#111216] text-black dark:text-white p-5 border border-[#E5E7EB] dark:border-[rgba(255,255,255,0.08)] shadow-xs">
      <div className="flex flex-col gap-3">
        {/* Header Tag */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-secondary flex items-center justify-center border border-border">
              <Wand2 className="size-3.5 text-foreground" />
            </div>
            <span className="text-xs font-semibold tracking-wide uppercase text-foreground">
              Studio Asisten Konten
            </span>
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-secondary text-foreground font-medium border border-border">
              MEMORI TERSAMBUNG
            </span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">GENERATOR</span>
        </div>

        {/* Input Bar */}
        <div className="relative flex items-center">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isRunning && handleRunAutopilot()}
            placeholder="Ketik ide postingan (misal: 'Edukasi cara menaikkan rating resto pakai kartu review JAGRES')..."
            className="w-full bg-[#F9FAFB] dark:bg-[#16181D] hover:bg-white dark:hover:bg-[#1C1E24] focus:bg-white dark:focus:bg-[#1C1E24] border border-[#E5E7EB] dark:border-[rgba(255,255,255,0.12)] focus:border-black dark:focus:border-white rounded-xl px-4 py-2.5 text-xs text-black dark:text-white placeholder:text-[#9CA3AF] focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all pr-24 font-normal"
            disabled={isRunning}
          />
          <button
            type="button"
            onClick={() => handleRunAutopilot()}
            disabled={isRunning}
            className="absolute right-1.5 px-3 py-1.5 rounded-lg bg-black text-white dark:bg-white dark:text-black text-xs font-semibold hover:bg-[#262626] dark:hover:bg-[#E5E7EB] transition-all cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
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
          <span className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] font-mono mr-1">Preset Cepat:</span>
          {QUICK_PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isRunning}
              onClick={() => handleRunAutopilot(p.prompt)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-[#F9FAFB] dark:bg-[#16181D] hover:bg-[#F3F4F6] dark:hover:bg-[#262933] border border-[#E5E7EB] dark:border-[rgba(255,255,255,0.08)] hover:border-black dark:hover:border-white text-[#374151] dark:text-[#D1D5DB] hover:text-black dark:hover:text-white transition-all cursor-pointer truncate max-w-full font-medium"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
