import * as React from "react"
import { NavMain } from "@/shared/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/shared/components/ui/sidebar"
import { LogOut, User } from "lucide-react"
import { useAuth } from "@/features/auth/auth-context"
import { toast } from "sonner"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, signOut } = useAuth()

  async function handleLogout() {
    await signOut()
    toast.success("Berhasil keluar dari sesi")
  }

  return (
    <Sidebar collapsible="icon" className="bg-white dark:bg-[#090A0C] text-black dark:text-white" {...props}>
      <SidebarHeader className="p-3 border-b border-border/60">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="hover:bg-muted data-[state=open]:bg-muted transition-colors rounded-xl px-2.5 h-12"
            >
              <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-foreground text-background font-mono font-bold text-sm shadow-xs">
                AP
              </div>
              <div className="grid flex-1 text-left text-xs leading-tight ml-1">
                <span className="truncate font-bold tracking-tight text-foreground text-sm">Auto Poster</span>
                <span className="truncate text-[10px] text-muted-foreground">Jadwal Konten Otomatis</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <NavMain />
      </SidebarContent>

      <SidebarFooter className="flex flex-col gap-2.5 p-3 border-t border-border/60">
        {/* User Profile & Logout */}
        {user && (
          <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-card text-xs group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-6 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                <User size={12} className="text-muted-foreground" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="truncate text-[11px] font-semibold text-foreground">
                  {user.email?.split('@')[0]}
                </span>
                <span className="truncate text-[9px] font-mono text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="p-1 rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
              title="Keluar (Logout)"
            >
              <LogOut size={13} />
            </button>
          </div>
        )}

        {/* Status Sistem */}
        <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-card text-[11px] text-muted-foreground group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="truncate font-medium text-foreground">Sistem Aktif</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-foreground font-medium">Siap Kirim</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
