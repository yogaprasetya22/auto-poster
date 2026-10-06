import { useState } from 'react'
import { useComposerStore } from './store/use-composer-store'
import { MediaUploader } from './components/media-uploader'
import { CaptionEditor } from './components/caption-editor'
import { SchedulePicker } from './components/schedule-picker'
import { AccountSelector } from './components/account-selector'
import { PhoneSimulator } from './components/phone-simulator'
import { AutopilotCommandBar } from './components/autopilot-command-bar'
import { supabase } from '@/shared/lib/supabase'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { composerFormSchema } from './validation'

export function ComposerPage() {
  const {
    title,
    contentText,
    media,
    mediaType,
    scheduledAt,
    targetAccountIds,
    isSimulationMode,
    setTitle,
    setSimulationMode,
    reset,
  } = useComposerStore()
  const [submitting, setSubmitting] = useState(false)
  const [activePreviewChannel, setActivePreviewChannel] = useState<'tiktok' | 'reels' | 'threads' | 'facebook'>('tiktok')

  const canSubmit = contentText.trim().length > 0 && scheduledAt && targetAccountIds.length > 0 && !submitting

  async function handleSubmit() {
    if (!canSubmit) {
      if (targetAccountIds.length === 0) {
        toast.error('Pilih minimal satu akun tujuan postingan!')
      }
      return
    }

    setSubmitting(true)
    try {
      // 1. Fetch platform details for chosen accounts
      const { data: accounts, error: accError } = await supabase
        .from('connected_accounts')
        .select('id, platform')
        .in('id', targetAccountIds)

      if (accError) throw accError

      // Validasi ketat zod sebelum menyimpan
      const validationResult = composerFormSchema.safeParse({
        title,
        contentText,
        mediaType,
        media,
        targetAccounts: accounts || [],
        scheduledAt,
      })

      if (!validationResult.success) {
        const firstError = validationResult.error.issues[0]?.message || 'Input form tidak valid'
        toast.error(firstError)
        return
      }

      // 2. Insert main post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          title: title.trim() || null,
          content_text: contentText,
          media_type: mediaType,
          gdrive_file_id: media?.fileId || null,
          gdrive_stream_url: media?.streamUrl || null,
          gdrive_lh3_url: media?.lh3Url || null,
          media_metadata: {
            duration: media?.durationSeconds,
            size: media?.fileSize,
            is_simulation: isSimulationMode,
          },
          scheduled_at: new Date(scheduledAt).toISOString(),
          status: 'SCHEDULED',
        })
        .select('id')
        .single()

      if (postError) throw postError

      // 3. Insert platform targets
      if (post && accounts && accounts.length > 0) {
        const targets = accounts.map((acc) => ({
          post_id: post.id,
          account_id: acc.id,
          platform: acc.platform,
          status: 'PENDING' as const,
        }))
        const { error: targetError } = await supabase.from('post_targets').insert(targets)
        if (targetError) throw targetError
      }

      toast.success('Postingan berhasil dijadwalkan!')
      reset()
      // ponytail: trigger dispatcher segera + follow-up poll untuk handle transcoding
      fetch('/api/cron/dispatcher').catch(() => {})
      setTimeout(() => fetch('/api/cron/dispatcher').catch(() => {}), 20_000)
      setTimeout(() => fetch('/api/cron/dispatcher').catch(() => {}), 40_000)
    } catch (err: any) {
      console.error('Error scheduling post:', err)
      toast.error(err.message || 'Gagal menjadwalkan postingan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 pb-12">
      {/* Header Bersih */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Buat Postingan Baru</h1>
          <p className="text-xs text-muted-foreground">
            Jadwalkan dan distribusikan video vertikal secara otomatis ke Instagram, Facebook, TikTok, dan Threads.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              isSimulationMode
                ? 'bg-secondary border-border text-foreground'
                : 'bg-primary text-primary-foreground border-primary font-semibold'
            }`}
          >
            <span className={`size-1.5 rounded-full ${isSimulationMode ? 'bg-amber-500' : 'bg-emerald-400'}`} />
            <span>{isSimulationMode ? 'Mode Simulasi (Uji Coba)' : 'Mode Publikasi Live'}</span>
          </button>
        </div>
      </div>

      {/* Split Layout: 7 Cols Left (Editor) / 5 Cols Right (Phone Simulator) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 Cols) */}
        <div className="xl:col-span-7 flex flex-col gap-4 min-w-0">
          {/* 1-Prompt Autopilot Command Bar */}
          <AutopilotCommandBar />

          {/* Form Card Container */}
          <div className="bg-card rounded-2xl border border-border shadow-xs divide-y divide-border/60">
            {/* 1. Judul & Akun Selector */}
            <div className="p-4 sm:p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5" htmlFor="campaign-title">
                    <span className="material-symbols-outlined text-[15px]">label</span>
                    <span>Judul Konten (Opsional)</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground">Untuk pelacakan internal</span>
                </div>
                <input
                  id="campaign-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Launching Feature v2.4 Walkthrough"
                  className="w-full bg-background border border-input px-3.5 py-2.5 rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all"
                  maxLength={200}
                />
              </div>

              {/* Target Akun */}
              <AccountSelector />
            </div>

            {/* 2. Media Asset Uploader */}
            <div className="p-4 sm:p-5">
              <MediaUploader />
            </div>

            {/* 3. Naskah Caption & Hashtag */}
            <div className="p-4 sm:p-5">
              <CaptionEditor />
            </div>

            {/* 4. Jadwal Publikasi */}
            <div className="p-4 sm:p-5">
              <SchedulePicker />
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={reset}
              className="px-4 py-2 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Reset Draft
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              <span>Jadwalkan Konten</span>
            </button>
          </div>
        </div>

        {/* Right Column (5 Cols) - Interactive Phone Canvas Simulator */}
        <div className="xl:col-span-5 sticky top-20">
          <PhoneSimulator channel={activePreviewChannel} setChannel={setActivePreviewChannel} />
        </div>
      </div>
    </div>
  )
}
