import { X, AlertCircle, Copy, ExternalLink, Trash2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { formatWIB } from '@/shared/lib/date'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/shared/components/ui/drawer'
import { PostPhoneSimulator } from './post-phone-simulator'

interface HistoryDetailDrawerProps {
  target: any | null
  onClose: () => void
  onRetry: (targetId: string) => void
  onDelete: (targetId: string) => void
}

export function HistoryDetailDrawer({
  target,
  onClose,
  onRetry,
  onDelete,
}: HistoryDetailDrawerProps) {
  if (!target) return null

  const mediaUrl = target.posts?.gdrive_stream_url || target.posts?.gdrive_lh3_url || ''
  const mediaType = target.posts?.media_type || 'VIDEO'
  const postTitle = target.posts?.title || ''
  const contentText = target.posts?.content_text || ''
  const accountName = target.connected_accounts?.account_name || target.platform

  // Map platform string ke kanal simulator
  const channelMap: Record<string, 'tiktok' | 'reels' | 'threads' | 'facebook'> = {
    tiktok: 'tiktok',
    instagram: 'reels',
    facebook_page: 'facebook',
    threads: 'threads',
  }
  const defaultChannel = channelMap[target.platform] || 'reels'

  return (
    <Drawer open={!!target} onOpenChange={(open) => { if (!open) onClose() }}>
      <DrawerContent className="max-w-5xl w-full bg-white dark:bg-[#121212] rounded-t-2xl md:rounded-t-none md:rounded-l-2xl border-t md:border-t-0 md:border-l border-[#E5E7EB] dark:border-[#27272A] shadow-2xl">
        {/* Drawer Header */}
        <DrawerHeader className="p-4 border-b border-[#E5E7EB] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#18181B]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase px-2 py-0.5 rounded bg-black dark:bg-white text-white dark:text-black">
                {target.platform}
              </span>
              <DrawerTitle className="text-sm font-semibold text-black dark:text-white truncate max-w-md">
                {postTitle || 'Detail Konten Postingan'}
              </DrawerTitle>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-[#6B7280] hover:text-black dark:hover:text-white hover:bg-[#E5E7EB] dark:hover:bg-[#27272A] transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
          <DrawerDescription className="text-xs text-muted-foreground mt-0.5 text-left">
            Inspeksi canvas phone simulator 9:16, naskah caption, dan data API response.
          </DrawerDescription>
        </DrawerHeader>

        {/* Drawer Body: 2 Kolom Layout (Kiri: Mockup Phone Simulator, Kanan: Metadata & Naskah) */}
        <div className="p-5 overflow-y-auto max-h-[100vh]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Kolom Kiri (5 Cols): Phone Simulator 9:16 */}
            <div className="lg:col-span-5 flex justify-center bg-[#F9FAFB] dark:bg-[#18181B] p-4 rounded-2xl border border-[#E5E7EB] dark:border-[#27272A]">
              <PostPhoneSimulator
                channel={defaultChannel}
                mediaUrl={mediaUrl}
                mediaType={mediaType}
                contentText={contentText}
                title={postTitle}
                accountName={accountName}
              />
            </div>

            {/* Kolom Kanan (7 Cols): Status, Detail Naskah, & Metadata */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              {/* Status Alert Banner */}
              <div
                className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                  target.status === 'SUCCESS'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : target.status === 'FAILED'
                    ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                    : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                }`}
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold uppercase tracking-wide">Status: {target.status}</span>
                    {Boolean(target.posts?.media_metadata?.is_simulation) && (
                      <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 tracking-wider">
                        <span className="size-1 rounded-full bg-amber-500 animate-pulse" />
                        SIMULASI (DRY-RUN)
                      </span>
                    )}
                  </div>
                  {target.error_payload ? (
                    <span className="font-mono text-[11px] break-all">
                      {(() => {
                        const raw = typeof target.error_payload === 'string'
                          ? target.error_payload
                          : (target.error_payload?.message || JSON.stringify(target.error_payload))
                        return raw.replace(/^(Err:\s*|Error:\s*)/i, '')
                      })()}
                    </span>
                  ) : (
                    <span>
                      {Boolean(target.posts?.media_metadata?.is_simulation)
                        ? `Postingan simulasi (dry-run) untuk akun @${accountName}. Aman tidak diposting ke feed live.`
                        : `Postingan dijadwalkan untuk akun @${accountName}`}
                    </span>
                  )}
                </div>
              </div>

              {/* Naskah Konten Caption */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-black dark:text-white">Naskah Caption & Hashtag:</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(contentText)
                      toast.success('Caption disalin ke clipboard!')
                    }}
                    className="flex items-center gap-1 text-[10px] font-mono text-[#6B7280] hover:text-black dark:hover:text-white cursor-pointer"
                  >
                    <Copy size={11} />
                    <span>Salin Naskah</span>
                  </button>
                </div>
                <div className="bg-[#F9FAFB] dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] p-3 rounded-xl text-xs text-black dark:text-gray-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-sans">
                  {contentText || '— Tidak ada naskah —'}
                </div>
              </div>

              {/* Tautan Media Stream & Google Drive */}
              {mediaUrl && (
                <div className="p-3 rounded-xl bg-[#F8F9FA] dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] flex flex-col gap-2">
                  <span className="text-[11px] font-semibold text-black dark:text-white">Sumber File Media:</span>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <a
                      href={mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <span>Buka URL Media Langsung</span>
                      <ExternalLink size={11} />
                    </a>
                    {target.posts?.gdrive_file_id && (
                      <a
                        href={`https://drive.google.com/file/d/${target.posts.gdrive_file_id}/view`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 dark:text-gray-400 hover:underline flex items-center gap-1 text-[11px]"
                      >
                        <span>Buka di Google Drive</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata Informasi */}
              <div className="grid grid-cols-2 gap-2 text-[11px] p-3 rounded-xl bg-[#F8F9FA] dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A]">
                <div>
                  <span className="text-[#6B7280]">Target ID:</span>
                  <p className="font-mono font-medium text-black dark:text-gray-200 truncate">{target.id}</p>
                </div>
                <div>
                  <span className="text-[#6B7280]">Jadwal / Waktu Buat:</span>
                  <p className="font-mono font-medium text-black dark:text-gray-200">
                    {formatWIB(target.posts?.scheduled_at || target.created_at)}
                  </p>
                </div>
                {target.external_post_id && (
                  <div className="col-span-2">
                    <span className="text-[#6B7280]">External Platform ID:</span>
                    <p className="font-mono font-medium text-black dark:text-gray-200 truncate">
                      {target.external_post_id}
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Drawer Footer Actions */}
        <DrawerFooter className="p-3 border-t border-[#E5E7EB] dark:border-[#27272A] bg-[#FAFAFA] dark:bg-[#18181B] flex flex-row items-center justify-between">
          <button
            type="button"
            onClick={() => onDelete(target.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-medium transition-colors cursor-pointer"
          >
            <Trash2 size={13} />
            <span>Hapus Item</span>
          </button>

          <div className="flex items-center gap-2">
            {target.status === 'FAILED' && (
              <button
                type="button"
                onClick={() => {
                  onRetry(target.id)
                  onClose()
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black dark:bg-white text-white dark:text-black text-xs font-semibold hover:bg-[#262626] transition-colors cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>Retry Postingan Ini</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#1E1E22] text-xs font-medium text-black dark:text-white hover:bg-[#F3F4F6] cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
