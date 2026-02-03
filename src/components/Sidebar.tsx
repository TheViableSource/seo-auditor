import Link from "next/link"
// FIX: Added 'Monitor' to the list of imports below
import { LayoutDashboard, Search, BarChart3, Settings, FileText, Monitor } from "lucide-react"

export function Sidebar() {
  return (
    <div className="h-screen w-64 bg-zinc-900 text-white flex flex-col border-r border-zinc-800">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-blue-500 flex items-center gap-2">
          <Search className="w-6 h-6" />
          Auditor<span className="text-white">Pro</span>
        </h1>
      </div>
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {/* Dashboard Link - Points to Home */}
        <Link href="/" className="flex items-center gap-3 px-4 py-3 bg-zinc-800 rounded-md text-sm font-medium">
          <LayoutDashboard className="w-5 h-5" />
          Dashboard
        </Link>
        
        <Link href="#" className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md text-sm transition-colors">
          <FileText className="w-5 h-5" />
          Site Audit
        </Link>

        {/* The New SERP Simulator Link */}
        <Link href="/serp-simulator" className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md text-sm transition-colors">
          <Monitor className="w-5 h-5" />
          SERP Simulator
        </Link>

        <Link href="#" className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md text-sm transition-colors">
          <BarChart3 className="w-5 h-5" />
          Rankings
        </Link>
        <Link href="#" className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md text-sm transition-colors">
          <Settings className="w-5 h-5" />
          Settings
        </Link>
      </nav>
      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold">
            U
          </div>
          <div className="text-sm">
            <p className="font-medium">User</p>
            <p className="text-zinc-500 text-xs">Free Plan</p>
          </div>
        </div>
      </div>
    </div>
  )
}