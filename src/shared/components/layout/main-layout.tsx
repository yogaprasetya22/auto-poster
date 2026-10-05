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
  '/composer': 'Composer Postingan',
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
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
