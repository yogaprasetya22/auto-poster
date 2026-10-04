import { useState } from 'react'
import { Sparkles, Copy, Check, Upload, ExternalLink, Film, ChevronRight, X, AlertCircle } from 'lucide-react'
import { uploadToGDrive } from '@/shared/lib/gdrive'
import { toast } from 'sonner'

interface Scene {
  scene_number: number
  name: string
  duration: string
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

export function VideoPromptModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [productName, setProductName] = useState('JAGRES Google Review Card')
  const [customAngle, setCustomAngle] = useState('Promo mulai 25 ribu untuk kafe/resto/klinik agar ulasan Google Maps ramai')
  const [productImageFile, setProductImageFile] = useState<File | null>(null)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('')
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [storyboard, setStoryboard] = useState<StoryboardData | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [copiedKeyframe, setCopiedKeyframe] = useState(false)

  if (!isOpen) return null

  async function handleUploadProductImage(file: File) {
    setIsUploadingImage(true)
    setProductImageFile(file)
    try {
      const gdriveRes = await uploadToGDrive(file)
      // Gunakan URL streaming / download publik agar bisa dibaca langsung oleh agent
      const publicUrl = gdriveRes.streamUrl || `https://drive.usercontent.google.com/download?id=${gdriveRes.fileId}&export=download`
      setUploadedImageUrl(publicUrl)
      toast.success('Mentahan foto produk berhasil diunggah & siap dijadikan referensi AI!')
    } catch (err: any) {
      toast.error('Gagal mengunggah foto produk: ' + err.message)
    } finally {
      setIsUploadingImage(false)
    }
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
          productImageUrl: uploadedImageUrl,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#18181B] rounded-2xl border border-[#E5E7EB] dark:border-[#27272A] shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#E5E7EB] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#202023]">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shadow-xs">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-black dark:text-white">
                  AI Video Storyboard & Agent Prompt Studio
                </h3>
                <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold">
                  Google Flow / Kling / Runway
                </span>
              </div>
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF]">
                Ekstrak naskah 3-scene iklan dari Knowledge Base produk & generate prompt visual fotorealistis siap pakai.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6B7280] hover:text-black dark:hover:text-white hover:bg-[#E5E7EB] dark:hover:bg-[#27272A] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* Section 1: Konfigurasi Produk & Upload Mentahan */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 rounded-xl border border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#121214]">
            <div className="md:col-span-6 space-y-3">
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
                <label className="text-[11px] font-semibold text-black dark:text-white mb-1 block">
                  Angle Iklan / Brief Tambahan
                </label>
                <input
                  type="text"
                  value={customAngle}
                  onChange={(e) => setCustomAngle(e.target.value)}
                  placeholder="Contoh: Promo mulai 25 ribu untuk kafe dan resto..."
                  className="w-full rounded-lg border border-[#D1D5DB] dark:border-[#27272A] bg-white dark:bg-[#18181B] px-3 py-2 text-xs font-medium text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
            </div>

            {/* Upload Mentahan Foto Produk Fisik */}
            <div className="md:col-span-6 flex flex-col justify-between">
              <div>
                <label className="text-[11px] font-semibold text-black dark:text-white mb-1 flex items-center justify-between">
                  <span>Upload Mentahan Gambar Produk (Image Reference)</span>
                  <span className="font-mono text-[9px] text-[#6B7280]">IMAGE-TO-VIDEO</span>
                </label>
                <label className="flex flex-col items-center justify-center p-3.5 rounded-lg border border-dashed border-[#D1D5DB] dark:border-[#3F3F46] bg-white dark:bg-[#18181B] hover:border-black cursor-pointer transition-all">
                  <Upload size={16} className="text-[#6B7280] mb-1" />
                  <span className="text-[11px] font-medium text-black dark:text-white text-center">
                    {isUploadingImage
                      ? 'Mengunggah mentahan ke cloud...'
                      : productImageFile
                      ? productImageFile.name
                      : 'Pilih foto kartu fisik / kemasan produk (JPG, PNG)'}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={isUploadingImage}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleUploadProductImage(f)
                    }}
                  />
                </label>
              </div>

              {uploadedImageUrl && (
                <div className="mt-2 p-2 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[10.5px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <span className="truncate max-w-[280px]">✓ Gambar tersimpan: {productImageFile?.name}</span>
                  <span className="font-mono text-[9px] font-bold">READY</span>
                </div>
              )}

              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerateStoryboard}
                className="mt-3 w-full py-2.5 px-4 rounded-xl bg-black dark:bg-white text-white dark:text-black font-semibold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <div className="size-3.5 border-2 border-white/40 dark:border-black/40 border-t-white dark:border-t-black rounded-full animate-spin" />
                    <span>AI sedang merancang storyboard & prompt...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Generate Storyboard & Agent Prompts</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Section 2: Hasil Storyboard Multi-Scene */}
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
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] p-3.5 flex flex-col justify-between shadow-2xs space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between border-b border-[#F3F4F6] dark:border-[#27272A] pb-1.5">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F3F4F6] dark:bg-[#27272A] text-black dark:text-white">
                            SCENE {scene.scene_number} ({scene.duration})
                          </span>
                          <span className="text-[10.5px] font-semibold text-[#4B5563] dark:text-[#A1A1AA]">
                            {scene.name}
                          </span>
                        </div>

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

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-[#E5E7EB] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#202023] flex items-center justify-between text-[11px]">
          <span className="text-[#6B7280]">
            💡 Tips: Untuk hasil video paling mirip produk fisik, pilih opsi <strong>Image-to-Video</strong> di Kling/Runway dan upload foto kartu produk.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 rounded-lg bg-black dark:bg-white text-white dark:text-black font-semibold text-xs cursor-pointer hover:opacity-90"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
