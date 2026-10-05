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
    <div className="w-full flex flex-col gap-6">
      {/* Top Breadcrumb & Metadata Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-[#E5E7EB] dark:border-[rgba(255,255,255,0.08)]">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-black dark:text-white font-semibold px-2 py-0.5 rounded bg-[#F3F4F6] dark:bg-[#1C1E24] border border-[#E5E7EB] dark:border-[rgba(255,255,255,0.08)]">
              Pipeline Mode
            </span>
            <span className="text-[#9CA3AF] font-mono text-xs">•</span>
            <span className="font-mono text-xs text-black dark:text-white font-semibold">Real-Time Sync 4 Nodes</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white mt-1">Buat Postingan Baru</h1>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            Jadwalkan & orkestrasikan distribusi video vertikal multi-channel secara serentak ke Instagram Reels, Facebook Page, Threads, dan TikTok.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              const next = !isSimulationMode
              setSimulationMode(next)
              toast.info(
                next
                  ? 'Mode Simulasi (Dry-Run) AKTIF: File upload ke GDrive & jadwal tersimpan ke database tanpa posting live.'
                  : 'Mode Live Posting AKTIF: Postingan akan langsung dikirim ke OpenAPI platform sesuai jadwal.'
              )
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
              isSimulationMode
                ? 'bg-amber-500/10 border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20'
                : 'bg-emerald-500/10 border-emerald-300 dark:border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            <span className={`size-2 rounded-full ${isSimulationMode ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span>{isSimulationMode ? 'MODE SIMULASI (DEV DRY-RUN)' : 'MODE LIVE POSTING'}</span>
          </button>

          <span className="font-mono text-[10px] text-[#6B7280] bg-[#F3F4F6] border border-[#E5E7EB] px-2 py-1.5 rounded-lg hidden sm:inline">
            AUTOSAVE ACTIVE
          </span>
        </div>
      </div>

      {/* Split Layout: 7 Cols Left (Editor) / 5 Cols Right (Phone Simulator) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start pb-12">
        {/* Left Column (7 Cols) */}
        <div className="xl:col-span-7 flex flex-col gap-4 min-w-0">
          {/* 1-Prompt Autopilot Command Bar */}
          <AutopilotCommandBar />

          {/* Studio Canvas Section */}
          <div className="bg-white dark:bg-[#111216] rounded-2xl border border-[#E5E7EB] dark:border-[rgba(255,255,255,0.08)] shadow-xs divide-y divide-[#F3F4F6] dark:divide-[rgba(255,255,255,0.06)]">
            {/* 1. Judul & Akun Selector */}
            <div className="p-4 sm:p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-black dark:text-white flex items-center gap-1.5" htmlFor="campaign-title">
                    <span className="material-symbols-outlined text-[15px]">label</span>
                    <span>Judul Konten (Internal Workspace)</span>
                  </label>
                  <span className="font-mono text-[10px] text-[#6B7280] dark:text-[#9CA3AF]">OPSIONAL • TAG TRACKING</span>
                </div>
                <div className="relative flex items-center">
                  <input
                    id="campaign-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Launching Feature v2.4 Walkthrough"
                    className="w-full bg-[#F9FAFB] dark:bg-[#16181D] border border-[#E5E7EB] dark:border-[rgba(255,255,255,0.12)] px-3.5 py-2.5 rounded-xl text-xs text-black dark:text-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white transition-all"
                    maxLength={200}
                  />
                  <div className="absolute right-2.5 flex items-center gap-1 pointer-events-none">
                    <kbd className="font-mono text-[10px] text-[#6B7280] dark:text-[#9CA3AF] bg-[#F3F4F6] dark:bg-[#262933] border border-[#E5E7EB] dark:border-[rgba(255,255,255,0.1)] px-1 rounded">
                      ⌘J
                    </kbd>
                  </div>
                </div>
              </div>

              {/* Target Akun */}
              <AccountSelector />
            </div>

            {/* 2. Media Asset Uploader (Manual, AI Video, Vision Clone) */}
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

            {/* Peringatan & Panduan Instagram Reels Pra-Posting */}
            {targetAccountIds.length > 0 && (
              <div className="p-4 sm:p-5 bg-[#FFFBEB] dark:bg-amber-950/20 border-t border-[#FDE68A] dark:border-amber-900/40 flex flex-col gap-2.5 rounded-b-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#B45309] dark:text-amber-400">
                    <span className="material-symbols-outlined text-[17px]">verified_user</span>
                    <span>Checklist Keamanan Posting Instagram & TikTok (Anti-Gagal)</span>
                  </div>
                  {media && mediaType === 'VIDEO' && (media.durationSeconds || 0) >= 3 && (
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-600 text-white font-semibold">
                      ✓ VIDEO LOLOS VALIDASI ({media.durationSeconds}s)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#92400E] dark:text-amber-300/90 leading-relaxed">
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold">✓</span>
                    <span>
                      <strong>Instagram Reels:</strong> Format video vertikal (9:16), durasi minimal 3 detik, maksimal 90 detik.
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold">✓</span>
                    <span>
                      <strong>TikTok Anti-Spam:</strong> Maksimal 5 posting per 24 jam untuk akun developer.
                    </span>
                  </div>
                </div>

                {mediaType === 'VIDEO' && media && (!media.durationSeconds || media.durationSeconds < 3) && (
                  <div className="mt-1 p-2 bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-900/60 rounded-lg text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    <span>Durasi video terlalu pendek ({media.durationSeconds || 0}s). Instagram & TikTok mewajibkan minimal 3 detik!</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={reset}
              className="px-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[rgba(255,255,255,0.12)] bg-white dark:bg-[#16181D] text-xs font-medium text-[#374151] dark:text-[#E5E7EB] hover:text-black dark:hover:text-white hover:border-black dark:hover:border-white transition-colors cursor-pointer"
            >
              Reset Draft
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-black text-white text-xs font-semibold hover:bg-[#262626] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              <span>Jadwalkan & Dispatch Konten</span>
              <kbd className="font-mono text-[10px] px-1 py-0.5 rounded bg-[#333333] text-white">⌘Enter</kbd>
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
