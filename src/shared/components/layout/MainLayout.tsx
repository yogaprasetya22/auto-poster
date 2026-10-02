import { Outlet, useLocation } from 'react-router-dom'
import { AppSidebar } from '@/shared/components/app-sidebar'
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/shared/components/ui/sidebar'
import { Separator } from '@/shared/components/ui/separator'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard Overview',
  '/composer': 'Composer Postingan',
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
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4 transition-[width,height] ease-linear">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-sm font-semibold">{title}</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
