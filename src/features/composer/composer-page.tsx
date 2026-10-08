import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useComposerStore } from './store/use-composer-store'
import { MediaUploader } from './components/media-uploader'
import { CaptionEditor } from './components/caption-editor'
import { SchedulePicker } from './components/schedule-picker'
import { AccountSelector } from './components/account-selector'
import { PhoneSimulator } from './components/phone-simulator'
import { supabase } from '@/shared/lib/supabase'
import { toast } from 'sonner'
import { Loader2, X, ArrowRight, Wand2, Bookmark, Plus, Layers, FileText, Trash2, Clock, Film, Image as ImageIcon, Sparkles, Bot } from 'lucide-react'
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
    label: 'Promo Penawaran Khusus',
    prompt: 'Promo penawaran terbatas dengan keuntungan terbaik untuk pelanggan baru hari ini',
  },
  {
    label: 'Solusi & Masalah Konsumen',
    prompt: 'Edukasi cara menyelesaikan kendala operasional bisnis secara praktis dan hemat biaya',
  },
  {
    label: 'Testimoni & Kepercayaan',
    prompt: 'Pentingnya ulasan positif dan kepuasan pelanggan terhadap pertumbuhan transaksi toko',
  },
  {
    label: 'Edukasi Tips Bisnis',
    prompt: 'Tips praktis meningkatkan penjualan toko offline dan online dengan strategi digital marketing',
  },
]

export function ComposerPage() {
  const navigate = useNavigate()
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
    loadDraft,
    reset,
  } = useComposerStore()

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)
  const [submitting, setSubmitting] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [activePreviewChannel, setActivePreviewChannel] = useState<'tiktok' | 'reels' | 'threads' | 'facebook'>('tiktok')
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false)
  const [aiPromptInput, setAiPromptInput] = useState('')
  const [isAiRunning, setIsAiRunning] = useState(false)

  // Drawer Draf Tersimpan
  const [isDraftsDrawerOpen, setIsDraftsDrawerOpen] = useState(false)
  const [savedDrafts, setSavedDrafts] = useState<any[]>([])
  const [loadingDrafts, setLoadingDrafts] = useState(false)

  const canSaveDraft = Boolean(title.trim() || contentText.trim() || media || mediaItems.length > 0) && !savingDraft && !submitting
  const canSubmit = contentText.trim().length > 0 && scheduledAt && targetAccountIds.length > 0 && !submitting && !savingDraft

  async function fetchSavedDrafts() {
    setLoadingDrafts(true)
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*, post_targets(*, connected_accounts(account_name, platform))')
        .eq('status', 'DRAFT')
        .order('updated_at', { ascending: false })
      if (!error && data) {
        setSavedDrafts(data)
      }
    } catch (err) {
      console.warn('Gagal memuat draf:', err)
    } finally {
      setLoadingDrafts(false)
    }
  }

  function handleOpenDrafts() {
    setIsDraftsDrawerOpen(true)
    fetchSavedDrafts()
  }

  async function handleDeleteDraftItem(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await supabase.from('post_targets').delete().eq('post_id', id)
      await supabase.from('posts').delete().eq('id', id)
      setSavedDrafts((prev) => prev.filter((d) => d.id !== id))
      if (editingDraftId === id) {
        reset()
      }
      toast.success('Draf berhasil dihapus')
    } catch {
      toast.error('Gagal menghapus draf')
    }
  }

  function handleSelectDraft(draft: any) {
    loadDraft(draft)
    setIsDraftsDrawerOpen(false)
    toast.success(`Draf "${draft.title || 'Tanpa Judul'}" berhasil dimuat ke editor!`)
  }

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
        toast.error('Pilih minimal satu akun tujuan postingan di Langkah 2!')
        return
      }
      if (!contentText.trim()) {
        toast.error('Tuliskan naskah caption postingan di Langkah 3!')
        return
      }
      if (!scheduledAt) {
        toast.error('Tentukan waktu tayang postingan di Langkah 4!')
        return
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
      fetch('/api/cron/dispatcher').catch(() => { })
      setTimeout(() => fetch('/api/cron/dispatcher').catch(() => { }), 20_000)
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
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Posting Manual</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary font-semibold text-muted-foreground">
              MODE BEBAS
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Tulis caption sendiri, unggah video/foto bebas, pilih akun, dan tentukan tanggal tayang sesuai keinginan Anda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tombol Lihat Draf Tersimpan */}
          <button
            type="button"
            onClick={handleOpenDrafts}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-semibold hover:bg-muted transition-colors cursor-pointer shadow-2xs"
            title="Buka daftar draf yang pernah disimpan"
          >
            <FileText size={13} className="text-muted-foreground" />
            <span>Draf Tersimpan</span>
          </button>

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

          {/* Tombol Jadwal Auto AI */}
          <button
            type="button"
            onClick={() => navigate('/auto-schedule')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-semibold hover:bg-muted transition-colors cursor-pointer shadow-2xs"
            title="Buka pembuat jadwal otomatis via AI"
          >
            <Bot size={13} className="text-muted-foreground" />
            <span>Jadwal Auto AI</span>
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${isSimulationMode
              ? 'bg-secondary border-border text-foreground'
              : 'bg-primary text-primary-foreground border-primary font-semibold'
              }`}
          >
            <span className={`size-1.5 rounded-full ${isSimulationMode ? 'bg-amber-500' : 'bg-emerald-400'}`} />
            <span>{isSimulationMode ? 'Mode Uji Coba' : 'Live Posting'}</span>
          </button>
        </div>
      </div>

      {/* Stepper Wizard Navigation Header (Next-Next Flow) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-1.5 rounded-xl border border-border bg-card shadow-2xs">
        {[
          { num: 1, label: '1. Format & Media', desc: 'Foto, Video, atau Carousel' },
          { num: 2, label: '2. Akun Tujuan', desc: 'Pilih Akun Medsos' },
          { num: 3, label: '3. Caption & Teks', desc: 'Naskah & Copywriting AI' },
          { num: 4, label: '4. Pratinjau & Jadwal', desc: 'Canvas Preview 9:16 & Tayang' },
        ].map((s) => {
          const isCurrent = currentStep === s.num
          const isDone = currentStep > s.num
          return (
            <div
              key={s.num}
              onClick={() => setCurrentStep(s.num as any)}
              className={`p-2.5 sm:p-3 rounded-lg flex items-center gap-2.5 transition-all cursor-pointer ${isCurrent
                ? 'bg-foreground text-background shadow-xs'
                : isDone
                  ? 'bg-secondary/70 text-foreground font-semibold'
                  : 'text-muted-foreground opacity-60 hover:opacity-100'
                }`}
            >
              <div
                className={`size-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isCurrent
                  ? 'bg-background text-foreground'
                  : isDone
                    ? 'bg-foreground text-background'
                    : 'bg-muted-foreground/20 text-muted-foreground'
                  }`}
              >
                {isDone ? '✓' : s.num}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate leading-tight">{s.label}</p>
                <p className={`text-[10px] truncate hidden sm:block ${isCurrent ? 'text-background/80' : 'text-muted-foreground'}`}>
                  {s.desc}
                </p>
              </div>
            </div>
          )
        })}
      </div>

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

      {/* ================= STEP 1: FORMAT & MEDIA KONTEN ================= */}
      {currentStep === 1 && (
        <div className="max-w-7xl mx-auto w-full flex flex-col gap-5">
          <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <h2 className="text-sm font-bold text-foreground">Langkah 1: Format & Media Konten</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tentukan tipe format postingan (Video Reels, Single Image, atau Carousel Slide) lalu unggah medianya.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary font-semibold text-foreground">
                LANGKAH 1 DARI 4
              </span>
            </div>

            <MediaUploader />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                reset()
                toast.info('Form postingan telah dikosongkan.')
              }}
              className="px-4 py-2.5 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Kosongkan Form
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-all shadow-xs cursor-pointer ml-auto"
            >
              <span>Lanjut: Pilih Akun Tujuan</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 2: PILIH AKUN TUJUAN ================= */}
      {currentStep === 2 && (
        <div className="max-w-7xl mx-auto w-full flex flex-col gap-5">
          <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <h2 className="text-sm font-bold text-foreground">Langkah 2: Pilih Akun Tujuan Distribusi</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Centang akun Instagram, TikTok, Facebook, atau Threads yang ingin dijadikan sasaran publikasi.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary font-semibold text-foreground">
                LANGKAH 2 DARI 4
              </span>
            </div>

            <AccountSelector />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              &larr; Kembali: Format Media
            </button>

            <button
              type="button"
              onClick={() => {
                if (targetAccountIds.length === 0) {
                  toast.error('Pilih minimal 1 akun tujuan sebelum melanjutkan!')
                  return
                }
                setCurrentStep(3)
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-all shadow-xs cursor-pointer"
            >
              <span>Lanjut: Naskah Caption</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: CAPTION & TEKS ================= */}
      {currentStep === 3 && (
        <div className="max-w-7xl mx-auto w-full flex flex-col gap-5">
          <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <h2 className="text-sm font-bold text-foreground">Langkah 3: Judul & Naskah Caption</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tuliskan naskah caption, hashtag relevan, atau gunakan Magic Caption Gemini AI.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary font-semibold text-foreground">
                LANGKAH 3 DARI 4
              </span>
            </div>

            {/* Judul Internal (Opsional) */}
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

            {/* Naskah Caption Editor */}
            <CaptionEditor />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              &larr; Kembali: Pilih Akun
            </button>

            <button
              type="button"
              onClick={() => {
                if (!contentText.trim()) {
                  toast.error('Tuliskan naskah caption terlebih dahulu sebelum melihat pratinjau!')
                  return
                }
                setCurrentStep(4)
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-all shadow-xs cursor-pointer"
            >
              <span>Lanjut: Lihat Canvas Preview & Jadwal</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 4: HASIL AKHIR (CANVAS PREVIEW 9:16 & JADWAL) ================= */}
      {currentStep === 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Kolom Kiri: Canvas Preview Ponsel Interaktif (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="p-3 bg-secondary/30 rounded-xl border border-border text-center">
              <span className="text-xs font-bold text-foreground">Hasil Akhir: Canvas Preview 9:16</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Simulasi tampilan real-time di layar ponsel pengguna sebelum tayang.
              </p>
            </div>
            <PhoneSimulator channel={activePreviewChannel} setChannel={setActivePreviewChannel} />
          </div>

          {/* Kolom Kanan: Jadwal Publikasi & Konfirmasi Penayangan (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div>
                  <h2 className="text-sm font-bold text-foreground">Langkah 4: Konfirmasi & Jadwalkan Postingan</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tentukan tanggal dan jam tayang, lalu konfirmasi untuk mempublikasikan konten.
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary font-semibold text-foreground">
                  LANGKAH 4 DARI 4
                </span>
              </div>

              {/* Tentukan Jadwal Tayang */}
              <div className="space-y-3">
                <SchedulePicker />
              </div>

              {/* Ringkasan Ringkas */}
              <div className="p-3.5 rounded-xl bg-secondary/40 border border-border space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Target Akun:</span>
                  <span className="font-mono font-medium">{targetAccountIds.length} Akun Terpilih</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Panjang Naskah:</span>
                  <span className="font-mono font-medium">{contentText.length} Karakter</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Media Terunggah:</span>
                  <span className="font-mono font-medium">
                    {mediaItems?.length > 0
                      ? `${mediaItems.length} Slide Carousel`
                      : media
                        ? '1 File Media'
                        : 'Belum ada media (Teks Only)'}
                  </span>
                </div>
                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <span className="font-semibold text-foreground">Status:</span>
                  {canSubmit ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      ✓ Siap Dijadwalkan
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                      ⚠️ Data belum lengkap
                    </span>
                  )}
                </div>
              </div>

              {/* Tombol Aksi: Kembali, Simpan Draft, Jadwalkan Postingan */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  &larr; Kembali ke Caption
                </button>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  {/* Tombol Simpan Draft */}
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

                  {/* Tombol Jadwalkan Postingan */}
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer ${canSubmit
                      ? 'bg-foreground text-background hover:opacity-90'
                      : 'bg-secondary text-muted-foreground border border-border hover:bg-secondary/80'
                      }`}
                  >
                    {submitting && <Loader2 className="size-4 animate-spin" />}
                    <span>Jadwalkan Postingan</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Drawer Draf Tersimpan Khusus Posting Manual */}
      <Drawer open={isDraftsDrawerOpen} onOpenChange={setIsDraftsDrawerOpen}>
        <DrawerContent className="w-full sm:max-w-lg max-h-screen flex flex-col p-6 space-y-4">
          <DrawerHeader className="p-0 pb-3 border-b border-border flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-md bg-secondary flex items-center justify-center text-foreground">
                  <FileText size={14} />
                </div>
                <DrawerTitle className="text-sm font-bold text-foreground">
                  Draf Posting Manual
                </DrawerTitle>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                  {savedDrafts.length} TERSIMPAN
                </span>
              </div>
              <DrawerDescription className="text-xs text-muted-foreground">
                Klik kartu draf untuk melanjutkan editan langsung di form Composer.
              </DrawerDescription>
            </div>
            <button
              type="button"
              onClick={() => setIsDraftsDrawerOpen(false)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
            >
              <X size={16} />
            </button>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto space-y-3 py-1 pr-1">
            {loadingDrafts ? (
              <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
                <Loader2 size={20} className="animate-spin mx-auto text-foreground" />
                <span>Memuat kumpulan draf...</span>
              </div>
            ) : savedDrafts.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground space-y-2 p-6">
                <div className="size-10 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
                  <FileText size={18} />
                </div>
                <p className="font-semibold text-foreground">Belum ada draf tersimpan</p>
                <p className="text-[11px] leading-relaxed max-w-xs mx-auto">
                  Tuliskan judul, caption, atau unggah media pada form, lalu klik tombol "Simpan Draf" di pojok kanan bawah.
                </p>
              </div>
            ) : (
              savedDrafts.map((draft) => {
                const isCurrentEditing = editingDraftId === draft.id
                const rawGallery = draft.media_metadata?.gallery_items || []
                const hasGallery = Array.isArray(rawGallery) && rawGallery.length > 0
                const firstMedia = hasGallery ? rawGallery[0] : null
                const mediaUrl =
                  firstMedia?.stream_url ||
                  firstMedia?.lh3_url ||
                  draft.gdrive_stream_url ||
                  draft.gdrive_lh3_url ||
                  ''
                const isVideo = draft.media_type === 'VIDEO'
                const targetAccounts = draft.post_targets || []

                return (
                  <div
                    key={draft.id}
                    onClick={() => handleSelectDraft(draft)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex gap-3.5 items-start group ${isCurrentEditing
                      ? 'border-foreground bg-secondary/60 ring-1 ring-foreground shadow-xs'
                      : 'border-border bg-card hover:border-foreground/40 hover:bg-secondary/20 shadow-2xs'
                      }`}
                  >
                    {/* Media Thumbnail */}
                    <div className="size-18 rounded-lg bg-secondary/80 border border-border shrink-0 overflow-hidden relative flex items-center justify-center">
                      {mediaUrl ? (
                        isVideo ? (
                          <div className="relative size-full">
                            <video src={mediaUrl} className="size-full object-cover" preload="metadata" />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white">
                              <Film size={14} />
                            </div>
                          </div>
                        ) : (
                          <img
                            src={mediaUrl}
                            alt=""
                            className="size-full object-cover"
                            onError={(e) => {
                              ; (e.target as HTMLElement).style.display = 'none'
                            }}
                          />
                        )
                      ) : (
                        <div className="flex flex-col items-center gap-0.5 text-muted-foreground/60 text-[9px] font-mono">
                          <FileText size={16} />
                          <span>Teks</span>
                        </div>
                      )}
                      <span className="absolute bottom-0.5 right-0.5 text-[8px] font-mono px-1 py-0.2 rounded bg-black/70 text-white uppercase">
                        {draft.media_type === 'VIDEO' ? 'Reels' : draft.media_type === 'CAROUSEL' ? 'Carousel' : 'Image'}
                      </span>
                    </div>

                    {/* Content Details */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-xs font-bold text-foreground line-clamp-1 group-hover:text-foreground">
                          {draft.title || 'Tanpa Judul'}
                        </h4>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteDraftItem(draft.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-rose-500 rounded transition-all cursor-pointer shrink-0 -mr-1"
                          title="Hapus draf"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {draft.content_text || 'Tidak ada teks caption'}
                      </p>

                      <div className="pt-1 border-t border-border/80 flex items-center justify-between text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          {targetAccounts.length > 0 ? (
                            <span className="font-mono text-foreground font-semibold">
                              {targetAccounts.length} Akun
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Belum pilih akun</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 font-mono text-[9px]">
                          <Clock size={10} />
                          <span>{new Date(draft.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
