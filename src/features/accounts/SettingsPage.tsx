import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { formatWIB } from '@/shared/lib/date'
import { CheckCircle2, AlertCircle, Trash2, Plus, HardDrive, LogIn } from 'lucide-react'
import { InstagramIcon, FacebookIcon, ThreadsIcon, TikTokIcon } from '@/shared/components/icons/PlatformIcons'
import { ConnectPlatformModal } from './components/ConnectPlatformModal'
import { toast } from 'sonner'

type PlatformKey = 'instagram' | 'facebook_page' | 'threads' | 'tiktok'

interface PlatformDef {
  key: PlatformKey
  name: string
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  desc: string
  badge: string
  supportsMetaOAuth?: boolean
}

const SUPPORTED_PLATFORMS: PlatformDef[] = [
  {
    key: 'instagram',
    name: 'Instagram',
    icon: InstagramIcon,
    iconBg: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white',
    desc: 'Publikasi otomatis Reels (video 9:16) & Single Feed Image',
    badge: 'Reels & Feed',
    supportsMetaOAuth: true,
  },
  {
    key: 'facebook_page',
    name: 'Facebook Page',
    icon: FacebookIcon,
    iconBg: 'bg-blue-600 text-white',
    desc: 'Posting video, link post, foto & teks ke Halaman Facebook',
    badge: 'Page Post',
    supportsMetaOAuth: true,
  },
  {
    key: 'threads',
    name: 'Threads',
    icon: ThreadsIcon,
    iconBg: 'bg-black text-white dark:bg-white dark:text-black',
    desc: 'Kirim postingan mikroblog teks (max 500 karakter) & gambar',
    badge: 'Microblog',
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    icon: TikTokIcon,
    iconBg: 'bg-black text-white dark:bg-white dark:text-black',
    desc: 'Direct video upload (max 10 menit) melalui TikTok Open API',
    badge: 'Direct Post',
  },
]

export function SettingsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [activePlatformModal, setActivePlatformModal] = useState<PlatformKey | null>(null)
  const [currentTime] = useState(() => Date.now())
  const [searchParams, setSearchParams] = useSearchParams()

  function loadAccounts() {
    supabase.from('connected_accounts').select('*').eq('is_active', true).then(({ data }) => {
      setAccounts(data ?? [])
    })
  }

  useEffect(() => {
    loadAccounts()

    // Cek respon redirect dari OAuth Meta
    const success = searchParams.get('success')
    const count = searchParams.get('count')
    const error = searchParams.get('error')

    if (success === 'connected') {
      toast.success(`Berhasil! ${count || 'Beberapa'} akun Meta terhubung secara otomatis.`)
      setSearchParams({})
      loadAccounts()
    } else if (error) {
      toast.error('Gagal menghubungkan Meta: ' + decodeURIComponent(error))
      setSearchParams({})
    }
  }, [searchParams, setSearchParams])

  function isExpiringSoon(expiresAt: string | null) {
    if (!expiresAt) return false
    return new Date(expiresAt).getTime() - currentTime < 7 * 24 * 3600_000
  }

  async function handleDisconnect(id: string, name: string) {
    if (!confirm(`Yakin ingin memutuskan koneksi akun "${name}"?`)) return
    const { error } = await supabase.from('connected_accounts').delete().eq('id', id)
    if (error) {
      toast.error('Gagal menghapus akun: ' + error.message)
    } else {
      toast.success(`Akun "${name}" diputuskan`)
      loadAccounts()
    }
  }

  function handleMetaConnect() {
    // Redirect langsung ke serverless OAuth Meta initiator
    window.location.href = '/api/auth/meta-login'
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Pengaturan & Koneksi Akun</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Hubungkan akun media sosial Anda secara otomatis via 1-Click OAuth.
          </p>
        </div>

        {/* Tombol Universal 1-Click Meta Login */}
        <button
          onClick={handleMetaConnect}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <LogIn size={15} />
          Auto-Connect Meta (IG & FB)
        </button>
      </div>

      {/* List Platform Media Sosial */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">Platform Sosial Media</h3>
        <div className="grid grid-cols-1 gap-3">
          {SUPPORTED_PLATFORMS.map((platform) => {
            const connectedList = accounts.filter((a) => a.platform === platform.key)
            const isConnected = connectedList.length > 0
            const Icon = platform.icon

            return (
              <div
                key={platform.key}
                className="rounded-xl border border-border bg-card p-4 transition-all hover:border-foreground/20 shadow-xs"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className={`p-2.5 rounded-xl shrink-0 ${platform.iconBg}`}>
                      <Icon className="size-5" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-foreground">{platform.name}</h4>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {platform.badge}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{platform.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {platform.supportsMetaOAuth ? (
                      <button
                        onClick={handleMetaConnect}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
                        title="Otomatis login tanpa input form"
                      >
                        <LogIn size={14} />
                        Auto Connect
                      </button>
                    ) : (
                      <button
                        onClick={() => setActivePlatformModal(platform.key)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        <Plus size={14} />
                        Connect
                      </button>
                    )}
                  </div>
                </div>

                {/* Sublist: Akun yang sedang terhubung untuk platform ini */}
                {isConnected && (
                  <div className="mt-3.5 pt-3.5 border-t border-border/60 space-y-2">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Akun Aktif ({connectedList.length}):
                    </p>
                    <div className="space-y-1.5">
                      {connectedList.map((acc) => (
                        <div
                          key={acc.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-foreground truncate">{acc.account_name}</span>
                            <span className="text-[11px] text-muted-foreground">
                              (ID: <code className="font-mono">{acc.platform_user_id}</code>)
                            </span>
                            <span className="text-[10px] text-muted-foreground hidden sm:inline">
                              · Terhubung {acc.created_at ? formatWIB(acc.created_at) : '—'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isExpiringSoon(acc.token_expires_at) ? (
                              <span className="flex items-center gap-1 text-[11px] text-amber-600 font-medium">
                                <AlertCircle size={13} /> Token Segera Habis
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[11px] text-green-600 font-medium">
                                <CheckCircle2 size={13} /> Terhubung
                              </span>
                            )}
                            <button
                              onClick={() => handleDisconnect(acc.id, acc.account_name)}
                              className="p-1 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 rounded text-muted-foreground transition-colors cursor-pointer"
                              title="Putuskan Akun"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Google Drive Storage Info */}
      <div className="p-4 rounded-xl border border-border bg-card space-y-2">
        <div className="flex items-center gap-2">
          <HardDrive className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">Google Drive Storage Engine</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Media video dan foto disimpan di Google Drive melalui OAuth2 (Folder: <code>15z6fpJ3z96iQEUfJMspSTmYPghnIHW9S</code>). Proxy HTTP 206 partial content aktif untuk transmisi streaming video ke Meta & TikTok.
        </p>
        <div className="pt-1">
          <span className="inline-flex items-center gap-1.5 text-xs text-green-600 font-medium bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded">
            <CheckCircle2 size={14} /> Terhubung & Siap Digunakan
          </span>
        </div>
      </div>

      <ConnectPlatformModal
        platform={activePlatformModal}
        isOpen={activePlatformModal !== null}
        onClose={() => setActivePlatformModal(null)}
        onSuccess={loadAccounts}
      />
    </div>
  )
}
