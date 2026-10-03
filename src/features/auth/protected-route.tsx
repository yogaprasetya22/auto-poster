import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './auth-context'
import { Loader2 } from 'lucide-react'

export function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground gap-3">
        <Loader2 className="size-6 animate-spin text-black dark:text-white" />
        <span className="font-mono text-xs text-muted-foreground">Memeriksa otentikasi Supabase...</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
