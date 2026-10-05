import { useMemo, useState } from 'react'
import {
  EventCalendar,
  type EventCalendarApi,
  type EventCalendarRenderEventProps,
} from '@/components/reui/event-calendar/event-calendar'
import { EventCalendarContent } from '@/components/reui/event-calendar/event-calendar-content'
import {
  EventCalendarNav,
  EventCalendarToolbar,
} from '@/components/reui/event-calendar/event-calendar-nav'
import type {
  CalendarEvent,
  CalendarView,
} from '@/components/reui/event-calendar/event-calendar-types'
import { SkeletonContainer } from '@/shared/components/ui/skeleton-container'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Video, Image as ImageIcon, PlusIcon } from 'lucide-react'

interface HistoryEventCalendarProps {
  loading: boolean
  targets: any[]
  onSelectTarget: (target: any) => void
  onRetry: (targetId: string) => void
  onDelete: (targetId: string) => void
  onSelectDateToListView?: (dateStr: string) => void
  onDateClickCreate?: (dateStr: string) => void
}

interface PostTargetData {
  target: any
}

export function HistoryEventCalendar({
  loading,
  targets,
  onSelectTarget,
  onDateClickCreate,
}: HistoryEventCalendarProps) {
  const [view, setView] = useState<CalendarView>('month')
  const [date, setDate] = useState<Date>(() => new Date())

  // Transform post_targets ke format CalendarEvent
  const events = useMemo<CalendarEvent<PostTargetData>[]>(() => {
    return targets.map((t) => {
      const scheduledIso = t.posts?.scheduled_at || t.created_at
      const startDate = scheduledIso ? new Date(scheduledIso) : new Date()
      // Durasi default 30 menit
      const endDate = new Date(startDate.getTime() + 30 * 60 * 1000)

      // Warna pastel khas screenshot:
      // blue: facebook / default
      // violet: tiktok / scheduled
      // emerald: success
      // rose: failed / urgent
      // amber: in_progress / review
      let color = 'rgb(59, 130, 246)' // blue-500
      if (t.status === 'SUCCESS') color = 'rgb(16, 185, 129)' // emerald-500
      else if (t.status === 'FAILED') color = 'rgb(244, 63, 94)' // rose-500
      else if (t.status === 'IN_PROGRESS') color = 'rgb(245, 158, 11)' // amber-500
      else if (t.platform === 'tiktok') color = 'rgb(168, 85, 247)' // violet-500
      else if (t.platform === 'instagram') color = 'rgb(236, 72, 153)' // pink-500

      const title = t.posts?.title || t.posts?.content_text?.slice(0, 40) || `Post ${t.platform}`

      return {
        id: t.id,
        title,
        start: startDate,
        end: endDate,
        color,
        data: {
          target: t,
        },
      }
    })
  }, [targets])

  // Custom chip renderer persis seperti desain screenshot ReUI:
  // [• Bulat warna] [Judul Postingan / Platform] [Waktu e.g. 10:00 AM]
  function renderEvent({ occurrence }: EventCalendarRenderEventProps<PostTargetData>) {
    const t = occurrence.event.data?.target
    const timeStr = occurrence.start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

    const isVideo = t?.posts?.media_type === 'VIDEO'

    return (
      <div
        className="flex items-center gap-1.5 w-full text-[11px] leading-tight select-none truncate py-0.5"
        title={`${occurrence.event.title} (${timeStr})`}
      >
        {/* Leading dot with theme color */}
        <span
          className="size-1.5 rounded-full shrink-0"
          style={{ backgroundColor: occurrence.event.color }}
        />

        {/* Media indicator if available */}
        {isVideo ? (
          <Video className="size-3 shrink-0 opacity-70" />
        ) : (
          <ImageIcon className="size-3 shrink-0 opacity-70" />
        )}

        {/* Title */}
        <span className="truncate font-medium flex-1 text-slate-800 dark:text-zinc-200">
          {occurrence.event.title}
        </span>

        {/* Time tag badge */}
        <span className="text-[10px] text-slate-500 dark:text-zinc-400 shrink-0 font-medium ml-0.5">
          {timeStr}
        </span>
      </div>
    )
  }

  return (
    <SkeletonContainer isLoading={loading}>
      <div className="rounded-xl border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#18181B] shadow-xs overflow-hidden">
        <div className="p-3 sm:p-5">
          <EventCalendar
            events={events}
            view={view}
            onViewChange={setView}
            date={date}
            onDateChange={setDate}
            views={['month', 'week', 'day', 'agenda']}
            maxEventsPerCell={4}
            renderEvent={renderEvent}
            onEventClick={(occ) => {
              const target = occ.event.data?.target
              if (target) {
                onSelectTarget(target)
              }
            }}
            onSlotClick={(slot) => {
              if (onDateClickCreate) {
                const dateStr = slot.date.toISOString().split('T')[0]
                onDateClickCreate(dateStr)
              }
            }}
            classNames={{
              nav: 'border-b border-[#E5E7EB] dark:border-[#27272A] pb-3 mb-1',
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
              <EventCalendarNav showViewSwitcher={true} />
              <EventCalendarToolbar>
                {onDateClickCreate && (
                  <Button
                    size="sm"
                    onClick={() => {
                      const todayStr = new Date().toISOString().split('T')[0]
                      onDateClickCreate(todayStr)
                    }}
                    className="h-8 px-3 rounded-md bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 text-xs font-medium cursor-pointer shadow-xs transition-colors"
                  >
                    <PlusIcon className="size-3.5 mr-1" />
                    Jadwalkan Konten
                  </Button>
                )}
              </EventCalendarToolbar>
            </div>
            <div className="min-h-[640px] flex flex-col">
              <EventCalendarContent />
            </div>
          </EventCalendar>
        </div>
      </div>
    </SkeletonContainer>
  )
}
