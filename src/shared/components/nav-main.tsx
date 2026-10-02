import * as React from "react"
import { NavLink } from "react-router-dom"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/shared/components/ui/sidebar"
import { LayoutDashboard, PenSquare, History, Settings } from "lucide-react"

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Composer", url: "/composer", icon: PenSquare },
  { title: "History", url: "/history", icon: History },
  { title: "Settings", url: "/settings", icon: Settings },
]

export function NavMain() {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-1">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <NavLink to={item.url} end={item.url === "/"}>
                {({ isActive }) => (
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={isActive}
                    className="w-full cursor-pointer"
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                )}
              </NavLink>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
