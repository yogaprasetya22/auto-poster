import { useState, useEffect } from 'react'
import { Sparkles, Copy, Check, Upload, ExternalLink, X, Plus, Trash2, Image as ImageIcon, Eye, Code2, Wand2, Bot, SlidersHorizontal, Database } from 'lucide-react'
import { uploadToGDrive } from '@/shared/lib/gdrive'
import { supabase } from '@/shared/lib/supabase'
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
  const [dbKnowledgeList, setDbKnowledgeList] = useState<any[]>([])
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState<string>('')
  const [productName, setProductName] = useState('')
  const [customAngle, setCustomAngle] = useState('')
  const [angleTab, setAngleTab] = useState<'write' | 'preview'>('write')
  const [productImages, setProductImages] = useState<ProductImageItem[]>([])
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [storyboard, setStoryboard] = useState<StoryboardData | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [copiedKeyframe, setCopiedKeyframe] = useState(false)
  const [copiedMasterFlowPrompt, setCopiedMasterFlowPrompt] = useState(false)

  // Fetch data dinamis dari Supabase saat modal terbuka
  useEffect(() => {
    if (!isOpen) return

    async function loadDynamicKnowledge() {
      try {
        const { data, error } = await supabase
          .from('ai_tuning_knowledge')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: true })

        if (!error && data && data.length > 0) {
          setDbKnowledgeList(data)
          // Default pilih item pertama jika belum ada yang terpilih
          const defaultItem = data.find((k) => k.category === 'product') || data[0]
          if (defaultItem) {
            const cleanTitle = (defaultItem.title || '').replace(/^KATEGORI:\s*/i, '').replace(/\s*\(.*\)$/, '').trim()
            setSelectedKnowledgeId(defaultItem.id)
            setProductName(cleanTitle || defaultItem.title)
            setCustomAngle(defaultItem.content || '')
          }
        } else {
          // Cek fallback audit_logs
          const { data: auditData } = await supabase
            .from('audit_logs')
            .select('response_body')
            .eq('event_type', 'AI_KNOWLEDGE_STORE')
            .order('id', { ascending: false })
            .limit(1)

          if (auditData && auditData.length > 0 && Array.isArray(auditData[0]?.response_body?.items)) {
            const items = auditData[0].response_body.items
            setDbKnowledgeList(items)
            if (items[0]) {
              const cleanTitle = (items[0].title || '').replace(/^KATEGORI:\s*/i, '').replace(/\s*\(.*\)$/, '').trim()
              setSelectedKnowledgeId(items[0].id || 'item-0')
              setProductName(cleanTitle || items[0].title)
              setCustomAngle(items[0].content || '')
            }
          }
        }
      } catch (err) {
        console.warn('Gagal memuat knowledge dinamis:', err)
      }
    }

    loadDynamicKnowledge()
  }, [isOpen])

  function handleSelectKnowledge(id: string) {
    setSelectedKnowledgeId(id)
    const found = dbKnowledgeList.find((k) => (k.id || k.title) === id)
    if (found) {
      const cleanTitle = (found.title || '').replace(/^KATEGORI:\s*/i, '').replace(/\s*\(.*\)$/, '').trim()
      setProductName(cleanTitle || found.title)
      setCustomAngle(found.content || '')
      toast.success(`Produk dipilih: ${cleanTitle || found.title}`)
    }
  }

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
      <DrawerContent className="max-w-[80%] w-full bg-white dark:bg-[#18181B] rounded-t-2xl md:rounded-t-none md:rounded-l-2xl border-t md:border-t-0 md:border-l border-[#E5E7EB] dark:border-[#27272A] shadow-2xl flex flex-col max-h-[96vh] md:max-h-screen">
        {/* Drawer Header */}
        <DrawerHeader className="p-4 sm:p-5 border-b border-[#E5E7EB] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#202023] shrink-0">
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
                    Google Flow • Kling • Runway
                  </span>
                </div>
                <DrawerDescription className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                  Pilih produk dari database, unggah foto mentahan, dan dapatkan alur video iklan 9:16 siap pakai.
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

        {/* Drawer Body: 2 Kolom Desktop (Kiri: Input & Aset | Kanan: Live Output & Action) */}
        <div className="p-4 sm:p-6 overflow-y-auto text-xs flex-1 grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
          {/* KOLOM KIRI (5 Kolom): Form Konfigurasi Produk & Upload Mentahan */}
          <div className="md:col-span-5 space-y-4">
            <div className="p-4 rounded-xl border border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#121214] space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] dark:border-[#27272A]">
                <span className="font-bold text-xs text-black dark:text-white flex items-center gap-1.5">
                  <Database size={13} className="text-emerald-600 dark:text-emerald-400" />
                  <span>1. Sumber Produk (Database)</span>
                </span>
                <span className="font-mono text-[9px] text-[#6B7280]">SUPABASE SYNC</span>
              </div>

              {/* Dropdown Produk Dinamis */}
              {dbKnowledgeList.length > 0 && (
                <div>
                  <label className="text-[10.5px] font-medium text-[#6B7280] dark:text-[#9CA3AF] mb-1 block">
                    Pilih Item Knowledge:
                  </label>
                  <select
                    value={selectedKnowledgeId}
                    onChange={(e) => handleSelectKnowledge(e.target.value)}
                    className="w-full rounded-lg border border-[#D1D5DB] dark:border-[#27272A] bg-white dark:bg-[#18181B] px-2.5 py-1.5 text-xs font-semibold text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black cursor-pointer truncate"
                  >
                    {dbKnowledgeList.map((k) => (
                      <option key={k.id || k.title} value={k.id || k.title}>
                        [{k.category ? k.category.toUpperCase() : 'PRODUK'}] {(k.title || '').replace(/^KATEGORI:\s*/i, '')}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10.5px] font-medium text-[#6B7280] dark:text-[#9CA3AF] mb-1 block">
                  Nama Produk & Brand:
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Ketik atau pilih dari database di atas..."
                  className="w-full rounded-lg border border-[#D1D5DB] dark:border-[#27272A] bg-white dark:bg-[#18181B] px-3 py-1.5 text-xs font-medium text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              {/* Brief & Tuning Area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10.5px] font-medium text-[#6B7280] dark:text-[#9CA3AF]">
                    Brief & Konsep Iklan:
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowConceptAgent((prev) => !prev)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all cursor-pointer ${
                        showConceptAgent
                          ? 'bg-foreground text-background border-foreground shadow-2xs'
                          : 'bg-secondary text-foreground border-border hover:bg-secondary/80'
                      }`}
                    >
                      <Sparkles size={10} />
                      <span>{showConceptAgent ? 'Tutup Tuning' : 'Tuning Sudut'}</span>
                    </button>
                    <div className="flex items-center p-0.5 rounded-md bg-[#F3F4F6] dark:bg-[#27272A] border border-[#E5E7EB] dark:border-[#3F3F46]">
                      <button
                        type="button"
                        onClick={() => setAngleTab('write')}
                        className={`px-1.5 py-0.5 rounded text-[9.5px] ${angleTab === 'write' ? 'bg-white dark:bg-[#18181B] font-bold shadow-2xs' : 'text-[#6B7280]'}`}
                      >
                        Tulis
                      </button>
                      <button
                        type="button"
                        onClick={() => setAngleTab('preview')}
                        className={`px-1.5 py-0.5 rounded text-[9.5px] ${angleTab === 'preview' ? 'bg-white dark:bg-[#18181B] font-bold shadow-2xs' : 'text-[#6B7280]'}`}
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                </div>

                {/* AI Tuning Box */}
                {showConceptAgent && (
                  <div className="mb-2.5 p-2.5 rounded-lg border border-border bg-secondary/30 space-y-2">
                    <input
                      type="text"
                      value={conceptPrompt}
                      onChange={(e) => setConceptPrompt(e.target.value)}
                      placeholder="Instruksi sudut pandang (misal: Diskon khusus resto sepi)..."
                      className="w-full rounded border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none"
                    />
                    <div className="flex items-center justify-between">
                      <select
                        value={conceptTone}
                        onChange={(e) => setConceptTone(e.target.value)}
                        className="rounded border border-border bg-background px-1.5 py-0.5 text-[9.5px] text-foreground"
                      >
                        <option value="commercial">Komersial & Hook Kuat</option>
                        <option value="storytelling">Storytelling & Empati</option>
                        <option value="edu-viral">Edukasi Ringkas</option>
                        <option value="soft-selling">Soft Selling</option>
                      </select>
                      <button
                        type="button"
                        disabled={isGeneratingConcept}
                        onClick={handleGenerateConcept}
                        className="py-1 px-2.5 rounded bg-foreground text-background font-semibold text-[10px] flex items-center gap-1 cursor-pointer disabled:opacity-50 hover:opacity-90 transition-opacity"
                      >
                        <Wand2 size={11} />
                        <span>Terapkan</span>
                      </button>
                    </div>
                  </div>
                )}

                {angleTab === 'write' ? (
                  <textarea
                    value={customAngle}
                    onChange={(e) => setCustomAngle(e.target.value)}
                    placeholder="Tuliskan format ringkas brief promosi..."
                    className="w-full rounded-lg border border-[#D1D5DB] dark:border-[#27272A] bg-white dark:bg-[#18181B] px-3 py-2 text-xs font-mono text-[11px] text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black resize-y min-h-[90px] max-h-[180px]"
                  />
                ) : (
                  <div className="w-full min-h-[90px] max-h-[180px] rounded-lg border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] p-2.5 text-xs overflow-y-auto">
                    {customAngle.trim() ? renderBriefMarkdown(customAngle) : <span className="text-[#9CA3AF] italic text-[11px]">Belum ada brief.</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Galeri Mentahan Foto Produk */}
            <div className="p-4 rounded-xl border border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#121214] space-y-3">
              <div className="flex items-center justify-between pb-1.5 border-b border-[#E5E7EB] dark:border-[#27272A]">
                <label className="text-xs font-bold text-black dark:text-white flex items-center gap-1.5">
                  <ImageIcon size={13} />
                  <span>2. Foto Produk Asli ({productImages.length})</span>
                </label>
                <span className="font-mono text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">KEYFRAME 1-TO-1</span>
              </div>

              {/* Grid Preview Foto */}
              <div className="grid grid-cols-4 gap-2 max-h-[130px] overflow-y-auto p-0.5">
                {productImages.map((img, idx) => (
                  <div
                    key={img.id}
                    className="group relative aspect-square rounded-lg border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] overflow-hidden flex flex-col items-center justify-center shadow-2xs"
                  >
                    <img
                      src={img.localPreviewUrl || img.url}
                      alt={img.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(img.id)}
                        className="p-1 rounded-full bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                    <span className="absolute bottom-1 left-1 font-mono text-[8px] px-1 py-0.2 rounded bg-black/70 text-white font-bold">
                      #{idx + 1}
                    </span>
                  </div>
                ))}

                {/* Upload Button */}
                <label className="aspect-square rounded-lg border-2 border-dashed border-[#D1D5DB] dark:border-[#3F3F46] hover:border-black dark:hover:border-white bg-white dark:bg-[#18181B] flex flex-col items-center justify-center cursor-pointer transition-all">
                  <Plus size={15} className="text-[#6B7280]" />
                  <span className="text-[9px] font-semibold text-[#6B7280] mt-0.5">
                    {isUploadingImage ? '...' : '+ Foto'}
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

              {/* Trigger Button */}
              <button
                type="button"
                disabled={isGenerating || isUploadingImage}
                onClick={handleGenerateStoryboard}
                className="w-full py-2.5 px-4 rounded-xl bg-black dark:bg-white text-white dark:text-black font-semibold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all cursor-pointer shadow-xs disabled:opacity-50 mt-1"
              >
                {isGenerating ? (
                  <>
                    <div className="size-3.5 border-2 border-white/40 dark:border-black/40 border-t-white dark:border-t-black rounded-full animate-spin" />
                    <span>AI Meracik Prompt Sinematik...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Generate Storyboard & Prompt</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* KOLOM KANAN (7 Kolom): Live Preview & Output Google Flow Prompt */}
          <div className="md:col-span-7 space-y-4">
            {!storyboard && !isGenerating && (
              <div className="h-full min-h-[380px] rounded-xl border border-dashed border-[#D1D5DB] dark:border-[#27272A] bg-[#FAFAFA]/70 dark:bg-[#121214]/50 flex flex-col items-center justify-center p-6 text-center text-[#6B7280] space-y-2">
                <div className="size-12 rounded-2xl bg-[#F3F4F6] dark:bg-[#1E1E22] flex items-center justify-center text-black dark:text-white">
                  <Sparkles size={22} />
                </div>
                <h5 className="font-bold text-xs text-black dark:text-white">Hasil Storyboard Akan Tampil di Sini</h5>
                <p className="text-[11px] max-w-sm text-[#6B7280] dark:text-[#9CA3AF]">
                  Pilih produk di sebelah kiri, unggah foto produk mentahan, lalu klik tombol Generate untuk merender alur adegan dan Master Prompt Google Flow.
                </p>
              </div>
            )}

            {isGenerating && (
              <div className="h-full min-h-[380px] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="size-10 border-3 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin" />
                <h5 className="font-bold text-xs text-black dark:text-white">Sedang Menghubungi Gemini 3.8 Flash...</h5>
                <p className="text-[11px] text-[#6B7280] max-w-xs">
                  Menganalisis fisik produk asli, menyusun kontinuitas kamera, dan meracik prompt fotorealistis vertikal 9:16.
                </p>
              </div>
            )}

            {storyboard && (
              <div className="space-y-4">
                {/* Master Google Flow Box (Utama) */}
                {(() => {
                  const masterPromptText = storyboard.full_flow_prompt || [
                    `Generate a photorealistic 9:16 vertical commercial video now for "${productName}". Do not output text, create video directly.`,
                    productImages.length > 0
                      ? `Use image references: ${productImages.map((img, i) => `[Image ${i + 1}: ${img.url}]`).join(' ')}`
                      : '',
                    '',
                    'Visual Sequence & Camera Action:',
                    storyboard.scenes.map((s) => `Scene ${s.scene_number}: ${s.prompt_english}`).join(' Then next, '),
                    '',
                    'Character Cast: Authentic Indonesian person with Southeast Asian facial features.',
                    'Cinematography: 4K UHD, 9:16 vertical commercial, 35mm cinematic lens, hyper-realistic cafe lighting, shallow depth of field, steady camera motion.',
                    'Negative: caucasian, western face, blurry, deformed fingers, low resolution, bad anatomy, cartoon.'
                  ].filter(Boolean).join('\n')

                  return (
                    <div className="p-4 rounded-xl border-2 border-emerald-500/80 dark:border-emerald-500/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                            ⚡
                          </div>
                          <div>
                            <span className="font-bold text-xs text-emerald-950 dark:text-emerald-100 block">
                              Master Prompt (Siap Paste ke Google Flow)
                            </span>
                            <span className="text-[10px] text-emerald-800 dark:text-emerald-300">
                              Otomatis menggabungkan seluruh adegan, cast lokal, dan setting kamera.
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <a
                            href="https://flow.google.com"
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 rounded-md text-[10px] font-semibold bg-white dark:bg-[#18181B] text-black dark:text-white border border-[#E5E7EB] dark:border-[#27272A] hover:bg-[#F3F4F6] flex items-center gap-1 cursor-pointer"
                          >
                            <ExternalLink size={10} />
                            <span>Buka Flow ↗</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(masterPromptText)
                              setCopiedMasterFlowPrompt(true)
                              toast.success('🚀 Master Prompt Google Flow berhasil disalin!')
                              setTimeout(() => setCopiedMasterFlowPrompt(false), 2000)
                            }}
                            className={`px-3 py-1 rounded-md text-[10.5px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              copiedMasterFlowPrompt ? 'bg-emerald-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                          >
                            {copiedMasterFlowPrompt ? <Check size={12} /> : <Copy size={12} />}
                            <span>{copiedMasterFlowPrompt ? 'Tersalin!' : 'Copy Prompt'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white dark:bg-[#121214] border border-emerald-200 dark:border-emerald-800 font-mono text-[10.5px] leading-relaxed max-h-[140px] overflow-y-auto whitespace-pre-wrap select-all text-black dark:text-gray-200">
                        {masterPromptText}
                      </div>
                    </div>
                  )
                })()}

                {/* 3 Scene Cards */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-black dark:text-white">Rincian Per Adegan (3 Scenes):</span>
                    <span className="font-mono text-[9px] text-[#6B7280]">FORMAT 9:16 VERTICAL</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {storyboard.scenes.map((scene, idx) => {
                      const isCopied = copiedIndex === idx
                      return (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] space-y-2 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F3F4F6] dark:bg-[#27272A] text-black dark:text-white">
                              SCENE {scene.scene_number} ({scene.duration}) • {scene.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(scene.prompt_english, idx)}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F3F4F6] dark:bg-[#27272A] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              {isCopied ? <Check size={10} /> : <Copy size={10} />}
                              <span>{isCopied ? 'Tersalin' : 'Copy'}</span>
                            </button>
                          </div>

                          <div className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF]">
                            <strong className="text-black dark:text-white">Aksi:</strong> {scene.storyboard_id}
                          </div>

                          <div className="p-1.5 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 text-[10.5px]">
                            <strong>Voiceover:</strong> "{scene.voiceover_id}"
                          </div>

                          <div className="p-2 rounded bg-[#F9FAFB] dark:bg-[#121214] border border-[#E5E7EB] dark:border-[#27272A] font-mono text-[9.5px] text-[#374151] dark:text-[#D1D5DB] max-h-[70px] overflow-y-auto">
                            {scene.prompt_english}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <DrawerFooter className="p-3 sm:p-4 border-t border-[#E5E7EB] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#202023] flex flex-row items-center justify-between text-[11px] shrink-0">
          <span className="text-[#6B7280]">
            💡 Tips: Di Google Flow atau Kling AI, masukkan foto mentahan sebagai <strong>Keyframe 1 (Image-to-Video)</strong> agar bentuk fisik produk tidak berubah.
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
