import { useComposerStore } from '../store/useComposerStore'
import { DatePickerDemo } from '@/shared/components/ui/date-picker-demo'

export function SchedulePicker() {
  const { scheduledAt, setScheduledAt } = useComposerStore()

  const currentDate = scheduledAt ? new Date(scheduledAt) : new Date()
  const currentTime = scheduledAt
    ? `${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}`
    : '12:00'

  const handleDateChange = (newDate: Date | undefined) => {
    if (!newDate) return
    const [hours, minutes] = currentTime.split(':').map(Number)
    newDate.setHours(hours, minutes, 0, 0)
    setScheduledAt(newDate.toISOString())
  }

  const handleTimeChange = (newTime: string) => {
    const [hours, minutes] = newTime.split(':').map(Number)
    const base = scheduledAt ? new Date(scheduledAt) : new Date()
    base.setHours(hours, minutes, 0, 0)
    setScheduledAt(base.toISOString())
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Jadwal Publikasi</label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setScheduledAt(new Date().toISOString())}
            className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground cursor-pointer font-medium"
          >
            Sekarang
          </button>
          <button
            type="button"
            onClick={() => setScheduledAt(new Date(Date.now() + 10 * 60000).toISOString())}
            className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground cursor-pointer font-medium"
          >
            +10 Menit
          </button>
          <button
            type="button"
            onClick={() => setScheduledAt(new Date(Date.now() + 24 * 3600000).toISOString())}
            className="text-[10px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground cursor-pointer font-medium"
          >
            Besok
          </button>
        </div>
      </div>

      <DatePickerDemo
        date={scheduledAt ? new Date(scheduledAt) : undefined}
        onDateChange={handleDateChange}
        showTime={true}
        timeValue={currentTime}
        onTimeChange={handleTimeChange}
      />
    </div>
  )
}
