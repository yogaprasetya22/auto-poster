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
import { Share2, Zap } from "lucide-react"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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

      <SidebarFooter>
        <div className="flex items-center justify-between p-2 rounded border border-border bg-card text-[11px] text-muted-foreground group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="truncate font-medium text-foreground">Cluster Live</span>
          </div>
          <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-muted">4 NODES</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
