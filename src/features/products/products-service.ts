import { supabase } from '@/shared/lib/supabase'

export interface ProductItem {
  id: string
  name: string
  tagline: string
  priceText: string
  description: string
  keyFeatures: string[]
  ctaText: string
  imageUrl?: string
  imageGdriveId?: string
  imageFileName?: string
  isActive: boolean
  createdAt?: string
}

// Default Seed Produk Nyata dengan Foto Contoh
export const DEFAULT_PRODUCTS: ProductItem[] = [
  {
    id: 'prod-review-card',
    name: 'Google Review Card (Smart NFC & QR)',
    tagline: 'Kumpulkan rating bintang 5 Google Maps dalam 1 detik tinggal tap',
    priceText: 'Rp25.000 / pcs',
    description: 'Kartu fisik Dual Chip NFC & QR Code waterproof untuk kasir dan meja toko. Pelanggan cukup tempelkan HP atau scan QR, form ulasan langsung terbuka instan.',
    keyFeatures: ['Dual Chip NFC & QR Code', 'Tanpa Baterai & Waterproof', 'Kompatibel Android & iPhone'],
    ctaText: 'Pesan Sekarang & Dapatkan Bonus Setup',
    imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&auto=format&fit=crop&q=80',
    isActive: true,
  },
  {
    id: 'prod-standee-acrylic',
    name: 'Standee Akrilik Meja Kasir',
    tagline: 'Dudukan display mewah Google Review untuk counter kasir & cafe',
    priceText: 'Rp49.000 / unit',
    description: 'Display akrilik bening elegan premium yang ditaruh di depan kasir. Meningkatkan kesadaran pelanggan untuk memberikan bintang 5 sebelum meninggalkan toko.',
    keyFeatures: ['Material Akrilik Premium Tebal', 'Visual Eye-Catching di Kasir', 'Tingkatkan Ulasan Organik hingga 3x'],
    ctaText: 'Upgrade Tampilan Meja Kasir Anda',
    imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&auto=format&fit=crop&q=80',
    isActive: true,
  },
  {
    id: 'prod-reseller-starter',
    name: 'Paket Kemitraan Reseller (Modal Rp150rb)',
    tagline: 'Peluang bisnis sampingan agen review card dengan margin 100-200%',
    priceText: 'Mulai Rp150.000',
    description: 'Paket starter modal terjangkau sudah dapat produk fisik Google Review Card siap jual ke cafe, resto, klinik, barbershop, dan toko retail di kota Anda.',
    keyFeatures: ['Modal Ringan Profit Tinggi', 'Target Pasar Toko Offline Luas', 'Dukungan Materi Promosi Lengkap'],
    ctaText: 'Daftar Kemitraan Reseller Hari Ini',
    imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&auto=format&fit=crop&q=80',
    isActive: true,
  },
  {
    id: 'prod-custom-branding',
    name: 'Custom Branding Kartu Logo Toko',
    tagline: 'Cetak kartu review eksklusif dengan logo, warna, dan nama outlet Anda',
    priceText: 'Rp35.000 / pcs (Min. 5)',
    description: 'Personalisasi kartu pintar dengan identitas visual outlet Anda. Memberikan kesan bonafid dan profesional di mata pelanggan setia.',
    keyFeatures: ['Cetak Full Color Kualitas Tinggi', 'Bebas Pasang Logo Outlet', 'Chip NFC Terkunci Aman'],
    ctaText: 'Konsultasi Desain Gratis',
    imageUrl: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=600&auto=format&fit=crop&q=80',
    isActive: true,
  },
]

export async function getProducts(): Promise<ProductItem[]> {
  try {
    // 1. Coba ambil dari tabel products jika suatu saat dimigrasikan
    const { data: dbData, error: dbErr } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (!dbErr && dbData && dbData.length > 0) {
      return dbData.map((d: any) => ({
        id: d.id,
        name: d.name || d.title,
        tagline: d.tagline || '',
        priceText: d.price_text || d.price || '',
        description: d.description || d.content || '',
        keyFeatures: Array.isArray(d.features) ? d.features : [],
        ctaText: d.cta_text || 'Pesan Sekarang',
        imageUrl: d.image_url || d.imageUrl,
        imageGdriveId: d.image_gdrive_id || d.imageGdriveId,
        imageFileName: d.image_file_name || d.imageFileName,
        isActive: d.is_active ?? true,
      }))
    }

    // 2. Coba ambil dari audit_logs event APP_PRODUCTS
    const { data: auditData } = await supabase
      .from('audit_logs')
      .select('response_body')
      .eq('event_type', 'APP_PRODUCTS')
      .order('id', { ascending: false })
      .limit(1)

    if (auditData && auditData[0]?.response_body?.items && Array.isArray(auditData[0].response_body.items)) {
      return auditData[0].response_body.items
    }
  } catch (err) {
    console.warn('Fallback getProducts:', err)
  }

  // 3. Fallback default seed
  return DEFAULT_PRODUCTS
}

export async function saveProducts(products: ProductItem[]): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      event_type: 'APP_PRODUCTS',
      response_body: {
        items: products,
        updated_at: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.error('Gagal menyimpan produk ke audit_logs:', err)
  }
}
