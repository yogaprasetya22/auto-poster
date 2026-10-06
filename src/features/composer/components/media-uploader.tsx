import { useState, useCallback } from 'react'
import { Upload, X, Film, Image as ImageIcon, Loader2 } from 'lucide-react'
import { useComposerStore } from '../store/use-composer-store'
import { uploadToGDrive, getVideoDuration } from '@/shared/lib/gdrive'
import { toast } from 'sonner'
import { VideoPromptModal } from './video-prompt-modal'

const MAX_SIZE = 100 * 1024 * 1024 // 100 MB

export function MediaUploader() {
  const {
    media,
    mediaItems,
    postFormat,
    isUploading,
    uploadProgress,
    setPostFormat,
    setMedia,
    addMediaItem,
    removeMediaItem,
    setUploading,
  } = useComposerStore()
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false)

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      let files = Array.from(fileList)
      if (files.length === 0) return

      // Batasi 1 file jika mode SINGLE_IMAGE atau VIDEO
      if (postFormat === 'SINGLE_IMAGE' || postFormat === 'VIDEO') {
        files = [files[0]]
      }

      for (const file of files) {
        if (file.size > MAX_SIZE) {
          toast.error(`"${file.name}" melebihi batas 100 MB`)
          continue
        }

        // Validasi tipe file sesuai format terpilih
        if (postFormat === 'VIDEO' && !file.type.startsWith('video/')) {
          toast.error(`Format mode "Video": File "${file.name}" bukan format video (MP4/MOV).`)
          continue
        }
        if (postFormat === 'SINGLE_IMAGE' && !file.type.startsWith('image/')) {
          toast.error(`Format mode "Single Image": File "${file.name}" bukan gambar (JPG/PNG).`)
          continue
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

          if (postFormat === 'SINGLE_IMAGE' || postFormat === 'VIDEO') {
            setMedia({ ...result, durationSeconds: duration })
          } else {
            addMediaItem({ ...result, durationSeconds: duration })
          }
          toast.success(`"${file.name}" berhasil diunggah!`, { id: toastId })
        } catch (err: any) {
          toast.error(err.message || `Gagal mengunggah "${file.name}"`, { id: toastId })
        } finally {
          setUploading(false, 0)
        }
      }
    },
    [postFormat, setMedia, addMediaItem, setUploading]
  )

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    if (isUploading) return
    if (e.dataTransfer.files?.length) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const items = mediaItems.length > 0 ? mediaItems : media ? [media] : []

  // Konfigurasi format
  const acceptTypes =
    postFormat === 'VIDEO'
      ? 'video/mp4,video/quicktime'
      : postFormat === 'SINGLE_IMAGE'
      ? 'image/jpeg,image/png,image/webp'
      : 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime'

  const formatOptions = [
    { id: 'VIDEO' as const, label: 'Video / Reels', icon: Film, desc: 'Single Video (TikTok, Reels, FB)' },
    { id: 'SINGLE_IMAGE' as const, label: 'Single Image', icon: ImageIcon, desc: '1 Foto (Instagram, FB, Threads)' },
    { id: 'CAROUSEL' as const, label: 'Carousel / Slide', icon: Film, desc: 'Hingga 10 Slide (Instagram, FB)' },
  ]
  const currentFormat = formatOptions.find((f) => f.id === postFormat) || formatOptions[0]

  return (
    <div className="flex flex-col gap-3">
      {/* ── Segmented Tab Switcher untuk Format Postingan (/ponytail) ── */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
          <span>Format Postingan</span>
        </label>
        <div className="grid grid-cols-3 gap-1 p-1 bg-secondary rounded-lg border border-border">
          {formatOptions.map((fmt) => {
            const active = postFormat === fmt.id
            const Icon = fmt.icon
            return (
              <button
                key={fmt.id}
                type="button"
                onClick={() => setPostFormat(fmt.id)}
                className={`py-1.5 px-2 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  active
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={13} />
                <span className="truncate">{fmt.label}</span>
              </button>
            )
          })}
        </div>
        <p className="text-[10px] text-muted-foreground px-0.5">
          {currentFormat.desc}
        </p>
      </div>

      {/* Header bar area media */}
      <div className="flex items-center justify-between pt-1">
        <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
          <span>
            {postFormat === 'CAROUSEL'
              ? `Slide Gallery (${items.length}/10 file)`
              : items.length > 0
              ? 'File Media Terpilih'
              : 'Upload File Media'}
          </span>
        </label>
        <div className="flex items-center gap-2">
          {postFormat === 'VIDEO' && (
            <button
              type="button"
              onClick={() => setIsPromptModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary text-foreground hover:bg-secondary/80 font-medium text-[11px] transition-all cursor-pointer border border-border shadow-xs"
            >
              <span>Prompt Video</span>
            </button>
          )}
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => setMedia(null)}
              className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Hapus Semua
            </button>
          )}
        </div>
      </div>

      <VideoPromptModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
      />

      {/* List thumbnail jika sudah ada media */}
      {items.length > 0 && (
        <div className="flex flex-col gap-1.5 p-2 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between px-1 pb-1 border-b border-border text-[11px]">
            <span className="font-medium text-foreground">
              {items.length > 1 ? `Slide Gallery (${items.length} Item)` : 'Media Aktif'}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">GOOGLE DRIVE CLOUD</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
            {items.map((item, idx) => {
              const isVideo = item.mimeType.startsWith('video/')
              return (
                <div
                  key={item.fileId || idx}
                  className="flex items-center gap-2.5 p-2 rounded-md border border-border bg-secondary/30 relative group"
                >
                  <div className="size-10 rounded bg-secondary flex items-center justify-center shrink-0 overflow-hidden border border-border">
                    {isVideo ? (
                      <Film size={18} className="text-foreground" />
                    ) : item.streamUrl ? (
                      <img src={item.streamUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <ImageIcon size={18} className="text-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pr-6">
                    <p className="text-xs font-semibold text-foreground truncate">{item.fileName}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {(item.fileSize / 1024 / 1024).toFixed(1)} MB
                      {item.durationSeconds ? ` • ${item.durationSeconds}s` : ''}
                      {items.length > 1 ? ` • Slide #${idx + 1}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMediaItem(idx)}
                    className="absolute right-2 top-2 p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded cursor-pointer transition-colors"
                    title="Hapus media ini"
                  >
                    <X size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Dropzone untuk upload */}
      {(postFormat === 'CAROUSEL' ? items.length < 10 : items.length === 0) && (
        <label
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          className={`relative overflow-hidden flex flex-col items-center justify-center gap-2 p-5 rounded-xl border border-dashed transition-all shadow-xs ${
            isUploading
              ? 'border-border bg-secondary/40 cursor-wait pointer-events-none'
              : 'border-border hover:border-foreground/40 bg-card hover:bg-secondary/40 cursor-pointer'
          }`}
        >
          <div className="size-9 rounded-full bg-secondary border border-border flex items-center justify-center text-foreground shadow-xs">
            {isUploading ? (
              <Loader2 size={16} className="animate-spin text-foreground" />
            ) : (
              <Upload size={16} />
            )}
          </div>

          <div className="flex flex-col items-center text-center gap-1 w-full max-w-sm">
            <span className="text-xs font-semibold text-foreground">
              {isUploading
                ? `Mengunggah media ke Google Drive... ${uploadProgress > 0 ? `(${uploadProgress}%)` : ''}`
                : postFormat === 'CAROUSEL' && items.length > 0
                ? '+ Tambahkan Gambar ke Slide Berikutnya'
                : postFormat === 'CAROUSEL'
                ? 'Pilih Gambar (Bisa pilih 2-10 file sekaligus)'
                : postFormat === 'SINGLE_IMAGE'
                ? 'Pilih 1 Gambar (JPG/PNG)'
                : 'Pilih 1 Video (MP4/MOV)'}
            </span>

            {isUploading ? (
              <div className="w-full flex flex-col items-center gap-1 mt-1">
                <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300 rounded-full"
                    style={{ width: `${Math.max(uploadProgress, 8)}%` }}
                  />
                </div>
                <span className="font-mono text-[9px] text-muted-foreground">
                  {uploadProgress < 100
                    ? `Mengirim stream file... ${uploadProgress}%`
                    : 'Sinkronisasi Google Drive...'}
                </span>
              </div>
            ) : (
              <span className="font-mono text-[10px] text-muted-foreground">
                {postFormat === 'VIDEO'
                  ? 'Format: MP4, MOV (Maksimal 100 MB, durasi 3-600 detik)'
                  : postFormat === 'SINGLE_IMAGE'
                  ? 'Format: JPG, PNG, WebP (Maksimal 100 MB)'
                  : 'Format: JPG, PNG, WebP (2 - 10 slide gambar/video)'}
              </span>
            )}
          </div>

          <input
            type="file"
            multiple={postFormat === 'CAROUSEL'}
            accept={acceptTypes}
            className="hidden"
            disabled={isUploading}
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files)
            }}
          />
        </label>
      )}
    </div>
  )
}
