import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import {
  FileText,
  Edit3,
  Trash2,
  Plus,
  RefreshCw,
  Search,
  Film,
  Image as ImageIcon,
  Images,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { useComposerStore } from '@/features/composer/store/use-composer-store'

function formatWibDateTime(iso: string) {
  try {
    const d = new Date(iso)
    const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000)
    return format(wib, 'd MMM yyyy, HH:mm', { locale: id }) + ' WIB'
  } catch {
    return iso
  }
}

export function DraftsPage() {
  const navigate = useNavigate()
  const { loadDraft, reset } = useComposerStore()

  const [drafts, setDrafts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'VIDEO' | 'SINGLE_IMAGE' | 'CAROUSEL'>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 9 // 3x3 grid looks visually balanced on desktop & responsive on mobile

  async function loadDrafts(isSilent = false) {
    if (!isSilent) setLoading(true)
    const { data, error } = await supabase
      .from('posts')
      .select('*, post_targets(*, connected_accounts(account_name, platform))')
      .eq('status', 'DRAFT')
      .order('updated_at', { ascending: false })

    if (error) {
      toast.error('Gagal memuat daftar draf')
    } else if (data) {
      setDrafts(data)
    }
    if (!isSilent) setLoading(false)
  }

  useEffect(() => {
    loadDrafts(false)

    // Realtime update
    const channel = supabase
      .channel('drafts_page_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => loadDrafts(true)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  function handleEditDraft(draft: any) {
    loadDraft(draft)
    toast.info(`Draf "${draft.title || 'Tanpa Judul'}" berhasil dimuat ke Composer`)
    navigate('/composer')
  }

  async function handleDeleteDraft(draftId: string, title?: string) {
    const name = title ? `"${title}"` : 'draf ini'
    if (!confirm(`Hapus ${name}? Tindakan ini tidak dapat dibatalkan.`)) return

    const { error } = await supabase.from('posts').delete().eq('id', draftId)
    if (error) {
      toast.error('Gagal menghapus draf')
    } else {
      toast.success('Draf berhasil dihapus')
      loadDrafts(true)
    }
  }

  // Filtered drafts by search and format
  const filteredDrafts = useMemo(() => {
    return drafts.filter((d) => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const titleMatch = d.title?.toLowerCase().includes(q)
        const textMatch = d.content_text?.toLowerCase().includes(q)
        if (!titleMatch && !textMatch) return false
      }

      // 2. Format filter
      if (formatFilter !== 'ALL') {
        const rawGallery = d.media_metadata?.gallery_items || []
        const isCarousel = Array.isArray(rawGallery) && rawGallery.length > 1
        const isVideo = d.media_type === 'VIDEO'
        const isImage = !isVideo && !isCarousel

        if (formatFilter === 'VIDEO' && !isVideo) return false
        if (formatFilter === 'CAROUSEL' && !isCarousel) return false
        if (formatFilter === 'SINGLE_IMAGE' && !isImage) return false
      }

      return true
    })
  }, [drafts, searchQuery, formatFilter])

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, formatFilter])

  // Pagination calculation
  const totalItems = filteredDrafts.length
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))
  const paginatedDrafts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredDrafts.slice(start, start + PAGE_SIZE)
  }, [filteredDrafts, currentPage, PAGE_SIZE])

  // Summary counts
  const videoCount = useMemo(() => drafts.filter((d) => d.media_type === 'VIDEO').length, [drafts])
  const carouselCount = useMemo(
    () =>
      drafts.filter((d) => {
        const raw = d.media_metadata?.gallery_items || []
        return Array.isArray(raw) && raw.length > 1
      }).length,
    [drafts]
  )
  const imageCount = useMemo(
    () =>
      drafts.filter((d) => {
        const isVideo = d.media_type === 'VIDEO'
        const raw = d.media_metadata?.gallery_items || []
        return !isVideo && !(Array.isArray(raw) && raw.length > 1)
      }).length,
    [drafts]
  )

  function renderPagination() {
    if (totalPages <= 1) return null

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-4 border-t border-border">
        <span className="text-xs font-mono text-muted-foreground">
          Menampilkan {(currentPage - 1) * PAGE_SIZE + 1} -{' '}
          {Math.min(currentPage * PAGE_SIZE, totalItems)} dari {totalItems} draf
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-medium hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Halaman Sebelumnya"
          >
            <ChevronLeft size={14} />
            <span>Sebelumnya</span>
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === totalPages ||
                  Math.abs(p - currentPage) <= 1
              )
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
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-medium hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Halaman Berikutnya"
          >
            <span>Berikutnya</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Kumpulan Draf Postingan</h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-secondary text-foreground border border-border">
              {drafts.length} DRAF
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Kelola, sempurnakan, dan jadwalkan ide postingan yang telah Anda simpan sebelumnya.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadDrafts(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
          >
            <RefreshCw size={13} />
            <span>Muat Ulang</span>
          </button>
          <button
            type="button"
            onClick={() => {
              reset()
              toast.info('Form dikosongkan. Siap untuk membuat konten baru!')
              navigate('/composer')
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
          >
            <Plus size={14} />
            <span>Buat Konten Baru</span>
          </button>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border p-2.5 rounded-xl shadow-xs">
        {/* Format Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-0.5 rounded-lg bg-secondary border border-border/40">
          <button
            type="button"
            onClick={() => setFormatFilter('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
              formatFilter === 'ALL'
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Semua ({drafts.length})
          </button>
          <button
            type="button"
            onClick={() => setFormatFilter('VIDEO')}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
              formatFilter === 'VIDEO'
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Video ({videoCount})
          </button>
          <button
            type="button"
            onClick={() => setFormatFilter('CAROUSEL')}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
              formatFilter === 'CAROUSEL'
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Carousel ({carouselCount})
          </button>
          <button
            type="button"
            onClick={() => setFormatFilter('SINGLE_IMAGE')}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
              formatFilter === 'SINGLE_IMAGE'
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Gambar ({imageCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px] sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul atau isi draf..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="font-mono text-xs text-muted-foreground">Memuat daftar draf...</span>
        </div>
      ) : filteredDrafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-card rounded-2xl border border-border text-center gap-3">
          <div className="size-14 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
            <FileText size={24} />
          </div>
          <div className="flex flex-col gap-1 max-w-sm">
            <h3 className="text-sm font-semibold text-foreground">
              {searchQuery || formatFilter !== 'ALL'
                ? 'Tidak Ada Draf yang Cocok'
                : 'Belum Ada Draf Tersimpan'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {searchQuery || formatFilter !== 'ALL'
                ? 'Coba ganti filter format atau kata kunci pencarian Anda.'
                : 'Simpan rancangan postingan Anda sebagai draf di Composer untuk diselesaikan nanti tanpa batasan jadwal.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              reset()
              toast.info('Form dikosongkan. Siap untuk membuat konten baru!')
              navigate('/composer')
            }}
            className="mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>Buat Draf Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Drafts Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedDrafts.map((d) => {
              const rawGallery = d.media_metadata?.gallery_items || []
              const hasGallery = Array.isArray(rawGallery) && rawGallery.length > 0
              const isCarousel = hasGallery && rawGallery.length > 1
              const isVideo = d.media_type === 'VIDEO'

              // Thumbnail candidate
              const firstGalleryItem = hasGallery ? rawGallery[0] : null
              const mediaUrl =
                firstGalleryItem?.stream_url ||
                firstGalleryItem?.lh3_url ||
                d.gdrive_stream_url ||
                d.gdrive_lh3_url ||
                ''

              const title = d.title || 'Tanpa Judul'
              const contentText = d.content_text || ''
              const updatedDate = formatWibDateTime(d.updated_at || d.created_at)
              const targetAccounts: any[] = d.post_targets || []

              return (
                <div
                  key={d.id}
                  className="group flex flex-col justify-between rounded-xl bg-card border border-border hover:border-foreground/30 transition-all shadow-xs overflow-hidden"
                >
                  {/* Card Header & Media Preview */}
                  <div className="flex flex-col">
                    {/* Media Thumbnail Container */}
                    <div className="relative w-full aspect-video bg-secondary/80 border-b border-border/50 overflow-hidden flex items-center justify-center">
                      {mediaUrl ? (
                        isVideo ? (
                          <div className="relative size-full">
                            <video
                              src={mediaUrl}
                              className="size-full object-cover group-hover:scale-103 transition-transform duration-300"
                              preload="metadata"
                            />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <div className="size-10 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white">
                                <Film size={18} />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={mediaUrl}
                            alt={title}
                            className="size-full object-cover group-hover:scale-103 transition-transform duration-300"
                            onError={(e) => {
                              ;(e.target as HTMLElement).style.display = 'none'
                            }}
                          />
                        )
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-muted-foreground/50">
                          <FileText size={28} />
                          <span className="text-[10px] font-mono">Belum ada media</span>
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-[10px] font-mono font-semibold text-white uppercase border border-white/10">
                          DRAFT
                        </span>
                        {isCarousel && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/90 text-primary-foreground backdrop-blur-xs text-[10px] font-mono font-semibold">
                            <Images size={11} /> {rawGallery.length} Slide
                          </span>
                        )}
                        {isVideo && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/90 text-white backdrop-blur-xs text-[10px] font-mono font-semibold">
                            <Film size={11} /> Video
                          </span>
                        )}
                        {!isVideo && !isCarousel && mediaUrl && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/90 text-white backdrop-blur-xs text-[10px] font-mono font-semibold">
                            <ImageIcon size={11} /> Single
                          </span>
                        )}
                      </div>

                      {/* Simulation badge */}
                      {d.media_metadata?.is_simulation && (
                        <div className="absolute top-2.5 right-2.5">
                          <span className="px-1.5 py-0.5 rounded-md bg-purple-600/90 text-white backdrop-blur-xs text-[9px] font-mono font-bold">
                            SIMULASI
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="p-4 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground font-mono">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {updatedDate}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors" title={title}>
                        {title}
                      </h3>

                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {contentText || <span className="italic text-muted-foreground/60">Tidak ada teks caption...</span>}
                      </p>

                      {/* Target Accounts */}
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {targetAccounts.length > 0 ? (
                          targetAccounts.map((t, idx) => {
                            const platform = t.connected_accounts?.platform || t.platform || 'AKUN'
                            const name = t.connected_accounts?.account_name || platform
                            return (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-[10px] font-medium text-foreground border border-border"
                              >
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                {name}
                              </span>
                            )
                          })
                        ) : (
                          <span className="text-[10px] font-mono text-muted-foreground/70">
                            Belum ada akun tujuan dipilih
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="p-3 bg-secondary/30 border-t border-border flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteDraft(d.id, d.title)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Hapus Draf"
                    >
                      <Trash2 size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEditDraft(d)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
                    >
                      <Edit3 size={13} />
                      <span>Edit di Composer</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination Controls */}
          {renderPagination()}
        </div>
      )}
    </div>
  )
}
