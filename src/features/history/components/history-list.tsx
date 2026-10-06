import { useState, useMemo, useEffect } from 'react'
import { Calendar, AlertCircle, Eye, RotateCcw, Trash2, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
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
  pageSize?: number
}

export function HistoryList({
  loading,
  targets,
  onSelectTarget,
  onRetry,
  onDelete,
  pageSize = 10,
}: HistoryListProps) {
  const [currentPage, setCurrentPage] = useState(1)

  // Reset ke halaman 1 saat filter data berubah
  useEffect(() => {
    setCurrentPage(1)
  }, [targets])

  const totalItems = targets.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  const paginatedTargets = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return targets.slice(startIndex, startIndex + pageSize)
  }, [targets, currentPage, pageSize])

  return (
    <SkeletonContainer isLoading={loading}>
      <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden flex flex-col">
        {targets.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            Belum ada data riwayat eksekusi. Jadwalkan postingan baru dari menu Buat Postingan!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary border-b border-border">
                  <TableHead className="w-[140px] px-4 py-3.5 text-xs font-semibold text-foreground uppercase tracking-wider">
                    Platform
                  </TableHead>
                  <TableHead className="min-w-[320px] px-4 py-3.5 text-xs font-semibold text-foreground uppercase tracking-wider">
                    Konten & Jadwal
                  </TableHead>
                  <TableHead className="w-[140px] px-4 py-3.5 text-xs font-semibold text-foreground uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="w-[180px] px-4 py-3.5 text-right text-xs font-semibold text-foreground uppercase tracking-wider">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {paginatedTargets.map((t) => {
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
                      className="hover:bg-muted/50 transition-colors"
                    >
                      {/* Kolom 1: Platform & Akun */}
                      <TableCell className="align-middle px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded bg-secondary border border-border flex items-center justify-center shrink-0">
                            <span className="font-mono text-[10px] font-bold text-foreground uppercase">
                              {t.platform.slice(0, 2)}
                            </span>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-mono text-[10px] font-semibold text-foreground uppercase">
                              {t.connected_accounts?.platform || t.platform}
                            </span>
                            {t.connected_accounts?.account_name && (
                              <span className="text-[11px] text-muted-foreground font-mono truncate max-w-[120px]">
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
                            className="text-xs font-bold text-foreground truncate max-w-lg cursor-pointer hover:underline"
                            title={t.posts?.title || t.posts?.content_text}
                          >
                            {t.posts?.title || t.posts?.content_text?.slice(0, 75) || '—'}
                          </span>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1 font-mono">
                              <Calendar size={11} />
                              {formatWIB(t.posts?.scheduled_at || t.created_at)}
                            </span>
                            {cleanError && (
                              <span
                                className="text-red-500 truncate max-w-sm font-mono text-[10px] flex items-center gap-1 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20"
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
                                ? 'bg-primary text-primary-foreground border-primary'
                                : t.status === 'FAILED'
                                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                : 'bg-secondary text-foreground border-border'
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

        {/* Pagination Bar */}
        <div className="p-3.5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground bg-secondary/20">
          <span>
            Menampilkan{' '}
            <strong className="text-foreground font-mono">
              {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalItems)}
            </strong>{' '}
            dari <strong className="text-foreground font-mono">{totalItems}</strong> postingan
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-card text-foreground text-xs font-medium hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft size={14} />
                <span>Sebelumnya</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (totalPages <= 7) return true
                    return p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1
                  })
                  .reduce<(number | string)[]>((acc, p, idx, arr) => {
                    if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                      acc.push('...')
                    }
                    acc.push(p)
                    return acc
                  }, [])
                  .map((item, idx) =>
                    typeof item === 'string' ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground font-mono">
                        ...
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setCurrentPage(item)}
                        className={`size-7 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                          currentPage === item
                            ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                            : 'bg-card border border-border text-foreground hover:bg-muted'
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-card text-foreground text-xs font-medium hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Halaman Berikutnya"
              >
                <span>Berikutnya</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </SkeletonContainer>
  )
}
