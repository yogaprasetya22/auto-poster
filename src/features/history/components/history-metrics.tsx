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
}: HistoryMetricsProps) {
  return (
    <SkeletonContainer isLoading={loading}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Eksekusi */}
        <div className="flex flex-col p-4 rounded-xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] uppercase tracking-wider font-semibold font-mono">Total Eksekusi</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary text-foreground font-bold">
              {successPct}% OK
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-foreground">{totalCount}</span>
            <span className="text-xs text-muted-foreground font-medium">{successCount} sukses</span>
          </div>
        </div>

        {/* Antrean Aktif */}
        <div className="flex flex-col p-4 rounded-xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] uppercase tracking-wider font-semibold font-mono">Dalam Antrean</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-bold">
              PENDING
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-foreground">{pendingCount}</span>
            <span className="text-xs text-muted-foreground">siap tayang</span>
          </div>
        </div>

        {/* Gagal Dispatch */}
        <div className="flex flex-col p-4 rounded-xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] uppercase tracking-wider font-semibold font-mono">Gagal Eksekusi</span>
            {failedCount > 0 ? (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 font-bold border border-red-500/20">
                {failedCount} GAGAL
              </span>
            ) : (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-bold">
                0
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-foreground">{failedCount}</span>
            <span className="text-xs text-muted-foreground font-medium">
              {failedCount > 0 ? 'perlu retry' : 'tidak ada error'}
            </span>
          </div>
        </div>

        {/* Status Engine */}
        <div className="flex flex-col p-4 rounded-xl bg-card border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] uppercase tracking-wider font-semibold font-mono">Dispatcher Engine</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary text-foreground font-bold">
              STANDBY
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-sm font-semibold text-foreground">Otomatisasi Aktif</span>
            <span className="text-xs text-muted-foreground">Sync Cron Ready</span>
          </div>
        </div>
      </div>
    </SkeletonContainer>
  )
}
