import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  ArrowRight,
  Check,
  Layers,
  Search,
  Upload,
  Image as ImageIcon,
  Loader2,
  X,
  ExternalLink,
  Cloud
} from 'lucide-react'
import { getProducts, saveProducts, ProductItem } from './products-service'
import { uploadToGDrive } from '@/shared/lib/gdrive'
import { useComposerStore } from '@/features/composer/store/use-composer-store'
import { toast } from 'sonner'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/shared/components/ui/drawer'
import { SkeletonContainer } from '@/shared/components/ui/skeleton-container'

export function ProductsPage() {
  const navigate = useNavigate()
  const { setTitle, setContentText, setMedia, setPostFormat } = useComposerStore()

  const [products, setProducts] = useState<ProductItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Modal Tambah / Edit
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formTagline, setFormTagline] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formFeatures, setFormFeatures] = useState('')
  const [formCta, setFormCta] = useState('')

  // State Foto & Upload Google Drive
  const [formImageUrl, setFormImageUrl] = useState('')
  const [formImageGdriveId, setFormImageGdriveId] = useState('')
  const [formImageFileName, setFormImageFileName] = useState('')
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    setLoading(true)
    const list = await getProducts()
    setProducts(list)
    setLoading(false)
  }

  function handleOpenCreate() {
    setEditingId(null)
    setFormName('')
    setFormTagline('')
    setFormPrice('')
    setFormDescription('')
    setFormFeatures('')
    setFormCta('')
    setFormImageUrl('')
    setFormImageGdriveId('')
    setFormImageFileName('')
    setIsUploadingImage(false)
    setUploadProgress(0)
    setIsModalOpen(true)
  }

  function handleOpenEdit(product: ProductItem) {
    setEditingId(product.id)
    setFormName(product.name)
    setFormTagline(product.tagline)
    setFormPrice(product.priceText)
    setFormDescription(product.description)
    setFormFeatures(product.keyFeatures.join(', '))
    setFormCta(product.ctaText)
    setFormImageUrl(product.imageUrl || '')
    setFormImageGdriveId(product.imageGdriveId || '')
    setFormImageFileName(product.imageFileName || '')
    setIsUploadingImage(false)
    setUploadProgress(0)
    setIsModalOpen(true)
  }

  // Handle Upload Foto ke Google Drive
  async function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (JPG, PNG, atau WebP)!')
      return
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('Ukuran gambar maksimal 20 MB!')
      return
    }

    setIsUploadingImage(true)
    setUploadProgress(0)
    const toastId = toast.loading(`Mengunggah "${file.name}" ke Google Drive Cloud...`)

    try {
      const result = await uploadToGDrive(file, (pct) => {
        setUploadProgress(pct)
      })

      setFormImageUrl(result.lh3Url || result.streamUrl)
      setFormImageGdriveId(result.fileId)
      setFormImageFileName(result.fileName)

      toast.success('Foto produk berhasil disimpan di Google Drive Cloud!', { id: toastId })
    } catch (err: any) {
      console.error('Upload foto ke Google Drive gagal:', err)
      toast.error(err.message || 'Gagal mengunggah foto ke Google Drive', { id: toastId })
    } finally {
      setIsUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleRemoveImage() {
    setFormImageUrl('')
    setFormImageGdriveId('')
    setFormImageFileName('')
  }

  async function handleSave() {
    if (!formName.trim()) {
      toast.error('Nama produk wajib diisi!')
      return
    }

    const featureList = formFeatures
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean)

    let updated: ProductItem[] = []
    if (editingId) {
      updated = products.map((p) =>
        p.id === editingId
          ? {
            ...p,
            name: formName.trim(),
            tagline: formTagline.trim(),
            priceText: formPrice.trim(),
            description: formDescription.trim(),
            keyFeatures: featureList,
            ctaText: formCta.trim() || 'Pesan Sekarang',
            imageUrl: formImageUrl || undefined,
            imageGdriveId: formImageGdriveId || undefined,
            imageFileName: formImageFileName || undefined,
          }
          : p
      )
      toast.success('Produk berhasil diperbarui!')
    } else {
      const newProduct: ProductItem = {
        id: `prod-${Date.now()}`,
        name: formName.trim(),
        tagline: formTagline.trim(),
        priceText: formPrice.trim(),
        description: formDescription.trim(),
        keyFeatures: featureList,
        ctaText: formCta.trim() || 'Pesan Sekarang',
        imageUrl: formImageUrl || undefined,
        imageGdriveId: formImageGdriveId || undefined,
        imageFileName: formImageFileName || undefined,
        isActive: true,
      }
      updated = [newProduct, ...products]
      toast.success('Produk baru berhasil ditambahkan!')
    }

    setProducts(updated)
    await saveProducts(updated)
    setIsModalOpen(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus produk ini dari katalog?')) return
    const updated = products.filter((p) => p.id !== id)
    setProducts(updated)
    await saveProducts(updated)
    toast.success('Produk dihapus dari katalog.')
  }

  // Aksi Cepat: Buat Konten Langsung dari Produk Ini ke Jadwal Auto AI
  function handleCreateContent(product: ProductItem) {
    navigate(`/auto-schedule?product=${product.id}`)
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-foreground text-background flex items-center justify-center font-bold">
              <Package size={16} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Katalog Produk</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Daftar barang dan jasa bisnis Anda yang siap dipromosikan ke TikTok, Instagram, dan Facebook. Foto tersimpan otomatis di Google Drive Cloud.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            <Plus size={14} />
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>

      {/* Search Bar & Counter */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama produk, harga, atau manfaat..."
            className="w-full bg-card border border-border pl-9 pr-3 py-2 rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <Cloud size={13} className="text-emerald-500" />
          <span>Google Drive Cloud Active • {filteredProducts.length} Produk Siap Dipasarkan</span>
        </div>
      </div>

      {/* Grid Kartu Produk */}
      {loading ? (
        <SkeletonContainer isLoading={true}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="flex gap-4 items-start">
                  <div className="size-20 sm:size-24 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded" />
                      <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
                    </div>
                    <div className="h-3.5 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-3 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded-md" />
                  <div className="h-5 w-28 bg-slate-200 dark:bg-slate-700 rounded-md" />
                  <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded-md" />
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex gap-1.5">
                    <div className="size-8 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                    <div className="size-8 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                  </div>
                  <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </SkeletonContainer>
      ) : filteredProducts.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-border bg-card text-center space-y-3">
          <Package size={32} className="mx-auto text-muted-foreground opacity-50" />
          <p className="text-sm font-bold text-foreground">Belum Ada Produk</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Tambahkan produk barang atau jasa bisnis Anda beserta fotonya agar bisa langsung disusun menjadi video & banner otomatis.
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-foreground text-background text-xs font-semibold cursor-pointer"
          >
            + Tambah Produk Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-xs flex flex-col justify-between space-y-4 hover:border-foreground/30 transition-all"
            >
              <div className="flex gap-4 items-start">
                {/* Thumbnail Foto Produk (Google Drive) */}
                <div className="relative size-20 sm:size-24 rounded-xl border border-border bg-secondary/50 shrink-0 overflow-hidden flex items-center justify-center">
                  {prod.imageUrl ? (
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-1">
                      <ImageIcon size={20} className="opacity-40" />
                      <span className="text-[9px] font-mono opacity-60">Tanpa Foto</span>
                    </div>
                  )}

                  {prod.imageGdriveId && (
                    <div
                      className="absolute bottom-1 right-1 p-0.5 rounded bg-black/70 text-white"
                      title="Tersimpan di Google Drive Cloud"
                    >
                      <Cloud size={10} className="text-emerald-400" />
                    </div>
                  )}
                </div>

                {/* Konten Produk */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-sm text-foreground line-clamp-1">{prod.name}</h3>
                    {prod.priceText && (
                      <span className="px-2 py-0.5 rounded-full bg-secondary text-foreground font-semibold text-[11px] border border-border shrink-0">
                        {prod.priceText}
                      </span>
                    )}
                  </div>

                  {prod.tagline && (
                    <p className="text-xs font-medium text-muted-foreground line-clamp-1">{prod.tagline}</p>
                  )}

                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {prod.description}
                  </p>
                </div>
              </div>

              {/* Fitur Utama Chips */}
              {prod.keyFeatures && prod.keyFeatures.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {prod.keyFeatures.map((f, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-secondary/60 text-[10px] text-muted-foreground border border-border font-medium"
                    >
                      ✓ {f}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer Aksi */}
              <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(prod)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    title="Edit produk"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(prod.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                    title="Hapus produk"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleCreateContent(prod)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
                >
                  <Layers size={13} />
                  <span>Buat Konten</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drawer Tambah / Edit Produk */}
      <Drawer open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DrawerContent className="max-w-xl mx-auto w-full bg-card rounded-t-2xl border-t border-border p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
          <DrawerHeader className="px-0 pt-0 pb-3 border-b border-border">
            <DrawerTitle className="text-base font-bold text-foreground">
              {editingId ? 'Edit Produk' : 'Tambah Produk Baru'}
            </DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground">
              Unggah foto produk asli untuk disimpan ke Google Drive dan digunakan di postingan otomatis.
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4 py-3 text-xs">
            {/* 1. Upload Foto Produk ke Google Drive */}
            <div className="space-y-2">
              <label className="font-semibold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon size={13} />
                  <span>Foto Produk (Simpan ke Google Drive)</span>
                </span>
                {formImageGdriveId && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                    <Cloud size={10} />
                    <span>Tersimpan di Cloud</span>
                  </span>
                )}
              </label>

              {formImageUrl ? (
                <div className="flex items-center gap-3.5 p-3 rounded-xl border border-border bg-secondary/30 relative">
                  <div className="size-16 rounded-lg overflow-hidden border border-border bg-background shrink-0">
                    <img src={formImageUrl} alt="Preview" className="size-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <p className="font-semibold text-foreground truncate text-xs">
                      {formImageFileName || 'Foto Produk Terpasang'}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      Google Drive Cloud Asset
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="text-[10px] text-foreground underline underline-offset-2 mt-1 hover:opacity-80 cursor-pointer block"
                    >
                      Ganti Foto Lain
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute right-2.5 top-2.5 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                    title="Hapus foto"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-4 rounded-xl border border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-secondary/40 hover:border-foreground/30 ${isUploadingImage ? 'pointer-events-none opacity-60' : ''
                    }`}
                >
                  <div className="size-9 rounded-full bg-secondary border border-border flex items-center justify-center text-foreground">
                    {isUploadingImage ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Upload size={16} />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-xs text-foreground">
                      {isUploadingImage
                        ? `Mengunggah ke Google Drive... (${uploadProgress}%)`
                        : 'Klik untuk pilih foto produk'}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      JPG, PNG, atau WebP (Maks. 20 MB) • Otomatis disimpan ke Google Drive
                    </p>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isUploadingImage}
                onChange={handleImageFileChange}
              />
            </div>

            {/* 2. Informasi Teks Produk */}
            <div>
              <label className="font-semibold text-foreground block mb-1">Nama Produk / Layanan *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Contoh: Google Review Card Pintar"
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">Tagline / Hook Singkat</label>
                <input
                  type="text"
                  value={formTagline}
                  onChange={(e) => setFormTagline(e.target.value)}
                  placeholder="Contoh: Cukup 1 Tap Rating Naik"
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>
              <div>
                <label className="font-semibold text-foreground block mb-1">Harga / Promo</label>
                <input
                  type="text"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="Contoh: Rp25.000 / pcs"
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Deskripsi & Manfaat Utama</label>
              <textarea
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Jelaskan apa fungsi produk dan bagaimana produk ini menyelesaikan masalah pelanggan..."
                className="w-full bg-background border border-input rounded-xl p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground resize-none leading-relaxed"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Fitur Utama (Pisahkan dengan koma)</label>
              <input
                type="text"
                value={formFeatures}
                onChange={(e) => setFormFeatures(e.target.value)}
                placeholder="Contoh: Dual Chip NFC, Tahan Air, Tanpa Baterai"
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
              />
            </div>

            <div>
              <label className="font-semibold text-foreground block mb-1">Teks Ajakan (Call to Action)</label>
              <input
                type="text"
                value={formCta}
                onChange={(e) => setFormCta(e.target.value)}
                placeholder="Contoh: Dapatkan Promo Terbatas di Bio"
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
              />
            </div>
          </div>

          <DrawerFooter className="px-0 pb-0 pt-2 flex flex-row items-center justify-end gap-2 border-t border-border">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-border text-xs font-medium text-foreground hover:bg-secondary cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isUploadingImage}
              className="px-5 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs disabled:opacity-50"
            >
              Simpan Produk
            </button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
