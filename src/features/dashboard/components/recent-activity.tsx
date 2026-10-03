interface RecentActivityProps {
  recentLogs: any[]
}

export function RecentActivity({ recentLogs }: RecentActivityProps) {
  return (
    <div className="bg-white dark:bg-[#18181B] rounded-xl p-4 border border-[#E5E7EB] dark:border-[#27272A] shadow-xs flex flex-col gap-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6] dark:border-[#27272A]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-black dark:text-white">terminal</span>
          <h2 className="text-base text-black dark:text-white font-semibold">Aktivitas Terkini</h2>
        </div>
        <span className="font-mono text-[10px] text-black dark:text-white bg-[#F3F4F6] dark:bg-[#27272A] border border-[#E5E7EB] dark:border-[#3F3F46] px-1.5 py-0.5 rounded font-semibold">
          ENGINE OK
        </span>
      </div>

      <div className="flex flex-col gap-2 text-xs">
        {recentLogs.length === 0 ? (
          <div className="py-4 text-center text-xs text-[#6B7280]">Belum ada aktivitas engine.</div>
        ) : (
          recentLogs.map((log) => (
            <div
              key={log.id}
              className="p-2 rounded bg-[#F9FAFB] dark:bg-[#202023] border border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-between gap-2 hover:bg-white dark:hover:bg-[#18181B] transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-[10px] text-white dark:text-black bg-black dark:bg-white px-1.5 py-0.5 rounded shrink-0 font-bold uppercase">
                  {log.platform.replace('_page', '').slice(0, 8)}
                </span>
                <span className="text-black dark:text-gray-200 font-medium truncate">
                  {log.posts?.title || log.posts?.content_text?.slice(0, 35) || 'Dispatch Target'}
                </span>
              </div>
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#F3F4F6] dark:bg-[#27272A] border border-[#E5E7EB] dark:border-[#3F3F46] text-black dark:text-white shrink-0 uppercase font-semibold">
                {log.status === 'SUCCESS' ? 'HTTP 200' : log.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
