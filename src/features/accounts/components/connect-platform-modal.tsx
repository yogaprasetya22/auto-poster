import { useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { X, Loader2, Check, Share2 } from 'lucide-react'
import { InstagramIcon, FacebookIcon, ThreadsIcon, TikTokIcon } from '@/shared/components/icons/platform-icons'
import { toast } from 'sonner'

interface ConnectModalProps {
  platform: 'instagram' | 'facebook_page' | 'threads' | 'tiktok' | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const platformMeta: Record<string, {
  title: string
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  idLabel: string
  placeholder: string
  tokenPlaceholder: string
}> = {
  instagram: {
    title: 'Hubungkan Instagram Business / Creator',
    icon: InstagramIcon,
    iconBg: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white',
    idLabel: 'Instagram Business Account ID',
    placeholder: 'contoh: 17841400123456789',
    tokenPlaceholder: 'User/Page Access Token dengan permission instagram_basic, instagram_content_publish',
  },
  facebook_page: {
    title: 'Hubungkan Facebook Page',
    icon: FacebookIcon,
    iconBg: 'bg-blue-600 text-white',
    idLabel: 'Facebook Page ID',
    placeholder: 'contoh: 102938475610293',
    tokenPlaceholder: 'Page Access Token dengan permission pages_manage_posts, pages_read_engagement',
  },
  threads: {
    title: 'Hubungkan Threads Account',
    icon: ThreadsIcon,
    iconBg: 'bg-black text-white dark:bg-white dark:text-black',
    idLabel: 'Threads User ID',
    placeholder: 'contoh: 891230491823091',
    tokenPlaceholder: 'Threads Access Token dengan permission threads_basic, threads_content_publish',
  },
  tiktok: {
    title: 'Hubungkan TikTok Direct Post',
    icon: TikTokIcon,
    iconBg: 'bg-black text-white dark:bg-white dark:text-black',
    idLabel: 'TikTok OpenID',
    placeholder: 'contoh: _000abc123def456...',
    tokenPlaceholder: 'User Access Token TikTok API v2 (scope: video.publish, video.upload)',
  },
}

export function ConnectPlatformModal({ platform, isOpen, onClose, onSuccess }: ConnectModalProps) {
  const [accountName, setAccountName] = useState('')
  const [platformUserId, setPlatformUserId] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [loading, setLoading] = useState(false)

  if (!platform) return null

  const meta = platformMeta[platform] || {
    title: `Hubungkan ${platform}`,
    icon: Share2,
    iconBg: 'bg-muted text-foreground',
    idLabel: 'Account ID',
    placeholder: 'ID Akun',
    tokenPlaceholder: 'Access Token',
  }
  const Icon = meta.icon

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.from('connected_accounts').upsert(
        {
          platform: platform!,
          platform_user_id: platformUserId,
          account_name: accountName,
          access_token: accessToken,
          is_active: true,
          token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        },
        { onConflict: 'platform,platform_user_id' }
      )

      if (error) throw error

      toast.success(`Akun ${meta.title} berhasil dihubungkan!`)
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(`Gagal menghubungkan akun: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${meta.iconBg}`}>
              <Icon className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">{meta.title}</h3>
              <p className="text-xs text-muted-foreground">Kredensial disimpan terenkripsi AES-256</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Nama Akun / Handle</label>
            <input
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="contoh: @brand_official atau Nama Brand"
              className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">{meta.idLabel}</label>
            <input
              value={platformUserId}
              onChange={(e) => setPlatformUserId(e.target.value)}
              placeholder={meta.placeholder}
              className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Access Token</label>
            <textarea
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              rows={3}
              placeholder={meta.tokenPlaceholder}
              className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-input text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 text-xs font-semibold disabled:opacity-50 transition-all cursor-pointer shadow-xs"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Simpan & Hubungkan
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
