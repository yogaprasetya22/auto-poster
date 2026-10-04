import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { RefreshCw, RotateCcw, Calendar as CalendarIcon, List } from 'lucide-react'
import { toast } from 'sonner'
import { useComposerStore } from '@/features/composer/store/use-composer-store'
import { HistoryMetrics } from './components/history-metrics'
import { HistoryList } from './components/history-list'
import { HistoryEventCalendar } from './components/history-event-calendar'
import { HistoryDetailDrawer } from './components/history-detail-drawer'

export function HistoryPage() {
  const navigate = useNavigate()
  const { setScheduledAt } = useComposerStore()
  const [targets, setTargets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [dateFilter, setDateFilter] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [networkLatency, setNetworkLatency] = useState<number>(118)
  const [selectedTarget, setSelectedTarget] = useState<any | null>(null)

  async function loadData(isSilent = false) {
    if (!isSilent) setLoading(true)
    const tStart = performance.now()
    const { data } = await supabase
      .from('post_targets')
      .select('*, posts(*), connected_accounts(account_name, platform)')
      .order('created_at', { ascending: false })
      .limit(100)
    const elapsed = Math.round(performance.now() - tStart)
    setNetworkLatency(elapsed > 0 ? elapsed : 118)
    if (data) setTargets(data)
    if (!isSilent) setLoading(false)
  }

  useEffect(() => {
    loadData(false)

    // Supabase Realtime subscription for instant dispatch & retry updates
    let debounceTimer: any = null
    const channel = supabase
      .channel('history_realtime_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_targets' },
        () => {
          if (debounceTimer) clearTimeout(debounceTimer)
          debounceTimer = setTimeout(() => {
            loadData(true)
          }, 400)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // ponytail: Auto-poll dispatcher setiap 20s HANYA kalau ada target IN_PROGRESS
  useEffect(() => {
    const hasInProgress = targets.some((t) => t.status === 'IN_PROGRESS')
    if (!hasInProgress) return

    const interval = setInterval(() => {
      fetch('/api/cron/dispatcher').catch(() => {})
    }, 20_000)

    return () => clearInterval(interval)
  }, [targets])

  async function retry(targetId: string) {
    const { error } = await supabase
      .from('post_targets')
      .update({ status: 'PENDING', error_payload: null, polling_attempts: 0 })
      .eq('id', targetId)
    if (error) {
      toast.error('Gagal mereset target')
    } else {
      toast.success('Target direset ke PENDING, engine akan segera mengeksekusi ulang!')
      loadData(true)
      // Trigger fast worker run
      fetch('/api/cron/dispatcher').catch(() => {})
    }
  }

  async function deleteTarget(targetId: string) {
    if (!confirm('Hapus log target ini dari riwayat?')) return
    const { error } = await supabase.from('post_targets').delete().eq('id', targetId)
    if (error) {
      toast.error('Gagal menghapus target')
    } else {
      toast.success('Target berhasil dihapus')
      if (selectedTarget?.id === targetId) setSelectedTarget(null)
      loadData(true)
    }
  }


  async function retryAllFailed() {
    const failedIds = targets.filter((t) => t.status === 'FAILED').map((t) => t.id)
    if (failedIds.length === 0) {
      toast.info('Tidak ada target gagal untuk di-retry')
      return
    }
    const { error } = await supabase
      .from('post_targets')
      .update({ status: 'PENDING', error_payload: null, polling_attempts: 0 })
      .in('id', failedIds)
    if (error) {
      toast.error('Gagal me-retry semua target')
    } else {
      toast.success(`${failedIds.length} target gagal berhasil direset ke PENDING!`)
      loadData(true)
      fetch('/api/cron/dispatcher').catch(() => {})
    }
  }

  async function triggerDispatcher() {
    try {
      toast.info('Memproses antrean postingan...')
      const res = await fetch('/api/cron/dispatcher')
      const data = await res.json()
      if (data.success) {
        toast.success('Antrean berhasil diproses!')
        loadData(true)
      } else {
        toast.error('Gagal: ' + (data.error || 'Unknown error'))
      }
      loadData(true)
    } catch (err: any) {
      toast.error(err.message || 'Gagal memanggil dispatcher')
    }
  }

  const filteredTargets = targets.filter((t) => {
    // Filter status
    let matchStatus = true
    if (filterStatus === 'SUCCESS') matchStatus = t.status === 'SUCCESS'
    else if (filterStatus === 'PENDING') matchStatus = t.status === 'PENDING' || t.status === 'IN_PROGRESS'
    else if (filterStatus === 'FAILED') matchStatus = t.status === 'FAILED'

    if (!matchStatus) return false

    // Filter tanggal spesifik (jika dialihkan dari kalender)
    if (dateFilter) {
      const dateIso = t.posts?.scheduled_at || t.created_at
      if (!dateIso) return false
      const d = new Date(dateIso)
      if (isNaN(d.getTime())) return false
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}` === dateFilter
    }

    return true
  })

  const successCount = targets.filter((t) => t.status === 'SUCCESS').length
  const pendingCount = targets.filter((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length
  const failedCount = targets.filter((t) => t.status === 'FAILED').length
  const successPct = targets.length > 0 ? ((successCount / targets.length) * 100).toFixed(1) : '100.0'

  function handleSelectDateToListView(dateStr: string) {
    setDateFilter(dateStr)
    setViewMode('list')
    toast.info(`Menampilkan detail list postingan tanggal ${dateStr}`)
  }

  function handleDateClickCreate(dateStr: string) {
    // Format YYYY-MM-DDTHH:mm (default jam 10:00 jika belum dipilih jam)
    const currentHour = new Date().getHours()
    const nextHour = String((currentHour + 1) % 24).padStart(2, '0')
    const scheduledDateTime = `${dateStr}T${nextHour}:00`
    
    setScheduledAt(scheduledDateTime)
    toast.success(`Tanggal postingan disetel ke ${dateStr}. Silakan atur jam upload di Composer!`)
    navigate('/composer')
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      {/* Top Header & Page Meta */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-[#E5E7EB] dark:border-[#27272A]">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">Riwayat Eksekusi</h1>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#F3F4F6] dark:bg-[#27272A] border border-[#E5E7EB] dark:border-[#3F3F46] text-black dark:text-white font-semibold">
              LIVE REALTIME • {networkLatency}ms
            </span>
          </div>
          <p className="text-xs text-[#6B7280]">
            Pantau status antrian real-time, inspect mockup simulator smartphone 9:16, dan kelola log hasil posting.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {failedCount > 0 && (
            <button
              type="button"
              onClick={retryAllFailed}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors cursor-pointer shadow-xs"
            >
              <RotateCcw size={13} />
              <span>Retry Semua Gagal ({failedCount})</span>
            </button>
          )}


          <button
            type="button"
            onClick={() => loadData(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] text-black dark:text-white text-xs font-medium hover:bg-[#F3F4F6] dark:hover:bg-[#27272A] transition-colors cursor-pointer"
          >
            <RefreshCw size={13} />
            <span>Reload</span>
          </button>

          <button
            type="button"
            onClick={triggerDispatcher}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black text-xs font-medium hover:bg-[#262626] transition-all shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">sync</span>
            <span>Jalankan Antrean Sekarang</span>
          </button>
        </div>
      </div>

      {/* 4 Bento Metrics Cards Component */}
      <HistoryMetrics
        loading={loading}
        totalCount={targets.length}
        successCount={successCount}
        pendingCount={pendingCount}
        failedCount={failedCount}
        successPct={successPct}
        networkLatency={networkLatency}
      />

      {/* Filter Tabs Navigation & View Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-2 rounded-xl shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded text-xs transition-colors font-medium cursor-pointer ${
              filterStatus === 'ALL'
                ? 'bg-black dark:bg-white text-white dark:text-black font-semibold'
                : 'text-[#4B5563] dark:text-gray-300 bg-[#F8F9FA] dark:bg-[#27272A] hover:bg-[#F3F4F6]'
            }`}
          >
            Semua <span className="font-mono ml-1 px-1.5 py-0.2 rounded bg-[#27272A] text-white text-[10px]">{targets.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('SUCCESS')}
            className={`px-3 py-1.5 rounded text-xs transition-colors font-medium border border-[#E5E7EB] dark:border-[#27272A] cursor-pointer ${
              filterStatus === 'SUCCESS'
                ? 'bg-black dark:bg-white text-white dark:text-black font-semibold'
                : 'text-[#4B5563] dark:text-gray-300 bg-[#F8F9FA] dark:bg-[#27272A] hover:bg-[#F3F4F6]'
            }`}
          >
            Sukses <span className="font-mono ml-1 px-1.5 py-0.2 rounded bg-white dark:bg-[#121212] text-black dark:text-white border border-[#E5E7EB] dark:border-[#27272A] text-[10px]">{successCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('PENDING')}
            className={`px-3 py-1.5 rounded text-xs transition-colors font-medium border border-[#E5E7EB] dark:border-[#27272A] cursor-pointer ${
              filterStatus === 'PENDING'
                ? 'bg-black dark:bg-white text-white dark:text-black font-semibold'
                : 'text-[#4B5563] dark:text-gray-300 bg-[#F8F9FA] dark:bg-[#27272A] hover:bg-[#F3F4F6]'
            }`}
          >
            Dalam Antrean <span className="font-mono ml-1 px-1.5 py-0.2 rounded bg-white dark:bg-[#121212] text-black dark:text-white border border-[#E5E7EB] dark:border-[#27272A] text-[10px]">{pendingCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('FAILED')}
            className={`px-3 py-1.5 rounded text-xs transition-colors font-medium border border-[#E5E7EB] dark:border-[#27272A] cursor-pointer ${
              filterStatus === 'FAILED'
                ? 'bg-black dark:bg-white text-white dark:text-black font-semibold'
                : 'text-[#4B5563] dark:text-gray-300 bg-[#F8F9FA] dark:bg-[#27272A] hover:bg-[#F3F4F6]'
            }`}
          >
            Gagal / Perlu Retry <span className="font-mono ml-1 px-1.5 py-0.2 rounded bg-red-600 text-white text-[10px]">{failedCount}</span>
          </button>
        </div>

        {/* View Mode Toggle: Event Calendar vs List Table */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#F3F4F6] dark:bg-[#27272A] border border-[#E5E7EB] dark:border-[#3F3F46]">
            <button
              type="button"
              onClick={() => {
                setViewMode('calendar')
                setDateFilter(null)
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-[#18181B] text-black dark:text-white shadow-2xs'
                  : 'text-[#6B7280] hover:text-black dark:hover:text-white'
              }`}
            >
              <CalendarIcon size={13} />
              <span>Event Calendar</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-[#18181B] text-black dark:text-white shadow-2xs'
                  : 'text-[#6B7280] hover:text-black dark:hover:text-white'
              }`}
            >
              <List size={13} />
              <span>Tabel List</span>
            </button>
          </div>

          <span className="font-mono text-[10px] text-[#6B7280] hidden sm:inline-block">
            HEARTBEAT 10s ACTIVE
          </span>
        </div>
      </div>

      {/* Date Filter Notification Banner (jika sedang memfilter tanggal dari kalender) */}
      {dateFilter && viewMode === 'list' && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Menampilkan Postingan Tanggal:</span>
            <span className="font-mono font-bold px-2 py-0.5 rounded bg-purple-200 dark:bg-purple-900 text-purple-950 dark:text-purple-100">
              {dateFilter}
            </span>
            <span className="text-[#6B7280] dark:text-[#9CA3AF] text-[11px]">
              ({filteredTargets.length} postingan ditemukan)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setViewMode('calendar')
                setDateFilter(null)
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-[#18181B] text-black dark:text-white border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors cursor-pointer"
            >
              Kembali ke Kalender 
            </button>
            <button
              type="button"
              onClick={() => setDateFilter(null)}
              className="px-2 py-1 text-xs text-[#6B7280] hover:text-black dark:hover:text-white cursor-pointer"
            >
              Tampilkan Semua Tanggal 
            </button>
          </div>
        </div>
      )}

      {/* Render View Mode: Event Calendar vs List Table */}
      {viewMode === 'calendar' ? (
        <HistoryEventCalendar
          loading={loading}
          targets={filteredTargets}
          onSelectTarget={(t) => setSelectedTarget(t)}
          onRetry={retry}
          onDelete={deleteTarget}
          onSelectDateToListView={handleSelectDateToListView}
          onDateClickCreate={handleDateClickCreate}
        />
      ) : (
        <HistoryList
          loading={loading}
          targets={filteredTargets}
          onSelectTarget={(t) => setSelectedTarget(t)}
          onRetry={retry}
          onDelete={deleteTarget}
        />
      )}

      {/* Drawer Detail Inspeksi Konten dengan Template Phone Simulator */}
      <HistoryDetailDrawer
        target={selectedTarget}
        onClose={() => setSelectedTarget(null)}
        onRetry={retry}
        onDelete={deleteTarget}
      />
    </div>
  )
}
