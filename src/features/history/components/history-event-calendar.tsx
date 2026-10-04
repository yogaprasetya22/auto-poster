import { useState, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Video,
  Image as ImageIcon,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Eye,
  RotateCcw,
  Trash2,
  Plus,
} from 'lucide-react'
import { SkeletonContainer } from '@/shared/components/ui/skeleton-container'

interface HistoryEventCalendarProps {
  loading: boolean
  targets: any[]
  onSelectTarget: (target: any) => void
  onRetry: (targetId: string) => void
  onDelete: (targetId: string) => void
  onSelectDateToListView?: (dateStr: string) => void
  onDateClickCreate?: (dateStr: string) => void
}

const DAYS_HEADER = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

export function HistoryEventCalendar({
  loading,
  targets,
  onSelectTarget,
  onRetry,
  onDelete,
  onSelectDateToListView,
  onDateClickCreate,
}: HistoryEventCalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null)

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  // Navigasi bulan
  function handlePrevMonth() {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  function handleNextMonth() {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  function handleToday() {
    setCurrentDate(new Date())
    setSelectedDateFilter(null)
  }

  // Petakan targets ke format YYYY-MM-DD
  const targetsByDate = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const t of targets) {
      const dateIso = t.posts?.scheduled_at || t.created_at
      if (!dateIso) continue
      const d = new Date(dateIso)
      if (isNaN(d.getTime())) continue
      
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const key = `${y}-${m}-${day}`
      
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return map
  }, [targets])

  // Bangun grid kalender (minggu dimulai dari Senin)
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)
    
    // Day of week: 0=Sun, 1=Mon, ..., 6=Sat -> Jadikan 0=Mon, ..., 6=Sun
    let startDayOfWeek = firstDayOfMonth.getDay() - 1
    if (startDayOfWeek === -1) startDayOfWeek = 6

    const days: { date: Date; dateStr: string; isCurrentMonth: boolean; isToday: boolean }[] = []
    const todayStr = new Date().toISOString().slice(0, 10)

    // Hari bulan sebelumnya untuk padding awal
    for (let i = startDayOfWeek; i > 0; i--) {
      const d = new Date(currentYear, currentMonth, 1 - i)
      const dateStr = d.toISOString().slice(0, 10)
      days.push({
        date: d,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      })
    }

    // Hari-hari bulan ini
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const d = new Date(currentYear, currentMonth, i)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const dateStr = `${y}-${m}-${day}`
      days.push({
        date: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      })
    }

    // Hari bulan berikutnya untuk melengkapi baris grid (kelipatan 7)
    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(currentYear, currentMonth + 1, i)
        const dateStr = d.toISOString().slice(0, 10)
        days.push({
          date: d,
          dateStr,
          isCurrentMonth: false,
          isToday: dateStr === todayStr,
        })
      }
    }

    return days
  }, [currentYear, currentMonth])

  // Postingan terpilih jika ada filter tanggal tertentu diklik
  const activeDetailTargets = selectedDateFilter
    ? targetsByDate.get(selectedDateFilter) || []
    : []

  return (
    <SkeletonContainer isLoading={loading}>
      <div className="bg-white dark:bg-[#18181B] rounded-2xl border border-[#E5E7EB] dark:border-[#27272A] shadow-xs overflow-hidden flex flex-col">
        {/* Calendar Header / Toolbar */}
        <div className="p-4 border-b border-[#E5E7EB] dark:border-[#27272A] flex flex-wrap items-center justify-between gap-3 bg-[#FAFAFA] dark:bg-[#202023]">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold">
              <CalendarIcon size={16} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-black dark:text-white">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h3>
              <p className="text-[11px] text-[#6B7280]">
                Kalender Jadwal Tayang & Stok Postingan Konten
              </p>
            </div>
          </div>

          {/* Navigasi Bulan */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] text-black dark:text-white hover:bg-[#F3F4F6] dark:hover:bg-[#27272A] transition-colors cursor-pointer"
            >
              Hari Ini
            </button>
            <div className="flex items-center gap-0.5 border border-[#E5E7EB] dark:border-[#27272A] rounded-lg bg-white dark:bg-[#18181B] p-0.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded text-[#6B7280] hover:text-black dark:hover:text-white hover:bg-[#F3F4F6] dark:hover:bg-[#27272A] transition-colors cursor-pointer"
                title="Bulan sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded text-[#6B7280] hover:text-black dark:hover:text-white hover:bg-[#F3F4F6] dark:hover:bg-[#27272A] transition-colors cursor-pointer"
                title="Bulan berikutnya"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-[#E5E7EB] dark:border-[#27272A] bg-[#F9FAFB] dark:bg-[#141416] text-center">
          {DAYS_HEADER.map((dayName, idx) => (
            <div
              key={idx}
              className="py-2 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider"
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Calendar Grid (ReUI Event-Calendar Style) */}
        <div className="grid grid-cols-7 divide-x divide-y divide-[#E5E7EB] dark:divide-[#27272A] bg-white dark:bg-[#18181B]">
          {calendarDays.map((dayItem, idx) => {
            const dayTargets = targetsByDate.get(dayItem.dateStr) || []
            const isSelected = selectedDateFilter === dayItem.dateStr

            // Hitung stok video & gambar
            const videoCount = dayTargets.filter(
              (t) => t.posts?.media_type === 'VIDEO'
            ).length
            const imageCount = dayTargets.filter(
              (t) => t.posts?.media_type === 'IMAGE' || (t.posts?.media_urls?.length && t.posts?.media_type !== 'VIDEO')
            ).length

            return (
              <div
                key={idx}
                onClick={() => {
                  if (dayTargets.length > 0) {
                    if (onSelectDateToListView) {
                      onSelectDateToListView(dayItem.dateStr)
                    } else {
                      setSelectedDateFilter(isSelected ? null : dayItem.dateStr)
                    }
                  } else if (onDateClickCreate) {
                    onDateClickCreate(dayItem.dateStr)
                  }
                }}
                className={`group min-h-[110px] sm:min-h-[125px] p-1.5 sm:p-2 flex flex-col justify-between transition-all relative ${
                  !dayItem.isCurrentMonth
                    ? 'bg-[#FAFAFA]/70 dark:bg-[#141416]/50 opacity-40'
                    : 'bg-white dark:bg-[#18181B]'
                } ${
                  dayItem.isToday
                    ? 'ring-1 ring-inset ring-black dark:ring-white bg-blue-50/20 dark:bg-blue-950/10'
                    : ''
                } ${
                  isSelected
                    ? 'bg-purple-50/50 dark:bg-purple-950/20 ring-2 ring-inset ring-purple-600'
                    : ''
                } cursor-pointer hover:bg-[#F9FAFB] dark:hover:bg-[#202023]`}
              >
                {/* Tanggal & Stock Badges */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`size-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                        dayItem.isToday
                          ? 'bg-black text-white dark:bg-white dark:text-black font-bold'
                          : 'text-black dark:text-white'
                      }`}
                    >
                      {dayItem.date.getDate()}
                    </span>

                    {onDateClickCreate && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDateClickCreate(dayItem.dateStr)
                        }}
                        className="opacity-0 group-hover:opacity-100 size-5 rounded-full bg-[#F3F4F6] dark:bg-[#27272A] hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black flex items-center justify-center text-[#6B7280] transition-all cursor-pointer shadow-2xs"
                        title={`Buat postingan di tanggal ${dayItem.dateStr}`}
                      >
                        <Plus size={10} />
                      </button>
                    )}
                  </div>

                  {/* Stock Video & Image Indicator Badges */}
                  {dayTargets.length > 0 && (
                    <div className="flex items-center gap-1 font-mono text-[9px]">
                      {videoCount > 0 && (
                        <span
                          className="flex items-center gap-0.5 px-1 py-0.2 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold"
                          title={`${videoCount} stok postingan video`}
                        >
                          <Video size={9} />
                          <span>{videoCount}</span>
                        </span>
                      )}
                      {imageCount > 0 && (
                        <span
                          className="flex items-center gap-0.5 px-1 py-0.2 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold"
                          title={`${imageCount} stok postingan gambar`}
                        >
                          <ImageIcon size={9} />
                          <span>{imageCount}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Event Chips List */}
                <div className="space-y-1 flex-1 overflow-hidden">
                  {dayTargets.slice(0, 3).map((target) => {
                    const post = target.posts || {}
                    const isVid = post.media_type === 'VIDEO'
                    
                    let statusColor = 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-200'
                    if (target.status === 'SUCCESS') {
                      statusColor = 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    } else if (target.status === 'FAILED') {
                      statusColor = 'bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800'
                    } else if (target.status === 'IN_PROGRESS') {
                      statusColor = 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                    } else {
                      statusColor = 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    }

                    return (
                      <div
                        key={target.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectTarget(target)
                        }}
                        className={`group px-1.5 py-0.5 rounded-md border text-[9.5px] truncate font-medium flex items-center justify-between gap-1 shadow-2xs hover:opacity-85 transition-opacity ${statusColor}`}
                        title={`${post.title || post.content_text || 'Postingan'} (${target.status})`}
                      >
                        <div className="flex items-center gap-1 min-w-0">
                          {isVid ? (
                            <Video size={9} className="shrink-0 text-purple-600 dark:text-purple-400" />
                          ) : (
                            <ImageIcon size={9} className="shrink-0 text-blue-600 dark:text-blue-400" />
                          )}
                          <span className="truncate">
                            {post.title || post.content_text?.slice(0, 25) || target.platform}
                          </span>
                        </div>
                        <span className="font-mono text-[8px] uppercase shrink-0 font-bold opacity-75">
                          {target.platform.slice(0, 2)}
                        </span>
                      </div>
                    )
                  })}

                  {dayTargets.length > 3 && (
                    <div className="text-[9.5px] font-mono text-[#6B7280] font-semibold text-center pt-0.5">
                      +{dayTargets.length - 3} postingan lagi
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Selected Date Detail Drawer / Popup Section */}
        {selectedDateFilter && activeDetailTargets.length > 0 && (
          <div className="p-4 border-t border-[#E5E7EB] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#121214] space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-black dark:text-white">
                  Detail Jadwal Tanggal {selectedDateFilter}
                </span>
                <span className="font-mono text-[10px] px-2 py-0.2 rounded-full bg-black text-white dark:bg-white dark:text-black font-bold">
                  {activeDetailTargets.length} Postingan
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDateFilter(null)}
                className="text-xs text-[#6B7280] hover:text-black dark:hover:text-white cursor-pointer"
              >
                Tutup Rincian ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[220px] overflow-y-auto p-1">
              {activeDetailTargets.map((target) => {
                const post = target.posts || {}
                const isVid = post.media_type === 'VIDEO'
                const firstMedia = post.media_urls?.[0]

                return (
                  <div
                    key={target.id}
                    className="p-3 rounded-xl border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] flex flex-col justify-between gap-2 shadow-2xs"
                  >
                    <div className="flex items-start gap-2.5">
                      {firstMedia && (
                        <div className="size-10 rounded-lg overflow-hidden shrink-0 border border-[#E5E7EB] dark:border-[#27272A] bg-[#F3F4F6] relative">
                          {isVid ? (
                            <video src={firstMedia} className="w-full h-full object-cover" muted />
                          ) : (
                            <img src={firstMedia} alt="Media" className="w-full h-full object-cover" />
                          )}
                          <span className="absolute bottom-0.5 right-0.5 font-mono text-[7px] bg-black/80 text-white px-0.5 rounded">
                            {isVid ? 'VID' : 'IMG'}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-mono text-[9px] font-bold px-1 py-0.2 rounded bg-[#F3F4F6] dark:bg-[#27272A] text-black dark:text-white border border-[#E5E7EB] dark:border-[#3F3F46] uppercase">
                            {target.platform}
                          </span>
                          <span className="font-mono text-[9px] text-[#6B7280]">
                            {target.status}
                          </span>
                        </div>
                        <h5
                          onClick={() => onSelectTarget(target)}
                          className="font-semibold text-xs text-black dark:text-white truncate cursor-pointer hover:underline"
                        >
                          {post.title || post.content_text?.slice(0, 50) || 'Postingan'}
                        </h5>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[#F3F4F6] dark:border-[#27272A] text-[10px]">
                      <span className="text-[#6B7280] font-mono">
                        {post.scheduled_at?.slice(11, 16) || '—'} WIB
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectTarget(target)}
                          className="p-1 rounded text-[#6B7280] hover:text-black dark:hover:text-white hover:bg-[#F3F4F6] cursor-pointer"
                          title="Buka Mockup Simulator"
                        >
                          <Eye size={12} />
                        </button>
                        {target.status === 'FAILED' && (
                          <button
                            type="button"
                            onClick={() => onRetry(target.id)}
                            className="p-1 rounded text-amber-600 hover:bg-amber-50 cursor-pointer"
                            title="Retry"
                          >
                            <RotateCcw size={12} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDelete(target.id)}
                          className="p-1 rounded text-red-500 hover:bg-red-50 cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </SkeletonContainer>
  )
}
