import { useState, useEffect } from "react"
import { NavLink, useLocation } from "react-router-dom"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/shared/components/ui/sidebar"
import {
  LayoutDashboard,
  Layers,
  PenSquare,
  FileText,
  CalendarClock,
  History,
  Settings,
  ChevronDown,
} from "lucide-react"

export function NavMain() {
  const location = useLocation()
  
  // Publikasi sub-menu is open if current pathname is in any of its children
  const isPublishingActive =
    location.pathname === "/composer" ||
    location.pathname === "/drafts" ||
    location.pathname === "/schedule" ||
    location.pathname === "/history"

  const [isPublishingOpen, setIsPublishingOpen] = useState(true)

  // Keep open when user navigates into it
  useEffect(() => {
    if (isPublishingActive) {
      setIsPublishingOpen(true)
    }
  }, [isPublishingActive])

  return (
    <div className="flex flex-col gap-4 py-2 px-1">
      {/* Group 1: Ringkasan Utama */}
      <SidebarGroup className="p-0">
        <SidebarGroupLabel className="px-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
          Menu Utama
        </SidebarGroupLabel>
        <SidebarGroupContent className="mt-1">
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<NavLink to="/" end />}
                tooltip="Dashboard Overview"
                className="w-full cursor-pointer rounded-lg font-medium text-xs h-9 px-3 transition-colors [&.active]:bg-sidebar-accent [&.active]:text-sidebar-accent-foreground"
              >
                <LayoutDashboard className="size-4 shrink-0 text-muted-foreground group-data-active/menu-button:text-foreground" />
                <span>Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Group 2: Publikasi (Parent Menu dengan Sub-menu Composer, Drafts, Jadwal, History) */}
      <SidebarGroup className="p-0">
        <SidebarGroupLabel className="px-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center justify-between">
          <span>Manajemen Konten</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-muted font-mono font-medium">
            4 FITUR
          </span>
        </SidebarGroupLabel>
        <SidebarGroupContent className="mt-1">
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              {/* Parent Toggle Button */}
              <SidebarMenuButton
                onClick={() => setIsPublishingOpen((prev) => !prev)}
                isActive={isPublishingActive && !isPublishingOpen}
                className="w-full cursor-pointer justify-between rounded-lg font-semibold text-xs h-9.5 px-3 transition-colors bg-muted/40 hover:bg-muted"
                tooltip="Publikasi Postingan"
              >
                <div className="flex items-center gap-2.5">
                  <div className="size-6 rounded-md bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0 shadow-2xs">
                    <Layers className="size-3.5" />
                  </div>
                  <span className="font-semibold text-foreground tracking-tight">Publikasi</span>
                </div>
                <ChevronDown
                  className={`size-3.5 text-muted-foreground transition-transform duration-200 ${
                    isPublishingOpen ? "rotate-0" : "-rotate-90"
                  }`}
                />
              </SidebarMenuButton>

              {/* Sub-menu Items */}
              {isPublishingOpen && (
                <SidebarMenuSub className="mt-1 ml-4 pl-3 border-l-2 border-border/70 flex flex-col gap-1 py-1">
                  {/* Sub-item 1: Composer (Buat Konten) */}
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      render={<NavLink to="/composer" />}
                      className="w-full cursor-pointer rounded-lg text-xs h-8.5 px-2.5 font-medium flex items-center justify-between transition-colors [&.active]:bg-sidebar-accent [&.active]:text-sidebar-accent-foreground"
                    >
                      <div className="flex items-center gap-2">
                        <PenSquare className="size-3.5 shrink-0 text-muted-foreground" />
                        <span>Composer</span>
                      </div>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                        AI
                      </span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>

                  {/* Sub-item 2: Draf Postingan */}
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      render={<NavLink to="/drafts" />}
                      className="w-full cursor-pointer rounded-lg text-xs h-8.5 px-2.5 font-medium flex items-center justify-between transition-colors [&.active]:bg-sidebar-accent [&.active]:text-sidebar-accent-foreground"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                        <span>Draf Konten</span>
                      </div>
                      <span className="size-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>

                  {/* Sub-item 3: Jadwal Konten */}
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      render={<NavLink to="/schedule" />}
                      className="w-full cursor-pointer rounded-lg text-xs h-8.5 px-2.5 font-medium flex items-center justify-between transition-colors [&.active]:bg-sidebar-accent [&.active]:text-sidebar-accent-foreground"
                    >
                      <div className="flex items-center gap-2">
                        <CalendarClock className="size-3.5 shrink-0 text-muted-foreground" />
                        <span>Jadwal Tayang</span>
                      </div>
                      <span className="size-1.5 rounded-full bg-amber-500" />
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>

                  {/* Sub-item 4: Riwayat Eksekusi */}
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      render={<NavLink to="/history" />}
                      className="w-full cursor-pointer rounded-lg text-xs h-8.5 px-2.5 font-medium flex items-center justify-between transition-colors [&.active]:bg-sidebar-accent [&.active]:text-sidebar-accent-foreground"
                    >
                      <div className="flex items-center gap-2">
                        <History className="size-3.5 shrink-0 text-muted-foreground" />
                        <span>Riwayat / History</span>
                      </div>
                      <span className="text-[9px] font-mono text-muted-foreground">Log</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Group 3: Pengaturan */}
      <SidebarGroup className="p-0 mt-auto">
        <SidebarGroupLabel className="px-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
          Preferensi
        </SidebarGroupLabel>
        <SidebarGroupContent className="mt-1">
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<NavLink to="/settings" />}
                tooltip="Pengaturan & Akun"
                className="w-full cursor-pointer rounded-lg font-medium text-xs h-9 px-3 transition-colors [&.active]:bg-sidebar-accent [&.active]:text-sidebar-accent-foreground"
              >
                <Settings className="size-4 shrink-0 text-muted-foreground group-data-active/menu-button:text-foreground" />
                <span>Settings & Akun</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </div>
  )
}
