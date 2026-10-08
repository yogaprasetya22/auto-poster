import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Sparkles,
  Bot,
  Package,
  Calendar,
  Clock,
  CheckCircle2,
  Check,
  Play,
  Film,
  Image as ImageIcon,
  Layers,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Info,
  CalendarDays,
  ExternalLink,
  RotateCcw,
} from 'lucide-react'
import { supabase } from '@/shared/lib/supabase'
import { getProducts, ProductItem } from '@/features/products/products-service'
import { toast } from 'sonner'
import { InstagramIcon, FacebookIcon, ThreadsIcon, TikTokIcon } from '@/shared/components/icons/platform-icons'
import { PostPhoneSimulator } from '@/features/history/components/post-phone-simulator'
import { SkeletonContainer } from '@/shared/components/ui/skeleton-container'

interface ConnectedAccount {
  id: string
  account_name: string
  platform: 'facebook_page' | 'instagram' | 'threads' | 'tiktok'
  account_avatar_url?: string | null
}

const PLATFORM_LABELS: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  instagram: { label: 'Instagram', icon: InstagramIcon },
  facebook_page: { label: 'Facebook Page', icon: FacebookIcon },
  threads: { label: 'Threads', icon: ThreadsIcon },
  tiktok: { label: 'TikTok', icon: TikTokIcon },
}

export interface PromoEventDef {
  id: string
  name: string
  badge: string
  description: string
  headlineHook: string
  urgencyTag: string
  discountHint: string
}

const EVENT_PRESETS: PromoEventDef[] = [
  {
    id: 'ai_auto',
    name: 'Otomatis Ditentukan AI (Direkomendasikan)',
    badge: 'AI RECOMMENDED',
    description: 'Biarkan AI menganalisis produk Anda dan memilih gaya promosi paling efektif tanpa perlu Anda pilih event manual.',
    headlineHook: 'Solusi terbaik untuk bisnis Anda bersama',
    urgencyTag: 'Rekomendasi AI',
    discountHint: 'Penawaran Menarik',
  },
  {
    id: 'regular',
    name: 'Promosi Harian / Reguler',
    badge: 'ALWAYS ON',
    description: 'Fokus pada edukasi manfaat produk, ulasan kepuasan konsumen, dan branding rutin.',
    headlineHook: 'Tingkatkan omset toko & kepuasan pelanggan bersama',
    urgencyTag: 'Tersedia Sekarang',
    discountHint: 'Harga Resmi Terjangkau',
  },
  {
    id: 'twin_date',
    name: 'Tanggal Kembar (10.10 / 11.11 / 12.12)',
    badge: 'PROMO BULANAN',
    description: 'Momen belanja terbesar nasional. Penawaran harga spesial dengan batas waktu 24 jam.',
    headlineHook: 'SPESIAL TANGGAL KEMBAR! Diskon terbatas untuk',
    urgencyTag: 'Khusus Hari Ini',
    discountHint: 'Diskon Terbesar Bulan Ini',
  },
  {
    id: 'payday',
    name: 'Payday Gajian (Akhir Bulan 25 - 31)',
    badge: 'PAYDAY SALE',
    description: 'Menyasar konsumen saat baru gajian dengan penawaran upgrade dan investasi bisnis terbaik.',
    headlineHook: 'Waktunya Investasi Cerdas untuk Bisnis Anda: Ambil Promo Payday',
    urgencyTag: 'Promo Gajian',
    discountHint: 'Paket Hemat Akhir Bulan',
  },
  {
    id: 'flash_sale',
    name: 'Flash Sale Akhir Pekan (Weekend)',
    badge: 'FLASH SALE',
    description: 'Dorongan belanja cepat Jumat - Minggu untuk mendongkrak omset akhir pekan.',
    headlineHook: 'FLASH SALE WEEKEND! Jangan sampai kehabisan stok',
    urgencyTag: 'Batas 3 Hari',
    discountHint: 'Khusus Pemesanan Weekend',
  },
  {
    id: 'clearance',
    name: 'Cuci Gudang / Stok Terbatas',
    badge: 'CLEARANCE',
    description: 'Menciptakan urgensi kelangkaan (FOMO) dengan stok terbatas dan penawaran cuci gudang.',
    headlineHook: 'STOK MENIPIS! Amankan sekarang sebelum kehabisan:',
    urgencyTag: 'Sisa Stok Sedikit',
    discountHint: 'Harga Spesial Cuci Gudang',
  },
  {
    id: 'ramadan_holiday',
    name: 'Spesial Hari Raya / Libur Nasional',
    badge: 'SEASONAL EVENT',
    description: 'Tema momen hari raya, mudik, atau liburan nasional dengan ucapan hangat & promo.',
    headlineHook: 'Sambut Momen Spesial dengan Solusi Terbaik dari',
    urgencyTag: 'Edisi Spesial',
    discountHint: 'Hadiah / Promo Spesial',
  },
]

type Step = 1 | 2 | 3
type ContentFormat = 'video_vertical' | 'photo_feed' | 'carousel_slides'

export function AutoSchedulePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlProductId = searchParams.get('product')

  // Wizard Step (1: Pilih Produk -> 2: Pilih Format & Event -> 3: Pratinjau & Aktifkan)
  const [currentStep, setCurrentStep] = useState<Step>(1)

  // Step 1: Data Produk
  const [products, setProducts] = useState<ProductItem[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [loadingProducts, setLoadingProducts] = useState(true)

  // Step 2: Format & Event (Default ke photo_feed karena video vertikal AI masih tahap BETA)
  const [selectedFormat, setSelectedFormat] = useState<ContentFormat>('photo_feed')
  const [selectedEventId, setSelectedEventId] = useState<string>('ai_auto')
  const [customDiscountText, setCustomDiscountText] = useState<string>('')

  // Step 2: Akun & Frekuensi Jadwal
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [campaignCount, setCampaignCount] = useState<number>(3)
  const [postingTimeSlot, setPostingTimeSlot] = useState<string>('prime_afternoon')
  const [frequencyDays, setFrequencyDays] = useState<'daily' | 'every_2_days' | 'weekly'>('every_2_days')

  // Step 3: Quick Edits & Preview
  const [headline, setHeadline] = useState('')
  const [description, setDescription] = useState('')
  const [activeSlide, setActiveSlide] = useState(0)
  const [activePreviewPostIdx, setActivePreviewPostIdx] = useState(0)
  const [activePreviewChannel, setActivePreviewChannel] = useState<'tiktok' | 'reels' | 'threads' | 'facebook'>('reels')

  // Step 3: Generating State & Post List
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSimulationMode, setIsSimulationMode] = useState(false)
  const [generatedPosts, setGeneratedPosts] = useState<Array<{
    title: string
    caption: string
    scheduledAt: string
    format: ContentFormat
    imageUrl: string
    imageGdriveId?: string
  }>>([])
  const [isSubmittingToSchedule, setIsSubmittingToSchedule] = useState(false)

  // Load Produk & Akun
  useEffect(() => {
    async function loadData() {
      try {
        const [pList, { data: accData }] = await Promise.all([
          getProducts(),
          supabase.from('connected_accounts').select('id, account_name, platform, account_avatar_url').eq('is_active', true),
        ])
        setProducts(pList)

        // Cek URL param ?product=xxx
        if (urlProductId && pList.some((p) => p.id === urlProductId)) {
          const match = pList.find((p) => p.id === urlProductId)!
          initProduct(match)
          setCurrentStep(2)
        } else if (pList.length > 0) {
          initProduct(pList[0])
        }

        const activeAccs = accData || []
        setAccounts(activeAccs)
        if (activeAccs.length > 0) {
          setSelectedAccountIds(activeAccs.map((a: ConnectedAccount) => a.id))
        }
      } catch (err) {
        console.error('Gagal memuat data auto-schedule:', err)
      } finally {
        setLoadingProducts(false)
        setLoadingAccounts(false)
      }
    }
    loadData()
  }, [urlProductId])

  function initProduct(product: ProductItem) {
    if (!product) return
    setSelectedProductId(product.id)
    setHeadline(`Solusi Praktis: ${product.name}`)
    setDescription(product.tagline || product.description || `Tingkatkan omset toko Anda dengan ${product.name}.`)
  }

  function handleSelectProduct(product: ProductItem) {
    initProduct(product)
  }

  const currentProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || products[0] || null
  }, [products, selectedProductId])

  const productName = currentProduct ? currentProduct.name : 'Produk Anda'

  // Mock Carousel Slides untuk preview format slide
  const carouselSlides = useMemo(() => {
    return [
      {
        tag: 'SLIDE 1 • MASALAH',
        title: 'Pelanggan Puas Tapi Lupa Kasih Ulasan?',
        desc: 'Banyak konsumen enggan memberi review karena proses pencarian toko di maps terlalu merepotkan.',
      },
      {
        tag: 'SLIDE 2 • SOLUSI',
        title: `Permudah dengan ${productName}`,
        desc: 'Cukup dekatkan ponsel pelanggan ke display, form ulasan langsung terbuka otomatis.',
      },
      {
        tag: 'SLIDE 3 • AJAKAN',
        title: 'Mulai Pasang di Toko Anda Sekarang',
        desc: 'Tingkatkan reputasi bisnis Anda di pencarian lokal. Hubungi kami melalui tautan di profil!',
      },
    ]
  }, [productName])

  function toggleAccount(id: string) {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((aId) => aId !== id) : [...prev, id]
    )
  }

  // Generate jadwal otomatis AI
  async function handleStartGenerate() {
    if (!currentProduct) {
      toast.error('Pilih produk dari katalog terlebih dahulu!')
      return
    }
    if (selectedAccountIds.length === 0) {
      toast.error('Pilih minimal satu akun media sosial tujuan!')
      return
    }

    setIsGenerating(true)
    setCurrentStep(3)
    const toastId = toast.loading('Gemini AI sedang merancang kampanye terjadwal otomatis...')

    try {
      const activeEvent = EVENT_PRESETS.find((e) => e.id === selectedEventId) || EVENT_PRESETS[0]
      const promoOffer = customDiscountText.trim() || activeEvent.discountHint

      const promptTopics = [
        `Tema Kampanye: ${activeEvent.name}. Hook: "${activeEvent.headlineHook} ${currentProduct.name}". Urgensi: ${activeEvent.urgencyTag}. Penawaran: ${promoOffer}. Manfaat: ${currentProduct.tagline || currentProduct.description}`,
        `Edukasi konsumen & Mengapa butuh ${currentProduct.name} sekarang juga saat momen ${activeEvent.name}. Diskon/Penawaran: ${promoOffer}`,
        `Ajakan beli cepat (FOMO & CTA) ${activeEvent.urgencyTag} untuk ${currentProduct.name}. Jangan lewatkan ${activeEvent.name}!`,
      ]

      const scheduleItems = []
      const baseHour = postingTimeSlot === 'prime_morning' ? 9 : postingTimeSlot === 'prime_afternoon' ? 12 : 19
      const stepInterval = frequencyDays === 'daily' ? 1 : frequencyDays === 'every_2_days' ? 2 : 7

      for (let i = 0; i < campaignCount; i++) {
        const targetDate = new Date()
        targetDate.setDate(targetDate.getDate() + (i + 1) * stepInterval)
        targetDate.setHours(baseHour, 30, 0, 0)

        const topic = promptTopics[i % promptTopics.length]
        let captionText = `🔥 ${activeEvent.headlineHook} ${currentProduct.name}!\n\n${description || currentProduct.tagline || currentProduct.description}\n\n🎁 Penawaran: ${promoOffer}\n⏰ Batas Waktu: ${activeEvent.urgencyTag}\n\nHubungi kami via link di bio untuk pemesanan instan! 🚀\n#${activeEvent.id} #promobisnis #umkm #${currentProduct.name.replace(/\s+/g, '').toLowerCase()}`

        try {
          const res = await fetch('/api/ai/caption', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic }),
          })
          const resData = await res.json()
          if (resData.success && resData.data?.caption) {
            captionText = resData.data.caption
          }
        } catch {
          // Fallback
        }

        scheduleItems.push({
          title: `[${activeEvent.badge}] ${headline || currentProduct.name} #${i + 1}`,
          caption: captionText,
          scheduledAt: targetDate.toISOString(),
          format: selectedFormat,
          imageUrl: currentProduct.imageUrl || 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=800&auto=format&fit=crop&q=80',
          imageGdriveId: currentProduct.imageGdriveId,
        })
      }

      setGeneratedPosts(scheduleItems)
      toast.success('✨ Kampanye otomatis siap! Tinjau dan aktifkan di bawah ini.', { id: toastId })
    } catch (err: any) {
      toast.error(err.message || 'Gagal generate kampanye otomatis', { id: toastId })
    } finally {
      setIsGenerating(false)
    }
  }

  // Simpan seluruh postingan ke antrean Supabase (Schedule)
  async function handleActivateAutoSchedule() {
    if (generatedPosts.length === 0) return
    setIsSubmittingToSchedule(true)
    const toastId = toast.loading('Mendaftarkan jadwal tayang ke sistem antrean...')

    try {
      for (const item of generatedPosts) {
        const payload = {
          title: item.title,
          content_text: item.caption,
          media_type: item.format === 'video_vertical' ? 'VIDEO' : item.format === 'carousel_slides' ? 'CAROUSEL' : 'SINGLE_IMAGE',
          gdrive_file_id: item.imageGdriveId || null,
          gdrive_stream_url: item.imageUrl,
          gdrive_lh3_url: item.imageUrl,
          media_metadata: {
            is_simulation: isSimulationMode,
            auto_generated: true,
            product_name: currentProduct?.name,
          },
          scheduled_at: item.scheduledAt,
          status: 'SCHEDULED',
        }

        const { data: post, error: pErr } = await supabase
          .from('posts')
          .insert(payload)
          .select('id')
          .single()

        if (pErr) throw pErr

        if (post && selectedAccountIds.length > 0) {
          const { data: accs } = await supabase
            .from('connected_accounts')
            .select('id, platform')
            .in('id', selectedAccountIds)

          if (accs && accs.length > 0) {
            const targets = accs.map((acc: any) => ({
              post_id: post.id,
              account_id: acc.id,
              platform: acc.platform,
              status: 'PENDING' as const,
            }))
            await supabase.from('post_targets').insert(targets)
          }
        }
      }

      toast.success(`🎉 Berhasil menjadwalkan ${generatedPosts.length} postingan otomatis!`, { id: toastId })
      navigate('/schedule')
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan ke antrean jadwal', { id: toastId })
    } finally {
      setIsSubmittingToSchedule(false)
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-6 pb-20">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-foreground text-background flex items-center justify-center text-xs font-bold shadow-2xs">
              <Bot size={14} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Jadwal Otomatis AI (Auto-Pilot)</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Alur praktis: pilih produk dari katalog Anda, pilih format & event promo, AI langsung menyusun naskah dan menjadwalkan penayangan otomatis.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Tombol Lihat Draf Tersimpan */}
          <button
            type="button"
            onClick={() => navigate('/composer')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-semibold hover:bg-muted transition-colors cursor-pointer shadow-2xs"
            title="Buka daftar draf postingan di Composer"
          >
            <RotateCcw size={13} className="text-muted-foreground" />
            <span>Mulai Ulang</span>
          </button>

          {/* Tombol Posting Manual */}
          <button
            type="button"
            onClick={() => navigate('/composer')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-semibold hover:bg-muted transition-colors cursor-pointer shadow-2xs"
            title="Buka pembuat postingan manual bebas"
          >
            <ArrowRight size={13} className="text-muted-foreground" />
            <span>Posting Manual</span>
          </button>

          {/* Mode Simulasi Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !isSimulationMode
              setIsSimulationMode(next)
              toast.info(
                next
                  ? 'Mode Simulasi (Dry-Run) Aktif: Jadwal tersimpan tanpa posting live ke media sosial.'
                  : 'Mode Live Posting Aktif: Konten akan dipublikasikan langsung ke akun tujuan.'
              )
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer shadow-2xs ${isSimulationMode
              ? 'bg-secondary border-border text-foreground'
              : 'bg-primary text-primary-foreground border-primary font-semibold'
              }`}
            title="Klik untuk beralih antara Mode Uji Coba (Dry-Run) dan Live Posting"
          >
            <span className={`size-1.5 rounded-full ${isSimulationMode ? 'bg-amber-500' : 'bg-emerald-400'}`} />
            <span>{isSimulationMode ? 'Mode Uji Coba' : 'Live Posting'}</span>
          </button>
        </div>
      </div>

      {/* Stepper Wizard Indicator (Desain Cantik Seperti Modal) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 p-1.5 rounded-xl border border-border bg-card shadow-2xs">
        {[
          { num: 1, label: '1. Pilih Produk', desc: 'Dari katalog resmi' },
          { num: 2, label: '2. Format & Event', desc: 'Video / Foto & Momen' },
          { num: 3, label: '3. Pratinjau & Aktifkan', desc: 'Review & Jadwal' },
        ].map((s) => {
          const isCurrent = currentStep === s.num
          const isDone = currentStep > s.num
          return (
            <div
              key={s.num}
              onClick={() => setCurrentStep(s.num as any)}
              className={`p-2.5 sm:p-3 rounded-lg flex items-center gap-2.5 transition-all cursor-pointer ${isCurrent
                ? 'bg-foreground text-background shadow-xs'
                : isDone
                  ? 'bg-secondary/70 text-foreground font-semibold hover:bg-secondary'
                  : 'text-muted-foreground opacity-70 hover:opacity-100 hover:bg-secondary/30'
                }`}
            >
              <div
                className={`size-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isCurrent
                  ? 'bg-background text-foreground'
                  : isDone
                    ? 'bg-foreground text-background'
                    : 'bg-muted-foreground/20 text-muted-foreground'
                  }`}
              >
                {isDone ? <Check size={13} /> : s.num}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate leading-tight">{s.label}</p>
                <p className={`text-[10px] truncate hidden sm:block ${isCurrent ? 'text-background/80' : 'text-muted-foreground'}`}>
                  {s.desc}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* ================= STEP 1: PILIH PRODUK ================= */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div className="text-center space-y-1 mb-2">
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Produk apa yang ingin dipromosikan hari ini?
            </h3>
            <p className="text-xs text-muted-foreground">
              Pilih salah satu produk dari katalog database Anda di bawah ini:
            </p>
          </div>

          {loadingProducts ? (
            <SkeletonContainer isLoading={true}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-3.5 rounded-xl border border-border bg-card space-y-3">
                    <div className="flex gap-3">
                      <div className="size-14 rounded-lg bg-slate-200 dark:bg-slate-700" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
                        <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-700 rounded" />
                      </div>
                    </div>
                    <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                  </div>
                ))}
              </div>
            </SkeletonContainer>
          ) : products.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-border text-xs space-y-2">
              <p className="font-semibold text-foreground">Belum ada produk di katalog.</p>
              <button
                onClick={() => navigate('/products')}
                className="px-3 py-1.5 rounded-lg bg-foreground text-background font-semibold"
              >
                Tambah Produk Sekarang
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {products.map((product) => {
                const isSelected = selectedProductId === product.id

                return (
                  <div
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between space-y-3 ${isSelected
                      ? 'border-foreground bg-card ring-1 ring-foreground shadow-xs'
                      : 'border-border bg-card/60 hover:border-muted-foreground/40 hover:bg-card'
                      }`}
                  >
                    <div className="flex gap-3 items-start">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="size-16 rounded-lg object-cover border border-border/80 shrink-0 bg-secondary/30"
                        />
                      ) : (
                        <div className="size-16 rounded-lg bg-secondary/50 border border-border/80 flex items-center justify-center shrink-0 text-[10px] text-muted-foreground font-medium">
                          No Foto
                        </div>
                      )}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-xs text-foreground line-clamp-1">{product.name}</h4>
                          <div
                            className={`size-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${isSelected
                              ? 'bg-foreground border-foreground text-background'
                              : 'border-muted-foreground/30'
                              }`}
                          >
                            {isSelected && <Check size={10} />}
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {product.tagline || product.description}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="font-mono text-foreground font-semibold">{product.priceText || 'KATALOG RESMI'}</span>
                      {product.imageGdriveId ? (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">Google Drive Sync</span>
                      ) : (
                        <span className="text-foreground font-semibold">Tersedia</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex justify-end pt-3">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 rounded-lg bg-foreground text-background text-xs font-semibold hover:opacity-90 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Lanjut: Pilih Format & Event</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 2: FORMAT & EVENT PROMO ================= */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="text-center space-y-1 mb-2">
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Mau buat jenis postingan seperti apa?
            </h3>
            <p className="text-xs text-muted-foreground">
              Produk terpilih: <strong className="text-foreground">{productName}</strong>
            </p>
          </div>

          {/* 3 Opsi Format Kartu Premium */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Opsi 1: Video Vertikal (SEMENTARA BETA & DISABLED) */}
            <div
              className="p-4 rounded-xl border border-dashed border-border/80 bg-secondary/20 opacity-65 cursor-not-allowed flex flex-col justify-between space-y-4 select-none relative"
              title="Render Video AI Otomatis sedang dalam tahap pengembangan (BETA). Gunakan Foto Banner Feed atau Slide Carousel."
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="size-10 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                    <Film size={20} />
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30">
                    BETA • SEGERA HADIR
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-muted-foreground">Video Vertikal (AI Video)</h4>
                  <p className="text-[11px] text-muted-foreground/80 mt-1 leading-snug">
                    Format 9:16 Reels & TikTok. Fitur render video baru masih dalam tahap pengujian model.
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-border/50 text-[10px] font-mono text-muted-foreground flex items-center justify-between">
                <span>RASIO 9:16</span>
                <span className="italic">Belum Tersedia</span>
              </div>
            </div>

            {/* Opsi 2: Foto Banner Feed */}
            <div
              onClick={() => setSelectedFormat('photo_feed')}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-4 ${selectedFormat === 'photo_feed'
                ? 'border-foreground bg-secondary/40 shadow-xs ring-1 ring-foreground'
                : 'border-border bg-card hover:border-muted-foreground/40 hover:bg-secondary/20'
                }`}
            >
              <div className="space-y-2.5">
                <div className="size-10 rounded-lg bg-foreground text-background flex items-center justify-center">
                  <ImageIcon size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-foreground">Foto Banner Feed</h4>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                    Format kotak 1:1 untuk feed Instagram dan Facebook dengan headline jelas.
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-border text-[10px] font-mono text-muted-foreground">
                RASIO 1:1 • 1 FOTO
              </div>
            </div>

            {/* Opsi 3: Slide Informasi Carousel */}
            <div
              onClick={() => setSelectedFormat('carousel_slides')}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-4 ${selectedFormat === 'carousel_slides'
                ? 'border-foreground bg-secondary/40 shadow-xs ring-1 ring-foreground'
                : 'border-border bg-card hover:border-muted-foreground/40 hover:bg-secondary/20'
                }`}
            >
              <div className="space-y-2.5">
                <div className="size-10 rounded-lg bg-foreground text-background flex items-center justify-center">
                  <Layers size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-foreground">Slide Informasi</h4>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                    Rangkaian 3 gambar geser (carousel) untuk menjelaskan cara pakai atau manfaat.
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-border text-[10px] font-mono text-muted-foreground">
                3 SLIDE • CAROUSEL
              </div>
            </div>
          </div>

          {/* Section: Pilihan Event Promo */}
          <div className="p-4 sm:p-5 rounded-xl border border-border bg-card space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-foreground" />
                <span className="text-xs font-bold text-foreground">Pilih Momen / Event Promosi (Opsional)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary font-semibold text-foreground">
                AI COPYWRITING
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {EVENT_PRESETS.map((ev) => {
                const isSelected = selectedEventId === ev.id
                return (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEventId(ev.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between space-y-2 ${isSelected
                      ? 'border-foreground bg-secondary/60 ring-1 ring-foreground shadow-xs'
                      : 'border-border bg-background hover:border-muted-foreground/40 hover:bg-secondary/20'
                      }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-muted font-bold text-foreground">
                          {ev.badge}
                        </span>
                        <div
                          className={`size-3.5 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'bg-foreground border-foreground text-background' : 'border-muted-foreground/30'
                            }`}
                        >
                          {isSelected && <Check size={10} />}
                        </div>
                      </div>
                      <h4 className="font-bold text-xs text-foreground line-clamp-1">{ev.name}</h4>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {ev.description}
                      </p>
                    </div>

                    <div className="pt-1.5 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="truncate max-w-[120px] font-medium text-foreground">{ev.urgencyTag}</span>
                      <span className="font-mono text-[9px]">{ev.discountHint}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="pt-1">
              <label className="text-[11px] font-semibold text-foreground block mb-1">
                Catatan Diskon / Penawaran Khusus (Opsional):
              </label>
              <input
                type="text"
                placeholder="Contoh: Diskon 20% khusus 50 pembeli pertama, Free Ongkir Se-Indonesia"
                value={customDiscountText}
                onChange={(e) => setCustomDiscountText(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
              />
            </div>
          </div>

          {/* Section: Akun & Jadwal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Akun Medsos Tujuan */}
            <div className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Akun Medsos Tujuan</span>
                <span className="text-[10px] text-muted-foreground font-mono">{selectedAccountIds.length} DIPILIH</span>
              </div>

              {loadingAccounts ? (
                <SkeletonContainer isLoading={true}>
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-2.5 rounded-lg border border-border bg-secondary/30 h-11" />
                    ))}
                  </div>
                </SkeletonContainer>
              ) : accounts.length === 0 ? (
                <div className="text-xs text-muted-foreground py-3 border border-dashed border-border rounded-lg p-3 text-center space-y-2">
                  <p>Belum ada akun medsos terhubung.</p>
                  <button
                    onClick={() => navigate('/settings')}
                    className="px-2.5 py-1 rounded bg-secondary text-foreground text-[11px] font-semibold"
                  >
                    Hubungkan Akun
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {accounts.map((acc) => {
                    const isSelected = selectedAccountIds.includes(acc.id)
                    const Icon = PLATFORM_LABELS[acc.platform]?.icon || Layers
                    return (
                      <div
                        key={acc.id}
                        onClick={() => toggleAccount(acc.id)}
                        className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between ${isSelected
                          ? 'border-foreground bg-secondary/50 font-medium'
                          : 'border-border bg-background hover:bg-secondary/20'
                          }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="size-6 rounded-md bg-secondary flex items-center justify-center shrink-0">
                            <Icon className="size-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-foreground font-semibold truncate">{acc.account_name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-mono">{acc.platform}</p>
                          </div>
                        </div>
                        <div
                          className={`size-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'bg-foreground border-foreground text-background' : 'border-muted-foreground/30'
                            }`}
                        >
                          {isSelected && <Check size={11} />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Frekuensi & Jam Tayang */}
            <div className="p-4 rounded-xl border border-border bg-card space-y-3.5 shadow-2xs">
              <span className="text-xs font-bold text-foreground">Frekuensi Penayangan</span>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                  Jumlah Postingan yang Dibuat:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[3, 5, 7].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setCampaignCount(cnt)}
                      className={`p-2 rounded-lg border text-center text-xs font-semibold cursor-pointer transition-all ${campaignCount === cnt
                        ? 'border-foreground bg-secondary/60 text-foreground'
                        : 'border-border bg-background text-muted-foreground'
                        }`}
                    >
                      {cnt} Postingan
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">Jarak Waktu:</label>
                <select
                  value={frequencyDays}
                  onChange={(e) => setFrequencyDays(e.target.value as any)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-foreground"
                >
                  <option value="daily">Setiap Hari (1x sehari)</option>
                  <option value="every_2_days">Selang 2 Hari Sekali</option>
                  <option value="weekly">Seminggu Sekali</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">Jam Tayang Utama (WIB):</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'prime_morning', label: 'Pagi 09:30' },
                    { id: 'prime_afternoon', label: 'Siang 12:30' },
                    { id: 'prime_night', label: 'Malam 19:30' },
                  ].map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setPostingTimeSlot(slot.id)}
                      className={`p-2 rounded-lg border text-center text-[11px] font-semibold cursor-pointer transition-all ${postingTimeSlot === slot.id
                        ? 'border-foreground bg-secondary/60 text-foreground'
                        : 'border-border bg-background text-muted-foreground'
                        }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-3 py-2 rounded-lg border border-border text-foreground text-xs font-semibold hover:bg-secondary/50 flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft size={14} />
              <span>Kembali</span>
            </button>
            <button
              type="button"
              onClick={handleStartGenerate}
              className="px-4 py-2 rounded-lg bg-foreground text-background text-xs font-semibold hover:opacity-90 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Sparkles size={14} />
              <span>Generate Pratinjau & Jadwal AI</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: PRATINJAU VISUAL NYATA & JADWALKAN ================= */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border">
            <div>
              <h2 className="text-sm font-bold text-foreground">Pratinjau Hasil & Konfirmasi Penayangan</h2>
              <p className="text-xs text-muted-foreground">
                Tinjau mockup visual nyata dan {generatedPosts.length} naskah kampanye untuk <strong className="text-foreground">{productName}</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleStartGenerate()}
              disabled={isGenerating}
              className="px-3 py-1.5 rounded-lg border border-border bg-card text-foreground text-xs font-semibold hover:bg-secondary transition-colors cursor-pointer self-start sm:self-auto"
            >
              Regenerate Teks AI
            </button>
          </div>

          {isGenerating ? (
            <div className="p-16 text-center rounded-xl border border-border bg-card space-y-3">
              <div className="size-8 rounded-full border-2 border-foreground border-t-transparent animate-spin mx-auto" />
              <p className="text-xs font-semibold text-foreground">Gemini AI sedang menulis variasi copy & mengaitkan foto produk Google Drive...</p>
              <p className="text-[11px] text-muted-foreground">Mohon tunggu beberapa detik.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Layout Pratinjau Interaktif Layar Ponsel & Editor Naskah (Identik dengan Posting Manual) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Kolom Kiri: Canvas Pratinjau Layar Ponsel (5 Cols Sticky) */}
                <div className="lg:col-span-5 lg:sticky lg:top-4 flex flex-col gap-3">
                  <div className="p-3 bg-secondary/30 rounded-xl border border-border text-center">
                    <span className="text-xs font-bold text-foreground">Hasil Akhir: Canvas Preview 9:16</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Menampilkan Post #{activePreviewPostIdx + 1} di simulasi layar ponsel.
                    </p>
                  </div>

                  {generatedPosts[activePreviewPostIdx] ? (
                    <PostPhoneSimulator
                      channel={activePreviewChannel}
                      mediaUrl={generatedPosts[activePreviewPostIdx].imageUrl}
                      mediaType={
                        generatedPosts[activePreviewPostIdx].format === 'video_vertical'
                          ? 'VIDEO'
                          : generatedPosts[activePreviewPostIdx].format === 'carousel_slides'
                            ? 'CAROUSEL'
                            : 'IMAGE'
                      }
                      carouselSlides={carouselSlides}
                      contentText={generatedPosts[activePreviewPostIdx].caption}
                      title={generatedPosts[activePreviewPostIdx].title}
                      accountName={
                        accounts.find((a) => selectedAccountIds.includes(a.id))?.account_name || 'autoposter.agency'
                      }
                    />
                  ) : (
                    <div className="p-8 text-center border rounded-2xl bg-card text-muted-foreground text-xs">
                      Pilih postingan di sebelah kanan untuk melihat pratinjau.
                    </div>
                  )}
                </div>

                {/* Kolom Kanan: Daftar Postingan & Quick Edit Naskah (7 Cols) */}
                <div className="lg:col-span-7 flex flex-col gap-5">
                  <div className="bg-card rounded-2xl border border-border p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-border/60">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">
                          Daftar {generatedPosts.length} Konten Siap Terjadwal
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Klik kartu untuk melihat pratinjaunya di layar ponsel sebelah kiri, dan edit caption sesuai selera.
                        </p>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary font-semibold text-foreground">
                        {generatedPosts.length} KONTEN
                      </span>
                    </div>

                    <div className="space-y-3">
                      {generatedPosts.map((post, idx) => {
                        const isCurrentActive = activePreviewPostIdx === idx
                        return (
                          <div
                            key={idx}
                            onClick={() => setActivePreviewPostIdx(idx)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 ${isCurrentActive
                              ? 'border-foreground bg-secondary/30 shadow-xs ring-1 ring-foreground'
                              : 'border-border bg-card/60 hover:bg-secondary/20 hover:border-muted-foreground/30'
                              }`}
                          >
                            <div className="flex items-center justify-between pb-2 border-b border-border/60">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${isCurrentActive ? 'bg-foreground text-background' : 'bg-secondary text-foreground'
                                  }`}>
                                  POST #{idx + 1}
                                </span>
                                <h4 className="text-xs font-bold text-foreground truncate max-w-[200px] sm:max-w-xs">
                                  {post.title}
                                </h4>
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
                                <CalendarDays size={13} />
                                <span>{new Date(post.scheduledAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} WIB</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-start">
                              <div className="sm:col-span-3">
                                <div className="aspect-square rounded-lg border border-border/80 overflow-hidden relative bg-black/5">
                                  <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
                                  <span className="absolute bottom-1.5 left-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/70 text-white">
                                    {post.format === 'video_vertical' ? '9:16 Video' : post.format === 'carousel_slides' ? 'Carousel' : '1:1 Foto'}
                                  </span>
                                </div>
                              </div>

                              <div className="sm:col-span-9 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                                  Naskah Caption Otomatis:
                                </label>
                                <textarea
                                  rows={4}
                                  value={post.caption}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    setGeneratedPosts((prev) =>
                                      prev.map((p, i) => (i === idx ? { ...p, caption: val } : p))
                                    )
                                  }}
                                  className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground resize-none leading-relaxed"
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-secondary/40 border border-border text-xs text-muted-foreground flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info size={14} className="text-foreground shrink-0" />
                  <span>
                    Postingan akan diterbitkan secara otomatis oleh Cron Dispatcher pada waktu yang ditentukan.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-3 py-2 rounded-lg border border-border text-foreground text-xs font-semibold hover:bg-secondary/50 flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                  <span>Ubah Format & Akun</span>
                </button>

                <button
                  type="button"
                  onClick={handleActivateAutoSchedule}
                  disabled={isSubmittingToSchedule}
                  className="px-5 py-2.5 rounded-lg bg-foreground text-background text-xs font-bold hover:opacity-90 flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <CheckCircle2 size={15} />
                  <span>{isSubmittingToSchedule ? 'Menyimpan Jadwal...' : 'Aktifkan Semua Jadwal Kampanye Ini'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
