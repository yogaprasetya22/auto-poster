import { SkeletonContainer } from '@/shared/components/ui/skeleton-container'

interface DashboardMetricsProps {
  loading: boolean
  completed: number
  scheduled: number
  failed: number
  successRate: string
  allTargetsCount: number
  connectedCount: number
  todayPostsCount: number
}

export function DashboardMetrics({
  loading,
  completed,
  scheduled,
  failed,
  successRate,
  allTargetsCount,
  connectedCount,
  todayPostsCount,
}: DashboardMetricsProps) {
  return (
    <SkeletonContainer isLoading={loading}>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Total Dipublikasikan */}
        <div className="relative overflow-hidden bg-card rounded-xl p-4 border border-border shadow-xs flex flex-col justify-between hover:border-foreground/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="material-symbols-outlined text-[18px]">publish</span>
              <span className="text-xs font-medium">Total Dipublikasikan</span>
            </div>
            <span className="font-mono text-[10px] text-foreground bg-secondary border border-border px-1.5 py-0.5 rounded font-semibold">
              {allTargetsCount} TARGETS
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight font-mono text-foreground">
                {completed}
              </span>
              <span className="text-[11px] text-muted-foreground">postingan selesai</span>
            </div>
          </div>
        </div>

        {/* Card 2: Antrean Terjadwal */}
        <div className="relative overflow-hidden bg-card rounded-xl p-4 border border-border shadow-xs flex flex-col justify-between hover:border-foreground/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="material-symbols-outlined text-[18px]">schedule</span>
              <span className="text-xs font-medium">Antrean Terjadwal</span>
            </div>
            <span className="font-mono text-[10px] text-foreground bg-secondary border border-border px-1.5 py-0.5 rounded font-medium">
              {connectedCount} Akun Siap
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold tracking-tight font-mono text-foreground">{scheduled}</span>
                <span className="font-mono text-xs text-muted-foreground">konten</span>
              </div>
              <span className="text-[11px] text-muted-foreground">{todayPostsCount} terjadwal hari ini</span>
            </div>
          </div>
        </div>

        {/* Card 3: Tingkat Keberhasilan */}
        <div className="relative overflow-hidden bg-card rounded-xl p-4 border border-border shadow-xs flex flex-col justify-between hover:border-foreground/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span className="text-xs font-medium">Tingkat Keberhasilan</span>
            </div>
            <span className="font-mono text-[10px] text-foreground bg-secondary border border-border px-1.5 py-0.5 rounded font-semibold">
              {Number(successRate) >= 90 ? 'Optimal' : 'Needs Review'}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight font-mono text-foreground">{successRate}%</span>
              <span className="text-[11px] text-muted-foreground font-mono">{failed} target gagal</span>
            </div>
          </div>
        </div>

        {/* Card 4: Platform Terhubung */}
        <div className="relative overflow-hidden bg-card rounded-xl p-4 border border-border shadow-xs flex flex-col justify-between hover:border-foreground/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="material-symbols-outlined text-[18px]">hub</span>
              <span className="text-xs font-medium">Platform Terhubung</span>
            </div>
            <span className="font-mono text-[10px] text-foreground bg-secondary border border-border px-1.5 py-0.5 rounded font-semibold">
              {connectedCount} Saluran
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold tracking-tight font-mono text-foreground">{connectedCount} Akun</span>
              </div>
              <span className="text-[11px] text-muted-foreground">Active Token</span>
            </div>
          </div>
        </div>
      </div>
    </SkeletonContainer>
  )
}
