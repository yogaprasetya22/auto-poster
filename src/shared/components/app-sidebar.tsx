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
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="hover:bg-muted data-[state=open]:bg-muted transition-colors rounded-md"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded bg-black text-white dark:bg-white dark:text-black font-mono font-bold text-xs shadow-sm">
                OS
              </div>
              <div className="grid flex-1 text-left text-xs leading-tight">
                <span className="truncate font-semibold tracking-tight text-foreground">OSM-APE</span>
                <span className="truncate text-[10px] text-muted-foreground font-mono">ENGINE v2.4</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain />
      </SidebarContent>

      <SidebarFooter className="flex flex-col gap-2 p-2">
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

        {/* Nodes Status */}
        <div className="flex items-center justify-between p-2 rounded border border-border bg-card text-[11px] text-muted-foreground group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="truncate font-medium text-foreground">Cluster Live</span>
          </div>
          <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-muted">4 NODES</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
