import { useEffect, useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useComposerStore } from '../store/use-composer-store'
import { Check } from 'lucide-react'
import { InstagramIcon, FacebookIcon, ThreadsIcon, TikTokIcon } from '@/shared/components/icons/platform-icons'

interface Account {
  id: string
  account_name: string
  platform: 'facebook_page' | 'instagram' | 'threads' | 'tiktok'
  account_avatar_url?: string | null
}

const platformIcons: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  instagram: { label: 'Instagram', icon: InstagramIcon },
  facebook_page: { label: 'Facebook', icon: FacebookIcon },
  threads: { label: 'Threads', icon: ThreadsIcon },
  tiktok: { label: 'TikTok', icon: TikTokIcon },
}

export function AccountSelector() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [quotaStats, setQuotaStats] = useState<Record<string, { countToday: number; limit: number; safeLimit: number }>>({})
  const { targetAccountIds, toggleTarget } = useComposerStore()

  useEffect(() => {
    async function fetchAccounts() {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const [{ data: accData }, { data: recentErrors }] = await Promise.all([
        supabase
          .from('connected_accounts')
          .select('id, account_name, platform, account_avatar_url')
          .eq('is_active', true),
        supabase
          .from('post_targets')
          .select('account_id, platform, status, error_payload, created_at')
          .gte('created_at', oneDayAgo)
          .eq('status', 'FAILED'),
      ])

      // Akun TikTok yang terkena limit spam_risk_too_many_posts atau limit 24 jam
      const cooledIds: string[] = []
      if (recentErrors && recentErrors.length > 0) {
        for (const err of recentErrors) {
          const errStr = typeof err.error_payload === 'string'
            ? err.error_payload
            : JSON.stringify(err.error_payload || '')
          if (errStr.includes('spam_risk_too_many_posts') || errStr.includes('too many posts') || err.platform === 'tiktok') {
            if (err.account_id && !cooledIds.includes(err.account_id)) {
              cooledIds.push(err.account_id)
            }
          }
        }
      }

      setCooldownAccountIds(cooledIds)
      setAccounts(accData || [])

      // Fetch live quota real-time langsung dari API platform (Meta & TikTok)
      fetch('/api/accounts-quota')
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data) {
            setQuotaStats(res.data)
          }
        })
        .catch(() => {})

      setLoading(false)
    }
    fetchAccounts()
  }, [])

  if (loading) {
    return <div className="text-xs text-muted-foreground animate-pulse">Memuat akun terhubung...</div>
  }

  if (accounts.length === 0) {
    return (
      <div className="p-3 rounded-md border border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300">
        Belum ada akun terhubung. Hubungkan akun di menu <a href="/settings" className="underline font-medium">Pengaturan</a> terlebih dahulu.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-black flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[15px]">send_and_archive</span>
          <span>Target Platform & Akun Distribusi</span>
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const allIds = accounts.map((a) => a.id)
              const allSelected = allIds.every((id) => targetAccountIds.includes(id))
              if (allSelected) {
                allIds.forEach((id) => toggleTarget(id))
              } else {
                allIds.forEach((id) => {
                  if (!targetAccountIds.includes(id)) toggleTarget(id)
                })
              }
            }}
            className="text-[11px] font-mono text-black hover:underline cursor-pointer font-medium"
          >
            {accounts.every((a) => targetAccountIds.includes(a.id)) ? 'Lepas Semua' : 'Pilih Semua'}
          </button>
          <span className="font-mono text-[10px] text-[#6B7280]">({targetAccountIds.length}/{accounts.length} AKTIF)</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {accounts.map((acc) => {
          const isCooldown = cooldownAccountIds.includes(acc.id)
          const isSelected = targetAccountIds.includes(acc.id)
          const config = platformIcons[acc.platform]
          const IconComponent = config?.icon || InstagramIcon
          const quota = quotaStats[acc.id]

          return (
            <button
              key={acc.id}
              type="button"
              disabled={isCooldown}
              onClick={() => {
                if (!isCooldown) toggleTarget(acc.id)
              }}
              className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all ${
                isCooldown
                  ? 'border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 text-[#6B7280] opacity-80 cursor-not-allowed'
                  : isSelected
                  ? 'border-black bg-black text-white shadow-xs cursor-pointer'
                  : 'border-[#E5E7EB] bg-[#FAFAFA] text-[#4B5563] hover:border-black hover:bg-white cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`size-5 rounded flex items-center justify-center shrink-0 ${
                  isCooldown ? 'bg-amber-100 text-amber-700' : isSelected ? 'bg-white/20' : 'bg-[#E5E7EB]'
                }`}>
                  <IconComponent className={`size-3 ${isSelected ? 'text-white' : 'text-black'}`} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-semibold truncate leading-tight">{acc.account_name}</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[9px] font-mono uppercase ${isSelected ? 'text-white/70' : 'text-[#6B7280]'}`}>
                      {config?.label || acc.platform}
                    </span>
                    {quota && (
                      <span
                        title="Jumlah postingan hari ini langsung dari API platform resmi"
                        className={`text-[8.5px] font-mono px-1 py-0.2 rounded font-bold ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : quota.countToday >= quota.safeLimit
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {quota.countToday}/{quota.limit} Hari Ini
                      </span>
                    )}
                    {isCooldown && (
                      <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300 font-bold">
                        COOLDOWN
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div
                className={`size-3.5 rounded-full flex items-center justify-center border shrink-0 transition-colors ${
                  isCooldown
                    ? 'border-amber-300 bg-transparent text-amber-500'
                    : isSelected
                    ? 'bg-white border-white text-black'
                    : 'border-[#9CA3AF]'
                }`}
              >
                {isSelected && !isCooldown && <Check size={9} strokeWidth={3} />}
                {isCooldown && <span className="text-[8px] font-bold">⏳</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
