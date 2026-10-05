import { useState, useCallback } from 'react'
import { Upload, X, Film, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react'
import { useComposerStore } from '../store/use-composer-store'
import { uploadToGDrive, getVideoDuration } from '@/shared/lib/gdrive'
import { toast } from 'sonner'
import { VideoPromptModal } from './video-prompt-modal'

const MAX_SIZE = 100 * 1024 * 1024 // 100 MB

export function MediaUploader() {
  const { media, isUploading, uploadProgress, setMedia, setUploading } = useComposerStore()
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false)

  const handleFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_SIZE) {
        toast.error('Ukuran file melebihi 100 MB')
        return
      }
      setUploading(true, 0)
      const toastId = toast.loading(`Mengunggah "${file.name}" ke Google Drive...`)
      try {
        const result = await uploadToGDrive(file, (pct) => {
          setUploading(true, pct)
        })
        let duration: number | undefined
        if (file.type.startsWith('video/')) {
          duration = await getVideoDuration(file)
        }
        setMedia({ ...result, durationSeconds: duration })
        toast.success('Media berhasil diunggah ke Google Drive!', { id: toastId })
      } catch (err: any) {
        toast.error(err.message || 'Gagal mengunggah media', { id: toastId })
      } finally {
        setUploading(false, 0)
      }
    },
    [setMedia, setUploading]
  )

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    if (isUploading) return
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  if (media) {
    const isVideo = media.mimeType.startsWith('video/')
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-black flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px]">movie</span>
            <span>Media Terpilih (Siap Tayang)</span>
          </label>
          <span className="font-mono text-[10px] text-[#6B7280]">SAVED IN GOOGLE DRIVE</span>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg border border-[#E5E7EB] bg-[#F8F9FA]">
          {isVideo ? <Film size={20} className="text-black" /> : <ImageIcon size={20} className="text-black" />}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-black truncate">{media.fileName}</p>
            <p className="font-mono text-[11px] text-[#6B7280]">
              {(media.fileSize / 1024 / 1024).toFixed(1)} MB
              {media.durationSeconds ? ` • ${media.durationSeconds}s` : ''}
              {' • GOOGLE DRIVE CLOUD'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMedia(null)}
            className="p-1 hover:bg-[#E5E7EB] rounded-md transition-colors cursor-pointer text-[#6B7280] hover:text-black"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-black flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px]">perm_media</span>
          <span>Upload Asset Media (Video / Gambar Asli)</span>
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPromptModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black dark:bg-white text-white dark:text-black font-semibold text-[10.5px] hover:opacity-90 transition-all cursor-pointer shadow-2xs"
          >
            <Sparkles size={12} />
            <span>AI Video Prompt & Storyboard</span>
          </button>
          <span className="font-mono text-[10px] text-[#6B7280]">MANUAL UPLOAD</span>
        </div>
      </div>

      <VideoPromptModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
      />

      <label
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`relative overflow-hidden flex flex-col items-center justify-center gap-2.5 p-8 rounded-xl border border-dashed transition-all shadow-xs ${
          isUploading
            ? 'border-black/40 dark:border-white/40 bg-zinc-50 dark:bg-zinc-900/50 cursor-wait pointer-events-none'
            : 'border-[#D1D5DB] dark:border-[rgba(255,255,255,0.15)] hover:border-black dark:hover:border-white bg-[#FAFAFA] dark:bg-[#16181D] hover:bg-white dark:hover:bg-[#1C1E24] cursor-pointer'
        }`}
      >
        <div className="size-11 rounded-full bg-white dark:bg-zinc-800 border border-[#E5E7EB] dark:border-zinc-700 flex items-center justify-center text-black dark:text-white shadow-xs">
          {isUploading ? (
            <Loader2 size={20} className="animate-spin text-black dark:text-white" />
          ) : (
            <Upload size={18} />
          )}
        </div>

        <div className="flex flex-col items-center text-center gap-1.5 w-full max-w-sm">
          <span className="text-xs font-semibold text-black dark:text-white">
            {isUploading
              ? `Mengunggah media ke Google Drive... ${uploadProgress > 0 ? `(${uploadProgress}%)` : ''}`
              : 'Klik untuk memilih atau seret file media asli ke sini'}
          </span>

          {isUploading ? (
            <div className="w-full flex flex-col items-center gap-1.5 mt-1">
              <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-black dark:bg-white h-full transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(uploadProgress, 8)}%` }}
                />
              </div>
              <span className="font-mono text-[10px] text-[#6B7280]">
                {uploadProgress < 100
                  ? `Mengirim stream file... ${uploadProgress}%`
                  : 'Memproses izin & sinkronisasi Google Drive...'}
              </span>
            </div>
          ) : (
            <>
              <span className="font-mono text-[10px] text-[#6B7280]">
                Format didukung: MP4, MOV, JPG, PNG (Maksimal 100 MB)
              </span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded mt-1">
                ✓ Otomatis tersimpan ke folder Google Drive & terintegrasi ke Reels/TikTok
              </span>
            </>
          )}
        </div>

        <input
          type="file"
          accept="video/mp4,video/quicktime,image/jpeg,image/png"
          className="hidden"
          disabled={isUploading}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />
      </label>
    </div>
  )
}
