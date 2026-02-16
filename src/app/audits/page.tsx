"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    Clock,
    Search,
    ArrowUpDown,
    Zap,
    Inbox,
    Download,
    Filter,
    Trash2,
} from "lucide-react"
import Link from "next/link"
import {
    getAudits,
    getSites,
    exportAllData,
    removeAudits,
    type StoredAudit,
    type StoredSite,
} from "@/lib/local-storage"
import { useToast } from "@/components/ui/toast-provider"

function ScoreBadge({ score }: { score: number }) {
    const getStyle = (s: number) => {
        if (s >= 80) return "bg-green-50 text-green-700 border-green-200"
        if (s >= 60) return "bg-orange-50 text-orange-700 border-orange-200"
        return "bg-red-50 text-red-700 border-red-200"
    }
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold border ${getStyle(score)}`}>
            {score}
        </span>
    )
}

type SortKey = "date" | "score" | "issues"
type SortDir = "asc" | "desc"

export default function AuditsPage() {
    const toast = useToast()
    const [audits, setAudits] = useState<StoredAudit[]>([])
    const [sites, setSites] = useState<StoredSite[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [siteFilter, setSiteFilter] = useState<string>("all")
    const [sortKey, setSortKey] = useState<SortKey>("date")
    const [sortDir, setSortDir] = useState<SortDir>("desc")
    const [mounted, setMounted] = useState(false)
    const [selected, setSelected] = useState<Set<string>>(new Set())

    const load = useCallback(() => {
        setAudits(getAudits())
        setSites(getSites())
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

    if (!mounted) return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="h-10 w-56 bg-muted rounded-lg animate-pulse" />
            <div className="h-12 bg-muted rounded-lg animate-pulse" />
            <div className="space-y-3">
                {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
            </div>
        </div>
    )

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"))
        } else {
            setSortKey(key)
            setSortDir("desc")
        }
    }

    // Filter
    let filtered = audits
    if (searchQuery) {
        const q = searchQuery.toLowerCase()
        filtered = filtered.filter(
            (a) => a.domain.toLowerCase().includes(q) || a.url.toLowerCase().includes(q)
        )
    }
    if (siteFilter !== "all") {
        filtered = filtered.filter((a) => a.siteId === siteFilter)
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
        const mul = sortDir === "asc" ? 1 : -1
        switch (sortKey) {
            case "date":
                return mul * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            case "score":
                return mul * (a.score - b.score)
            case "issues":
                return mul * (a.issuesCount - b.issuesCount)
            default:
                return 0
        }
    })

    const handleExport = () => {
        const data = exportAllData()
        const blob = new Blob([data], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `auditor-export-${new Date().toISOString().split("T")[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleSelectAll = () => {
        if (selected.size === filtered.length) {
            setSelected(new Set())
        } else {
            setSelected(new Set(filtered.map(a => a.id)))
        }
    }

    const handleBulkDelete = () => {
        const count = selected.size
        removeAudits(Array.from(selected))
        setSelected(new Set())
        load()
        window.dispatchEvent(new Event("auditor:update"))
        toast.success(`Deleted ${count} audit${count !== 1 ? "s" : ""}`)
    }

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Audit History</h1>
                    <p className="text-muted-foreground mt-1">
                        {audits.length > 0
                            ? `${audits.length} audit${audits.length !== 1 ? "s" : ""} recorded.`
                            : "Run your first audit to start building history."}
                    </p>
                </div>
                <div className="flex gap-3">
                    {audits.length > 0 && (
                        <Button variant="outline" className="gap-2" onClick={handleExport}>
                            <Download className="h-4 w-4" />
                            Export
                        </Button>
                    )}
                    <Link href="/">
                        <Button className="gap-2 bg-orange-500 hover:bg-orange-600 text-white">
                            <Zap className="h-4 w-4" />
                            New Audit
                        </Button>
                    </Link>
                </div>
            </div>

            {audits.length > 0 ? (
                <>
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search by domain or URL..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-background text-foreground"
                            />
                        </div>
                        {sites.length > 1 && (
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <select
                                    value={siteFilter}
                                    onChange={(e) => setSiteFilter(e.target.value)}
                                    className="pl-10 pr-8 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-background text-foreground appearance-none cursor-pointer"
                                >
                                    <option value="all">All Sites</option>
                                    {sites.map((s) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Table */}
                    <Card className="shadow-sm border-zinc-200">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/30">
                                            <th className="py-3 px-3 w-10">
                                                <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleSelectAll} className="accent-orange-500 w-4 h-4 cursor-pointer" />
                                            </th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Site</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">URL</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                <button onClick={() => toggleSort("score")} className="flex items-center gap-1 hover:text-foreground transition-colors">
                                                    Score
                                                    <ArrowUpDown className={`h-3 w-3 ${sortKey === "score" ? "text-orange-500" : ""}`} />
                                                </button>
                                            </th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                <button onClick={() => toggleSort("issues")} className="flex items-center gap-1 hover:text-foreground transition-colors">
                                                    Issues
                                                    <ArrowUpDown className={`h-3 w-3 ${sortKey === "issues" ? "text-orange-500" : ""}`} />
                                                </button>
                                            </th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categories</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                <button onClick={() => toggleSort("date")} className="flex items-center gap-1 hover:text-foreground transition-colors">
                                                    Date
                                                    <ArrowUpDown className={`h-3 w-3 ${sortKey === "date" ? "text-orange-500" : ""}`} />
                                                </button>
                                            </th>
                                            <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filtered.map((audit) => (
                                            <tr key={audit.id} className={`hover:bg-muted/30 transition-colors cursor-pointer ${selected.has(audit.id) ? "bg-orange-50/50 dark:bg-orange-900/10" : ""}`} onClick={() => window.location.href = `/audits/${audit.id}`}>
                                                <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                                                    <input type="checkbox" checked={selected.has(audit.id)} onChange={() => toggleSelect(audit.id)} className="accent-orange-500 w-4 h-4 cursor-pointer" />
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                                                            {audit.domain.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="font-medium text-sm text-foreground">{audit.domain}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-muted-foreground max-w-[200px] truncate">
                                                    {audit.url.replace(/^https?:\/\//, "")}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <ScoreBadge score={audit.score} />
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`text-sm font-medium ${audit.issuesCount > 5 ? "text-red-600" : audit.issuesCount > 0 ? "text-orange-600" : "text-green-600"}`}>
                                                        {audit.issuesCount}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex gap-1 flex-wrap">
                                                        {audit.categorySummary.slice(0, 4).map((cat) => (
                                                            <span
                                                                key={cat.name}
                                                                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${cat.score >= 80 ? "bg-green-50 text-green-700" :
                                                                    cat.score >= 60 ? "bg-orange-50 text-orange-700" :
                                                                        "bg-red-50 text-red-700"
                                                                    }`}
                                                            >
                                                                {cat.label.split(" ")[0]} {cat.score}
                                                            </span>
                                                        ))}
                                                        {audit.categorySummary.length > 4 && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                                                +{audit.categorySummary.length - 4}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-muted-foreground whitespace-nowrap">
                                                    {new Date(audit.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                                                </td>
                                                <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center gap-1 justify-end">
                                                        <Link href={`/audits/${audit.id}`}>
                                                            <Button size="sm" variant="ghost" className="text-blue-500 hover:text-blue-600 gap-1 text-xs">
                                                                View
                                                            </Button>
                                                        </Link>
                                                        <Link href={`/?url=${encodeURIComponent(audit.url)}`}>
                                                            <Button size="sm" variant="ghost" className="text-orange-500 hover:text-orange-600 gap-1 text-xs">
                                                                <Clock className="h-3 w-3" />
                                                                Re-audit
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {filtered.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground text-sm">
                            No audits match your filters.
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-16">
                    <Inbox className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground">No audits yet</h3>
                    <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
                        Run a Quick Audit on any URL — results are automatically saved here.
                    </p>
                    <Link href="/" className="inline-block mt-4">
                        <Button className="gap-2 bg-orange-500 hover:bg-orange-600 text-white">
                            <Zap className="h-4 w-4" />
                            Run Your First Audit
                        </Button>
                    </Link>
                </div>
            )}

            {/* Floating Bulk Actions Bar */}
            {selected.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
                    <div className="flex items-center gap-4 bg-zinc-900 text-white px-6 py-3 rounded-full shadow-xl border border-zinc-700">
                        <span className="text-sm font-medium">{selected.size} audit{selected.size !== 1 ? "s" : ""} selected</span>
                        <div className="w-px h-5 bg-zinc-600" />
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/30 gap-1.5"
                            onClick={handleBulkDelete}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete Selected
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-zinc-400 hover:text-white gap-1.5"
                            onClick={() => setSelected(new Set())}
                        >
                            Clear
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
