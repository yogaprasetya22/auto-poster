import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "@/shared/components/theme-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring"
        title="Ganti Tema"
      >
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32 bg-card border-border shadow-md">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={`flex items-center gap-2 text-xs cursor-pointer ${
            theme === "light" ? "font-bold text-foreground bg-muted" : "text-muted-foreground"
          }`}
        >
          <Sun className="h-3.5 w-3.5" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={`flex items-center gap-2 text-xs cursor-pointer ${
            theme === "dark" ? "font-bold text-foreground bg-muted" : "text-muted-foreground"
          }`}
        >
          <Moon className="h-3.5 w-3.5" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={`flex items-center gap-2 text-xs cursor-pointer ${
            theme === "system" ? "font-bold text-foreground bg-muted" : "text-muted-foreground"
          }`}
        >
          <Monitor className="h-3.5 w-3.5" />
          <span>Sistem</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
