import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from './auth-context'
import { toast } from 'sonner'
import { Loader2, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react'

export function LoginPage() {
  const { signInWithEmail } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Email dan kata sandi wajib diisi')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await signInWithEmail(email, password)
      if (error) {
        toast.error(error.message || 'Gagal masuk ke akun')
      } else {
        toast.success('Berhasil masuk!')
        navigate('/')
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-[#F9FAFB] dark:bg-[#09090B] p-4 text-foreground selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      <div className="w-full max-w-[400px] flex flex-col gap-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="size-10 rounded-xl bg-black dark:bg-white text-white dark:text-black font-mono font-bold flex items-center justify-center text-sm shadow-md">
            OS
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-black dark:text-white">
              Masuk ke Engine Auto-Poster
            </h1>
            <p className="text-xs text-[#6B7280] dark:text-[#A1A1AA] mt-1">
              Autonomous Omnichannel Social Media Auto-Poster
            </p>
          </div>
        </div>

        {/* Card Form */}
        <div className="bg-white dark:bg-[#18181B] border border-[#E5E7EB] dark:border-[#27272A] rounded-2xl p-6 shadow-sm flex flex-col gap-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-black dark:text-gray-200 flex items-center gap-1.5">
                <Mail size={13} className="text-[#6B7280]" />
                <span>Alamat Email</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@perusahaan.com"
                required
                className="w-full bg-[#F9FAFB] dark:bg-[#202023] border border-[#E5E7EB] dark:border-[#27272A] px-3.5 py-2.5 rounded-xl text-xs text-black dark:text-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-black dark:focus:border-white transition-all"
              />
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-black dark:text-gray-200 flex items-center gap-1.5">
                <Lock size={13} className="text-[#6B7280]" />
                <span>Kata Sandi</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                minLength={6}
                className="w-full bg-[#F9FAFB] dark:bg-[#202023] border border-[#E5E7EB] dark:border-[#27272A] px-3.5 py-2.5 rounded-xl text-xs text-black dark:text-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-black dark:focus:border-white transition-all"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-semibold hover:bg-[#262626] dark:hover:bg-[#E4E4E7] transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <span>Masuk Sekarang</span>
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security / Info Badge */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#6B7280]">
          <ShieldCheck size={13} className="text-emerald-600" />
          <span>Otentikasi aman ditenagai oleh Supabase Auth</span>
        </div>

        <div className="flex items-center justify-center gap-3 text-[11px] text-[#9CA3AF]">
          <Link to="/terms" className="hover:underline">Syarat Layanan</Link>
          <span>•</span>
          <Link to="/privacy" className="hover:underline">Kebijakan Privasi</Link>
        </div>
      </div>
    </div>
  )
}
