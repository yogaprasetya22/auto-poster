import { useState } from 'react'
import { useComposerStore } from './store/useComposerStore'
import { MediaUploader } from './components/MediaUploader'
import { CaptionEditor } from './components/CaptionEditor'
import { SchedulePicker } from './components/SchedulePicker'
import { AccountSelector } from './components/AccountSelector'
import { supabase } from '@/shared/lib/supabase'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function ComposerPage() {
  const { title, contentText, media, mediaType, scheduledAt, targetAccountIds, setTitle, reset } =
    useComposerStore()
  const [submitting, setSubmitting] = useState(false)

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
          media_metadata: media ? { duration: media.durationSeconds, size: media.fileSize } : {},
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
    } catch (err: any) {
      console.error('Error scheduling post:', err)
      toast.error(err.message || 'Gagal menjadwalkan postingan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Buat Postingan Baru</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Jadwalkan postingan serentak ke Instagram Reels, Facebook Page, Threads, dan TikTok.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Judul Konten (Internal)</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Contoh: Promo Flash Sale Oktober (opsional)"
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          maxLength={200}
        />
      </div>

      <AccountSelector />
      <CaptionEditor />
      <MediaUploader />
      <SchedulePicker />

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-primary text-primary-foreground font-medium text-sm disabled:opacity-40 hover:opacity-90 transition-opacity"
      >
        {submitting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Menjadwalkan...
          </>
        ) : (
          'Jadwalkan Posting'
        )}
      </button>
    </div>
  )
}
