import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { SkeletonContainer } from '@/shared/components/ui/skeleton-container'
import { useComposerStore } from '@/features/composer/store/use-composer-store'
import { DashboardMetrics } from './components/dashboard-metrics'
import { TodaySchedule } from './components/today-schedule'
import { ChannelDistribution, PlatformStat } from './components/channel-distribution'
import { RecentActivity } from './components/recent-activity'
import { HistoryEventCalendar } from '@/features/history/components/history-event-calendar'
import { HistoryDetailDrawer } from '@/features/history/components/history-detail-drawer'

interface Metrics {
  scheduled: number
  completed: number
  failed: number
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { setScheduledAt } = useComposerStore()
  const [metrics, setMetrics] = useState<Metrics>({ scheduled: 0, completed: 0, failed: 0 })
  const [todayPosts, setTodayPosts] = useState<any[]>([])
  const [recentLogs, setRecentLogs] = useState<any[]>([])
  const [allTargets, setAllTargets] = useState<any[]>([])
  const [calendarTargets, setCalendarTargets] = useState<any[]>([])
  const [selectedTarget, setSelectedTarget] = useState<any | null>(null)
  const [connectedCount, setConnectedCount] = useState(0)
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d' | 'month'>('7d')
  const [loading, setLoading] = useState(true)

  async function loadData(isSilent = false) {
    if (!isSilent) setLoading(true)
    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Timeframe start
    const timeframeDate = new Date(now)
    if (selectedTimeframe === '24h') timeframeDate.setHours(now.getHours() - 24)
    else if (selectedTimeframe === '7d') timeframeDate.setDate(now.getDate() - 7)
    else if (selectedTimeframe === '30d') timeframeDate.setDate(now.getDate() - 30)
    else if (selectedTimeframe === 'month') timeframeDate.setDate(1)

    const [sched, comp, fail, posts, targets, accounts, logs, calTargets] = await Promise.all([
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'SCHEDULED'),
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'COMPLETED'),
      supabase.from('posts').select('id', { count: 'exact', head: true }).in('status', ['FAILED', 'PARTIALLY_FAILED']),
      supabase.from('posts').select('*')
        .gte('scheduled_at', today.toISOString())
        .lt('scheduled_at', tomorrow.toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(5),
      supabase.from('post_targets').select('id, platform, status, created_at, posts(title, content_text)')
        .gte('created_at', timeframeDate.toISOString())
        .order('created_at', { ascending: false }),
      supabase.from('connected_accounts').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('post_targets').select('id, platform, status, http_status_code, created_at, posts(title, content_text)')
        .order('updated_at', { ascending: false })
        .limit(6),
      supabase.from('post_targets').select('*, posts(*), connected_accounts(account_name, platform)')
        .order('updated_at', { ascending: false })
        .limit(100),
    ])

    let activeToday = posts.data ?? []
    // Jika tidak ada jadwal di hari ini, ambil 5 antrean langsung / postingan terbaru
    if (activeToday.length === 0) {
      const { data: recentQueue } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
      activeToday = recentQueue ?? []
    }

    setMetrics({
      scheduled: sched.count ?? 0,
      completed: comp.count ?? 0,
      failed: fail.count ?? 0,
    })
    setTodayPosts(activeToday.slice(0, 5))
    setAllTargets(targets.data ?? [])
    setCalendarTargets(calTargets.data ?? [])
    setConnectedCount(accounts.count ?? 0)
    setRecentLogs(logs.data ?? [])
    if (!isSilent) setLoading(false)
  }

  async function retryTarget(targetId: string) {
    const { error } = await supabase
      .from('post_targets')
      .update({ status: 'PENDING', error_payload: null, polling_attempts: 0 })
      .eq('id', targetId)
    if (error) {
      toast.error('Gagal me-reset target')
    } else {
      toast.success('Target direset ke PENDING, engine akan segera mengeksekusi ulang!')
      loadData(true)
      fetch('/api/cron/dispatcher').catch(() => {})
    }
  }

  async function deleteTarget(targetId: string) {
    if (!confirm('Hapus log target ini?')) return
    const { error } = await supabase.from('post_targets').delete().eq('id', targetId)
    if (error) {
      toast.error('Gagal menghapus target')
    } else {
      toast.success('Target berhasil dihapus')
      if (selectedTarget?.id === targetId) setSelectedTarget(null)
      loadData(true)
    }
  }

  function handleDateClickCreate(dateStr: string) {
    // Set jam upload default (1 jam ke depan)
    const currentHour = new Date().getHours()
    const nextHour = String((currentHour + 1) % 24).padStart(2, '0')
    const scheduledDateTime = `${dateStr}T${nextHour}:00`

    setScheduledAt(scheduledDateTime)
    toast.success(`Tanggal postingan disetel ke ${dateStr}. Silakan atur jam upload di Composer!`)
    navigate('/composer')
  }

  useEffect(() => {
    loadData(false)

    // Supabase Realtime channel subscription dengan debounce dan background reload (tanpa trigger skeleton)
    let debounceTimer: any = null
    const handleRealtimeChange = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        loadData(true)
      }, 500)
    }

    const channel = supabase
      .channel('dashboard_realtime_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, handleRealtimeChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_targets' }, handleRealtimeChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connected_accounts' }, handleRealtimeChange)
      .subscribe()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      supabase.removeChannel(channel)
    }
  }, [selectedTimeframe])

  const totalCalculated = metrics.completed + metrics.scheduled + metrics.failed
  const successRate = totalCalculated > 0 ? ((metrics.completed / totalCalculated) * 100).toFixed(1) : '100.0'

  // Dynamic distribution based on targets
  const platformStats: PlatformStat[] = useMemo(() => {
    const counts: Record<string, number> = {
      tiktok: 0,
      instagram: 0,
      facebook_page: 0,
      threads: 0,
    }

    allTargets.forEach((t) => {
      const p = t.platform || 'facebook_page'
      counts[p] = (counts[p] || 0) + 1
    })

    const total = allTargets.length || 1
    return [
      { key: 'tiktok', name: 'TikTok', count: counts.tiktok, pct: Math.round((counts.tiktok / total) * 100) || 0, color: 'bg-black dark:bg-white' },
      { key: 'instagram', name: 'Instagram Reels', count: counts.instagram, pct: Math.round((counts.instagram / total) * 100) || 0, color: 'bg-[#4B5563]' },
      { key: 'facebook_page', name: 'Facebook Page', count: counts.facebook_page, pct: Math.round((counts.facebook_page / total) * 100) || 0, color: 'bg-[#9CA3AF]' },
      { key: 'threads', name: 'Threads', count: counts.threads, pct: Math.round((counts.threads / total) * 100) || 0, color: 'bg-[#D1D5DB]' },
    ]
  }, [allTargets])

  return (
    <div className="flex flex-col gap-6 w-full pb-8">
      {/* Top Action Bar & Page Meta */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white font-sans">Dashboard Overview</h1>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black dark:bg-white text-white dark:text-black font-semibold tracking-wider">
              LIVE SYNC
            </span>
          </div>
          <p className="text-xs text-[#6B7280]">
            Metrik agregat distribusi multi-platform real-time dan status antrean aktif engine.
          </p>
        </div>

        {/* Timeframe Controls & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-0.5 rounded-lg shadow-xs">
            {(['24h', '7d', '30d', 'month'] as const).map((t) => {
              const labelMap = { '24h': '24 Jam', '7d': '7 Hari', '30d': '30 Hari', 'month': 'Bulan Ini' }
              const active = selectedTimeframe === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTimeframe(t)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                    active
                      ? 'bg-black dark:bg-white text-white dark:text-black font-semibold shadow-xs'
                      : 'text-[#6B7280] hover:text-black dark:hover:text-white font-medium'
                  }`}
                >
                  {labelMap[t]}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => loadData(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] text-[#374151] dark:text-gray-300 hover:text-black dark:hover:text-white hover:border-black dark:hover:border-white transition-all shadow-xs text-xs font-medium cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Refresh</span>
            <kbd className="font-mono text-[10px] px-1 py-0.5 rounded bg-[#F3F4F6] dark:bg-[#27272A] text-[#6B7280] border border-[#E5E7EB] dark:border-[#3F3F46]">
              ⌘R
            </kbd>
          </button>

          <Link
            to="/composer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black text-xs hover:bg-[#262626] transition-all shadow-xs font-medium"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Buat Postingan</span>
            <kbd className="font-mono text-[10px] px-1 py-0.5 rounded bg-[#262626] dark:bg-[#E5E7EB] text-white dark:text-black">C</kbd>
          </Link>
        </div>
      </div>

      {/* 4-Column Bento Metric Cards Component */}
      <DashboardMetrics
        loading={loading}
        completed={metrics.completed}
        scheduled={metrics.scheduled}
        failed={metrics.failed}
        successRate={successRate}
        allTargetsCount={allTargets.length}
        connectedCount={connectedCount}
        todayPostsCount={todayPosts.length}
      />

      {/* Main Content Split Grid: 7 Cols Left / 5 Cols Right */}
      <SkeletonContainer isLoading={loading}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols): Jadwal Hari Ini */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <TodaySchedule todayPosts={todayPosts} />
          </div>

          {/* Right Column (5 cols): Kanal Distribusi & Aktivitas Log Real-Time */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <ChannelDistribution
              selectedTimeframe={selectedTimeframe}
              totalTargets={allTargets.length}
              platformStats={platformStats}
            />
            <RecentActivity recentLogs={recentLogs} />
          </div>
        </div>
      </SkeletonContainer>

      {/* Full Width Event Calendar Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-black dark:text-white">
              Kalender Jadwal & Stok Konten
            </h2>
            <p className="text-xs text-[#6B7280]">
              Klik pada kotak tanggal untuk otomatis membuka Composer dengan tanggal tersebut.
            </p>
          </div>
          <Link
            to="/history"
            className="text-xs font-semibold text-black dark:text-white hover:underline flex items-center gap-1"
          >
            <span>Buka Riwayat Penuh ↗</span>
          </Link>
        </div>

        <HistoryEventCalendar
          loading={loading}
          targets={calendarTargets}
          onSelectTarget={(t) => setSelectedTarget(t)}
          onRetry={retryTarget}
          onDelete={deleteTarget}
          onDateClickCreate={handleDateClickCreate}
        />
      </div>

      {/* Drawer Detail Inspeksi Konten dengan Simulator */}
      <HistoryDetailDrawer
        target={selectedTarget}
        onClose={() => setSelectedTarget(null)}
        onRetry={retryTarget}
        onDelete={deleteTarget}
      />
    </div>
  )
}
