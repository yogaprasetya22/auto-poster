import { Link } from 'react-router-dom'
import { formatWIB } from '@/shared/lib/date'

interface TodayScheduleProps {
  todayPosts: any[]
}

export function TodaySchedule({ todayPosts }: TodayScheduleProps) {
  return (
    <div className="bg-white dark:bg-[#18181B] rounded-xl p-4 border border-[#E5E7EB] dark:border-[#27272A] shadow-xs flex flex-col gap-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6] dark:border-[#27272A]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-black dark:text-white">calendar_today</span>
          <h2 className="text-base text-black dark:text-white font-semibold tracking-tight">Jadwal Hari Ini & Antrean Langsung</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#F3F4F6] dark:bg-[#27272A] border border-[#E5E7EB] dark:border-[#3F3F46] text-[#374151] dark:text-gray-300 font-medium">
            Auto-Dispatch ON
          </span>
        </div>
      </div>

      {todayPosts.length === 0 ? (
        <div className="p-8 text-center bg-[#F9FAFB] dark:bg-[#202023] rounded-lg border border-dashed border-[#E5E7EB] dark:border-[#27272A]">
          <span className="material-symbols-outlined text-3xl text-[#9CA3AF] mb-1">hourglass_empty</span>
          <p className="text-xs text-[#6B7280] font-medium">Tidak ada postingan yang dijadwalkan untuk hari ini.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {todayPosts.slice(0, 6).map((p) => (
            <div
              key={p.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg bg-[#F9FAFB] dark:bg-[#202023] border border-[#E5E7EB] dark:border-[#27272A] hover:border-black dark:hover:border-white hover:bg-white dark:hover:bg-[#18181B] transition-all gap-3 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative size-12 rounded border border-[#E5E7EB] dark:border-[#27272A] bg-[#F3F4F6] dark:bg-[#27272A] overflow-hidden shrink-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-gray-400">videocam</span>
                </div>
                <div className="flex flex-col min-w-0 gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black dark:bg-white text-white dark:text-black font-medium">
                      {formatWIB(p.scheduled_at).split(' ')[1] || '14:30'} WIB
                    </span>
                    <span className="font-mono text-[10px] text-black dark:text-white font-semibold flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-black dark:bg-white animate-pulse" />
                      {p.status}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-black dark:text-white truncate group-hover:underline">
                    {p.title || p.content_text.slice(0, 60)}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
                    <span>{p.media_type || 'VIDEO'} • Synced</span>
                  </div>
                </div>
              </div>

              <Link
                to="/history"
                className="px-2.5 py-1 rounded bg-white dark:bg-[#27272A] border border-[#E5E7EB] dark:border-[#3F3F46] text-[11px] text-black dark:text-white font-mono hover:bg-[#F3F4F6] dark:hover:bg-[#3F3F46] transition-colors shrink-0"
              >
                Audit
              </Link>
            </div>
          ))}

          {todayPosts.length > 6 && (
            <div className="pt-1 text-center">
              <Link
                to="/history"
                className="text-xs font-medium text-[#6B7280] hover:text-black dark:hover:text-white hover:underline transition-colors"
              >
                + Lihat {todayPosts.length - 6} postingan lainnya di Riwayat ↗
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
