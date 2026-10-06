import { useState } from 'react'
import { useComposerStore } from './store/use-composer-store'
import { MediaUploader } from './components/media-uploader'
import { CaptionEditor } from './components/caption-editor'
import { SchedulePicker } from './components/schedule-picker'
import { AccountSelector } from './components/account-selector'
import { PhoneSimulator } from './components/phone-simulator'
import { supabase } from '@/shared/lib/supabase'
import { toast } from 'sonner'
import { Loader2, X, ArrowRight, Wand2, Bookmark, Plus } from 'lucide-react'
import { composerFormSchema } from './validation'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/shared/components/ui/drawer'

const QUICK_AI_PRESETS = [
  {
    label: 'Promo Reseller',
    prompt: 'Peluang kemitraan agen reseller JAGRES Google Review Card modal terjangkau profit optimal',
  },
  {
    label: 'Solusi Rating Toko',
    prompt: 'Edukasi cara menaikkan rating bintang 5 Google Maps tanpa ribet pakai kartu NFC JAGRES',
  },
  {
    label: 'Fitur Sekali Tap Review',
    prompt: 'Demonstrasi teknologi kartu review NFC JAGRES sekali tempel langsung buka link review',
  },
  {
    label: 'Strategi Ulasan Google',
    prompt: 'Analisis bisnis mengapa ulasan Google Maps mempengaruhi keputusan pembelian konsumen',
  },
]

export function ComposerPage() {
  const {
    title,
    contentText,
    media,
    mediaItems,
    mediaType,
    scheduledAt,
    targetAccountIds,
    isSimulationMode,
    editingDraftId,
    setTitle,
    setContentText,
    setScheduledAt,
    setSimulationMode,
    setEditingDraftId,
    reset,
  } = useComposerStore()

  const [submitting, setSubmitting] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [activePreviewChannel, setActivePreviewChannel] = useState<'tiktok' | 'reels' | 'threads' | 'facebook'>('tiktok')
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false)
  const [aiPromptInput, setAiPromptInput] = useState('')
  const [isAiRunning, setIsAiRunning] = useState(false)

  const canSaveDraft = Boolean(title.trim() || contentText.trim() || media || mediaItems.length > 0) && !savingDraft && !submitting
  const canSubmit = contentText.trim().length > 0 && scheduledAt && targetAccountIds.length > 0 && !submitting && !savingDraft

  async function handleRunAiAutopilot(customText?: string) {
    const textToRun = (customText || aiPromptInput).trim()
    if (!textToRun) {
      toast.error('Ketik instruksi konten atau pilih salah satu preset!')
      return
    }

    setIsAiRunning(true)
    const toastId = toast.loading('Gemini AI sedang menyusun Naskah Caption & Judul...')

    try {
      const res = await fetch('/api/ai/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: textToRun }),
      })
      const captionRes = await res.json()

      setTitle(textToRun.slice(0, 60))
      if (captionRes.success && captionRes.data?.caption) {
        setContentText(captionRes.data.caption)
      }

      setScheduledAt(new Date(Date.now() + 15 * 60000).toISOString())
      toast.success('✨ Naskah AI berhasil dibuat dan disuntikkan ke form!', { id: toastId })
      setAiPromptInput('')
      setIsAiDrawerOpen(false)
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghasilkan konten via AI', { id: toastId })
    } finally {
      setIsAiRunning(false)
    }
  }

  // Simpan sebagai draft (validasi longgar: cukup judul, caption, atau media)
  async function handleSaveDraft() {
    if (!canSaveDraft) {
      toast.error('Isi minimal judul, caption, atau unggah media untuk disimpan sebagai draft!')
      return
    }

    setSavingDraft(true)
    try {
      const items = mediaItems.length > 0 ? mediaItems : media ? [media] : []
      const primaryMedia = items[0] || media || null

      const payload = {
        title: title.trim() || null,
        content_text: contentText.trim() || '',
        media_type: mediaType,
        gdrive_file_id: primaryMedia?.fileId || null,
        gdrive_stream_url: primaryMedia?.streamUrl || null,
        gdrive_lh3_url: primaryMedia?.lh3Url || null,
        media_metadata: {
          duration: primaryMedia?.durationSeconds,
          size: primaryMedia?.fileSize,
          is_simulation: isSimulationMode,
          gallery_items: items.map((it) => ({
            file_id: it.fileId,
            file_name: it.fileName,
            mime_type: it.mimeType,
            file_size: it.fileSize,
            stream_url: it.streamUrl,
            lh3_url: it.lh3Url,
            duration: it.durationSeconds,
          })),
        },
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
        status: 'DRAFT',
      }

      let postId = editingDraftId

      if (editingDraftId) {
        const { error: updateErr } = await supabase
          .from('posts')
          .update(payload)
          .eq('id', editingDraftId)
        if (updateErr) throw updateErr
      } else {
        const { data: newPost, error: insertErr } = await supabase
          .from('posts')
          .insert(payload)
          .select('id')
          .single()
        if (insertErr) throw insertErr
        postId = newPost.id
        setEditingDraftId(newPost.id)
      }

      // Sync post_targets jika akun dipilih
      if (postId) {
        if (editingDraftId) {
          await supabase.from('post_targets').delete().eq('post_id', postId)
        }
        if (targetAccountIds.length > 0) {
          const { data: accounts } = await supabase
            .from('connected_accounts')
            .select('id, platform')
            .in('id', targetAccountIds)

          if (accounts && accounts.length > 0) {
            const targets = accounts.map((acc) => ({
              post_id: postId,
              account_id: acc.id,
              platform: acc.platform,
              status: 'PENDING' as const,
            }))
            await supabase.from('post_targets').insert(targets)
          }
        }
      }

      toast.success(editingDraftId ? 'Draft berhasil diperbarui!' : 'Draft berhasil disimpan!')
    } catch (err: any) {
      console.error('Error saving draft:', err)
      toast.error(err.message || 'Gagal menyimpan draft')
    } finally {
      setSavingDraft(false)
    }
  }

  // Jadwalkan postingan (validasi ketat akun + jadwal)
  async function handleSubmit() {
    if (!canSubmit) {
      if (targetAccountIds.length === 0) {
        toast.error('Pilih minimal satu akun tujuan postingan!')
      }
      return
    }

    setSubmitting(true)
    try {
      const { data: accounts, error: accError } = await supabase
        .from('connected_accounts')
        .select('id, platform')
        .in('id', targetAccountIds)

      if (accError) throw accError

      const validationResult = composerFormSchema.safeParse({
        title,
        contentText,
        mediaType,
        media,
        mediaItems,
        targetAccounts: accounts || [],
        scheduledAt,
      })

      if (!validationResult.success) {
        const firstError = validationResult.error.issues[0]?.message || 'Input form tidak valid'
        toast.error(firstError)
        return
      }

      const items = mediaItems.length > 0 ? mediaItems : media ? [media] : []
      const primaryMedia = items[0] || media || null

      const postPayload = {
        title: title.trim() || null,
        content_text: contentText,
        media_type: mediaType,
        gdrive_file_id: primaryMedia?.fileId || null,
        gdrive_stream_url: primaryMedia?.streamUrl || null,
        gdrive_lh3_url: primaryMedia?.lh3Url || null,
        media_metadata: {
          duration: primaryMedia?.durationSeconds,
          size: primaryMedia?.fileSize,
          is_simulation: isSimulationMode,
          gallery_items: items.map((it) => ({
            file_id: it.fileId,
            file_name: it.fileName,
            mime_type: it.mimeType,
            file_size: it.fileSize,
            stream_url: it.streamUrl,
            lh3_url: it.lh3Url,
            duration: it.durationSeconds,
          })),
        },
        scheduled_at: new Date(scheduledAt).toISOString(),
        status: 'SCHEDULED',
      }

      let postId = editingDraftId

      if (editingDraftId) {
        const { error: updateErr } = await supabase
          .from('posts')
          .update(postPayload)
          .eq('id', editingDraftId)
        if (updateErr) throw updateErr
        await supabase.from('post_targets').delete().eq('post_id', editingDraftId)
      } else {
        const { data: post, error: postError } = await supabase
          .from('posts')
          .insert(postPayload)
          .select('id')
          .single()
        if (postError) throw postError
        postId = post.id
      }

      if (postId && accounts && accounts.length > 0) {
        const targets = accounts.map((acc) => ({
          post_id: postId,
          account_id: acc.id,
          platform: acc.platform,
          status: 'PENDING' as const,
        }))
        const { error: targetError } = await supabase.from('post_targets').insert(targets)
        if (targetError) throw targetError
      }

      toast.success(editingDraftId ? 'Draft berhasil dijadwalkan!' : 'Postingan berhasil dijadwalkan!')
      reset()
      fetch('/api/cron/dispatcher').catch(() => {})
      setTimeout(() => fetch('/api/cron/dispatcher').catch(() => {}), 20_000)
    } catch (err: any) {
      console.error('Error scheduling post:', err)
      toast.error(err.message || 'Gagal menjadwalkan postingan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 pb-16">
      {/* Top Bar Bersih & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Upload & Buat Postingan</h1>
          <p className="text-xs text-muted-foreground">
            Unggah video, tulis caption, pilih akun, dan tentukan jadwal penayangan secara langsung.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tombol Buat Baru / Kosongkan Form */}
          <button
            type="button"
            onClick={() => {
              reset()
              toast.success('Form berhasil dikosongkan. Siap untuk membuat postingan baru!')
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-semibold hover:bg-muted transition-colors cursor-pointer shadow-2xs"
            title="Kosongkan form dan buat postingan baru"
          >
            <Plus size={13} />
            <span>Buat Baru</span>
          </button>

          {/* Tombol AI Drawer */}
          <button
            type="button"
            onClick={() => setIsAiDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
          >
            <Wand2 size={13} className="text-foreground" />
            <span>AI Assistant</span>
          </button>

          {/* Mode Simulasi Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !isSimulationMode
              setSimulationMode(next)
              toast.info(
                next
                  ? 'Mode Simulasi (Dry-Run) Aktif: Jadwal tersimpan tanpa posting live ke media sosial.'
                  : 'Mode Live Posting Aktif: Konten akan dipublikasikan langsung ke akun tujuan.'
              )
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              isSimulationMode
                ? 'bg-secondary border-border text-foreground'
                : 'bg-primary text-primary-foreground border-primary font-semibold'
            }`}
          >
            <span className={`size-1.5 rounded-full ${isSimulationMode ? 'bg-amber-500' : 'bg-emerald-400'}`} />
            <span>{isSimulationMode ? 'Mode Uji Coba' : 'Live Posting'}</span>
          </button>
        </div>
      </div>

      {/* Main Studio 2-Column Layout (TikTok Creator Studio Style) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Kolom Kiri: Media Hub & Pratinjau Interaktif (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-card rounded-2xl border border-border p-4 shadow-xs">
            <MediaUploader />
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 shadow-xs">
            <PhoneSimulator channel={activePreviewChannel} setChannel={setActivePreviewChannel} />
          </div>
        </div>

        {/* Kolom Kanan: Form Pengaturan Postingan & Publishing (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="bg-card rounded-2xl border border-border p-5 shadow-xs flex flex-col gap-5">
            {/* Draft Mode Banner (jika sedang membuka / mengedit draft) */}
            {editingDraftId && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="size-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span className="font-semibold text-amber-800 dark:text-amber-300">Mode Edit Draf:</span>
                    <span className="text-foreground font-mono text-[11px] truncate max-w-[200px] sm:max-w-xs font-medium">
                      {title || 'Tanpa Judul'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    reset()
                    toast.info('Keluar dari mode edit draf. Form kembali kosong untuk konten baru.')
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-background border border-amber-500/40 text-foreground hover:bg-muted transition-colors cursor-pointer shadow-2xs shrink-0"
                >
                  <Plus size={12} />
                  <span>Buat Baru (Keluar Draf)</span>
                </button>
              </div>
            )}

            {/* 1. Target Akun */}
            <AccountSelector />

            {/* 2. Judul Internal */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5" htmlFor="composer-title">
                  <span className="material-symbols-outlined text-[15px]">label</span>
                  <span>Judul Konten (Opsional)</span>
                </label>
                <span className="text-[10px] text-muted-foreground">Internal tracking</span>
              </div>
              <input
                id="composer-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Promo Flash Sale Weekend"
                className="w-full bg-background border border-input px-3.5 py-2.5 rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                maxLength={200}
              />
            </div>

            {/* 3. Naskah Caption */}
            <CaptionEditor />

            {/* 4. Jadwal Publikasi */}
            <div className="pt-2 border-t border-border/60">
              <SchedulePicker />
            </div>

            {/* Footer Form Action: Reset, Simpan Draft, Jadwalkan Postingan */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/60">
              <button
                type="button"
                onClick={() => {
                  reset()
                  toast.info('Form postingan telah dikosongkan.')
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Reset Form
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                {/* Tombol Simpan Draft (Validasi longgar, tanpa keharusan pilih akun) */}
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={!canSaveDraft || savingDraft}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
                  title="Simpan sebagai draft untuk diedit atau dijadwalkan nanti"
                >
                  {savingDraft ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Bookmark size={14} className="text-muted-foreground" />
                  )}
                  <span>{editingDraftId ? 'Perbarui Draft' : 'Simpan Draft'}</span>
                </button>

                {/* Tombol Jadwalkan Postingan (Validasi lengkap akun & waktu) */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitting}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting && <Loader2 className="size-4 animate-spin" />}
                  <span>Jadwalkan Postingan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side-Drawer AI Assistant */}
      <Drawer open={isAiDrawerOpen} onOpenChange={setIsAiDrawerOpen}>
        <DrawerContent className="max-w-xl mx-auto w-full bg-card rounded-t-2xl border-t border-border p-6 shadow-2xl">
          <DrawerHeader className="px-0 pt-0 pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                  <Wand2 size={16} />
                </div>
                <div>
                  <DrawerTitle className="text-base font-bold text-foreground">AI Caption & Story Assistant</DrawerTitle>
                  <DrawerDescription className="text-xs text-muted-foreground">
                    Tuliskan ide konten Anda atau pilih template instan untuk dibuatkan naskah oleh Gemini AI.
                  </DrawerDescription>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAiDrawerOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </DrawerHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">Instruksi / Topik Konten</label>
              <textarea
                value={aiPromptInput}
                onChange={(e) => setAiPromptInput(e.target.value)}
                placeholder="Contoh: Buatkan caption persuasif tentang diskon reseller dengan hook memikat di detik pertama..."
                rows={3}
                className="w-full bg-background border border-input rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold text-muted-foreground">Preset Topik Cepat:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {QUICK_AI_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleRunAiAutopilot(p.prompt)}
                    className="p-2.5 text-left rounded-lg bg-secondary border border-border hover:border-foreground/30 text-xs text-foreground transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <span className="truncate">{p.label}</span>
                    <ArrowRight size={12} className="text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DrawerFooter className="px-0 pb-0 pt-2 flex flex-row items-center justify-end gap-2 border-t border-border">
            <button
              type="button"
              onClick={() => setIsAiDrawerOpen(false)}
              className="px-4 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => handleRunAiAutopilot()}
              disabled={isAiRunning || !aiPromptInput.trim()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isAiRunning ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
              <span>Generate Naskah</span>
            </button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
