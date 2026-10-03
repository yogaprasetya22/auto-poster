import { SkeletonContainer } from '@/shared/components/ui/skeleton-container'

interface HistoryMetricsProps {
  loading: boolean
  totalCount: number
  successCount: number
  pendingCount: number
  failedCount: number
  successPct: string
  networkLatency: number
}

export function HistoryMetrics({
  loading,
  totalCount,
  successCount,
  pendingCount,
  failedCount,
  successPct,
  networkLatency,
}: HistoryMetricsProps) {
  return (
    <SkeletonContainer isLoading={loading}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Dispatch */}
        <div className="flex flex-col p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-xs">
          <div className="flex items-center justify-between text-[#6B7280]">
            <span className="text-[11px] uppercase tracking-wider font-semibold font-mono">Total Dispatch</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[#F3F4F6] dark:bg-[#27272A] text-black dark:text-white font-bold">
              {successPct}% OK
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-black dark:text-white">{totalCount}</span>
            <span className="text-xs text-black dark:text-gray-300 font-medium">{successCount} sukses</span>
          </div>
          <div className="w-full h-1 bg-[#E5E7EB] dark:bg-[#27272A] rounded-full overflow-hidden mt-3">
            <div className="h-full bg-black dark:bg-white rounded-full" style={{ width: `${successPct}%` }} />
          </div>
        </div>

        {/* Antrean Aktif */}
        <div className="flex flex-col p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-xs">
          <div className="flex items-center justify-between text-[#6B7280]">
            <span className="text-[11px] uppercase tracking-wider font-semibold font-mono">Antrean Aktif</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[#F3F4F6] dark:bg-[#27272A] text-[#4B5563] dark:text-gray-300 font-bold">
              {pendingCount} PENDING
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-black dark:text-white">{pendingCount}</span>
            <span className="text-xs text-[#6B7280]">siap diproses engine</span>
          </div>
          <div className="w-full h-1 bg-[#E5E7EB] dark:bg-[#27272A] rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-black dark:bg-white rounded-full"
              style={{ width: `${Math.min(100, pendingCount * 20)}%` }}
            />
          </div>
        </div>

        {/* Gagal Dispatch */}
        <div className="flex flex-col p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-xs">
          <div className="flex items-center justify-between text-[#6B7280]">
            <span className="text-[11px] uppercase tracking-wider font-semibold font-mono">Gagal Dispatch</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-red-50 dark:bg-red-950/40 text-red-600 font-bold border border-red-200 dark:border-red-800">
              {failedCount} FAILED
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-black dark:text-white">{failedCount}</span>
            <span className="text-xs text-red-600 font-medium">perlu tindakan</span>
          </div>
          <div className="w-full h-1 bg-[#E5E7EB] dark:bg-[#27272A] rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-red-600 rounded-full"
              style={{ width: `${Math.min(100, failedCount * 25)}%` }}
            />
          </div>
        </div>

        {/* Latency Realtime */}
        <div className="flex flex-col p-4 rounded-xl bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] shadow-xs">
          <div className="flex items-center justify-between text-[#6B7280]">
            <span className="text-[11px] uppercase tracking-wider font-semibold font-mono">Latency Realtime</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800">
              ACTIVE
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-black dark:text-white">{networkLatency}ms</span>
            <span className="text-xs text-[#6B7280]">sub-second</span>
          </div>
          <div className="w-full h-1 bg-[#E5E7EB] dark:bg-[#27272A] rounded-full overflow-hidden mt-3">
            <div className="h-full bg-emerald-600 rounded-full w-full" />
          </div>
        </div>
      </div>
    </SkeletonContainer>
  )
}
