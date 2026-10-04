import { useState } from 'react'
import { Sparkles, Copy, Check, Upload, ExternalLink, X, Plus, Trash2, Image as ImageIcon, Eye, Code2 } from 'lucide-react'
import { uploadToGDrive } from '@/shared/lib/gdrive'
import { toast } from 'sonner'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/shared/components/ui/drawer'

interface ProductImageItem {
  id: string
  name: string
  url: string
  localPreviewUrl: string
}

interface Scene {
  scene_number: number
  name: string
  duration: string
  reference_image_used?: string
  storyboard_id: string
  voiceover_id: string
  prompt_english: string
  negative_prompt?: string
}

interface StoryboardData {
  title: string
  concept_overview: string
  scenes: Scene[]
  agent_instructions?: {
    google_flow?: string
    image_prompt_reference?: string
  }
}

// ponytail: Helper parser markdown inline & multi-line ringkas
function parseBriefMarkdown(text: string) {
  const parts: React.ReactNode[] = []
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    const token = match[0]
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-bold text-black dark:text-white">
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic text-[#374151] dark:text-[#D1D5DB]">
          {token.slice(1, -1)}
        </em>
      )
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={match.index} className="px-1 py-0.5 rounded bg-[#F3F4F6] dark:bg-[#27272A] font-mono text-[10.5px] text-[#DC2626] dark:text-[#F87171]">
          {token.slice(1, -1)}
        </code>
      )
    }
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts.length > 0 ? parts : text
}

function renderBriefMarkdown(content: string) {
  const lines = content.split('\n')
  return (
    <div className="space-y-1.5 text-[11.5px] leading-relaxed text-[#1F2937] dark:text-[#E5E7EB]">
      {lines.map((line, idx) => {
        if (!line.trim()) return <div key={idx} className="h-1" />
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1.5">
              <span className="text-black dark:text-white shrink-0 pt-1 text-[7px]">●</span>
              <span className="flex-1">{parseBriefMarkdown(line.trim().replace(/^[-*]\s+/, ''))}</span>
            </div>
          )
        }
        if (line.startsWith('### ')) {
          return <h5 key={idx} className="font-bold text-xs text-black dark:text-white pt-1">{parseBriefMarkdown(line.replace('### ', ''))}</h5>
        }
        if (line.startsWith('## ') || line.startsWith('# ')) {
          return <h4 key={idx} className="font-bold text-[12.5px] text-black dark:text-white pt-1 border-b border-[#E5E7EB] dark:border-[#27272A] pb-0.5">{parseBriefMarkdown(line.replace(/^#+\s+/, ''))}</h4>
        }
        return <p key={idx}>{parseBriefMarkdown(line)}</p>
      })}
    </div>
  )
}

export function VideoPromptModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [productName, setProductName] = useState('JAGRES Google Review Card')
  const [customAngle, setCustomAngle] = useState(
    '### Konsep Video Promo Kilat\n- **Harga Promo**: Mulai Rp25.000 (sekali beli aktif selamanya)\n- **Target**: Kafe, resto, dan klinik kecantikan\n- **Goal**: Dorong ulasan bintang 5 Google Maps tanpa repot ketik manual.'
  )
  const [angleTab, setAngleTab] = useState<'write' | 'preview'>('write')
  const [productImages, setProductImages] = useState<ProductImageItem[]>([])
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [storyboard, setStoryboard] = useState<StoryboardData | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [copiedKeyframe, setCopiedKeyframe] = useState(false)

  async function handleUploadMultipleImages(files: FileList | null) {
    if (!files || files.length === 0) return
    setIsUploadingImage(true)
    const newItems: ProductImageItem[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const localPreviewUrl = URL.createObjectURL(file)
        const gdriveRes = await uploadToGDrive(file)
        const publicUrl = gdriveRes.streamUrl || `https://drive.usercontent.google.com/download?id=${gdriveRes.fileId}&export=download`

        newItems.push({
          id: `img-${Date.now()}-${i}`,
          name: file.name,
          url: publicUrl,
          localPreviewUrl,
        })
      }

      setProductImages((prev) => [...prev, ...newItems])
      toast.success(`${newItems.length} foto referensi produk berhasil diunggah!`)
    } catch (err: any) {
      toast.error('Gagal mengunggah foto: ' + err.message)
    } finally {
      setIsUploadingImage(false)
    }
  }

  function handleRemoveImage(id: string) {
    setProductImages((prev) => prev.filter((img) => img.id !== id))
  }

  async function handleGenerateStoryboard() {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/ai/video-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          customAngle,
          productImages: productImages.map((p) => ({ name: p.name, url: p.url })),
          productImageUrl: productImages[0]?.url || '',
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Gagal menghasilkan storyboard')
      setStoryboard(data.data)
      toast.success('Storyboard & Prompt AI Video 3-Scene siap digunakan!')
    } catch (err: any) {
      toast.error(err.message || 'Gagal memproses prompt storyboard')
    } finally {
      setIsGenerating(false)
    }
  }

  function copyToClipboard(text: string, sceneIdx: number) {
    navigator.clipboard.writeText(text)
    setCopiedIndex(sceneIdx)
    toast.success(`Prompt Scene ${sceneIdx + 1} berhasil disalin!`)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <Drawer open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DrawerContent className="max-w-4xl w-full bg-white dark:bg-[#18181B] rounded-t-2xl md:rounded-t-none md:rounded-l-2xl border-t md:border-t-0 md:border-l border-[#E5E7EB] dark:border-[#27272A] shadow-2xl flex flex-col max-h-[96vh] md:max-h-screen">
        {/* Drawer Header */}
        <DrawerHeader className="p-4 sm:p-5 border-b border-[#E5E7EB] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#202023]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shadow-xs">
                <Sparkles size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DrawerTitle className="text-sm sm:text-base font-bold text-black dark:text-white">
                    AI Video Storyboard & Multi-Image Studio
                  </DrawerTitle>
                  <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold">
                    Google Flow / Kling / Runway
                  </span>
                </div>
                <DrawerDescription className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                  Upload galeri foto produk fisik asli, tinjau preview gambar, dan susun alur video iklan.
                </DrawerDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#6B7280] hover:text-black dark:hover:text-white hover:bg-[#E5E7EB] dark:hover:bg-[#27272A] transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </DrawerHeader>

        {/* Drawer Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Section 1: Konfigurasi Produk & Upload Galeri Multi-Image */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-4 rounded-xl border border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#121214]">
            {/* Form Kiri */}
            <div className="md:col-span-5 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-black dark:text-white mb-1 block">
                  Nama Produk & Brand
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full rounded-lg border border-[#D1D5DB] dark:border-[#27272A] bg-white dark:bg-[#18181B] px-3 py-2 text-xs font-medium text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-black dark:text-white">
                    Angle Iklan / Brief Tambahan (Markdown)
                  </label>
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#F3F4F6] dark:bg-[#27272A] border border-[#E5E7EB] dark:border-[#3F3F46]">
                    <button
                      type="button"
                      onClick={() => setAngleTab('write')}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] transition-all cursor-pointer ${
                        angleTab === 'write'
                          ? 'bg-white dark:bg-[#18181B] text-black dark:text-white font-bold shadow-2xs'
                          : 'text-[#6B7280] hover:text-black dark:hover:text-white'
                      }`}
                    >
                      <Code2 size={11} />
                      <span>Tulis</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAngleTab('preview')}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] transition-all cursor-pointer ${
                        angleTab === 'preview'
                          ? 'bg-white dark:bg-[#18181B] text-black dark:text-white font-bold shadow-2xs'
                          : 'text-[#6B7280] hover:text-black dark:hover:text-white'
                      }`}
                    >
                      <Eye size={11} />
                      <span>Preview</span>
                    </button>
                  </div>
                </div>

                {angleTab === 'write' ? (
                  <div className="space-y-1">
                    <textarea
                      value={customAngle}
                      onChange={(e) => {
                        setCustomAngle(e.target.value)
                        e.target.style.height = 'auto'
                        e.target.style.height = `${Math.min(220, Math.max(80, e.target.scrollHeight))}px`
                      }}
                      onFocus={(e) => {
                        e.target.style.height = 'auto'
                        e.target.style.height = `${Math.min(220, Math.max(80, e.target.scrollHeight))}px`
                      }}
                      placeholder="Tuliskan format Markdown (contoh: **Promo**, - Target: Kafe, ### Angle)..."
                      className="w-full rounded-lg border border-[#D1D5DB] dark:border-[#27272A] bg-white dark:bg-[#18181B] px-3 py-2 text-xs font-mono text-[11.5px] text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black leading-relaxed transition-all resize-y min-h-[85px] max-h-[220px]"
                    />
                    <div className="flex items-center justify-between text-[10px] text-[#6B7280] font-mono">
                      <span>Mendukung: **tebal**, *miring*, `code`, - list</span>
                      <span>{customAngle.length} karakter</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full min-h-[85px] max-h-[220px] rounded-lg border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] p-3 text-xs leading-relaxed overflow-y-auto shadow-2xs">
                    {customAngle.trim() ? (
                      renderBriefMarkdown(customAngle)
                    ) : (
                      <p className="text-[#9CA3AF] italic text-center py-4 text-[11px]">
                        Belum ada teks brief. Ketik di tab "Tulis" untuk melihat preview markdown.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={isGenerating || isUploadingImage}
                onClick={handleGenerateStoryboard}
                className="w-full py-2.5 px-4 rounded-xl bg-black dark:bg-white text-white dark:text-black font-semibold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <div className="size-3.5 border-2 border-white/40 dark:border-black/40 border-t-white dark:border-t-black rounded-full animate-spin" />
                    <span>AI sedang menyusun cerita & prompt...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Generate Storyboard & Agent Prompts</span>
                  </>
                )}
              </button>
            </div>

            {/* Galeri Multi-Image & Preview Kanan */}
            <div className="md:col-span-7 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-black dark:text-white flex items-center gap-1.5">
                  <ImageIcon size={14} />
                  <span>Galeri Mentahan Foto Produk ({productImages.length} Foto)</span>
                </label>
                <span className="font-mono text-[9px] text-[#6B7280]">MULTI IMAGE-TO-VIDEO</span>
              </div>

              {/* Grid Preview Foto Produk */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-[160px] overflow-y-auto p-1">
                {productImages.map((img, idx) => (
                  <div
                    key={img.id}
                    className="group relative aspect-square rounded-xl border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] overflow-hidden shadow-2xs flex flex-col items-center justify-center"
                  >
                    <img
                      src={img.localPreviewUrl || img.url}
                      alt={img.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(img.id)}
                        className="p-1 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
                        title="Hapus foto"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <span className="absolute bottom-1 left-1 font-mono text-[8.5px] px-1 py-0.2 rounded bg-black/70 text-white font-bold backdrop-blur-2xs">
                      #{idx + 1}
                    </span>
                  </div>
                ))}

                {/* Tombol Tambah Foto */}
                <label className="aspect-square rounded-xl border-2 border-dashed border-[#D1D5DB] dark:border-[#3F3F46] hover:border-black dark:hover:border-white bg-white dark:bg-[#18181B] flex flex-col items-center justify-center cursor-pointer transition-all group">
                  <div className="size-7 rounded-full bg-[#F3F4F6] dark:bg-[#27272A] flex items-center justify-center text-[#6B7280] group-hover:text-black dark:group-hover:text-white transition-colors">
                    {isUploadingImage ? (
                      <div className="size-3.5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                    ) : (
                      <Plus size={14} />
                    )}
                  </div>
                  <span className="text-[9.5px] font-semibold text-[#6B7280] group-hover:text-black dark:group-hover:text-white mt-1 text-center px-1">
                    {isUploadingImage ? 'Upload...' : 'Tambah Foto'}
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={isUploadingImage}
                    onChange={(e) => handleUploadMultipleImages(e.target.files)}
                  />
                </label>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-[10.5px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                <span>
                  💡 <strong>Tip Multi-Image</strong>: Unggah foto tampak depan, kartu di standee kasir, & pelanggan tap HP. AI akan mencocokkan tiap adegan dengan foto yang sesuai!
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Hasil Storyboard Multi-Scene dengan Visual Keyframe Tag */}
          {storyboard && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#27272A] pb-2">
                <div>
                  <h4 className="font-bold text-sm text-black dark:text-white">{storyboard.title}</h4>
                  <p className="text-[#6B7280] text-[11px]">{storyboard.concept_overview}</p>
                </div>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black text-white dark:bg-white dark:text-black font-bold">
                  3 SCENES • 9:16 VERTICAL
                </span>
              </div>

              {/* Grid 3 Scenes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {storyboard.scenes.map((scene, idx) => {
                  const isCopied = copiedIndex === idx
                  const matchedImg = productImages[idx] || productImages[0]

                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] p-3.5 flex flex-col justify-between shadow-2xs space-y-3"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between border-b border-[#F3F4F6] dark:border-[#27272A] pb-1.5">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F3F4F6] dark:bg-[#27272A] text-black dark:text-white">
                            SCENE {scene.scene_number} ({scene.duration})
                          </span>
                          <span className="text-[10.5px] font-semibold text-[#4B5563] dark:text-[#A1A1AA]">
                            {scene.name}
                          </span>
                        </div>

                        {/* Thumbnail Preview Referensi Gambar yang Dipakai di Scene Ini */}
                        {matchedImg && (
                          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-[#F9FAFB] dark:bg-[#121214] border border-[#E5E7EB] dark:border-[#27272A]">
                            <img
                              src={matchedImg.localPreviewUrl || matchedImg.url}
                              alt={matchedImg.name}
                              className="size-8 rounded-md object-cover shrink-0 border border-[#E5E7EB]"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[9.5px] font-semibold text-black dark:text-white truncate">
                                Keyframe Ref: {scene.reference_image_used || matchedImg.name}
                              </p>
                              <p className="font-mono text-[8.5px] text-emerald-600 dark:text-emerald-400">
                                Match to Image #{Math.min(idx + 1, productImages.length)}
                              </p>
                            </div>
                          </div>
                        )}

                        <div>
                          <p className="font-semibold text-[11px] text-black dark:text-white mb-0.5">Visual Scene:</p>
                          <p className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF] leading-relaxed">
                            {scene.storyboard_id}
                          </p>
                        </div>

                        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[10.5px] text-amber-900 dark:text-amber-300">
                          <span className="font-bold">Voiceover: </span>"{scene.voiceover_id}"
                        </div>

                        <div>
                          <p className="font-semibold text-[11px] text-black dark:text-white mb-0.5 flex items-center justify-between">
                            <span>Prompt AI Video (English):</span>
                          </p>
                          <div className="p-2 rounded-lg bg-[#F9FAFB] dark:bg-[#121214] border border-[#E5E7EB] dark:border-[#27272A] font-mono text-[10px] text-[#374151] dark:text-[#D1D5DB] leading-relaxed max-h-[110px] overflow-y-auto">
                            {scene.prompt_english}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(scene.prompt_english, idx)}
                        className={`w-full py-1.5 px-3 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isCopied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[#F3F4F6] dark:bg-[#27272A] text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black'
                        }`}
                      >
                        {isCopied ? <Check size={12} strokeWidth={3} /> : <Copy size={12} />}
                        <span>{isCopied ? 'Tersalin!' : `Copy Prompt Scene ${scene.scene_number}`}</span>
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Panduan Agent & Image Prompt Reference */}
              {storyboard.agent_instructions && (
                <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 space-y-2">
                  <div className="flex items-center justify-between text-blue-900 dark:text-blue-300 font-bold text-xs">
                    <span className="flex items-center gap-1.5">
                      <ExternalLink size={13} />
                      <span>Cara Eksekusi ke Google Flow & AI Video Generator:</span>
                    </span>
                    <a
                      href="https://flow.google.com"
                      target="_blank"
                      rel="noreferrer"
                      className="underline font-mono text-[10px] hover:text-blue-600"
                    >
                      Buka flow.google.com ↗
                    </a>
                  </div>
                  <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
                    {storyboard.agent_instructions.google_flow}
                  </p>

                  {storyboard.agent_instructions.image_prompt_reference && (
                    <div className="pt-2 border-t border-blue-200 dark:border-blue-800 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-blue-800 dark:text-blue-300 truncate">
                        Midjourney Keyframe: {storyboard.agent_instructions.image_prompt_reference}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(storyboard.agent_instructions?.image_prompt_reference || '')
                          setCopiedKeyframe(true)
                          toast.success('Prompt Midjourney Keyframe tersalin!')
                          setTimeout(() => setCopiedKeyframe(false), 2000)
                        }}
                        className="shrink-0 text-[10px] font-mono px-2 py-0.5 rounded bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-200 font-semibold cursor-pointer hover:bg-blue-300"
                      >
                        {copiedKeyframe ? 'Tersalin' : 'Copy Keyframe'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <DrawerFooter className="p-3 sm:p-4 border-t border-[#E5E7EB] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#202023] flex flex-row items-center justify-between text-[11px]">
          <span className="text-[#6B7280]">
            💡 Tips: Di Kling AI atau Runway, unggah masing-masing foto referensi di mode <strong>Image-to-Video</strong> untuk menjaga konsistensi bentuk fisik kartu di setiap scene.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 rounded-lg bg-black dark:bg-white text-white dark:text-black font-semibold text-xs cursor-pointer hover:opacity-90"
          >
            Tutup
          </button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
