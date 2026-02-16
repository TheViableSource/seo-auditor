"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    Plus,
    Globe,
    ExternalLink,
    Zap,
    Trash2,
    AlertTriangle,
    CheckCircle,
    Clock,
    Search,
    Inbox,
} from "lucide-react"
import Link from "next/link"
import {
    getSites,
    addSite,
    removeSite,
    getLatestAuditForSite,
    getAuditsForSite,
    type StoredSite,
} from "@/lib/local-storage"

function ScoreMeter({ score }: { score: number }) {
    const getColor = (s: number) => {
        if (s >= 80) return { ring: "text-green-500", text: "text-green-700" }
        if (s >= 60) return { ring: "text-orange-500", text: "text-orange-700" }
        return { ring: "text-red-500", text: "text-red-700" }
    }
    const colors = getColor(score)
    const circumference = 2 * Math.PI * 36
    const offset = circumference - (score / 100) * circumference

    return (
        <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="36" fill="none" strokeWidth="6" className="stroke-muted" />
                <circle
                    cx="40" cy="40" r="36" fill="none" strokeWidth="6"
                    strokeLinecap="round"
                    className={`${colors.ring.replace("text-", "stroke-")} transition-all duration-1000`}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-xl font-bold ${colors.text}`}>{score}</span>
            </div>
        </div>
    )
}

function StatusIndicator({ status }: { status: StoredSite["status"] }) {
    const config = {
        active: { icon: CheckCircle, color: "text-green-500", label: "Active" },
        pending: { icon: Clock, color: "text-orange-500", label: "Pending" },
        error: { icon: AlertTriangle, color: "text-red-500", label: "Error" },
    }
    const { icon: Icon, color, label } = config[status]
    return (
        <div className={`flex items-center gap-1.5 text-xs font-medium ${color}`}>
            <Icon className="h-3.5 w-3.5" />
            {label}
        </div>
    )
}

function AddSiteDialog({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (url: string, name: string) => void }) {
    const [url, setUrl] = useState("")
    const [name, setName] = useState("")

    if (!open) return null

    const handleSubmit = () => {
        if (!url.trim()) return
        onAdd(url.trim(), name.trim())
        setUrl("")
        setName("")
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-xl border border-border w-full max-w-md p-6 space-y-6" onClick={(e) => e.stopPropagation()}>
                <div>
                    <h2 className="text-xl font-bold text-foreground">Add a New Site</h2>
                    <p className="text-sm text-muted-foreground mt-1">Enter the URL of the website you want to track.</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="site-url" className="block text-sm font-medium text-foreground mb-1.5">Website URL</label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                id="site-url"
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://example.com"
                                className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-background text-foreground"
                                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                                autoFocus
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="site-name" className="block text-sm font-medium text-foreground mb-1.5">Site Name (optional)</label>
                        <input
                            id="site-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My Awesome Website"
                            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-background text-foreground"
                            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                        />
                    </div>
                </div>

                <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2" onClick={handleSubmit} disabled={!url.trim()}>
                        <Plus className="h-4 w-4" />
                        Add Site
                    </Button>
                </div>
            </div>
        </div>
    )
}

function DeleteConfirmDialog({ site, onClose, onConfirm }: { site: StoredSite; onClose: () => void; onConfirm: () => void }) {
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-xl border border-border w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-50 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground">Remove Site</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                    Remove <span className="font-medium text-foreground">{site.name}</span> and all its audit history? This can't be undone.
                </p>
                <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button className="bg-red-500 hover:bg-red-600 text-white gap-2" onClick={onConfirm}>
                        <Trash2 className="h-4 w-4" />
                        Remove
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default function SitesPage() {
    const [sites, setSites] = useState<StoredSite[]>([])
    const [showAddDialog, setShowAddDialog] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<StoredSite | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [mounted, setMounted] = useState(false)

    const load = useCallback(() => setSites(getSites()), [])

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

    if (!mounted) return null

    const handleAdd = (url: string, name: string) => {
        addSite(url, name || undefined)
        load()
        window.dispatchEvent(new Event("auditor:update"))
    }

    const handleDelete = (site: StoredSite) => {
        removeSite(site.id)
        setDeleteTarget(null)
        load()
        window.dispatchEvent(new Event("auditor:update"))
    }

    const filteredSites = sites.filter(
        (site) =>
            site.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
            site.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Enrich with audit data
    const enrichedSites = filteredSites.map((site) => {
        const latest = getLatestAuditForSite(site.id)
        const auditCount = getAuditsForSite(site.id).length
        const issuesCount = latest?.issuesCount ?? 0
        return {
            ...site,
            lastAuditScore: latest?.score ?? null,
            lastAuditDate: latest?.createdAt ?? null,
            totalAudits: auditCount,
            issuesCount,
        }
    })

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Sites</h1>
                    <p className="text-muted-foreground mt-1">
                        {sites.length > 0 ? `Tracking ${sites.length} website${sites.length !== 1 ? "s" : ""}.` : "Add your first website to get started."}
                    </p>
                </div>
                <Button className="gap-2 bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4" />
                    Add Site
                </Button>
            </div>

            {/* Search */}
            {sites.length > 0 && (
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search sites..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-background text-foreground"
                    />
                </div>
            )}

            {/* Site Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {enrichedSites.map((site) => (
                    <Card key={site.id} className="shadow-sm hover:shadow-lg transition-all border-zinc-200 overflow-hidden group">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4 min-w-0 flex-1">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-md">
                                        {site.domain.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-bold text-lg text-foreground truncate">{site.name}</h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <a
                                                href={site.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-muted-foreground hover:text-orange-500 flex items-center gap-1 transition-colors"
                                            >
                                                {site.domain}
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                        <div className="mt-2">
                                            <StatusIndicator status={site.status} />
                                        </div>
                                    </div>
                                </div>
                                <div className="shrink-0">
                                    {site.lastAuditScore ? (
                                        <ScoreMeter score={site.lastAuditScore} />
                                    ) : (
                                        <div className="w-24 h-24 rounded-full border-4 border-muted flex items-center justify-center">
                                            <span className="text-xs text-muted-foreground text-center">No data</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-6 flex items-center justify-between pt-4 border-t border-border">
                                <div className="flex gap-6 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Audits: </span>
                                        <span className="font-semibold text-foreground">{site.totalAudits}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Issues: </span>
                                        <span className={`font-semibold ${site.issuesCount > 5 ? "text-red-600" : site.issuesCount > 0 ? "text-orange-600" : "text-green-600"}`}>
                                            {site.issuesCount}
                                        </span>
                                    </div>
                                    {site.lastAuditDate && (
                                        <div>
                                            <span className="text-muted-foreground">Last: </span>
                                            <span className="font-medium text-foreground">
                                                {new Date(site.lastAuditDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <Link href={`/?url=${encodeURIComponent(site.url)}`}>
                                        <Button size="sm" className="gap-1.5 bg-orange-500 hover:bg-orange-600 text-white">
                                            <Zap className="h-3.5 w-3.5" />
                                            Audit
                                        </Button>
                                    </Link>
                                    <Button size="sm" variant="ghost" className="px-2 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(site)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Empty state */}
            {sites.length === 0 && (
                <div className="text-center py-16">
                    <Inbox className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground">No sites yet</h3>
                    <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
                        Add a website to start tracking, or run a Quick Audit — it will be automatically saved here.
                    </p>
                </div>
            )}

            {filteredSites.length === 0 && sites.length > 0 && (
                <div className="text-center py-16">
                    <Globe className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground">No sites found</h3>
                    <p className="text-muted-foreground mt-1">Try a different search term.</p>
                </div>
            )}

            {/* Dialogs */}
            <AddSiteDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} onAdd={handleAdd} />
            {deleteTarget && (
                <DeleteConfirmDialog site={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => handleDelete(deleteTarget)} />
            )}
        </div>
    )
}
