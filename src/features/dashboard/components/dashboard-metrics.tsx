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
        <div className="relative overflow-hidden bg-white dark:bg-[#18181B] rounded-xl p-4 border border-[#E5E7EB] dark:border-[#27272A] shadow-xs flex flex-col justify-between group hover:border-black dark:hover:border-white transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-[#6B7280]">
              <span className="material-symbols-outlined text-[18px]">publish</span>
              <span className="text-xs font-medium">Total Dipublikasikan</span>
            </div>
            <span className="flex items-center gap-0.5 font-mono text-[10px] text-black dark:text-white bg-[#F3F4F6] dark:bg-[#27272A] border border-[#E5E7EB] dark:border-[#3F3F46] px-1.5 py-0.5 rounded font-semibold">
              <span className="material-symbols-outlined text-[12px]">trending_up</span>{allTargetsCount} TARGETS
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight font-mono text-black dark:text-white">
                {completed}
              </span>
              <span className="text-[11px] text-[#6B7280]">postingan terselesaikan</span>
            </div>
            <div className="w-20 h-9">
              <svg className="w-full h-full text-black dark:text-white" fill="none" preserveAspectRatio="none" viewBox="0 0 80 36">
                <path d="M0 28 L14 24 L28 26 L42 16 L56 18 L70 6 L80 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M0 28 L14 24 L28 26 L42 16 L56 18 L70 6 L80 4 L80 36 L0 36 Z" fill="currentColor" fillOpacity="0.06" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 2: Antrean Terjadwal */}
        <div className="relative overflow-hidden bg-white dark:bg-[#18181B] rounded-xl p-4 border border-[#E5E7EB] dark:border-[#27272A] shadow-xs flex flex-col justify-between group hover:border-black dark:hover:border-white transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-[#6B7280]">
              <span className="material-symbols-outlined text-[18px]">schedule</span>
              <span className="text-xs font-medium">Antrean Terjadwal</span>
            </div>
            <span className="flex items-center gap-1 font-mono text-[10px] text-black dark:text-white bg-[#F3F4F6] dark:bg-[#27272A] border border-[#E5E7EB] dark:border-[#3F3F46] px-1.5 py-0.5 rounded font-medium">
              <span className="size-1.5 rounded-full bg-black dark:bg-white" />{connectedCount} Akun Siap
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold tracking-tight font-mono text-black dark:text-white">{scheduled}</span>
                <span className="font-mono text-xs text-[#6B7280]">konten</span>
              </div>
              <span className="text-[11px] text-[#6B7280]">{todayPostsCount} terjadwal hari ini</span>
            </div>
          </div>
        </div>

        {/* Card 3: Tingkat Keberhasilan */}
        <div className="relative overflow-hidden bg-white dark:bg-[#18181B] rounded-xl p-4 border border-[#E5E7EB] dark:border-[#27272A] shadow-xs flex flex-col justify-between group hover:border-black dark:hover:border-white transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-[#6B7280]">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span className="text-xs font-medium">Tingkat Keberhasilan</span>
            </div>
            <span className="font-mono text-[10px] text-black dark:text-white bg-[#F3F4F6] dark:bg-[#27272A] border border-[#E5E7EB] dark:border-[#3F3F46] px-1.5 py-0.5 rounded font-semibold">
              {Number(successRate) >= 90 ? 'Optimal' : 'Needs Review'}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-tight font-mono text-black dark:text-white">{successRate}%</span>
              <span className="text-[11px] text-[#6B7280] font-mono">{failed} target gagal</span>
            </div>
            <div className="relative flex items-center justify-center size-9">
              <svg className="size-full transform -rotate-90" viewBox="0 0 36 36">
                <path className="text-[#E5E7EB] dark:text-[#27272A]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                <path className="text-black dark:text-white" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${successRate}, 100`} strokeLinecap="round" strokeWidth="3" />
              </svg>
              <span className="material-symbols-outlined text-[14px] text-black dark:text-white absolute">done_all</span>
            </div>
          </div>
        </div>

        {/* Card 4: Platform Terhubung */}
        <div className="relative overflow-hidden bg-white dark:bg-[#18181B] rounded-xl p-4 border border-[#E5E7EB] dark:border-[#27272A] shadow-xs flex flex-col justify-between group hover:border-black dark:hover:border-white transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-[#6B7280]">
              <span className="material-symbols-outlined text-[18px]">hub</span>
              <span className="text-xs font-medium">Platform Terhubung</span>
            </div>
            <span className="font-mono text-[10px] text-black dark:text-white bg-[#F3F4F6] dark:bg-[#27272A] border border-[#E5E7EB] dark:border-[#3F3F46] px-1.5 py-0.5 rounded font-semibold">
              {connectedCount} Saluran
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold tracking-tight font-mono text-black dark:text-white">{connectedCount} Akun</span>
                <span className="size-2 rounded-full bg-black dark:bg-white" />
              </div>
              <span className="text-[11px] text-[#6B7280]">Active Token Cluster</span>
            </div>
          </div>
        </div>
      </div>
    </SkeletonContainer>
  )
}
