import { useComposerStore } from '../store/useComposerStore'
import { AlertTriangle } from 'lucide-react'

const LIMITS: Record<string, number> = {
  threads: 500,
  instagram: 2200,
  tiktok: 2200,
  facebook_page: 63206,
}

export function CaptionEditor() {
  const { contentText, setContentText } = useComposerStore()
  const len = contentText.length

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">Caption / Teks</label>
      <textarea
        value={contentText}
        onChange={(e) => setContentText(e.target.value)}
        rows={5}
        placeholder="Tulis caption konten Anda di sini..."
        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring"
        maxLength={63206}
      />
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>{len} karakter</span>
        {len > LIMITS.threads && (
          <span className="flex items-center gap-1 text-amber-500 font-medium">
            <AlertTriangle size={13} /> Threads max {LIMITS.threads}
          </span>
        )}
        {len > LIMITS.instagram && (
          <span className="flex items-center gap-1 text-red-500 font-medium">
            <AlertTriangle size={13} /> IG/TikTok max {LIMITS.instagram}
          </span>
        )}
      </div>
    </div>
  )
}
