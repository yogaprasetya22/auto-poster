import { useCallback } from 'react'
import { Upload, X, Film, Image as ImageIcon } from 'lucide-react'
import { useComposerStore } from '../store/useComposerStore'
import { uploadToGDrive, getVideoDuration } from '@/shared/lib/gdrive'
import { toast } from 'sonner'

const MAX_SIZE = 100 * 1024 * 1024 // 100 MB

export function MediaUploader() {
  const { media, isUploading, setMedia, setUploading } = useComposerStore()

  const handleFile = useCallback(async (file: File) => {
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
      toast.success('Media berhasil diunggah')
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengunggah media')
    } finally {
      setUploading(false)
    }
  }, [setMedia, setUploading])

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  if (media) {
    const isVideo = media.mimeType.startsWith('video/')
    return (
      <div className="flex items-center gap-3 p-3 rounded-md border border-border bg-card">
        {isVideo ? <Film size={20} className="text-blue-500" /> : <ImageIcon size={20} className="text-green-500" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{media.fileName}</p>
          <p className="text-xs text-muted-foreground">
            {(media.fileSize / 1024 / 1024).toFixed(1)} MB
            {media.durationSeconds ? ` · ${media.durationSeconds}s` : ''}
          </p>
        </div>
        <button onClick={() => setMedia(null)} className="p-1 hover:bg-accent rounded">
          <X size={16} />
        </button>
      </div>
    )
  }

  return (
    <label
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      className="flex flex-col items-center justify-center gap-2 p-8 rounded-md border-2 border-dashed border-border cursor-pointer hover:border-ring transition-colors"
    >
      <Upload size={24} className="text-muted-foreground" />
      <span className="text-sm text-muted-foreground">
        {isUploading ? 'Mengunggah...' : 'Seret file atau klik untuk unggah'}
      </span>
      <span className="text-xs text-muted-foreground">MP4, MOV, JPG, PNG — Maks 100 MB</span>
      <input
        type="file"
        accept="video/mp4,video/quicktime,image/jpeg,image/png"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </label>
  )
}
