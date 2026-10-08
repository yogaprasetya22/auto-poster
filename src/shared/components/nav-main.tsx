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
  Package,
  PenSquare,
  FileText,
  CalendarClock,
  History,
  Settings,
  ChevronDown,
  Bot,
} from "lucide-react"

export function NavMain() {
  const location = useLocation()
  
  // Publikasi sub-menu is open if current pathname is in any of its children
  const isPublishingActive =
    location.pathname === "/products" ||
    location.pathname === "/composer" ||
    location.pathname === "/auto-schedule" ||
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
            5 FITUR
          </span>
        </SidebarGroupLabel>
        <SidebarGroupContent className="mt-1">
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              {/* Parent Toggle Button */}
              <SidebarMenuButton
                onClick={() => setIsPublishingOpen((prev) => !prev)}
                isActive={isPublishingActive && !isPublishingOpen}
                className="w-full cursor-pointer justify-between rounded-lg font-semibold text-xs h-9 px-3 transition-colors bg-muted/40 hover:bg-muted"
                tooltip="Publikasi Postingan"
              >
                <div className="flex items-center gap-2.5">
                  <div className="size-6 rounded-md bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0 shadow-2xs">
                    <Layers className="size-3.5" />
                  </div>
                  <span className="font-semibold text-foreground tracking-tight text-xs">Publikasi</span>
                </div>
                <ChevronDown
                  className={`size-3.5 text-muted-foreground transition-transform duration-200 ${
                    isPublishingOpen ? "rotate-0" : "-rotate-90"
                  }`}
                />
              </SidebarMenuButton>

              {/* Sub-menu Items */}
              {isPublishingOpen && (
                <SidebarMenuSub className="mt-1 ml-4 pl-2.5 border-l-2 border-border/70 flex flex-col gap-0.5 py-0.5">
                  {/* Sub-item 0: Katalog Produk */}
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      size="sm"
                      render={<NavLink to="/products" />}
                      className="w-full cursor-pointer rounded-md text-[11px] font-medium h-7.5 px-2 flex items-center justify-between transition-colors [&.active]:bg-sidebar-accent [&.active]:text-sidebar-accent-foreground"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Package className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">Katalog Produk</span>
                      </div>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>

                  {/* Sub-item 1: Posting Manual */}
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      size="sm"
                      render={<NavLink to="/composer" />}
                      className="w-full cursor-pointer rounded-md text-[11px] font-medium h-7.5 px-2 flex items-center justify-between transition-colors [&.active]:bg-sidebar-accent [&.active]:text-sidebar-accent-foreground"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <PenSquare className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">Posting Manual</span>
                      </div>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>

                  {/* Sub-item 2: Jadwal Otomatis AI */}
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      size="sm"
                      render={<NavLink to="/auto-schedule" />}
                      className="w-full cursor-pointer rounded-md text-[11px] font-medium h-7.5 px-2 flex items-center justify-between transition-colors [&.active]:bg-sidebar-accent [&.active]:text-sidebar-accent-foreground"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Bot className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">Jadwal Auto AI</span>
                      </div>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold shrink-0">
                        BETA
                      </span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>

                  {/* Sub-item 3: Jadwal Antrean */}
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      size="sm"
                      render={<NavLink to="/schedule" />}
                      className="w-full cursor-pointer rounded-md text-[11px] font-medium h-7.5 px-2 flex items-center justify-between transition-colors [&.active]:bg-sidebar-accent [&.active]:text-sidebar-accent-foreground"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CalendarClock className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">Jadwal Antrean</span>
                      </div>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>

                  {/* Sub-item 5: Riwayat Postingan */}
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton
                      size="sm"
                      render={<NavLink to="/history" />}
                      className="w-full cursor-pointer rounded-md text-[11px] font-medium h-7.5 px-2 flex items-center justify-between transition-colors [&.active]:bg-sidebar-accent [&.active]:text-sidebar-accent-foreground"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <History className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">Riwayat Postingan</span>
                      </div>
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
