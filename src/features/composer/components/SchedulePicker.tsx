import { useComposerStore } from '../store/useComposerStore'

export function SchedulePicker() {
  const { scheduledAt, setScheduledAt } = useComposerStore()

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">Jadwal Posting</label>
      <input
        type="datetime-local"
        value={scheduledAt}
        onChange={(e) => setScheduledAt(e.target.value)}
        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  )
}
