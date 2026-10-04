import { Calendar, AlertCircle, Eye, RotateCcw, Trash2, ExternalLink } from 'lucide-react'
import { formatWIB } from '@/shared/lib/date'
import { SkeletonContainer } from '@/shared/components/ui/skeleton-container'

interface HistoryListProps {
  loading: boolean
  targets: any[]
  onSelectTarget: (target: any) => void
  onRetry: (targetId: string) => void
  onDelete: (targetId: string) => void
}

export function HistoryList({
  loading,
  targets,
  onSelectTarget,
  onRetry,
  onDelete,
}: HistoryListProps) {
  return (
    <SkeletonContainer isLoading={loading}>
      <div className="bg-white dark:bg-[#18181B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] shadow-xs overflow-hidden">
        {targets.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#6B7280]">
            Belum ada data riwayat eksekusi. Jadwalkan postingan baru dari menu Buat Postingan!
          </div>
        ) : (
          <div className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
            {targets.map((t) => (
              <div
                key={t.id}
                className="p-4 hover:bg-[#F9FAFB] dark:hover:bg-[#202023] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="size-8 rounded bg-[#F3F4F6] dark:bg-[#27272A] border border-[#E5E7EB] dark:border-[#3F3F46] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="font-mono text-[10px] font-bold text-black dark:text-white uppercase">
                      {t.platform.slice(0, 2)}
                    </span>
                  </div>

                  <div className="flex flex-col min-w-0 gap-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-black dark:text-white truncate">
                        {t.posts?.title || t.posts?.content_text?.slice(0, 60) || '—'}
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[#F3F4F6] dark:bg-[#27272A] text-black dark:text-white border border-[#E5E7EB] dark:border-[#3F3F46] uppercase">
                        {t.connected_accounts?.platform || t.platform}
                      </span>
                      {t.connected_accounts?.account_name && (
                        <span className="text-[11px] text-[#6B7280] font-mono">
                          @{t.connected_accounts.account_name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[#6B7280] mt-0.5">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar size={11} />
                        {formatWIB(t.posts?.scheduled_at || t.created_at)}
                      </span>
                      {t.status === 'FAILED' && t.error_payload && (
                        <span className="text-red-600 truncate max-w-md font-mono text-[10px] flex items-center gap-1">
                          <AlertCircle size={10} />
                          {(() => {
                            const raw = typeof t.error_payload === 'string'
                              ? t.error_payload
                              : (t.error_payload?.message || JSON.stringify(t.error_payload))
                            return raw.replace(/^(Err:\s*|Error:\s*)/i, '')
                          })()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Lihat Konten, Retry, Delete, External Link */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <span
                    className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${
                      t.status === 'SUCCESS'
                        ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                        : t.status === 'FAILED'
                        ? 'bg-red-50 dark:bg-red-950/40 text-red-600 border-red-200 dark:border-red-800'
                        : 'bg-[#F3F4F6] dark:bg-[#27272A] text-black dark:text-white border-[#E5E7EB] dark:border-[#3F3F46]'
                    }`}
                  >
                    {t.status}
                  </span>

                  <button
                    type="button"
                    onClick={() => onSelectTarget(t)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#1E1E22] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A] text-[11px] font-medium text-black dark:text-white cursor-pointer transition-colors"
                    title="Lihat Naskah & Media"
                  >
                    <Eye size={12} />
                    <span>Lihat Konten</span>
                  </button>

                  {t.status === 'FAILED' && (
                    <button
                      type="button"
                      onClick={() => onRetry(t.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-black dark:bg-white text-white dark:text-black text-[11px] font-semibold hover:bg-[#262626] transition-colors cursor-pointer"
                    >
                      <RotateCcw size={11} />
                      <span>Retry</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onDelete(t.id)}
                    className="p-1 rounded text-[#9CA3AF] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                    title="Hapus Target"
                  >
                    <Trash2 size={13} />
                  </button>

                  {t.external_post_url && (
                    <a
                      href={t.external_post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded text-[#6B7280] hover:text-black dark:hover:text-white hover:bg-[#F3F4F6] dark:hover:bg-[#27272A] transition-colors"
                      title="Buka Postingan Asli"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SkeletonContainer>
  )
}
