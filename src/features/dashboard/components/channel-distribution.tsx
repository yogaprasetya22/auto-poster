export interface PlatformStat {
  key: string
  name: string
  count: number
  pct: number
  color: string
}

interface ChannelDistributionProps {
  selectedTimeframe: string
  totalTargets: number
  platformStats: PlatformStat[]
}

export function ChannelDistribution({
  selectedTimeframe,
  totalTargets,
  platformStats,
}: ChannelDistributionProps) {
  return (
    <div className="bg-white dark:bg-[#18181B] rounded-xl p-4 border border-[#E5E7EB] dark:border-[#27272A] shadow-xs flex flex-col gap-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6] dark:border-[#27272A]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-black dark:text-white">donut_small</span>
          <h2 className="text-base text-black dark:text-white font-semibold">Distribusi Kanal</h2>
        </div>
        <span className="font-mono text-[10px] text-[#6B7280] font-medium uppercase">
          {selectedTimeframe} ({totalTargets} target)
        </span>
      </div>

      {/* Dynamic Progress Stack */}
      <div className="flex flex-col gap-2">
        <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-[#F3F4F6] dark:bg-[#27272A] gap-0.5 border border-[#E5E7EB] dark:border-[#3F3F46]">
          {platformStats.map((ps) => (
            <div
              key={ps.key}
              className={`${ps.color} h-full transition-all duration-300`}
              style={{ width: `${ps.pct}%` }}
              title={`${ps.name}: ${ps.pct}%`}
            />
          ))}
        </div>

        {/* Dynamic Rows */}
        <div className="flex flex-col gap-2 pt-2 text-xs">
          {platformStats.map((ps) => (
            <div key={ps.key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`size-2 rounded-full ${ps.color}`} />
                <span className="text-black dark:text-gray-200 font-medium">{ps.name}</span>
                <span className="font-mono text-[#6B7280]">{ps.count} posts</span>
              </div>
              <span className="font-mono text-black dark:text-white font-bold">{ps.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
