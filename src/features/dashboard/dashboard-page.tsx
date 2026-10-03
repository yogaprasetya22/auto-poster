import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { Link } from 'react-router-dom'
import { SkeletonContainer } from '@/shared/components/ui/skeleton-container'
import { DashboardMetrics } from './components/dashboard-metrics'
import { TodaySchedule } from './components/today-schedule'
import { ChannelDistribution, PlatformStat } from './components/channel-distribution'
import { RecentActivity } from './components/recent-activity'

interface Metrics {
  scheduled: number
  completed: number
  failed: number
}

export function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics>({ scheduled: 0, completed: 0, failed: 0 })
  const [todayPosts, setTodayPosts] = useState<any[]>([])
  const [recentLogs, setRecentLogs] = useState<any[]>([])
  const [allTargets, setAllTargets] = useState<any[]>([])
  const [connectedCount, setConnectedCount] = useState(0)
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d' | 'month'>('7d')
  const [loading, setLoading] = useState(true)

  async function loadData() {
    setLoading(true)
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

    const [sched, comp, fail, posts, targets, accounts, logs] = await Promise.all([
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'SCHEDULED'),
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'COMPLETED'),
      supabase.from('posts').select('id', { count: 'exact', head: true }).in('status', ['FAILED', 'PARTIALLY_FAILED']),
      supabase.from('posts').select('*')
        .gte('scheduled_at', today.toISOString())
        .lt('scheduled_at', tomorrow.toISOString())
        .order('scheduled_at', { ascending: true }),
      supabase.from('post_targets').select('id, platform, status, created_at, posts(title, content_text)')
        .gte('created_at', timeframeDate.toISOString())
        .order('created_at', { ascending: false }),
      supabase.from('connected_accounts').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('post_targets').select('id, platform, status, http_status_code, created_at, posts(title, content_text)')
        .order('created_at', { ascending: false })
        .limit(6),
    ])

    setMetrics({
      scheduled: sched.count ?? 0,
      completed: comp.count ?? 0,
      failed: fail.count ?? 0,
    })
    setTodayPosts(posts.data ?? [])
    setAllTargets(targets.data ?? [])
    setConnectedCount(accounts.count ?? 0)
    setRecentLogs(logs.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()

    // Supabase Realtime channel subscription (Zero-overhead, instant live CDC)
    const channel = supabase
      .channel('dashboard_realtime_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        loadData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_targets' }, () => {
        loadData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connected_accounts' }, () => {
        loadData()
      })
      .subscribe()

    return () => {
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
            onClick={loadData}
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
    </div>
  )
}
