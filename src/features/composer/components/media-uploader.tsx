import { useCallback } from 'react'
import { Upload, X, Film, Image as ImageIcon } from 'lucide-react'
import { useComposerStore } from '../store/use-composer-store'
import { uploadToGDrive, getVideoDuration } from '@/shared/lib/gdrive'
import { toast } from 'sonner'

const MAX_SIZE = 100 * 1024 * 1024 // 100 MB

export function MediaUploader() {
  const { media, isUploading, setMedia, setUploading } = useComposerStore()

  const handleFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_SIZE) {
        toast.error('Ukuran file melebihi 100 MB')
        return
      }
      setUploading(true, 0)
      try {
        const result = await uploadToGDrive(file)
        let duration: number | undefined
        if (file.type.startsWith('video/')) {
          duration = await getVideoDuration(file)
        }
        setMedia({ ...result, durationSeconds: duration })
        toast.success('Media berhasil diunggah ke Google Drive!')
      } catch (err: any) {
        toast.error(err.message || 'Gagal mengunggah media')
      } finally {
        setUploading(false)
      }
    },
    [setMedia, setUploading]
  )

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
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
        <span className="font-mono text-[10px] text-[#6B7280]">MANUAL UPLOAD</span>
      </div>

      <label
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="flex flex-col items-center justify-center gap-2.5 p-8 rounded-xl border border-dashed border-[#D1D5DB] hover:border-black bg-[#FAFAFA] hover:bg-white cursor-pointer transition-all shadow-xs"
      >
        <div className="size-10 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center text-black shadow-xs">
          <Upload size={18} />
        </div>
        <div className="flex flex-col items-center text-center gap-1">
          <span className="text-xs font-semibold text-black">
            {isUploading ? 'Sedang mengunggah media ke Google Drive...' : 'Klik untuk memilih atau seret file media asli ke sini'}
          </span>
          <span className="font-mono text-[10px] text-[#6B7280]">
            Format didukung: MP4, MOV, JPG, PNG (Maksimal 100 MB)
          </span>
          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded mt-1">
            ✓ Otomatis tersimpan ke folder Google Drive & terintegrasi ke Reels/TikTok
          </span>
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
