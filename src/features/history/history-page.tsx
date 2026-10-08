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
  const [calendarTargets, setCalendarTargets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  // ponytail: Riwayat (/history) fokus pada konten yang sudah dieksekusi (Sukses & Gagal), bukan antrean mendatang
  const [filterStatus, setFilterStatus] = useState<string>('SUCCESS')
  const [dateFilter, setDateFilter] = useState<string | null>(null)
  // ponytail: Default ke 'calendar' agar tampilan kalender muncul duluan
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [networkLatency, setNetworkLatency] = useState<number>(118)
  const [selectedTarget, setSelectedTarget] = useState<any | null>(null)

  async function loadData(isSilent = false) {
    if (!isSilent) setLoading(true)
    const tStart = performance.now()

    // Fetch riwayat eksekusi postingan untuk tabel dan kalender
    const { data } = await supabase
      .from('post_targets')
      .select('*, posts(*), connected_accounts(account_name, platform)')
      .in('status', ['SUCCESS', 'FAILED'])
      .order('updated_at', { ascending: false })
      .limit(300)

    const elapsed = Math.round(performance.now() - tStart)
    setNetworkLatency(elapsed > 0 ? elapsed : 118)

    if (data) {
      setTargets(data)
      setCalendarTargets(data)
    }
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
      fetch('/api/cron/dispatcher').catch(() => { })
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
      fetch('/api/cron/dispatcher').catch(() => { })
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
      fetch('/api/cron/dispatcher').catch(() => { })
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

  const targetsToFilter = dateFilter ? (calendarTargets.length > 0 ? calendarTargets : targets) : targets

  const filteredTargets = targetsToFilter.filter((t) => {
    let matchStatus = true
    if (filterStatus === 'SUCCESS') matchStatus = t.status === 'SUCCESS'
    else if (filterStatus === 'PENDING') matchStatus = t.status === 'PENDING' || t.status === 'IN_PROGRESS'
    else if (filterStatus === 'FAILED') matchStatus = t.status === 'FAILED'

    if (!matchStatus) return false

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

  const filteredCalendarTargets = calendarTargets.filter((t) => {
    let matchStatus = true
    if (filterStatus === 'SUCCESS') matchStatus = t.status === 'SUCCESS'
    else if (filterStatus === 'PENDING') matchStatus = t.status === 'PENDING' || t.status === 'IN_PROGRESS'
    else if (filterStatus === 'FAILED') matchStatus = t.status === 'FAILED'
    return matchStatus
  })

  const allTargetsPool = calendarTargets.length > 0 ? calendarTargets : targets
  const successCount = allTargetsPool.filter((t) => t.status === 'SUCCESS').length
  const pendingCount = allTargetsPool.filter((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length
  const failedCount = allTargetsPool.filter((t) => t.status === 'FAILED').length
  const successPct = allTargetsPool.length > 0 ? ((successCount / allTargetsPool.length) * 100).toFixed(1) : '100.0'

  function handleSelectDateToListView(dateStr: string) {
    setDateFilter(dateStr)
    setViewMode('list')
    toast.info(`Menampilkan isi tabel postingan tanggal ${dateStr}`)
  }

  function handleDateClickCreate(dateStr: string) {
    const currentHour = new Date().getHours()
    const nextHour = String((currentHour + 1) % 24).padStart(2, '0')
    const scheduledDateTime = `${dateStr}T${nextHour}:00`

    setScheduledAt(scheduledDateTime)
    toast.success(`Tanggal postingan disetel ke ${dateStr}. Silakan atur jam upload di Composer!`)
    navigate('/composer')
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12">
      {/* Top Header & Page Meta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Riwayat Eksekusi</h1>
          <p className="text-xs text-muted-foreground">
            Daftar lengkap status penerbitan konten, respon API sosial media, dan penanganan error.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {failedCount > 0 && (
            <button
              type="button"
              onClick={retryAllFailed}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-foreground text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Retry Gagal ({failedCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => loadData(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
          >
            <RefreshCw size={13} />
            <span>Muat Ulang</span>
          </button>

          <button
            type="button"
            onClick={triggerDispatcher}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">sync</span>
            <span>Jalankan Antrean</span>
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
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border p-2 rounded-xl shadow-xs">
        <div className="flex flex-wrap items-center gap-1 p-0.5 rounded-lg bg-secondary border border-border/40">
          <button
            type="button"
            onClick={() => setFilterStatus('SUCCESS')}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${filterStatus === 'SUCCESS'
              ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Sukses ({successCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('FAILED')}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${filterStatus === 'FAILED'
              ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Gagal ({failedCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${filterStatus === 'ALL'
              ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Semua Riwayat ({targets.length})
          </button>
        </div>

        {/* View Mode Toggle: Event Calendar vs List Table */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-secondary border border-border/40">
          <button
            type="button"
            onClick={() => {
              setViewMode('calendar')
              setDateFilter(null)
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${viewMode === 'calendar'
              ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <CalendarIcon size={13} />
            <span>Kalender</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${viewMode === 'list'
              ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <List size={13} />
            <span>Tabel</span>
          </button>
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
          targets={filteredCalendarTargets}
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
          pageSize={10}
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
