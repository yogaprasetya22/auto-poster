import { useEffect, useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { formatWIB } from '@/shared/lib/date'
import { RefreshCw, ExternalLink, Calendar, Clock, Check, X } from 'lucide-react'
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

  const [editingSchedule, setEditingSchedule] = useState<{ postId: string; currentSchedule: string } | null>(null)
  const [newScheduleValue, setNewScheduleValue] = useState('')

  async function updatePostSchedule(postId: string) {
    if (!newScheduleValue) {
      toast.error('Pilih jadwal waktu baru')
      return
    }
    const isoString = new Date(newScheduleValue).toISOString()
    const { error: postErr } = await supabase
      .from('posts')
      .update({ scheduled_at: isoString, status: 'SCHEDULED' })
      .eq('id', postId)

    if (postErr) {
      toast.error('Gagal memperbarui jadwal: ' + postErr.message)
      return
    }

    // Reset status targets agar siap di-pickup ulang sesuai jadwal baru
    await supabase
      .from('post_targets')
      .update({ status: 'PENDING', error_payload: null, polling_attempts: 0 })
      .eq('post_id', postId)

    toast.success('Jadwal berhasil diperbarui!')
    setEditingSchedule(null)
    reload()
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
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap mt-0.5">
                  <span>{t.connected_accounts?.platform}</span>
                  <span>·</span>
                  <span>{t.connected_accounts?.account_name}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-foreground/80 font-medium">
                    <Clock size={12} />
                    Jadwal: {t.posts?.scheduled_at ? formatWIB(t.posts.scheduled_at) : 'Langsung'}
                  </span>
                </p>
                {t.error_payload?.message && (
                  <p className="text-xs text-red-500 mt-1 truncate">{t.error_payload.message}</p>
                )}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${statusColor[t.status] || 'bg-muted text-muted-foreground'}`}>
                {t.status}
              </span>
              {t.status !== 'SUCCESS' && t.posts?.id && (
                <button
                  onClick={() => {
                    const currentVal = t.posts.scheduled_at
                      ? new Date(new Date(t.posts.scheduled_at).getTime() - new Date().getTimezoneOffset() * 60000)
                          .toISOString()
                          .slice(0, 16)
                      : ''
                    setEditingSchedule({ postId: t.posts.id, currentSchedule: t.posts.scheduled_at })
                    setNewScheduleValue(currentVal)
                  }}
                  className="p-1.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Ubah Jadwal Waktu"
                >
                  <Calendar size={14} />
                </button>
              )}
              {t.status === 'FAILED' && (
                <button onClick={() => retry(t.id)} className="p-1.5 hover:bg-accent rounded cursor-pointer" title="Retry">
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

      {/* Modal / Dialog Ubah Jadwal */}
      {editingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Ubah Jadwal Eksekusi</h3>
              </div>
              <button
                onClick={() => setEditingSchedule(null)}
                className="p-1 hover:bg-accent rounded text-muted-foreground cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Jadwal Baru (WIB)</label>
                <input
                  type="datetime-local"
                  value={newScheduleValue}
                  onChange={(e) => setNewScheduleValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Quick presets */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-muted-foreground font-medium">Preset Cepat:</span>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
                      .toISOString()
                      .slice(0, 16)
                    setNewScheduleValue(now)
                  }}
                  className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground cursor-pointer"
                >
                  Sekarang
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const in10m = new Date(Date.now() + 10 * 60000 - new Date().getTimezoneOffset() * 60000)
                      .toISOString()
                      .slice(0, 16)
                    setNewScheduleValue(in10m)
                  }}
                  className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground cursor-pointer"
                >
                  +10 Menit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tomorrow = new Date(Date.now() + 24 * 3600000 - new Date().getTimezoneOffset() * 60000)
                      .toISOString()
                      .slice(0, 16)
                    setNewScheduleValue(tomorrow)
                  }}
                  className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground cursor-pointer"
                >
                  Besok
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setEditingSchedule(null)}
                className="px-3 py-1.5 rounded-lg border border-input bg-background text-xs font-medium hover:bg-accent cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => updatePostSchedule(editingSchedule.postId)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 cursor-pointer shadow-xs"
              >
                <Check size={14} />
                Simpan Jadwal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
