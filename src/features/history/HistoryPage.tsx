import { useEffect, useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { formatWIB } from '@/shared/lib/date'
import { RefreshCw, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

export function HistoryPage() {
  const [targets, setTargets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('post_targets')
        .select('*, posts(*), connected_accounts(account_name, platform)')
        .order('created_at', { ascending: false })
        .limit(50)
      setTargets(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function reload() {
    const { data } = await supabase
      .from('post_targets')
      .select('*, posts(*), connected_accounts(account_name, platform)')
      .order('created_at', { ascending: false })
      .limit(50)
    setTargets(data ?? [])
  }

  async function retry(targetId: string) {
    const { error } = await supabase
      .from('post_targets')
      .update({ status: 'PENDING', error_payload: null, polling_attempts: 0 })
      .eq('id', targetId)
    if (error) {
      toast.error('Gagal mereset target')
    } else {
      toast.success('Target direset ke PENDING')
      reload()
    }
  }

  async function triggerDispatcher() {
    try {
      toast.info('Memproses antrean postingan...')
      const res = await fetch('/api/cron/dispatcher')
      const data = await res.json()
      if (data.success) {
        toast.success('Antrean berhasil diproses!')
      } else {
        toast.error('Gagal: ' + (data.error || 'Unknown error'))
      }
      reload()
    } catch (err: any) {
      toast.error(err.message || 'Gagal memanggil dispatcher')
    }
  }

  const statusColor: Record<string, string> = {
    SUCCESS: 'bg-green-100 text-green-700',
    FAILED: 'bg-red-100 text-red-700',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
    PENDING: 'bg-blue-100 text-blue-700',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Riwayat Eksekusi</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pantau status eksekusi dan log pengiriman postingan ke sosial media.
          </p>
        </div>
        <button
          onClick={triggerDispatcher}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
        >
          <RefreshCw size={13} />
          Jalankan Antrean Sekarang
        </button>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : targets.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada riwayat.</p>
      ) : (
        <div className="space-y-2">
          {targets.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-3 rounded-md border border-border bg-card">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {t.posts?.title || t.posts?.content_text?.slice(0, 50) || '—'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.connected_accounts?.platform} · {t.connected_accounts?.account_name} · {formatWIB(t.created_at)}
                </p>
                {t.error_payload?.message && (
                  <p className="text-xs text-red-500 mt-1 truncate">{t.error_payload.message}</p>
                )}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${statusColor[t.status] || 'bg-muted text-muted-foreground'}`}>
                {t.status}
              </span>
              {t.status === 'FAILED' && (
                <button onClick={() => retry(t.id)} className="p-1.5 hover:bg-accent rounded" title="Retry">
                  <RefreshCw size={14} />
                </button>
              )}
              {t.external_post_url && (
                <a href={t.external_post_url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-accent rounded">
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
