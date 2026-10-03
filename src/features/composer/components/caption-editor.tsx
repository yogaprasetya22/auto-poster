import { useState, useRef, useEffect } from 'react'
import { useComposerStore } from '../store/use-composer-store'
import { AlertTriangle, Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const LIMITS: Record<string, number> = {
  threads: 500,
  instagram: 2200,
  tiktok: 2200,
  facebook_page: 63206,
}

export function CaptionEditor() {
  const { contentText, setContentText, title } = useComposerStore()
  const [isGenerating, setIsGenerating] = useState(false)
  const [topicInput, setTopicInput] = useState('')
  const [showPromptInput, setShowPromptInput] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const len = contentText.length

  // Auto-resize textarea height mengikuti jumlah baris konten teks
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.max(88, textareaRef.current.scrollHeight)}px`
    }
  }, [contentText])

  async function handleGenerateCaption() {
    const promptTopic = topicInput.trim() || title.trim() || contentText.trim()
    if (!promptTopic) {
      toast.error('Masukkan topik atau judul konten terlebih dahulu!')
      setShowPromptInput(true)
      return
    }

    setIsGenerating(true)
    try {
      const res = await fetch('/api/ai/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: promptTopic }),
      })
      const data = await res.json()

      if (data.success && data.data?.caption) {
        setContentText(data.data.caption)
        toast.success('Magic Caption berhasil dibuat oleh Gemini AI!')
        setShowPromptInput(false)
        setTopicInput('')
      } else {
        toast.error(data.error || 'Gagal membuat caption AI')
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat memanggil AI')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-black flex items-center gap-1.5" htmlFor="caption-input">
          <span className="material-symbols-outlined text-[15px]">notes</span>
          <span>Naskah Caption & Hashtag</span>
        </label>

        <button
          type="button"
          onClick={() => {
            if (!showPromptInput) {
              setShowPromptInput(true)
            } else {
              handleGenerateCaption()
            }
          }}
          disabled={isGenerating}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black text-white text-[11px] font-medium hover:bg-[#262626] transition-all cursor-pointer shadow-xs disabled:opacity-50"
        >
          {isGenerating ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Sparkles className="size-3 text-amber-300" />
          )}
          <span>{isGenerating ? 'AI Menulis...' : '✨ Magic AI Caption'}</span>
        </button>
      </div>

      {showPromptInput && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-[#F8F9FA] border border-[#E5E7EB]">
          <input
            type="text"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerateCaption()}
            placeholder={title.trim() ? `Topik: "${title}" (atau ketik topik baru)...` : 'Ketik ide/topik caption (contoh: Promo Kopi 50%)...'}
            className="flex-1 bg-white border border-[#E5E7EB] px-2.5 py-1.5 rounded-md text-xs text-black placeholder:text-[#9CA3AF] focus:outline-none focus:border-black"
            autoFocus
          />
          <button
            type="button"
            onClick={handleGenerateCaption}
            disabled={isGenerating}
            className="px-3 py-1.5 rounded-md bg-black text-white text-xs font-semibold hover:bg-[#262626] cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? 'Memproses...' : 'Generate'}
          </button>
          <button
            type="button"
            onClick={() => setShowPromptInput(false)}
            className="px-2 py-1.5 text-xs text-[#6B7280] hover:text-black cursor-pointer"
          >
            Batal
          </button>
        </div>
      )}

      <textarea
        id="caption-input"
        ref={textareaRef}
        value={contentText}
        onChange={(e) => setContentText(e.target.value)}
        rows={3}
        placeholder="Tulis caption konten Anda di sini atau klik '✨ Magic AI Caption' untuk dibuatkan otomatis..."
        className="w-full bg-[#F9FAFB] border border-[#E5E7EB] px-3.5 py-2.5 rounded-lg text-xs text-black placeholder:text-[#9CA3AF] resize-none focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all leading-relaxed overflow-hidden"
        maxLength={63206}
      />

      <div className="flex flex-wrap items-center justify-between text-[11px] text-[#6B7280]">
        <div className="flex items-center gap-3">
          <span className="font-mono">{len} karakter</span>
          {len > LIMITS.threads && (
            <span className="flex items-center gap-1 text-amber-600 font-medium">
              <AlertTriangle size={12} /> Threads max {LIMITS.threads}
            </span>
          )}
          {len > LIMITS.instagram && (
            <span className="flex items-center gap-1 text-red-600 font-medium">
              <AlertTriangle size={12} /> IG/TikTok max {LIMITS.instagram}
            </span>
          )}
        </div>
        <span className="font-mono text-[10px] text-[#9CA3AF]">GEMINI 3.5 FLASH LITE ACTIVE</span>
      </div>
    </div>
  )
}

