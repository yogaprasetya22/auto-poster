import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { ConnectPlatformModal } from './components/connect-platform-modal'
import { toast } from 'sonner'
import { SkeletonContainer } from '@/shared/components/ui/skeleton-container'
import { Edit3, Plus, Trash2, X, Check, Loader2, Eye, Code, FileText, AlertTriangle } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/shared/components/ui/drawer'

type PlatformKey = 'instagram' | 'facebook_page' | 'threads' | 'tiktok'

interface PlatformDef {
  key: PlatformKey
  name: string
  iconName: string
  badge: string
  capabilities: string
}

const SUPPORTED_PLATFORMS: PlatformDef[] = [
  {
    key: 'instagram',
    name: 'Instagram',
    iconName: 'photo_camera',
    badge: 'REELS & FEED',
    capabilities: 'Reels (9:16 Video), Single Feed Image, Carousel',
  },
  {
    key: 'facebook_page',
    name: 'Facebook Page',
    iconName: 'public',
    badge: 'PAGE POST',
    capabilities: 'Page Feed, Video Post, Direct Upload API',
  },
  {
    key: 'threads',
    name: 'Threads',
    iconName: 'alternate_email',
    badge: 'MICROBLOG',
    capabilities: 'Text Post (max 500 chars), Image Media Attachment',
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    iconName: 'videocam',
    badge: 'DIRECT POST',
    capabilities: 'Direct Video Upload (max 10m), Privacy & Duet Flags',
  },
]

const DEFAULT_KNOWLEDGE_SEED = [
    {
      id: 'seed-1',
      title: 'JAGRES Google Review Card',
      category: 'product',
      content: 'Kartu NFC & QR untuk mendapatkan review bintang 5 di Google Maps dalam 1 detik tanpa aplikasi tambahan.',
    },
    {
      id: 'seed-2',
      title: 'Paket Starter Reseller',
      category: 'offering',
      content: 'Modal Rp150.000 sudah dapat produk Google Review Card siap jual. Margin keuntungan tinggi hingga 100-200%.',
    },
    {
      id: 'seed-3',
      title: 'Gaya Bahasa / Tone of Voice',
      category: 'brand_voice',
      content: 'Persuasif, edukatif, solutif, dan ramah bisnis. Menghindari kata-kata kaku atau robotik.',
    },
    {
      id: 'seed-4',
      title: 'Guardrails (Anti-Halusinasi)',
      category: 'guardrail',
      content: 'Dilarang menjanjikan review palsu/bot. Wajib mendahulukan angka harga asli yang tertera di gambar poster.',
    },
  ]

// ponytail: Helper render markdown presisi tanpa lib berat tambahan
function parseInlineMarkdown(text: string) {
  // Parsing: **bold**, *italic*, `code`, link
  const parts: React.ReactNode[] = []
  // Regex untuk bold, italic, code
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    const token = match[0]
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-bold text-black dark:text-white">
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic text-[#374151] dark:text-[#D1D5DB]">
          {token.slice(1, -1)}
        </em>
      )
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={match.index} className="px-1 py-0.5 rounded bg-[#F3F4F6] dark:bg-[#27272A] font-mono text-[11px] text-[#DC2626] dark:text-[#F87171]">
          {token.slice(1, -1)}
        </code>
      )
    }
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : text
}

function renderCleanMarkdown(content: string) {
  const rawLines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < rawLines.length) {
    const rawLine = rawLines[i]
    const line = rawLine.trimEnd()

    // 1. Cek apakah ini awal Markdown Table: | Kolom 1 | Kolom 2 |
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = []
      while (i < rawLines.length && rawLines[i].trim().startsWith('|') && rawLines[i].trim().endsWith('|')) {
        tableLines.push(rawLines[i].trim())
        i++
      }

      if (tableLines.length >= 2) {
        const headerCells = tableLines[0].split('|').slice(1, -1).map((c) => c.trim())
        // Baris 1 biasanya separator | :--- | :--- |
        const bodyLines = tableLines.slice(1).filter((l) => !l.replace(/[:\-\s|]/g, '') == false)

        elements.push(
          <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-lg border border-[#E5E7EB] dark:border-[#27272A] shadow-2xs">
            <table className="w-full text-left text-[11.5px] border-collapse">
              <thead className="bg-[#F9FAFB] dark:bg-[#18181B] border-b border-[#E5E7EB] dark:border-[#27272A]">
                <tr>
                  {headerCells.map((header, hIdx) => (
                    <th key={hIdx} className="px-3 py-2 font-bold text-black dark:text-white uppercase tracking-wider text-[10.5px]">
                      {parseInlineMarkdown(header)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#27272A] bg-white dark:bg-[#121214]">
                {bodyLines.map((rowLine, rIdx) => {
                  const cells = rowLine.split('|').slice(1, -1).map((c) => c.trim())
                  return (
                    <tr key={rIdx} className="hover:bg-[#F9FAFB]/80 dark:hover:bg-[#18181B]/80 transition-colors">
                      {cells.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-2 text-[#374151] dark:text-[#D1D5DB] whitespace-normal">
                          {parseInlineMarkdown(cell)}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
        continue
      }
    }

    if (!line.trim()) {
      elements.push(<div key={i} className="h-1.5" />)
      i++
      continue
    }

    // Horizontal Rule
    if (line.trim() === '---' || line.trim() === '***') {
      elements.push(<hr key={i} className="my-3 border-[#E5E7EB] dark:border-[#27272A]" />)
      i++
      continue
    }

    // Headings
    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={i} className="text-[17px] font-black tracking-tight text-black dark:text-white pt-2 pb-1 border-b border-[#E5E7EB] dark:border-[#27272A]">
          {parseInlineMarkdown(line.replace('# ', ''))}
        </h2>
      )
      i++
      continue
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={i} className="text-[15px] font-bold tracking-tight text-black dark:text-white pt-2 pb-0.5 border-b border-[#E5E7EB]/60 dark:border-[#27272A]/60">
          {parseInlineMarkdown(line.replace('## ', ''))}
        </h3>
      )
      i++
      continue
    }
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={i} className="text-[13.5px] font-bold text-black dark:text-white pt-1.5">
          {parseInlineMarkdown(line.replace('### ', ''))}
        </h4>
      )
      i++
      continue
    }

    // Blockquote
    if (line.trim().startsWith('> ')) {
      elements.push(
        <blockquote key={i} className="border-l-3 border-black dark:border-white pl-3.5 py-1 text-[#4B5563] dark:text-[#9CA3AF] italic bg-[#F9FAFB] dark:bg-[#18181B] rounded-r my-1">
          {parseInlineMarkdown(line.trim().replace(/^>\s+/, ''))}
        </blockquote>
      )
      i++
      continue
    }

    // Numbered List
    const numMatch = line.match(/^(\d+)\.\s+(.*)/)
    if (numMatch) {
      elements.push(
        <div key={i} className="flex items-start gap-2 pl-2 my-0.5">
          <span className="font-mono font-bold text-[11px] text-[#4B5563] dark:text-[#9CA3AF] shrink-0 pt-0.5 min-w-[14px]">
            {numMatch[1]}.
          </span>
          <div className="flex-1 text-[#1F2937] dark:text-[#E5E7EB]">
            {parseInlineMarkdown(numMatch[2])}
          </div>
        </div>
      )
      i++
      continue
    }

    // Unordered List & Nested Bullet
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const isNested = line.startsWith('   ') || line.startsWith('\t')
      elements.push(
        <div key={i} className={`flex items-start gap-2 my-0.5 ${isNested ? 'pl-6' : 'pl-2'}`}>
          <span className="text-black dark:text-white shrink-0 pt-1 leading-none text-[8px]">
            {isNested ? '◦' : '●'}
          </span>
          <div className="flex-1 text-[#1F2937] dark:text-[#E5E7EB]">
            {parseInlineMarkdown(line.trim().replace(/^[-*]\s+/, ''))}
          </div>
        </div>
      )
      i++
      continue
    }

    // Paragraph normal
    elements.push(
      <p key={i} className="leading-relaxed text-[#374151] dark:text-[#D1D5DB]">
        {parseInlineMarkdown(line)}
      </p>
    )
    i++
  }

  return <div className="space-y-2 text-[12.5px] leading-relaxed text-[#1F2937] dark:text-[#E5E7EB]">{elements}</div>
}

export function SettingsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [activePlatformModal, setActivePlatformModal] = useState<PlatformKey | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [totalPostsCount, setTotalPostsCount] = useState<number>(0)
  const [systemLatency, setSystemLatency] = useState<number>(18)
  const [knowledgeList, setKnowledgeList] = useState<any[]>(DEFAULT_KNOWLEDGE_SEED)
  const [loading, setLoading] = useState(true)

  // Drawer Edit State
  const [editingKnowledge, setEditingKnowledge] = useState<any | null>(null)
  const [isKnowledgeDrawerOpen, setIsKnowledgeDrawerOpen] = useState(false)
  const [knowledgeForm, setKnowledgeForm] = useState({ id: '', title: '', category: 'product', content: '' })
  const [savingKnowledge, setSavingKnowledge] = useState(false)
  const [knowledgeTab, setKnowledgeTab] = useState<'write' | 'preview'>('write')

  async function loadAccounts() {
    setLoading(true)
    const startTime = performance.now()
    const [{ data: accs }, { count: pCount }, { data: auditKnowledge }] = await Promise.all([
      supabase.from('connected_accounts').select('*').eq('is_active', true),
      supabase.from('posts').select('id', { count: 'exact', head: true }),
      supabase.from('audit_logs').select('response_body').eq('event_type', 'AI_KNOWLEDGE_STORE').order('id', { ascending: false }).limit(1),
    ])
    // Query ai_tuning_knowledge secara opsional jika tabel tersedia di Supabase
    let knowledges: any[] | null = null
    try {
      const res = await supabase.from('ai_tuning_knowledge').select('*').eq('is_active', true).order('created_at', { ascending: true })
      if (!res.error && res.data) knowledges = res.data
    } catch {}

    const latency = Math.round(performance.now() - startTime)
    setSystemLatency(latency > 0 ? latency : 18)
    setAccounts(accs ?? [])
    setTotalPostsCount(pCount ?? 0)

    if (knowledges && knowledges.length > 0) {
      setKnowledgeList(knowledges)
    } else if (auditKnowledge && auditKnowledge.length > 0 && Array.isArray(auditKnowledge[0]?.response_body?.items)) {
      setKnowledgeList(auditKnowledge[0].response_body.items)
    } else {
      const localSaved = localStorage.getItem('autoposter_ai_knowledge')
      if (localSaved) {
        try {
          setKnowledgeList(JSON.parse(localSaved))
        } catch {
          setKnowledgeList(DEFAULT_KNOWLEDGE_SEED)
        }
      } else {
        setKnowledgeList(DEFAULT_KNOWLEDGE_SEED)
      }
    }
    setLoading(false)
  }

  function handleOpenCreateKnowledge() {
    setKnowledgeForm({
      id: '',
      title: '',
      category: 'product',
      content: '',
    })
    setEditingKnowledge(null)
    setKnowledgeTab('write')
    setIsKnowledgeDrawerOpen(true)
  }

  function handleOpenEditKnowledge(item: any) {
    setKnowledgeForm({
      id: item.id || '',
      title: item.title || '',
      category: item.category || 'product',
      content: item.content || '',
    })
    setEditingKnowledge(item)
    setKnowledgeTab('write')
    setIsKnowledgeDrawerOpen(true)
  }

  async function handleSaveKnowledge(e: React.FormEvent) {
    e.preventDefault()
    if (!knowledgeForm.title.trim() || !knowledgeForm.content.trim()) {
      toast.error('Judul dan konten memori AI tidak boleh kosong')
      return
    }

    setSavingKnowledge(true)
    try {
      let updatedList = [...knowledgeList]
      if (editingKnowledge) {
        updatedList = updatedList.map((item) =>
          item.id === editingKnowledge.id
            ? { ...item, ...knowledgeForm }
            : item
        )
      } else {
        const newItem = {
          ...knowledgeForm,
          id: `item-${Date.now()}`,
        }
        updatedList.push(newItem)
      }

      setKnowledgeList(updatedList)
      localStorage.setItem('autoposter_ai_knowledge', JSON.stringify(updatedList))

      // Sync ke Supabase (coba ai_tuning_knowledge dan audit_logs)
      try {
        await supabase.from('audit_logs').insert({
          event_type: 'AI_KNOWLEDGE_STORE',
          platform: 'SYSTEM',
          request_url: 'ai_tuning_knowledge',
          response_body: { items: updatedList },
        })
      } catch (err) {
        console.warn('Sync audit_logs skipped:', err)
      }

      toast.success(editingKnowledge ? 'Memori AI berhasil diperbarui!' : 'Memori AI baru berhasil ditambahkan!')
      setIsKnowledgeDrawerOpen(false)
    } catch (err: any) {
      toast.error('Gagal menyimpan memori AI: ' + err.message)
    } finally {
      setSavingKnowledge(false)
    }
  }

  async function handleDeleteKnowledge(id: string, title: string) {
    if (!confirm(`Hapus memori AI "${title}"?`)) return
    const updatedList = knowledgeList.filter((item) => item.id !== id)
    setKnowledgeList(updatedList)
    localStorage.setItem('autoposter_ai_knowledge', JSON.stringify(updatedList))

    try {
      await supabase.from('audit_logs').insert({
        event_type: 'AI_KNOWLEDGE_STORE',
        platform: 'SYSTEM',
        request_url: 'ai_tuning_knowledge',
        response_body: { items: updatedList },
      })
    } catch (err) {
      console.warn('Sync audit_logs skipped:', err)
    }

    toast.success(`Memori AI "${title}" telah dihapus`)
  }

  useEffect(() => {
    loadAccounts()

    // Supabase Realtime subscription untuk connected_accounts, posts, & ai_tuning_knowledge
    const channel = supabase
      .channel('settings_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'connected_accounts' },
        () => loadAccounts()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => loadAccounts()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ai_tuning_knowledge' },
        () => loadAccounts()
      )
      .subscribe()

    const success = searchParams.get('success')
    const connectedParam = searchParams.get('connected')
    const count = searchParams.get('count')
    const error = searchParams.get('error')

    if (success === 'connected') {
      toast.success(`Berhasil! ${count || 'Beberapa'} akun Meta terhubung secara otomatis.`)
      setSearchParams({})
      loadAccounts()
    } else if (connectedParam === 'tiktok') {
      toast.success('Berhasil! Akun TikTok terhubung dan refresh token tersimpan.')
      setSearchParams({})
      loadAccounts()
    } else if (error) {
      toast.error('Gagal menghubungkan akun: ' + decodeURIComponent(error))
      setSearchParams({})
    }

    return () => {
      supabase.removeChannel(channel)
    }
  }, [searchParams, setSearchParams])

  async function handleDisconnect(id: string, name: string) {
    if (!confirm(`Yakin ingin memutuskan koneksi akun "${name}"?`)) return
    const { error } = await supabase.from('connected_accounts').delete().eq('id', id)
    if (error) {
      toast.error('Gagal menghapus akun: ' + error.message)
    } else {
      toast.success(`Akun "${name}" diputuskan`)
      loadAccounts()
    }
  }

  function handleMetaConnect() {
    window.location.href = '/api/auth/meta-login'
  }

  // Tab Navigasi Sederhana
  const [activeTab, setActiveTab] = useState<'accounts' | 'knowledge'>('accounts')

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-12">
      {/* Header Bersih & Ringkas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Pengaturan</h1>
          <p className="text-xs text-muted-foreground">
            Kelola integrasi akun media sosial dan panduan pengetahuan brand untuk asisten AI.
          </p>
        </div>

        {/* Tab Switcher Minimalis */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary border border-border self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'accounts'
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Akun Terhubung ({accounts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('knowledge')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'knowledge'
                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Memori AI ({knowledgeList.length})
          </button>
        </div>
      </div>

      {/* Konten Tab 1: Akun Media Sosial */}
      {activeTab === 'accounts' && (
        <SkeletonContainer isLoading={loading}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-xl bg-card border border-border">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-foreground">Koneksi Otomatis Meta</span>
                <span className="text-[11px] text-muted-foreground">
                  Hubungkan akun Instagram Creator/Business dan Facebook Page sekaligus dalam 1 klik.
                </span>
              </div>
              <button
                type="button"
                onClick={handleMetaConnect}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">bolt</span>
                <span>Hubungkan Meta</span>
              </button>
            </div>

            {/* List Platform */}
            <div className="flex flex-col gap-3">
              {SUPPORTED_PLATFORMS.map((platform) => {
                const connected = accounts.filter((a) => a.platform === platform.key)
                const isConnected = connected.length > 0
                const hasExpired = connected.some(
                  (a) => a.token_expires_at && new Date(a.token_expires_at).getTime() < Date.now()
                )

                return (
                  <div
                    key={platform.key}
                    className="p-4 rounded-xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative shrink-0">
                        <div className="size-11 rounded-lg bg-secondary border border-border flex items-center justify-center">
                          <span className="material-symbols-outlined text-[22px] text-foreground">
                            {platform.iconName}
                          </span>
                        </div>
                        {isConnected && (
                          <span
                            className={`absolute -bottom-1 -right-1 size-3.5 rounded-full flex items-center justify-center text-white ${
                              hasExpired ? 'bg-amber-500' : 'bg-emerald-600'
                            }`}
                          >
                            {hasExpired ? (
                              <AlertTriangle size={8} strokeWidth={2.5} />
                            ) : (
                              <Check size={8} strokeWidth={3} />
                            )}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{platform.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {platform.badge}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground truncate">
                          {isConnected
                            ? connected.map((c) => c.account_name).join(', ')
                            : 'Belum ada akun yang terhubung'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {isConnected ? (
                        <div className="flex items-center gap-2">
                          {hasExpired && (
                            <button
                              type="button"
                              onClick={() => {
                                if (platform.key === 'tiktok') window.location.href = '/api/auth/tiktok-login'
                                else handleMetaConnect()
                              }}
                              className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 transition-colors cursor-pointer"
                            >
                              Login Ulang
                            </button>
                          )}
                          {connected.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleDisconnect(c.id, c.account_name)}
                              className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            >
                              Putuskan
                            </button>
                          ))}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (platform.key === 'tiktok') window.location.href = '/api/auth/tiktok-login'
                            else setActivePlatformModal(platform.key)
                          }}
                          className="px-3 py-1.5 rounded-lg border border-border bg-secondary text-foreground text-xs font-medium hover:bg-accent transition-colors cursor-pointer"
                        >
                          Hubungkan
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </SkeletonContainer>
      )}

      {/* Konten Tab 2: AI Knowledge Memory */}
      {activeTab === 'knowledge' && (
        <SkeletonContainer isLoading={loading}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Panduan Pengetahuan AI</h2>
                <p className="text-xs text-muted-foreground">
                  Informasi produk dan aturan brand yang dipakai AI saat membuat konten.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenCreateKnowledge}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                <Plus size={14} />
                <span>Tambah Data</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {knowledgeList.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => handleOpenEditKnowledge(item)}
                  className="group p-4 rounded-xl bg-card border border-border hover:border-foreground/30 transition-all flex flex-col justify-between gap-3 cursor-pointer"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{item.title}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground uppercase">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                      {item.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1 group-hover:text-foreground transition-colors">
                      <Edit3 size={11} /> Edit
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteKnowledge(item.id, item.title)
                      }}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Hapus"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SkeletonContainer>
      )}

      {/* Drawer Editor AI Brand Tuning & Knowledge (max-w-5xl) */}
      <Drawer open={isKnowledgeDrawerOpen} onOpenChange={setIsKnowledgeDrawerOpen}>
        <DrawerContent className="max-w-5xl w-full bg-white dark:bg-[#121212] rounded-t-2xl md:rounded-t-none md:rounded-l-2xl border-t md:border-t-0 md:border-l border-[#E5E7EB] dark:border-[#27272A] shadow-2xl">
          <DrawerHeader className="border-b border-[#E5E7EB] dark:border-[#27272A] pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black">
                  <FileText size={18} />
                </div>
                <div className="text-left">
                  <DrawerTitle className="text-base font-bold text-black dark:text-white">
                    {editingKnowledge ? 'Edit Memori Pengetahuan AI' : 'Tambah Memori Pengetahuan Baru'}
                  </DrawerTitle>
                  <DrawerDescription className="text-xs text-muted-foreground">
                    Penyesuaian di sini langsung tersinkronisasi ke cloud dan disuntikkan ke prompt Gemini AI.
                  </DrawerDescription>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsKnowledgeDrawerOpen(false)}
                className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </DrawerHeader>

          <form onSubmit={handleSaveKnowledge} className="p-6 space-y-4 max-w-5xl w-full mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Judul Pengetahuan / Komponen</label>
                <input
                  value={knowledgeForm.title}
                  onChange={(e) => setKnowledgeForm({ ...knowledgeForm, title: e.target.value })}
                  placeholder="contoh: Fitur NFC Review Card atau Promo Diskon 50%"
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Kategori Pengetahuan</label>
                <select
                  value={knowledgeForm.category}
                  onChange={(e) => setKnowledgeForm({ ...knowledgeForm, category: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="product">PRODUCT (Fitur, Spesifikasi, Manfaat)</option>
                  <option value="offering">OFFERING (Harga, Paket Reseller, Promo)</option>
                  <option value="brand_voice">BRAND_VOICE (Gaya Bahasa, Tone, Karakter)</option>
                  <option value="guardrail">GUARDRAIL (Pantangan, Aturan Anti-Halusinasi)</option>
                  <option value="hook">HOOK (Formula Pembuka Konten Viral)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FileText size={13} />
                  <span>Detail Naskah & Pengetahuan Resmi (Markdown)</span>
                </label>
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted border border-border/60">
                  <button
                    type="button"
                    onClick={() => setKnowledgeTab('write')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                      knowledgeTab === 'write'
                        ? 'bg-white dark:bg-[#202020] text-black dark:text-white shadow-2xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Code size={12} />
                    <span>Tulis</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setKnowledgeTab('preview')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                      knowledgeTab === 'preview'
                        ? 'bg-white dark:bg-[#202020] text-black dark:text-white shadow-2xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Eye size={12} />
                    <span>Preview</span>
                  </button>
                </div>
              </div>

              {knowledgeTab === 'write' ? (
                <div className="space-y-1">
                  <textarea
                    value={knowledgeForm.content}
                    onChange={(e) => setKnowledgeForm({ ...knowledgeForm, content: e.target.value })}
                    rows={8}
                    placeholder="Tuliskan format Markdown (contoh: **Fitur Utama**, *Harga*: Rp150.000, - Poin 1)..."
                    className="w-full min-h-[60vh]  rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring leading-relaxed"
                    required
                  />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                    <span>Mendukung: **tebal**, *miring*, `code`, # heading, - list item</span>
                    <span>{knowledgeForm.content.length} karakter</span>
                  </div>
                </div>
              ) : (
                <div className="w-full min-h-[60vh] rounded-lg border border-[#E5E7EB] dark:border-[#27272A] bg-white dark:bg-[#121214] p-5 text-[12.5px] leading-relaxed overflow-y-auto max-h-[460px] shadow-2xs">
                  {knowledgeForm.content.trim() ? (
                    renderCleanMarkdown(knowledgeForm.content)
                  ) : (
                    <p className="text-muted-foreground italic text-center py-12 text-xs">
                      Belum ada teks markdown. Ketik di tab "Tulis" untuk melihat hasil pratinjau di sini.
                    </p>
                  )}
                </div>
              )}
            </div>

            <DrawerFooter className="px-0 pt-4 flex flex-row items-center justify-end gap-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => setIsKnowledgeDrawerOpen(false)}
                className="px-4 py-2.5 rounded-lg border border-input text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingKnowledge}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 text-xs font-semibold disabled:opacity-50 transition-all cursor-pointer shadow-xs"
              >
                {savingKnowledge ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Simpan Pengetahuan
              </button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      {activePlatformModal && (
        <ConnectPlatformModal
          platform={activePlatformModal}
          isOpen={true}
          onClose={() => setActivePlatformModal(null)}
          onSuccess={loadAccounts}
        />
      )}
    </div>
  )
}
