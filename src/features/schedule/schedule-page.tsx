import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import {
  CalendarDays,
  Clock,
  RefreshCw,
  Play,
  Film,
  Plus,
  RotateCcw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Edit3,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import type { DateRange } from 'react-day-picker'
import { Calendar, CalendarDayButton } from '@/shared/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover'
import { HistoryDetailDrawer } from '@/features/history/components/history-detail-drawer'
import { useComposerStore } from '@/features/composer/store/use-composer-store'

// Format helper WIB (UTC+7)
function getWIBDate(iso: string) {
  const d = new Date(iso)
  return new Date(d.getTime() + 7 * 60 * 60 * 1000)
}

function formatDateHeader(iso: string) {
  const wib = getWIBDate(iso)
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ]
  const dayName = days[wib.getUTCDay()]
  const dateNum = String(wib.getUTCDate()).padStart(2, '0')
  const monthName = months[wib.getUTCMonth()]
  const year = wib.getUTCFullYear()
  return `${dayName}, ${dateNum} ${monthName} ${year}`
}

function formatDateKey(iso: string) {
  const wib = getWIBDate(iso)
  const y = wib.getUTCFullYear()
  const m = String(wib.getUTCMonth() + 1).padStart(2, '0')
  const d = String(wib.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatTimeOnly(iso: string) {
  const wib = getWIBDate(iso)
  const hh = String(wib.getUTCHours()).padStart(2, '0')
  const mm = String(wib.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm} WIB`
}

export function SchedulePage() {
  const navigate = useNavigate()
  const { loadDraft } = useComposerStore()
  const [targets, setTargets] = useState<any[]>([])
  const [drafts, setDrafts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [selectedTarget, setSelectedTarget] = useState<any | null>(null)

  async function loadSchedules(isSilent = false) {
    if (!isSilent) setLoading(true)
    const [targetsRes, draftsRes] = await Promise.all([
      supabase
        .from('post_targets')
        .select('*, posts(*), connected_accounts(account_name, platform)')
        .order('updated_at', { ascending: false })
        .limit(150),
      supabase
        .from('posts')
        .select('*, post_targets(*, connected_accounts(account_name, platform))')
        .eq('status', 'DRAFT')
        .order('updated_at', { ascending: false })
        .limit(150),
    ])

    if (targetsRes.error) {
      toast.error('Gagal memuat jadwal postingan')
    } else if (targetsRes.data) {
      setTargets(targetsRes.data)
    }

    if (draftsRes.data) {
      setDrafts(draftsRes.data)
    }

    if (!isSilent) setLoading(false)
  }

  useEffect(() => {
    loadSchedules(false)

    // Realtime changes on both post_targets and posts
    const channel = supabase
      .channel('schedule_page_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_targets' },
        () => loadSchedules(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => loadSchedules(true)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  function handleEditDraft(draft: any) {
    loadDraft(draft)
    toast.info(`Draft "${draft.title || 'Tanpa Judul'}" dimuat ke Composer`)
    navigate('/composer')
  }

  async function handleDeleteDraft(draftId: string) {
    if (!confirm('Hapus draft postingan ini?')) return
    const { error } = await supabase.from('posts').delete().eq('id', draftId)
    if (error) {
      toast.error('Gagal menghapus draft')
    } else {
      toast.success('Draft berhasil dihapus')
      loadSchedules(true)
    }
  }

  async function retry(targetId: string) {
    const { error } = await supabase
      .from('post_targets')
      .update({ status: 'PENDING', error_payload: null, polling_attempts: 0 })
      .eq('id', targetId)
    if (error) {
      toast.error('Gagal mereset target')
    } else {
      toast.success('Target direset ke PENDING!')
      loadSchedules(true)
      fetch('/api/cron/dispatcher').catch(() => {})
    }
  }

  async function deleteTarget(targetId: string) {
    if (!confirm('Hapus target jadwal ini?')) return
    const { error } = await supabase.from('post_targets').delete().eq('id', targetId)
    if (error) {
      toast.error('Gagal menghapus target')
    } else {
      toast.success('Target berhasil dihapus')
      if (selectedTarget?.id === targetId) setSelectedTarget(null)
      loadSchedules(true)
    }
  }

  // Hitung jumlah postingan per tanggal (YYYY-MM-DD)
  const dateTargetCountMap = useMemo(() => {
    const counts = new Map<string, number>()
    targets.forEach((t) => {
      const iso = t.posts?.scheduled_at || t.created_at || new Date().toISOString()
      const key = formatDateKey(iso)
      counts.set(key, (counts.get(key) || 0) + 1)
    })
    return counts
  }, [targets])

  // Filter status & date range
  const filteredTargets = useMemo(() => {
    const startStr = dateRange?.from ? formatDateKey(dateRange.from.toISOString()) : null
    const endStr = dateRange?.to ? formatDateKey(dateRange.to.toISOString()) : startStr

    return targets.filter((t) => {
      // 1. Status Filter
      if (filterStatus === 'PENDING' && !(t.status === 'PENDING' || t.status === 'IN_PROGRESS')) return false
      if (filterStatus === 'SUCCESS' && t.status !== 'SUCCESS') return false
      if (filterStatus === 'FAILED' && t.status !== 'FAILED') return false

      // 2. Date Range Filter (WIB YYYY-MM-DD)
      const iso = t.posts?.scheduled_at || t.created_at || new Date().toISOString()
      const targetDateKey = formatDateKey(iso)

      if (startStr && targetDateKey < startStr) return false
      if (endStr && targetDateKey > endStr) return false

      return true
    })
  }, [targets, filterStatus, dateRange])

  // Group by Date & Sort by Time
  const groupedByDate = useMemo(() => {
    // ponytail: grouping per tanggal, diurutkan kronologis tanggal terbaru
    const map = new Map<string, { header: string; items: any[] }>()

    filteredTargets.forEach((t) => {
      const iso = t.posts?.scheduled_at || t.created_at || new Date().toISOString()
      const key = formatDateKey(iso)
      if (!map.has(key)) {
        map.set(key, {
          header: formatDateHeader(iso),
          items: [],
        })
      }
      map.get(key)!.items.push(t)
    })

    // Sort items dalam setiap tanggal berdasarkan jam (terbaru / terjadwal)
    map.forEach((group) => {
      group.items.sort((a, b) => {
        const timeA = new Date(a.posts?.scheduled_at || a.created_at).getTime()
        const timeB = new Date(b.posts?.scheduled_at || b.created_at).getTime()
        return timeB - timeA
      })
    })

    // Sort groups descending by date key
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dateKey, data]) => ({ dateKey, ...data }))
  }, [filteredTargets])

  // Pagination (/ponytail: 10 item per halaman)
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 10
  const isDraftView = filterStatus === 'DRAFT'
  const totalItems = isDraftView ? drafts.length : filteredTargets.length
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))

  // Reset page saat filter berganti
  useEffect(() => {
    setCurrentPage(1)
  }, [filterStatus, dateRange])

  // Slice drafts untuk halaman aktif
  const paginatedDrafts = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return drafts.slice(startIndex, startIndex + PAGE_SIZE)
  }, [drafts, currentPage, PAGE_SIZE])

  // Slice filtered targets untuk halaman aktif
  const paginatedGroupedByDate = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    const endIndex = startIndex + PAGE_SIZE
    const pageItems = filteredTargets.slice(startIndex, endIndex)

    const map = new Map<string, { header: string; items: any[] }>()
    pageItems.forEach((t) => {
      const iso = t.posts?.scheduled_at || t.created_at || new Date().toISOString()
      const key = formatDateKey(iso)
      if (!map.has(key)) {
        map.set(key, {
          header: formatDateHeader(iso),
          items: [],
        })
      }
      map.get(key)!.items.push(t)
    })

    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dateKey, data]) => ({ dateKey, ...data }))
  }, [filteredTargets, currentPage, PAGE_SIZE])

  // Reusable pagination controls (/ponytail)
  const renderPagination = () => {
    if (totalPages <= 1) return null
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
        <span className="text-xs text-muted-foreground font-mono">
          Menampilkan{' '}
          <strong className="text-foreground">
            {totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalItems)}
          </strong>{' '}
          dari <strong className="text-foreground">{totalItems}</strong> {isDraftView ? 'draft' : 'jadwal'}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-medium hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Halaman Sebelumnya"
          >
            <ChevronLeft size={14} />
            <span>Sebelumnya</span>
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                if (totalPages <= 7) return true
                return p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1
              })
              .reduce<(number | string)[]>((acc, p, idx, arr) => {
                if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                  acc.push('...')
                }
                acc.push(p)
                return acc
              }, [])
              .map((item, idx) =>
                typeof item === 'string' ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground font-mono">
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCurrentPage(item)}
                    className={`size-7 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                      currentPage === item
                        ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                        : 'bg-card border border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
          </div>

          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-medium hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Halaman Berikutnya"
          >
            <span>Berikutnya</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    )
  }

  const pendingCount = targets.filter((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length
  const successCount = targets.filter((t) => t.status === 'SUCCESS').length
  const failedCount = targets.filter((t) => t.status === 'FAILED').length

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Jadwal Postingan</h1>
          <p className="text-xs text-muted-foreground">
            Daftar konten terjadwal yang siap ditayangkan otomatis per tanggal dan jam.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadSchedules(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
          >
            <RefreshCw size={13} />
            <span>Muat Ulang</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/composer')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
          >
            <Plus size={14} />
            <span>Buat Jadwal</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Date Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border p-2 rounded-xl shadow-xs">
        <div className="flex flex-wrap items-center gap-1 p-0.5 rounded-lg bg-secondary border border-border/40">
          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
              filterStatus === 'ALL'
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Semua ({targets.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('PENDING')}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
              filterStatus === 'PENDING'
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Antrean ({pendingCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('SUCCESS')}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
              filterStatus === 'SUCCESS'
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Terbit ({successCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('FAILED')}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
              filterStatus === 'FAILED'
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Gagal ({failedCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('DRAFT')}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
              filterStatus === 'DRAFT'
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Draft ({drafts.length})
          </button>
        </div>

        {/* Interactive Date Range Calendar Picker (hanya untuk timeline jadwal) */}
        {!isDraftView ? (
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F8F9FA] dark:bg-[#16181D] hover:bg-muted dark:hover:bg-[#202023] border border-[#E5E7EB] dark:border-[rgba(255,255,255,0.08)] text-xs text-foreground cursor-pointer transition-colors shadow-2xs outline-none"
                title="Pilih Rentang Tanggal"
              >
                <CalendarDays size={13} className="text-muted-foreground" />
                <span className="font-medium">
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'd MMM yyyy', { locale: id })} – {format(dateRange.to, 'd MMM yyyy', { locale: id })}
                      </>
                    ) : (
                      format(dateRange.from, 'd MMM yyyy', { locale: id })
                    )
                  ) : (
                    'Pilih Rentang Tanggal'
                  )}
                </span>
                <ChevronDown size={12} className="text-muted-foreground ml-0.5" />
              </PopoverTrigger>

              <PopoverContent align="end" className="w-auto p-3 bg-popover border border-border shadow-xl rounded-xl">
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-xs font-semibold text-foreground">Rentang Jadwal</span>
                    {dateRange && (
                      <button
                        type="button"
                        onClick={() => setDateRange(undefined)}
                        className="text-[11px] font-mono text-muted-foreground hover:text-foreground cursor-pointer underline"
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>
                  <Calendar
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={1}
                    captionLayout="dropdown"
                    className="rounded-lg border [--cell-size:--spacing(10)] md:[--cell-size:--spacing(11)]"
                    formatters={{
                      formatMonthDropdown: (date) => {
                        return date.toLocaleString("default", { month: "long" })
                      },
                    }}
                    locale={id}
                    components={{
                      DayButton: ({ children, modifiers, day, ...props }) => {
                        const dateKey = formatDateKey(day.date.toISOString())
                        const count = dateTargetCountMap.get(dateKey) || 0
                        const isRangeEndpoint =
                          Boolean(modifiers.range_start || modifiers.range_end || (modifiers.selected && !modifiers.range_middle))

                        return (
                          <CalendarDayButton day={day} modifiers={modifiers} {...props}>
                            <span className="text-xs font-medium leading-none">{children}</span>
                            {!modifiers.outside && count > 0 && (
                              <span
                                className={`text-[9px] font-mono font-bold leading-none px-1 py-0.5 rounded-full ${
                                  isRangeEndpoint
                                    ? 'bg-white/20 text-white dark:bg-black/20 dark:text-black'
                                    : 'bg-black/10 dark:bg-white/20 text-foreground dark:text-white'
                                }`}
                              >
                                {count}p
                              </span>
                            )}
                          </CalendarDayButton>
                        )
                      },
                    }}
                  />
                </div>
              </PopoverContent>
            </Popover>

            {dateRange && (
              <button
                type="button"
                onClick={() => setDateRange(undefined)}
                className="size-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 flex items-center justify-center cursor-pointer transition-colors text-xs"
                title="Reset Rentang Tanggal"
              >
                ✕
              </button>
            )}

            <span className="text-[11px] font-mono text-muted-foreground">
              Total {totalItems} Jadwal Terdaftar
            </span>
          </div>
        ) : (
          <span className="text-[11px] font-mono text-muted-foreground">
            Total {drafts.length} Draft Tersimpan
          </span>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="font-mono text-xs text-muted-foreground">
            {isDraftView ? 'Memuat daftar draft postingan...' : 'Memuat timeline jadwal postingan...'}
          </span>
        </div>
      ) : isDraftView ? (
        drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 bg-card rounded-2xl border border-border text-center gap-3">
            <div className="size-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
              <FileText size={22} />
            </div>
            <div className="flex flex-col gap-1 max-w-sm">
              <h3 className="text-sm font-semibold text-foreground">Belum Ada Draft Tersimpan</h3>
              <p className="text-xs text-muted-foreground">
                Simpan ide postingan Anda sebagai draft di Composer untuk disempurnakan atau dijadwalkan nanti.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/composer')}
              className="mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
            >
              Buat Draft di Composer
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {paginatedDrafts.map((d) => {
                const mediaUrl = d.gdrive_stream_url || d.gdrive_lh3_url || ''
                const title = d.title || d.content_text || 'Tanpa Judul'
                const updatedDate = format(new Date(d.updated_at || d.created_at), 'd MMM yyyy, HH:mm', { locale: id })
                const targetAccounts =
                  d.post_targets?.map((pt: any) => pt.connected_accounts?.platform || pt.platform).filter(Boolean) || []

                return (
                  <div
                    key={d.id}
                    onClick={() => handleEditDraft(d)}
                    className="group flex items-center justify-between gap-3.5 p-3.5 rounded-xl bg-card border border-border hover:border-foreground/30 transition-all cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Media Thumbnail */}
                      <div className="relative size-16 rounded-lg bg-secondary border border-border/70 overflow-hidden shrink-0 flex items-center justify-center">
                        {mediaUrl ? (
                          <img
                            src={mediaUrl}
                            alt={title}
                            className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              ;(e.target as HTMLElement).style.display = 'none'
                            }}
                          />
                        ) : (
                          <FileText size={20} className="text-muted-foreground/60" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                        <div className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/70 backdrop-blur-xs text-[9px] font-mono text-white uppercase">
                          {d.media_type || 'POST'}
                        </div>
                      </div>

                      {/* Content Detail */}
                      <div className="flex flex-col min-w-0 flex-1 gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-secondary text-muted-foreground border border-border">
                            DRAFT
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {updatedDate} WIB
                          </span>
                        </div>

                        <h4 className="text-xs font-semibold text-foreground truncate" title={title}>
                          {title}
                        </h4>

                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="truncate">
                            {targetAccounts.length > 0
                              ? `Target: ${targetAccounts.join(', ')}`
                              : 'Belum ada akun tujuan'}
                          </span>
                          <span>•</span>
                          <span className="text-primary font-medium group-hover:underline flex items-center gap-1 shrink-0">
                            <Edit3 size={11} /> Lanjutkan Edit
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Delete Action Button */}
                    <div className="shrink-0 flex items-center pl-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteDraft(d.id)
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Hapus Draft"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {renderPagination()}
          </div>
        )
      ) : filteredTargets.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-card rounded-2xl border border-border text-center gap-3">
          <div className="size-12 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
            <Film size={22} />
          </div>
          <div className="flex flex-col gap-1 max-w-sm">
            <h3 className="text-sm font-semibold text-foreground">Belum Ada Video Terjadwal</h3>
            <p className="text-xs text-muted-foreground">
              Mulai buat konten baru di menu Composer untuk menjadwalkan video ke TikTok, Instagram, Facebook, dan Threads.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/composer')}
            className="mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            Buka Composer
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-10">
            {paginatedGroupedByDate.map((group) => (
            <section key={group.dateKey} className="flex flex-col gap-4">
              {/* Sticky Date Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between py-2 px-3.5 rounded-xl bg-card/90 backdrop-blur-md border border-border shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="size-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
                    <CalendarDays size={13} />
                  </div>
                  <h2 className="text-xs font-bold text-foreground tracking-tight">
                    {group.header}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium border border-border/60">
                    {group.items.length} Postingan
                  </span>
                </div>
              </div>

              {/* Compact List / Card View */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.items.map((t) => {
                  const mediaUrl = t.posts?.gdrive_stream_url || t.posts?.gdrive_lh3_url || ''
                  const scheduledIso = t.posts?.scheduled_at || t.created_at
                  const timeLabel = formatTimeOnly(scheduledIso)
                  const isSimulation = Boolean(t.posts?.media_metadata?.is_simulation)
                  const title = t.posts?.title || t.posts?.content_text || 'Tanpa Judul'

                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTarget(t)}
                      className="group flex items-center gap-3.5 p-3 rounded-xl bg-card border border-border hover:border-foreground/30 transition-all cursor-pointer shadow-xs"
                    >
                      {/* Compact Thumbnail (16:9 / 4:5 Compact Ratio) */}
                      <div className="relative size-18 rounded-lg bg-black shrink-0 overflow-hidden flex items-center justify-center">
                        {mediaUrl ? (
                          t.posts?.media_type === 'IMAGE' ? (
                            <img
                              src={mediaUrl}
                              alt={title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="relative w-full h-full">
                              <video
                                src={mediaUrl}
                                preload="metadata"
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                <Play size={12} className="fill-white text-white opacity-80" />
                              </div>
                            </div>
                          )
                        ) : (
                          <Film size={18} className="text-muted-foreground" />
                        )}

                        {/* Durasi / Media Type Badge */}
                        {t.posts?.media_metadata?.duration && (
                          <span className="absolute bottom-1 right-1 font-mono text-[9px] bg-black/80 text-white px-1 rounded">
                            {t.posts.media_metadata.duration}s
                          </span>
                        )}
                      </div>

                      {/* Content Meta & Details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          {/* Channel Badge */}
                          <span className="px-1.5 py-0.5 rounded bg-secondary text-foreground font-mono text-[9px] font-semibold uppercase">
                            {t.platform}
                          </span>

                          {/* Time */}
                          <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                            <Clock size={11} />
                            <span>{timeLabel}</span>
                          </span>

                          {/* Simulation Flag */}
                          {isSimulation && (
                            <span className="font-mono text-[9px] font-bold px-1 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                              SIM
                            </span>
                          )}

                          {/* Status */}
                          <span
                            className={`ml-auto font-mono text-[9px] font-semibold px-1.5 py-0.2 rounded uppercase ${
                              t.status === 'SUCCESS'
                                ? 'bg-primary text-primary-foreground'
                                : t.status === 'FAILED'
                                ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                : 'bg-secondary text-muted-foreground'
                            }`}
                          >
                            {t.status}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-semibold text-foreground truncate" title={title}>
                          {title}
                        </h4>

                        {/* Account Name */}
                        {t.connected_accounts?.account_name && (
                          <span className="text-[11px] text-muted-foreground font-mono truncate">
                            @{t.connected_accounts.account_name}
                          </span>
                        )}
                      </div>

                      {/* Right Detail Hint */}
                      <div className="shrink-0 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all text-xs pr-1">
                        &rarr;
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
          </div>

          {renderPagination()}
        </div>
      )}

      {/* Drawer Detail Inspeksi Konten dengan Simulator 9:16 */}
      <HistoryDetailDrawer
        target={selectedTarget}
        onClose={() => setSelectedTarget(null)}
        onRetry={retry}
        onDelete={deleteTarget}
      />
    </div>
  )
}
