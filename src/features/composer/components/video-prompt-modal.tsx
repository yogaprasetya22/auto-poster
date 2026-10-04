import { useState } from 'react'
import { Sparkles, Copy, Check, Upload, ExternalLink, X, Plus, Trash2, Image as ImageIcon, Eye, Code2, Wand2, Bot, SlidersHorizontal } from 'lucide-react'
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
  full_flow_prompt?: string
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
  const [copiedMasterFlowPrompt, setCopiedMasterFlowPrompt] = useState(false)

  // AI Concept Generator Agent states (Tuning & Prompt)
  const [showConceptAgent, setShowConceptAgent] = useState(false)
  const [conceptPrompt, setConceptPrompt] = useState('')
  const [conceptTone, setConceptTone] = useState('commercial')
  const [isGeneratingConcept, setIsGeneratingConcept] = useState(false)

  async function handleGenerateConcept() {
    setIsGeneratingConcept(true)
    const toastId = toast.loading('AI Agent sedang merancang konsep brief iklan...')
    try {
      const res = await fetch('/api/ai/concept-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          instruction: conceptPrompt,
          tone: conceptTone,
        }),
      })
      const text = await res.text()
      let data: any = {}
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        throw new Error(`Respons server tidak valid (${res.status}): ${text.slice(0, 100)}`)
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || `Server error (${res.status})`)
      }
      
      setCustomAngle(data.concept)
      setAngleTab('write')
      setShowConceptAgent(false)
      toast.success('✨ Konsep brief berhasil dibuat & diaplikasikan!', { id: toastId })
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghasilkan konsep', { id: toastId })
    } finally {
      setIsGeneratingConcept(false)
    }
  }

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
          {/* Section 1: Konfigurasi Produk & Upload Galeri Multi-Image (Vertical Single Column) */}
          <div className="flex flex-col gap-4 p-4 rounded-xl border border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#121214]">
            {/* Form Input Produk & Brief */}
            <div className="space-y-3">
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
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold text-black dark:text-white">
                      Angle Iklan / Brief Tambahan (Markdown)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowConceptAgent((prev) => !prev)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold border transition-all cursor-pointer ${
                        showConceptAgent
                          ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                          : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/50'
                      }`}
                    >
                      <Sparkles size={11} />
                      <span>{showConceptAgent ? 'Tutup Tuning AI' : '✨ AI Agent Buat Konsep'}</span>
                    </button>
                  </div>
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

                {/* AI Agent Tuning Box (Collapsible) */}
                {showConceptAgent && (
                  <div className="mb-3 p-3 rounded-xl border border-purple-200 dark:border-purple-800/80 bg-purple-50/50 dark:bg-purple-950/20 space-y-2.5 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-purple-900 dark:text-purple-200 font-bold text-[11px]">
                        <Bot size={13} />
                        <span>AI Concept Tuning & Prompt Generator</span>
                      </div>
                      <span className="font-mono text-[9px] text-purple-600 dark:text-purple-400">GEMINI AGENT</span>
                    </div>

                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={conceptPrompt}
                        onChange={(e) => setConceptPrompt(e.target.value)}
                        placeholder="Ketik instruksi/tuningan konsep (contoh: Konsep dramatis resto sepi, fokus ke pemilik salon, dll)..."
                        className="w-full rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-[#18181B] px-3 py-1.5 text-xs text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-600"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !isGeneratingConcept) {
                            e.preventDefault()
                            handleGenerateConcept()
                          }
                        }}
                      />
                    </div>

                    {/* Quick Tuning Presets / Style Persona */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] font-medium mr-1">Pilihan Tuning:</span>
                      {[
                        { label: '🔥 Promo Kilat 25rb', val: 'Fokus promo flash sale kartu review mulai 25 ribu rupiah untuk UMKM' },
                        { label: '⭐ Rating Google Drop', val: 'Cerita kafe sepi pengunjung gara-gara ulasan bintang 3 dan solusi NFC tap 1 detik' },
                        { label: '💼 Peluang Reseller', val: 'Peluang bisnis agen reseller produk smart card keuntungan jutaan rupiah' },
                        { label: '✨ Mewah / Elegan', val: 'Tampilan premium estetis untuk restoran fine-dining & klinik kecantikan' },
                      ].map((preset, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setConceptPrompt(preset.val)}
                          className="px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-900 bg-white dark:bg-[#18181B] text-[10px] text-purple-800 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-950 transition-colors cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1 text-[10.5px]">
                        <span className="text-[#6B7280]">Tone:</span>
                        <select
                          value={conceptTone}
                          onChange={(e) => setConceptTone(e.target.value)}
                          className="rounded border border-[#D1D5DB] dark:border-[#27272A] bg-white dark:bg-[#18181B] px-1.5 py-0.5 text-[10px] font-medium text-black dark:text-white"
                        >
                          <option value="commercial">Komersial & Hook Kuat</option>
                          <option value="storytelling">Storytelling & Empati</option>
                          <option value="edu-viral">Edukasi Viral / Kasus Nyata</option>
                          <option value="soft-selling">Soft Selling Elegan</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        disabled={isGeneratingConcept}
                        onClick={handleGenerateConcept}
                        className="py-1 px-3 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-semibold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {isGeneratingConcept ? (
                          <>
                            <div className="size-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            <span>Menyusun Konsep...</span>
                          </>
                        ) : (
                          <>
                            <Wand2 size={12} />
                            <span>Generate Konsep ke Brief</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

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
            </div>

            {/* Galeri Multi-Image & Upload */}
            <div className="space-y-2.5 pt-1 border-t border-[#E5E7EB] dark:border-[#27272A]">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-black dark:text-white flex items-center gap-1.5">
                  <ImageIcon size={14} />
                  <span>Galeri Mentahan Foto Produk ({productImages.length} Foto)</span>
                </label>
                <span className="font-mono text-[9px] text-[#6B7280]">MULTI IMAGE-TO-VIDEO</span>
              </div>

              {/* Grid Preview Foto Produk */}
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 max-h-[160px] overflow-y-auto p-1">
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
                    {isUploadingImage ? 'Upload...' : 'Tambah'}
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

            {/* Tombol Action Generate di bagian bawah flow */}
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

              {/* MASTER ALL-IN-ONE PROMPT UNTUK GOOGLE FLOW / KLING / RUNWAY */}
              {(() => {
                const masterPromptText = storyboard.full_flow_prompt || [
                  `Generate a photorealistic 9:16 vertical commercial video now for "${productName}". Do not output text, create video directly.`,
                  productImages.length > 0
                    ? `Use image references: ${productImages.map((img, i) => `[Image ${i + 1}: ${img.url}]`).join(' ')}`
                    : '',
                  '',
                  'Visual Sequence & Camera Action:',
                  storyboard.scenes.map((s) => (
                    `Scene ${s.scene_number}: ${s.prompt_english}`
                  )).join(' Then next, '),
                  '',
                  'Character Cast: Authentic Indonesian person with Southeast Asian facial features.',
                  'Cinematography: 4K UHD, 9:16 vertical commercial, 35mm cinematic lens, hyper-realistic cafe lighting, shallow depth of field, steady camera motion.',
                  'Negative: caucasian, western face, blurry, deformed fingers, low resolution, bad anatomy, cartoon.'
                ].filter(Boolean).join('\n')

                return (
                  <div className="p-4 rounded-xl border-2 border-emerald-500/80 dark:border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                          ⚡
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-emerald-950 dark:text-emerald-100">
                              Master All-in-One Prompt (Siap Paste ke Google Flow)
                            </span>
                            <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-bold uppercase">
                              1 Prompt Lengkap
                            </span>
                          </div>
                          <p className="text-[10px] text-emerald-800 dark:text-emerald-300">
                            Mencakup seluruh adegan (Scene 1-3), link image Google Drive, audio/voiceover, dan gaya visual. Tinggal salin & tempel!
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href="https://flow.google.com"
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg text-[10.5px] font-semibold bg-white dark:bg-[#18181B] text-black dark:text-white border border-[#E5E7EB] dark:border-[#27272A] hover:bg-[#F3F4F6] transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <ExternalLink size={11} />
                          <span>Buka Google Flow ↗</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(masterPromptText)
                            setCopiedMasterFlowPrompt(true)
                            toast.success('🚀 Master Prompt Google Flow berhasil disalin! Tinggal paste.')
                            setTimeout(() => setCopiedMasterFlowPrompt(false), 2500)
                          }}
                          className={`px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                            copiedMasterFlowPrompt
                              ? 'bg-emerald-700 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {copiedMasterFlowPrompt ? <Check size={13} strokeWidth={3} /> : <Copy size={13} />}
                          <span>{copiedMasterFlowPrompt ? 'Berhasil Tersalin!' : 'Copy 1 Prompt ke Google Flow'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-white dark:bg-[#121214] border border-emerald-200 dark:border-emerald-800/80 font-mono text-[11px] text-black dark:text-gray-200 leading-relaxed max-h-[150px] overflow-y-auto whitespace-pre-wrap select-all">
                      {masterPromptText}
                    </div>
                  </div>
                )
              })()}

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

                        {/* Thumbnail Preview Referensi Gambar yang Dipakai di Scene Ini & Link Google Drive Publik */}
                        {matchedImg && (
                          <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-[#F9FAFB] dark:bg-[#121214] border border-[#E5E7EB] dark:border-[#27272A]">
                            <div className="flex items-center gap-2">
                              <img
                                src={matchedImg.localPreviewUrl || matchedImg.url}
                                alt={matchedImg.name}
                                className="size-9 rounded-md object-cover shrink-0 border border-[#E5E7EB] dark:border-[#27272A]"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-semibold text-black dark:text-white truncate">
                                  {scene.reference_image_used || matchedImg.name}
                                </p>
                                <p className="font-mono text-[8.5px] text-emerald-600 dark:text-emerald-400">
                                  Match Foto #{Math.min(idx + 1, productImages.length)}
                                </p>
                              </div>
                            </div>

                            {/* Google Drive Published URL */}
                            {matchedImg.url && (
                              <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-[#E5E7EB] dark:border-[#27272A]">
                                <a
                                  href={matchedImg.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[9.5px] font-mono text-blue-600 dark:text-blue-400 hover:underline truncate flex items-center gap-1 min-w-0 flex-1"
                                  title={matchedImg.url}
                                >
                                  <ExternalLink size={10} className="shrink-0" />
                                  <span className="truncate">GDrive Image URL</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(matchedImg.url)
                                    toast.success('Link Google Drive foto berhasil disalin!')
                                  }}
                                  className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer flex items-center gap-1"
                                >
                                  <Copy size={9} />
                                  <span>Salin Link</span>
                                </button>
                              </div>
                            )}
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

              {/* Ringkasan Daftar Link Google Drive Publik yang Siap Dipakai di AI Video Platform */}
              {productImages.length > 0 && (
                <div className="p-3 rounded-xl border border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#121214] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-black dark:text-white flex items-center gap-1.5">
                      <ExternalLink size={12} />
                      <span>Daftar Link Image Google Drive (Published & Akses Publik Langsung):</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const allLinks = productImages.map((img, i) => `Foto ${i + 1} (${img.name}): ${img.url}`).join('\n')
                        navigator.clipboard.writeText(allLinks)
                        toast.success('Semua link Google Drive gambar berhasil disalin!')
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-opacity cursor-pointer flex items-center gap-1"
                    >
                      <Copy size={10} />
                      <span>Salin Semua Link ({productImages.length})</span>
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-[110px] overflow-y-auto">
                    {productImages.map((img, i) => (
                      <div
                        key={img.id}
                        className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] text-[10px]"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="font-mono font-bold text-black dark:text-white shrink-0">#{i + 1}</span>
                          <span className="truncate font-medium text-black dark:text-white shrink-0 max-w-[120px]">{img.name}</span>
                          <a
                            href={img.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 dark:text-blue-400 font-mono hover:underline truncate flex-1 text-[9.5px]"
                          >
                            {img.url}
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(img.url)
                            toast.success(`Link foto #${i + 1} tersalin!`)
                          }}
                          className="shrink-0 p-1 text-[#6B7280] hover:text-black dark:hover:text-white cursor-pointer"
                          title="Salin link ini"
                        >
                          <Copy size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
