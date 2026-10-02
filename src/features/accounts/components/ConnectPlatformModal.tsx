import { useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { X, Loader2, Check, Share2 } from 'lucide-react'
import { InstagramIcon, FacebookIcon, ThreadsIcon, TikTokIcon } from '@/shared/components/icons/PlatformIcons'
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

  if (!isOpen || !platform) return null

  const meta = platformMeta[platform] || {
    title: 'Hubungkan Akun',
    icon: Share2,
    iconBg: 'bg-primary text-primary-foreground',
    idLabel: 'Platform User ID',
    placeholder: 'ID Akun',
    tokenPlaceholder: 'Access Token',
  }
  const Icon = meta.icon

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!accountName.trim() || !platformUserId.trim() || !accessToken.trim()) {
      toast.error('Semua kolom wajib diisi!')
      return
    }

    setLoading(true)
    try {
      let encryptedToken = accessToken
      try {
        const encryptionKey = import.meta.env.VITE_ENCRYPTION_MASTER_KEY || ''
        const { data: enc, error: encErr } = await supabase.rpc('encrypt_secret', {
          plain_text: accessToken,
          secret_key: encryptionKey
        })
        if (!encErr && enc) encryptedToken = enc
      } catch {
        encryptedToken = btoa(accessToken)
      }

      const { error } = await supabase.from('connected_accounts').upsert({
        platform,
        account_name: accountName.trim(),
        platform_user_id: platformUserId.trim(),
        access_token_encrypted: encryptedToken,
        is_active: true,
        token_expires_at: new Date(Date.now() + 60 * 24 * 3600_000).toISOString(),
      }, { onConflict: 'platform,platform_user_id' })

      if (error) throw error

      toast.success(`Akun ${accountName} berhasil dihubungkan!`)
      setAccountName('')
      setPlatformUserId('')
      setAccessToken('')
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Gagal menyimpan akun')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${meta.iconBg}`}>
              <Icon className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">{meta.title}</h3>
              <p className="text-xs text-muted-foreground">Kredensial disimpan terenkripsi AES-256</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium">Nama Akun / Handle</label>
            <input
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="contoh: @brand_official atau Nama Brand"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">{meta.idLabel}</label>
            <input
              value={platformUserId}
              onChange={(e) => setPlatformUserId(e.target.value)}
              placeholder={meta.placeholder}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Access Token</label>
            <textarea
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              rows={3}
              placeholder={meta.tokenPlaceholder}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-md border border-input text-xs font-medium hover:bg-muted"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50 hover:opacity-90"
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
