import { useEffect, useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { formatWIB } from '@/shared/lib/date'
import { CalendarClock, CheckCircle2, XCircle, Clock } from 'lucide-react'

interface Metrics {
  scheduled: number
  completed: number
  failed: number
}

export function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics>({ scheduled: 0, completed: 0, failed: 0 })
  const [todayPosts, setTodayPosts] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const [sched, comp, fail, posts] = await Promise.all([
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'SCHEDULED'),
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'COMPLETED'),
        supabase.from('posts').select('id', { count: 'exact', head: true }).in('status', ['FAILED', 'PARTIALLY_FAILED']),
        supabase.from('posts').select('*')
          .gte('scheduled_at', today.toISOString())
          .lt('scheduled_at', tomorrow.toISOString())
          .order('scheduled_at'),
      ])

      setMetrics({
        scheduled: sched.count ?? 0,
        completed: comp.count ?? 0,
        failed: fail.count ?? 0,
      })
      setTodayPosts(posts.data ?? [])
    }
    load()
  }, [])

  const cards = [
    { label: 'Terjadwal', value: metrics.scheduled, icon: CalendarClock, color: 'text-blue-500' },
    { label: 'Berhasil', value: metrics.completed, icon: CheckCircle2, color: 'text-green-500' },
    { label: 'Gagal', value: metrics.failed, icon: XCircle, color: 'text-red-500' },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Dashboard</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card">
            <c.icon size={28} className={c.color} />
            <div>
              <p className="text-2xl font-bold">{c.value}</p>
              <p className="text-sm text-muted-foreground">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-base font-medium mb-3">Jadwal Hari Ini</h3>
        {todayPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada postingan hari ini.</p>
        ) : (
          <div className="space-y-2">
            {todayPosts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-md border border-border bg-card">
                <Clock size={16} className="text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.title || p.content_text.slice(0, 60)}</p>
                  <p className="text-xs text-muted-foreground">{formatWIB(p.scheduled_at)}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  p.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                  p.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
