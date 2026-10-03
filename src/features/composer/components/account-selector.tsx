import { useEffect, useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useComposerStore } from '../store/useComposerStore'
import { Check } from 'lucide-react'
import { InstagramIcon, FacebookIcon, ThreadsIcon, TikTokIcon } from '@/shared/components/icons/PlatformIcons'

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
  const { targetAccountIds, toggleTarget } = useComposerStore()

  useEffect(() => {
    async function fetchAccounts() {
      const { data } = await supabase
        .from('connected_accounts')
        .select('id, account_name, platform, account_avatar_url')
        .eq('is_active', true)
      
      setAccounts(data || [])
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
    <div className="space-y-2">
      <label className="text-sm font-medium">Target Platform & Akun</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {accounts.map((acc) => {
          const isSelected = targetAccountIds.includes(acc.id)
          const config = platformIcons[acc.platform]
          const IconComponent = config?.icon || InstagramIcon

          return (
            <button
              key={acc.id}
              type="button"
              onClick={() => toggleTarget(acc.id)}
              className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-foreground/30'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground">
                  <IconComponent className="size-3.5" />
                  {config?.label || acc.platform}
                </span>
                <span className="text-sm font-medium text-foreground truncate">{acc.account_name}</span>
              </div>
              <div
                className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                  isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'
                }`}
              >
                {isSelected && <Check size={12} strokeWidth={3} />}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
