"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Search,
  BarChart3,
  Settings,
  FileText,
  Monitor,
  Menu,
  Globe,
  ChevronDown,
  History,
  GitCompareArrows,
  Swords,
  Code,
  Moon,
  Sun,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { getSites, getAudits, getSettings, TIER_LIMITS } from "@/lib/local-storage"
import type { UserTier } from "@/lib/local-storage"
import { NotificationBell } from "@/components/NotificationPanel"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  disabled?: boolean
  badge?: number
}

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname()
  const [settings, setSettings] = useState<{ workspaceName: string; userName: string; tier: UserTier }>({ workspaceName: "AuditorPro", userName: "User", tier: "pro" })
  const [sitesCount, setSitesCount] = useState(0)
  const [auditsCount, setAuditsCount] = useState(0)
  const [mounted, setMounted] = useState(false)

  const load = useCallback(() => {
    setSettings(getSettings())
    setSitesCount(getSites().length)
    setAuditsCount(getAudits().length)
  }, [])

  useEffect(() => {
    load()
    setMounted(true)
    const handler = () => load()
    window.addEventListener("storage", handler)
    window.addEventListener("auditor:update", handler)
    return () => {
      window.removeEventListener("storage", handler)
      window.removeEventListener("auditor:update", handler)
    }
  }, [load])

  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("auditor:darkMode")
    const isDark = saved === "true" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)
    setDark(isDark)
    document.documentElement.classList.toggle("dark", isDark)
  }, [])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("auditor:darkMode", String(next))
  }

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/", label: "Quick Audit", icon: FileText },
    { href: "/sites", label: "Sites", icon: Globe, badge: mounted ? sitesCount : undefined },
    { href: "/audits", label: "Audit History", icon: History, badge: mounted ? auditsCount : undefined },
    { href: "/reports", label: "Reports", icon: FileText },
    { href: "/internal-links", label: "Internal Links", icon: Globe },
    { href: "/compare", label: "Compare", icon: GitCompareArrows },
    { href: "/competitor-gap", label: "Competitor Gap", icon: Swords },
    { href: "/serp-simulator", label: "SERP Simulator", icon: Monitor },
    { href: "/schema-generator", label: "Schema Generator", icon: Code },
    { href: "/rankings", label: "Rankings", icon: BarChart3 },
    { href: "/widget", label: "Widgets", icon: Code },
    { href: "/settings", label: "Settings", icon: Settings },
  ]

  return (
    <>
      {/* Logo + Notifications */}
      <div className="p-6 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <Search className="w-6 h-6 text-sidebar-primary group-hover:scale-110 transition-transform" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-sidebar-primary">
            Auditor<span className="text-sidebar-foreground">Pro</span>
          </h1>
        </Link>
        <NotificationBell />
      </div>

      {/* Workspace Switcher */}
      <div className="px-4 mb-4">
        <button className="w-full flex items-center justify-between p-3 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors text-left group">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {mounted ? settings.workspaceName.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">
                {mounted ? settings.workspaceName : "AuditorPro"}
              </p>
              <p className="text-[10px] text-sidebar-foreground/50">{TIER_LIMITS[settings.tier]?.label ?? "Pro"} Plan</p>
            </div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70 transition-colors shrink-0" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1" aria-label="Main navigation">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.label}
              href={item.disabled ? "#" : item.href}
              onClick={onNavClick}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-all",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : item.disabled
                    ? "text-sidebar-foreground/30 cursor-not-allowed"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
              aria-current={isActive ? "page" : undefined}
              aria-disabled={item.disabled}
            >
              <Icon className="w-4.5 h-4.5" aria-hidden="true" />
              {item.label}
              {item.disabled && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-sidebar-foreground/10 text-sidebar-foreground/30 font-normal">
                  Soon
                </span>
              )}
              {!item.disabled && item.badge !== undefined && item.badge > 0 && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-bold min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer: dark mode + user */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <button
          onClick={toggleDark}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all"
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {dark ? "Light Mode" : "Dark Mode"}
        </button>
        <Link href="/settings" className="flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors">
          <div
            className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center font-bold text-sm shadow-sm"
            aria-hidden="true"
          >
            {mounted ? settings.userName.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="text-sm min-w-0">
            <p className="font-medium text-sidebar-foreground truncate">
              {mounted ? settings.userName : "User"}
            </p>
            <p className="text-sidebar-foreground/50 text-xs">{TIER_LIMITS[settings.tier]?.label ?? "Pro"} Plan</p>
          </div>
        </Link>
      </div>
    </>
  )
}

function DesktopSidebar() {
  return (
    <aside className="hidden md:flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border shrink-0">
      <SidebarContent />
    </aside>
  )
}

function MobileSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden fixed top-4 left-4 z-40 bg-background/80 backdrop-blur-sm shadow-sm border"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-64 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border"
      >
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        <SheetDescription className="sr-only">
          Application navigation links
        </SheetDescription>
        <SidebarContent onNavClick={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}

export function Sidebar() {
  return (
    <>
      <DesktopSidebar />
      <MobileSidebar />
    </>
  )
}
