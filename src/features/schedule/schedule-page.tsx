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
  Sparkles,
  ChevronDown,
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
  const [targets, setTargets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [selectedTarget, setSelectedTarget] = useState<any | null>(null)

  async function loadSchedules(isSilent = false) {
    if (!isSilent) setLoading(true)
    const { data, error } = await supabase
      .from('post_targets')
      .select('*, posts(*), connected_accounts(account_name, platform)')
      .order('updated_at', { ascending: false })
      .limit(150)

    if (error) {
      toast.error('Gagal memuat jadwal postingan')
    } else if (data) {
      setTargets(data)
    }
    if (!isSilent) setLoading(false)
  }

  useEffect(() => {
    loadSchedules(false)

    // Realtime changes
    const channel = supabase
      .channel('schedule_page_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_targets' },
        () => {
          loadSchedules(true)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

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
        </div>

        {/* Interactive Date Range Calendar Picker */}
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

          <span className="text-[11px] font-mono text-[#6B7280]">
            Total {groupedByDate.length} Hari Terjadwal
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="font-mono text-xs text-muted-foreground">Memuat timeline jadwal postingan...</span>
        </div>
      ) : groupedByDate.length === 0 ? (
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
        <div className="flex flex-col gap-10">
          {groupedByDate.map((group) => (
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

              {/* Grid Video Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                      className="group relative flex flex-col bg-card rounded-2xl border border-border overflow-hidden shadow-xs hover:border-foreground/30 transition-all cursor-pointer"
                    >
                      {/* Video / Thumbnail Canvas Container (9:16 Aspect Preview) */}
                      <div className="relative w-full aspect-9/16 bg-black flex items-center justify-center overflow-hidden">
                        {mediaUrl ? (
                          t.posts?.media_type === 'IMAGE' ? (
                            <img
                              src={mediaUrl}
                              alt={title}
                              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <div className="relative w-full h-full">
                              <video
                                src={mediaUrl}
                                preload="metadata"
                                muted
                                playsInline
                                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                <div className="size-10 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg border border-white/20">
                                  <Play size={18} className="fill-white translate-x-0.5" />
                                </div>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="flex flex-col items-center justify-center text-zinc-500 gap-1.5 p-4 text-center">
                            <Film size={28} />
                            <span className="text-[10px] font-mono">Teks Saja</span>
                          </div>
                        )}

                        {/* Top Overlays: Time Badge & Status Badge */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 pointer-events-none">
                          {/* Jam Posting Badge */}
                          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-black/75 backdrop-blur-md text-white font-mono text-[10px] font-bold shadow-xs border border-white/10">
                            <Clock size={11} className="text-amber-400" />
                            <span>{timeLabel}</span>
                          </div>

                          {/* Status Badge */}
                          <div className="flex items-center gap-1">
                            {isSimulation && (
                              <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-black shadow-xs">
                                SIM
                              </span>
                            )}
                            <span
                              className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded shadow-xs uppercase tracking-wider ${
                                t.status === 'SUCCESS'
                                  ? 'bg-emerald-500 text-white'
                                  : t.status === 'FAILED'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-zinc-800/90 text-white border border-white/10'
                              }`}
                            >
                              {t.status}
                            </span>
                          </div>
                        </div>

                        {/* Bottom Video Overlay: Platform Badge */}
                        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 pointer-events-none">
                          <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-white font-mono text-[10px] font-semibold uppercase tracking-wider border border-white/10">
                            {t.platform}
                          </span>
                          {t.connected_accounts?.account_name && (
                            <span className="px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-zinc-200 font-mono text-[9px] truncate max-w-[100px]">
                              @{t.connected_accounts.account_name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Bottom Meta */}
                      <div className="p-3 flex flex-col gap-1.5 justify-between flex-1">
                        <h4 className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                          {title}
                        </h4>

                        {t.posts?.content_text && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {t.posts.content_text}
                          </p>
                        )}

                        <div className="pt-2 mt-auto border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                          <span className="flex items-center gap-1">
                            <Sparkles size={11} className="text-foreground" />
                            <span>Detail Inspeksi</span>
                          </span>
                          <span className="group-hover:translate-x-0.5 transition-transform text-foreground">
                            Lihat &rarr;
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
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
