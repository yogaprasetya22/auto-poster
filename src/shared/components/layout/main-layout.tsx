import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AppSidebar } from '@/shared/components/app-sidebar'
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/shared/components/ui/sidebar'
import { Separator } from '@/shared/components/ui/separator'
import { ThemeToggle } from '@/shared/components/theme-toggle'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard Overview',
  '/products': 'Katalog Produk',
  '/composer': 'Composer Postingan',
  '/auto-schedule': 'Jadwal Otomatis AI',
  '/schedule': 'Jadwal Postingan',
  '/history': 'Riwayat Eksekusi',
  '/settings': 'Pengaturan & Koneksi Akun',
}

export function MainLayout() {
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'Dashboard'

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
            <Separator orientation="vertical" className="mr-2 h-4 bg-border" />
            <h1 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">{title}</h1>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground border border-border">
              <span className="size-1.5 rounded-full bg-emerald-500"></span>
              API READY
            </span>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
          <Suspense
            fallback={
              <div className="w-full max-w-7xl mx-auto space-y-6">
                <div className="animate-pulse space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-border">
                    <div className="space-y-2">
                      <div className="h-6 w-48 bg-muted rounded-lg" />
                      <div className="h-4 w-72 bg-muted rounded" />
                    </div>
                    <div className="h-9 w-32 bg-muted rounded-lg" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                    <div className="h-48 bg-muted rounded-2xl" />
                    <div className="h-48 bg-muted rounded-2xl" />
                    <div className="h-48 bg-muted rounded-2xl" />
                  </div>
                </div>
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
