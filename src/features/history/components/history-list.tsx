import { useEffect, useRef } from 'react'
import { Calendar, AlertCircle, Eye, RotateCcw, Trash2, ExternalLink, Loader2 } from 'lucide-react'
import { formatWIB } from '@/shared/lib/date'
import { SkeletonContainer } from '@/shared/components/ui/skeleton-container'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/shared/components/ui/table'

interface HistoryListProps {
  loading: boolean
  targets: any[]
  onSelectTarget: (target: any) => void
  onRetry: (targetId: string) => void
  onDelete: (targetId: string) => void
  hasMore?: boolean
  isLoadingMore?: boolean
  onLoadMore?: () => void
}

export function HistoryList({
  loading,
  targets,
  onSelectTarget,
  onRetry,
  onDelete,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: HistoryListProps) {
  // Intersection Observer untuk Infinite Scroll trigger otomatis saat scroll ke bawah
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!hasMore || isLoadingMore || !onLoadMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore()
        }
      },
      { rootMargin: '200px' }
    )

    const el = sentinelRef.current
    if (el) observer.observe(el)
    return () => {
      if (el) observer.unobserve(el)
    }
  }, [hasMore, isLoadingMore, onLoadMore])

  return (
    <SkeletonContainer isLoading={loading}>
      <div className="bg-white dark:bg-[#18181B] rounded-xl border border-[#E5E7EB] dark:border-[#27272A] shadow-xs overflow-hidden flex flex-col">
        {targets.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#6B7280]">
            Belum ada data riwayat eksekusi. Jadwalkan postingan baru dari menu Buat Postingan!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F9FAFB] dark:bg-[#18181B] border-b border-[#E5E7EB] dark:border-[#27272A]">
                  <TableHead className="w-[140px] px-4 py-3.5 text-xs font-bold text-black dark:text-white uppercase tracking-wider">
                    Platform
                  </TableHead>
                  <TableHead className="min-w-[320px] px-4 py-3.5 text-xs font-bold text-black dark:text-white uppercase tracking-wider">
                    Konten & Jadwal
                  </TableHead>
                  <TableHead className="w-[140px] px-4 py-3.5 text-xs font-bold text-black dark:text-white uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="w-[180px] px-4 py-3.5 text-right text-xs font-bold text-black dark:text-white uppercase tracking-wider">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A]">
                {targets.map((t) => {
                  const errorMsg =
                    t.status === 'FAILED' && t.error_payload
                      ? typeof t.error_payload === 'string'
                        ? t.error_payload
                        : t.error_payload?.message || JSON.stringify(t.error_payload)
                      : null

                  const cleanError = errorMsg ? errorMsg.replace(/^(Err:\s*|Error:\s*)/i, '') : ''

                  return (
                    <TableRow
                      key={t.id}
                      className="hover:bg-[#F9FAFB] dark:hover:bg-[#202023] transition-colors"
                    >
                      {/* Kolom 1: Platform & Akun */}
                      <TableCell className="align-middle px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded bg-[#F3F4F6] dark:bg-[#27272A] border border-[#E5E7EB] dark:border-[#3F3F46] flex items-center justify-center shrink-0">
                            <span className="font-mono text-[10px] font-bold text-black dark:text-white uppercase">
                              {t.platform.slice(0, 2)}
                            </span>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-mono text-[10px] font-semibold text-black dark:text-white uppercase">
                              {t.connected_accounts?.platform || t.platform}
                            </span>
                            {t.connected_accounts?.account_name && (
                              <span className="text-[11px] text-[#6B7280] font-mono truncate max-w-[120px]">
                                @{t.connected_accounts.account_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Kolom 2: Judul, Jadwal & Detail Error jika ada */}
                      <TableCell className="align-middle px-4 py-3.5">
                        <div className="flex flex-col gap-1 min-w-0">
                          <span
                            onClick={() => onSelectTarget(t)}
                            className="text-xs font-bold text-black dark:text-white truncate max-w-lg cursor-pointer hover:underline"
                            title={t.posts?.title || t.posts?.content_text}
                          >
                            {t.posts?.title || t.posts?.content_text?.slice(0, 75) || '—'}
                          </span>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#6B7280]">
                            <span className="flex items-center gap-1 font-mono">
                              <Calendar size={11} />
                              {formatWIB(t.posts?.scheduled_at || t.created_at)}
                            </span>
                            {cleanError && (
                              <span
                                className="text-red-600 truncate max-w-sm font-mono text-[10px] flex items-center gap-1 bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900/50"
                                title={cleanError}
                              >
                                <AlertCircle size={10} className="shrink-0" />
                                <span className="truncate">{cleanError}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Kolom 3: Status Badge */}
                      <TableCell className="align-middle px-4 py-3.5">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-block font-mono text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${
                              t.status === 'SUCCESS'
                                ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                                : t.status === 'FAILED'
                                ? 'bg-red-50 dark:bg-red-950/40 text-red-600 border-red-200 dark:border-red-800'
                                : 'bg-[#F3F4F6] dark:bg-[#27272A] text-black dark:text-white border-[#E5E7EB] dark:border-[#3F3F46]'
                            }`}
                          >
                            {t.status}
                          </span>
                          {Boolean(t.posts?.media_metadata?.is_simulation) && (
                            <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 tracking-wider">
                              <span className="size-1 rounded-full bg-amber-500 animate-pulse" />
                              SIMULASI
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Kolom 4: Aksi */}
                      <TableCell className="align-middle px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectTarget(t)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#1E1E22] hover:bg-[#F3F4F6] dark:hover:bg-[#27272A] text-[11px] font-medium text-black dark:text-white cursor-pointer transition-colors"
                            title="Lihat Naskah & Media"
                          >
                            <Eye size={12} />
                            <span>Lihat</span>
                          </button>

                          {t.status === 'FAILED' && (
                            <button
                              type="button"
                              onClick={() => onRetry(t.id)}
                              className="flex items-center gap-1 px-2 py-1 rounded-md bg-black dark:bg-white text-white dark:text-black text-[11px] font-semibold hover:bg-[#262626] transition-colors cursor-pointer"
                              title="Eksekusi Ulang Target"
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
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Infinite Pagination Sentinel & Status Bar */}
        <div ref={sentinelRef} className="p-4 border-t border-[#E5E7EB] dark:border-[#27272A] flex items-center justify-between text-xs text-[#6B7280] bg-[#FAFAFA] dark:bg-[#141416]">
          <span>
            Menampilkan <strong className="text-black dark:text-white font-mono">{targets.length}</strong> postingan
          </span>

          {isLoadingMore ? (
            <div className="flex items-center gap-1.5 text-xs text-black dark:text-white font-medium">
              <Loader2 size={14} className="animate-spin" />
              <span>Memuat data berikutnya...</span>
            </div>
          ) : hasMore ? (
            <button
              type="button"
              onClick={onLoadMore}
              className="text-xs font-medium text-black dark:text-white hover:underline cursor-pointer"
            >
              Muat lebih banyak ↓
            </button>
          ) : (
            <span className="text-[11px] text-[#9CA3AF] font-mono">Semua riwayat telah dimuat</span>
          )}
        </div>
      </div>
    </SkeletonContainer>
  )
}
