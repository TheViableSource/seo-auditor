"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    ArrowLeft,
    BarChart3,
    Plus,
    Trash2,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Minus,
    Search,
    Target,
    Globe,
    Zap,
    Loader2,
    AlertCircle,
    Sparkles,
    Check,
    X,
    MapPin,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    getSites,
    getSiteById,
    getCompetitorsForSite,
    addCompetitor,
    removeCompetitor,
    updateCompetitor,
    getKeywordsForSite,
    addKeyword,
    removeKeyword,
    updateKeywordRank,
    saveRankSnapshot,
    getRankHistory,
    getLatestAuditForSite,
    saveLocalRank,
    getLatestLocalRanks,
    getSettings,
    TIER_LIMITS,
    type StoredSite,
    type StoredCompetitor,
    type StoredKeyword,
    type StoredRankSnapshot,
    type LocalRankEntry,
} from "@/lib/local-storage"
import { RankGrid, type GridPoint, type BusinessLocation } from "@/components/RankGrid"

/* ------------------------------------------------------------------ */
/*  Radar Chart (SVG)                                                   */
/* ------------------------------------------------------------------ */
function RadarChart({
    labels,
    datasets,
}: {
    labels: string[]
    datasets: { label: string; values: number[]; color: string; fill: string }[]
}) {
    const size = 300
    const center = size / 2
    const maxRadius = 120
    const sides = labels.length
    if (sides < 3) return null

    const angleStep = (2 * Math.PI) / sides
    const startAngle = -Math.PI / 2 // Start from top

    const getPoint = (index: number, value: number) => {
        const angle = startAngle + index * angleStep
        const r = (value / 100) * maxRadius
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle),
        }
    }

    // Grid rings
    const rings = [20, 40, 60, 80, 100]

    return (
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[350px] mx-auto">
            {/* Grid rings */}
            {rings.map((ring) => {
                const points = Array.from({ length: sides }, (_, i) => {
                    const p = getPoint(i, ring)
                    return `${p.x},${p.y}`
                }).join(" ")
                return (
                    <polygon
                        key={ring}
                        points={points}
                        fill="none"
                        stroke="currentColor"
                        className="text-border"
                        strokeWidth="0.5"
                        opacity={0.5}
                    />
                )
            })}

            {/* Axis lines */}
            {Array.from({ length: sides }, (_, i) => {
                const p = getPoint(i, 100)
                return (
                    <line
                        key={`axis-${i}`}
                        x1={center}
                        y1={center}
                        x2={p.x}
                        y2={p.y}
                        stroke="currentColor"
                        className="text-border"
                        strokeWidth="0.5"
                        opacity={0.3}
                    />
                )
            })}

            {/* Data polygons */}
            {datasets.map((ds, di) => {
                const points = ds.values.map((v, i) => {
                    const p = getPoint(i, v)
                    return `${p.x},${p.y}`
                }).join(" ")
                return (
                    <g key={di}>
                        <polygon
                            points={points}
                            fill={ds.fill}
                            stroke={ds.color}
                            strokeWidth="2"
                            className="transition-all duration-500"
                        />
                        {/* Data points */}
                        {ds.values.map((v, i) => {
                            const p = getPoint(i, v)
                            return (
                                <circle
                                    key={i}
                                    cx={p.x}
                                    cy={p.y}
                                    r="3"
                                    fill={ds.color}
                                    stroke="white"
                                    strokeWidth="1"
                                />
                            )
                        })}
                    </g>
                )
            })}

            {/* Labels */}
            {labels.map((label, i) => {
                const p = getPoint(i, 115)
                return (
                    <text
                        key={i}
                        x={p.x}
                        y={p.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-[8px] fill-muted-foreground font-medium"
                    >
                        {label.length > 12 ? label.slice(0, 12) + "…" : label}
                    </text>
                )
            })}
        </svg>
    )
}

/* ------------------------------------------------------------------ */
/*  Rank Sparkline (SVG)                                                */
/* ------------------------------------------------------------------ */
function RankSparkline({ history }: { history: StoredRankSnapshot[] }) {
    if (history.length < 2) return <span className="text-xs text-muted-foreground">—</span>

    const width = 80
    const height = 24
    const padding = 2
    // Rank 1 = top (best), higher rank = lower position
    const ranks = history.map((h) => h.rank ?? 100)
    const maxRank = Math.max(...ranks, 10)
    const minRank = Math.min(...ranks, 1)
    const range = maxRank - minRank || 1

    const points = ranks.map((rank, i) => {
        const x = padding + (i / (ranks.length - 1)) * (width - 2 * padding)
        // Invert: rank 1 = top of chart
        const y = padding + ((rank - minRank) / range) * (height - 2 * padding)
        return `${x},${y}`
    }).join(" ")

    const latest = ranks[ranks.length - 1]
    const prev = ranks[ranks.length - 2]
    const color = latest < prev ? "#22c55e" : latest > prev ? "#ef4444" : "#94a3b8"

    return (
        <svg width={width} height={height} className="inline-block">
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

/* ------------------------------------------------------------------ */
/*  Rank Trend Badge                                                    */
/* ------------------------------------------------------------------ */
function RankTrend({ current, previous }: { current: number | null | undefined; previous: number | null | undefined }) {
    if (current == null || previous == null) return <Minus className="w-3.5 h-3.5 text-muted-foreground" />
    const diff = previous - current // Lower rank is better, so positive diff = improvement
    if (diff === 0) return <Minus className="w-3.5 h-3.5 text-muted-foreground" />
    if (diff > 0) return (
        <span className="inline-flex items-center gap-0.5 text-xs font-bold text-green-600">
            <TrendingUp className="w-3 h-3" /> +{diff}
        </span>
    )
    return (
        <span className="inline-flex items-center gap-0.5 text-xs font-bold text-red-600">
            <TrendingDown className="w-3 h-3" /> {diff}
        </span>
    )
}

/* ------------------------------------------------------------------ */
/*  Main Rankings Page                                                  */
/* ------------------------------------------------------------------ */
export default function RankingsPage() {
    const router = useRouter()
    const [mounted, setMounted] = useState(false)
    const [sites, setSites] = useState<StoredSite[]>([])
    const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<"competitors" | "keywords" | "local">("competitors")

    // Local rank tracking state
    const [localRankKeyword, setLocalRankKeyword] = useState("")
    const [localRankLoading, setLocalRankLoading] = useState(false)
    const [hasLocalRankAccess, setHasLocalRankAccess] = useState(false)

    // Grid mode state
    const [gridSize, setGridSize] = useState(5)
    const [radiusMiles, setRadiusMiles] = useState(5)
    const [gridResults, setGridResults] = useState<GridPoint[]>([])
    const [gridProvider, setGridProvider] = useState<string>("")
    const [gridUsage, setGridUsage] = useState<{ used: number; remaining: number; limit: number } | null>(null)
    const [gridError, setGridError] = useState<string>("")

    // Business address state
    const [businessAddress, setBusinessAddress] = useState("")
    const [businessLocation, setBusinessLocation] = useState<BusinessLocation | null>(null)
    const [geocoding, setGeocoding] = useState(false)

    // Competitors
    const [competitors, setCompetitors] = useState<StoredCompetitor[]>([])
    const [competitorUrl, setCompetitorUrl] = useState("")
    const [auditingCompetitors, setAuditingCompetitors] = useState(false)
    const [auditProgress, setAuditProgress] = useState("")

    // Keywords
    const [keywords, setKeywords] = useState<StoredKeyword[]>([])
    const [newKeyword, setNewKeyword] = useState("")
    const [checkingRanks, setCheckingRanks] = useState(false)
    const [rankProgress, setRankProgress] = useState("")

    // Keyword Discovery
    const [discovering, setDiscovering] = useState(false)
    const [suggestions, setSuggestions] = useState<{ phrase: string; score: number; source: string }[]>([])
    const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set())
    const [discoveryError, setDiscoveryError] = useState("")

    // Rank histories for sparklines
    const [rankHistories, setRankHistories] = useState<Record<string, StoredRankSnapshot[]>>({})

    const load = useCallback(() => {
        const allSites = getSites()
        setSites(allSites)
        if (!selectedSiteId && allSites.length > 0) {
            setSelectedSiteId(allSites[0].id)
        }
    }, [selectedSiteId])

    const loadSiteData = useCallback(() => {
        if (!selectedSiteId) return
        const comps = getCompetitorsForSite(selectedSiteId)
        setCompetitors(comps)
        const kws = getKeywordsForSite(selectedSiteId)
        setKeywords(kws)
        // Load rank histories
        const histories: Record<string, StoredRankSnapshot[]> = {}
        for (const kw of kws) {
            histories[kw.id] = getRankHistory(kw.id)
        }
        setRankHistories(histories)
    }, [selectedSiteId])

    useEffect(() => {
        setMounted(true)
        load()
    }, [load])

    useEffect(() => {
        loadSiteData()
    }, [loadSiteData])

    // Get your site's category scores from latest audit
    const siteCategories = useMemo(() => {
        if (!selectedSiteId) return []
        const latest = getLatestAuditForSite(selectedSiteId)
        if (!latest?.fullCategories) return []
        return latest.fullCategories.map((c) => ({
            name: c.name,
            label: c.label,
            score: typeof c.score === "number" && !isNaN(c.score) ? c.score : 0,
        }))
    }, [selectedSiteId])

    // Radar chart data
    const radarData = useMemo(() => {
        if (siteCategories.length === 0) return null
        const labels = siteCategories.map((c) => c.label)
        const datasets = [
            {
                label: "Your Site",
                values: siteCategories.map((c) => c.score),
                color: "#f97316",
                fill: "rgba(249, 115, 22, 0.15)",
            },
        ]
        // Add competitor datasets
        const colors = [
            { color: "#3b82f6", fill: "rgba(59, 130, 246, 0.1)" },
            { color: "#8b5cf6", fill: "rgba(139, 92, 246, 0.1)" },
            { color: "#06b6d4", fill: "rgba(6, 182, 212, 0.1)" },
            { color: "#10b981", fill: "rgba(16, 185, 129, 0.1)" },
        ]
        competitors.forEach((comp, i) => {
            if (comp.latestCategories) {
                const colIdx = i % colors.length
                datasets.push({
                    label: comp.name,
                    values: siteCategories.map((sc) => {
                        const match = comp.latestCategories?.find((cc) => cc.name === sc.name)
                        return match?.score ?? 0
                    }),
                    ...colors[colIdx],
                })
            }
        })
        return { labels, datasets }
    }, [siteCategories, competitors])

    // --- Actions ---
    const handleAddCompetitor = () => {
        if (!selectedSiteId || !competitorUrl.trim()) return
        addCompetitor(selectedSiteId, competitorUrl.trim())
        setCompetitorUrl("")
        loadSiteData()
        window.dispatchEvent(new Event("auditor:update"))
    }

    const handleRemoveCompetitor = (id: string) => {
        removeCompetitor(id)
        loadSiteData()
        window.dispatchEvent(new Event("auditor:update"))
    }

    const handleAuditCompetitors = async () => {
        if (!selectedSiteId || competitors.length === 0) return
        setAuditingCompetitors(true)

        for (let i = 0; i < competitors.length; i++) {
            const comp = competitors[i]
            setAuditProgress(`Auditing ${comp.name} (${i + 1}/${competitors.length})...`)
            try {
                const res = await fetch("/api/competitor-audit", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: comp.url }),
                })
                if (res.ok) {
                    const data = await res.json()
                    updateCompetitor(comp.id, {
                        latestScore: data.score,
                        latestCategories: data.categories,
                    })
                }
            } catch {
                // Skip failed audits
            }
        }

        setAuditingCompetitors(false)
        setAuditProgress("")
        loadSiteData()
        window.dispatchEvent(new Event("auditor:update"))
    }

    const handleAddKeyword = () => {
        if (!selectedSiteId || !newKeyword.trim()) return
        addKeyword(selectedSiteId, newKeyword.trim())
        setNewKeyword("")
        loadSiteData()
        window.dispatchEvent(new Event("auditor:update"))
    }

    const handleRemoveKeyword = (id: string) => {
        removeKeyword(id)
        loadSiteData()
        window.dispatchEvent(new Event("auditor:update"))
    }

    const handleCheckRanks = async () => {
        if (!selectedSiteId || keywords.length === 0) return
        setCheckingRanks(true)
        const site = getSiteById(selectedSiteId)
        if (!site) return

        for (let i = 0; i < keywords.length; i++) {
            const kw = keywords[i]
            setRankProgress(`Checking "${kw.keyword}" (${i + 1}/${keywords.length})...`)
            try {
                const res = await fetch("/api/rank-check", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ keyword: kw.keyword, domain: site.domain }),
                })
                const data = await res.json()
                updateKeywordRank(kw.id, data.rank ?? null)
                saveRankSnapshot(kw.id, selectedSiteId, data.rank ?? null)
            } catch {
                // Skip failed checks
            }
            // Small delay between requests to avoid rate limiting
            if (i < keywords.length - 1) {
                await new Promise((r) => setTimeout(r, 2000))
            }
        }

        setCheckingRanks(false)
        setRankProgress("")
        loadSiteData()
        window.dispatchEvent(new Event("auditor:update"))
    }

    // --- Keyword Discovery ---
    const handleDiscoverKeywords = async () => {
        if (!selectedSiteId) return
        const site = getSiteById(selectedSiteId)
        if (!site) return
        setDiscovering(true)
        setDiscoveryError("")
        setSuggestions([])
        setSelectedSuggestions(new Set())

        try {
            const siteUrl = site.url.startsWith("http") ? site.url : `https://${site.url}`
            const res = await fetch("/api/keyword-discovery", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: siteUrl }),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || "Discovery failed")
            }
            const data = await res.json()
            // Filter out keywords already being tracked
            const trackedSet = new Set(keywords.map((kw) => kw.keyword.toLowerCase()))
            const filtered = (data.keywords || []).filter(
                (k: { phrase: string }) => !trackedSet.has(k.phrase.toLowerCase())
            )
            setSuggestions(filtered)
            // Pre-select all
            setSelectedSuggestions(new Set(filtered.map((k: { phrase: string }) => k.phrase)))
        } catch (err: unknown) {
            setDiscoveryError(err instanceof Error ? err.message : "Failed to discover keywords")
        } finally {
            setDiscovering(false)
        }
    }

    const handleToggleSuggestion = (phrase: string) => {
        setSelectedSuggestions((prev) => {
            const next = new Set(prev)
            if (next.has(phrase)) next.delete(phrase)
            else next.add(phrase)
            return next
        })
    }

    const handleAddSuggestions = () => {
        if (!selectedSiteId || selectedSuggestions.size === 0) return
        for (const phrase of selectedSuggestions) {
            addKeyword(selectedSiteId, phrase)
        }
        setSuggestions([])
        setSelectedSuggestions(new Set())
        loadSiteData()
        window.dispatchEvent(new Event("auditor:update"))
    }

    if (!mounted) return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            <div className="h-10 w-48 bg-muted rounded-lg animate-pulse" />
            <div className="grid md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
            </div>
            <div className="h-80 bg-muted rounded-xl animate-pulse" />
        </div>
    )

    const selectedSite = selectedSiteId ? getSiteById(selectedSiteId) : null

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="sm" className="gap-1">
                            <ArrowLeft className="h-4 w-4" /> Back
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <BarChart3 className="h-6 w-6 text-orange-500" />
                            Rankings & Competitors
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Track keyword positions and compare against competitors
                        </p>
                    </div>
                </div>
            </div>

            {/* Site Selector */}
            {sites.length > 0 ? (
                <div className="flex items-center gap-3 flex-wrap">
                    <label className="text-sm font-medium text-muted-foreground">Site:</label>
                    <select
                        value={selectedSiteId || ""}
                        onChange={(e) => setSelectedSiteId(e.target.value)}
                        className="border border-border rounded-lg px-3 py-2 text-sm bg-background"
                    >
                        {sites.map((site) => (
                            <option key={site.id} value={site.id}>
                                {site.name} ({site.domain})
                            </option>
                        ))}
                    </select>
                </div>
            ) : (
                <Card className="shadow-sm border-zinc-200">
                    <CardContent className="text-center py-12">
                        <Globe className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Sites Tracked</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Add a site and run an audit first to enable competitor and keyword tracking.
                        </p>
                        <Link href="/">
                            <Button className="gap-2 bg-orange-500 hover:bg-orange-600 text-white">
                                <Zap className="h-4 w-4" /> Run Your First Audit
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            )}

            {/* Tabs */}
            {selectedSiteId && (
                <>
                    <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
                        <button
                            onClick={() => setActiveTab("competitors")}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "competitors"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <Target className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                            Competitors
                        </button>
                        <button
                            onClick={() => setActiveTab("keywords")}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "keywords"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <Search className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                            Keyword Rankings
                        </button>
                        <button
                            onClick={() => setActiveTab("local")}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "local"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <MapPin className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                            Local Rankings
                        </button>
                    </div>

                    {/* ============================================================ */}
                    {/*  COMPETITORS TAB                                              */}
                    {/* ============================================================ */}
                    {activeTab === "competitors" && (
                        <div className="space-y-6">
                            {/* Add Competitor */}
                            <Card className="shadow-sm border-zinc-200">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">Add Competitor</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form
                                        onSubmit={(e) => { e.preventDefault(); handleAddCompetitor() }}
                                        className="flex gap-2"
                                    >
                                        <input
                                            type="text"
                                            value={competitorUrl}
                                            onChange={(e) => setCompetitorUrl(e.target.value)}
                                            placeholder="e.g. competitor.com or https://competitor.com"
                                            className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                                        />
                                        <Button
                                            type="submit"
                                            disabled={!competitorUrl.trim()}
                                            className="gap-1.5 bg-orange-500 hover:bg-orange-600 text-white"
                                        >
                                            <Plus className="h-4 w-4" /> Add
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>

                            {/* Competitor List */}
                            {competitors.length > 0 && (
                                <Card className="shadow-sm border-zinc-200">
                                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                        <CardTitle className="text-base">
                                            Tracked Competitors ({competitors.length})
                                        </CardTitle>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-1.5"
                                            onClick={handleAuditCompetitors}
                                            disabled={auditingCompetitors}
                                        >
                                            {auditingCompetitors ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <RefreshCw className="h-3.5 w-3.5" />
                                            )}
                                            {auditingCompetitors ? auditProgress : "Audit All Competitors"}
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b text-xs text-muted-foreground uppercase tracking-wider">
                                                    <th className="text-left py-2.5 px-4 font-semibold">Competitor</th>
                                                    <th className="text-right py-2.5 px-4 font-semibold">Score</th>
                                                    <th className="text-right py-2.5 px-4 font-semibold w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {competitors.map((comp) => (
                                                    <tr key={comp.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                                        <td className="py-3 px-4">
                                                            <p className="font-medium text-sm">{comp.name}</p>
                                                            <p className="text-xs text-muted-foreground">{comp.domain}</p>
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            {comp.latestScore != null ? (
                                                                <span className={`font-bold text-sm ${comp.latestScore >= 80 ? "text-green-600" : comp.latestScore >= 60 ? "text-orange-600" : "text-red-600"}`}>
                                                                    {comp.latestScore}
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">Not audited</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            <button
                                                                onClick={() => handleRemoveCompetitor(comp.id)}
                                                                className="text-muted-foreground hover:text-red-500 transition-colors"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Radar Chart */}
                            {radarData && radarData.datasets.some((d) => d.values.some((v) => v > 0)) && (
                                <Card className="shadow-sm border-zinc-200">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">Category Comparison</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <RadarChart labels={radarData.labels} datasets={radarData.datasets} />
                                        {/* Legend */}
                                        <div className="flex flex-wrap justify-center gap-4 mt-4">
                                            {radarData.datasets.map((ds) => (
                                                <div key={ds.label} className="flex items-center gap-1.5">
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: ds.color }}
                                                    />
                                                    <span className="text-xs font-medium text-muted-foreground">
                                                        {ds.label}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Score Comparison Table */}
                            {competitors.some((c) => c.latestCategories) && siteCategories.length > 0 && (
                                <Card className="shadow-sm border-zinc-200">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">Detailed Score Comparison</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0 overflow-x-auto">
                                        <table className="w-full min-w-[600px]">
                                            <thead>
                                                <tr className="border-b text-xs text-muted-foreground uppercase tracking-wider">
                                                    <th className="text-left py-2.5 px-4 font-semibold">Category</th>
                                                    <th className="text-right py-2.5 px-4 font-semibold text-orange-600">
                                                        {selectedSite?.name || "Your Site"}
                                                    </th>
                                                    {competitors.filter((c) => c.latestCategories).map((comp) => (
                                                        <th key={comp.id} className="text-right py-2.5 px-4 font-semibold">
                                                            {comp.name}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {siteCategories.map((cat) => (
                                                    <tr key={cat.name} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                                        <td className="py-2.5 px-4 text-sm font-medium">{cat.label}</td>
                                                        <td className="py-2.5 px-4 text-right">
                                                            <span className={`font-bold text-sm ${cat.score >= 80 ? "text-green-600" : cat.score >= 60 ? "text-orange-600" : "text-red-600"}`}>
                                                                {Math.round(cat.score)}%
                                                            </span>
                                                        </td>
                                                        {competitors.filter((c) => c.latestCategories).map((comp) => {
                                                            const compCat = comp.latestCategories?.find((cc) => cc.name === cat.name)
                                                            const compScore = compCat?.score ?? 0
                                                            const diff = compScore - cat.score
                                                            return (
                                                                <td key={comp.id} className="py-2.5 px-4 text-right">
                                                                    <span className={`font-bold text-sm ${compScore >= 80 ? "text-green-600" : compScore >= 60 ? "text-orange-600" : "text-red-600"}`}>
                                                                        {Math.round(compScore)}%
                                                                    </span>
                                                                    {diff !== 0 && (
                                                                        <span className={`ml-1.5 text-[10px] font-bold ${diff > 0 ? "text-red-500" : "text-green-500"}`}>
                                                                            ({diff > 0 ? "+" : ""}{Math.round(diff)})
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            )
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Empty state */}
                            {competitors.length === 0 && (
                                <Card className="shadow-sm border-zinc-200">
                                    <CardContent className="text-center py-12">
                                        <Target className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold mb-2">No Competitors Yet</h3>
                                        <p className="text-sm text-muted-foreground mb-1">
                                            Add competitor URLs to compare their SEO scores against yours.
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Use the form above to add a competitor domain.
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    {/* ============================================================ */}
                    {/*  KEYWORDS TAB                                                 */}
                    {/* ============================================================ */}
                    {activeTab === "keywords" && (
                        <div className="space-y-6">
                            {/* Discover Keywords */}
                            <Card className="shadow-sm border-zinc-200 overflow-hidden">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Sparkles className="h-4 w-4 text-orange-500" />
                                                Auto-Discover Keywords
                                            </CardTitle>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Analyze your site to find keywords you may already be ranking for
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-1.5 border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                                            onClick={handleDiscoverKeywords}
                                            disabled={discovering}
                                        >
                                            {discovering ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <Sparkles className="h-3.5 w-3.5" />
                                            )}
                                            {discovering ? "Analyzing…" : "Discover Keywords"}
                                        </Button>
                                    </div>
                                </CardHeader>

                                {/* Discovery Error */}
                                {discoveryError && (
                                    <CardContent className="pt-0">
                                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                                            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                                            <p className="text-xs text-red-600 dark:text-red-400">{discoveryError}</p>
                                        </div>
                                    </CardContent>
                                )}

                                {/* Suggestions List */}
                                {suggestions.length > 0 && (
                                    <CardContent className="pt-0">
                                        <div className="border border-border rounded-lg divide-y">
                                            {/* Select all / none header */}
                                            <div className="flex items-center justify-between px-3 py-2 bg-muted/40">
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    {selectedSuggestions.size} of {suggestions.length} selected
                                                </span>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setSelectedSuggestions(new Set(suggestions.map((s) => s.phrase)))}
                                                        className="text-[10px] font-medium text-orange-600 hover:underline"
                                                    >
                                                        Select All
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedSuggestions(new Set())}
                                                        className="text-[10px] font-medium text-muted-foreground hover:underline"
                                                    >
                                                        Clear
                                                    </button>
                                                </div>
                                            </div>

                                            {suggestions.map((s) => (
                                                <label
                                                    key={s.phrase}
                                                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 cursor-pointer transition-colors"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSuggestions.has(s.phrase)}
                                                        onChange={() => handleToggleSuggestion(s.phrase)}
                                                        className="rounded border-border text-orange-500 focus:ring-orange-500/30 h-4 w-4"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <span className="text-sm font-medium">{s.phrase}</span>
                                                    </div>
                                                    <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${s.source === "title" ? "bg-orange-100 text-orange-700" :
                                                        s.source === "h1" ? "bg-blue-100 text-blue-700" :
                                                            s.source === "meta" ? "bg-purple-100 text-purple-700" :
                                                                s.source === "h2" ? "bg-cyan-100 text-cyan-700" :
                                                                    s.source === "h3" ? "bg-teal-100 text-teal-700" :
                                                                        "bg-zinc-100 text-zinc-600"
                                                        }`}>
                                                        {s.source}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
                                                        {s.score.toFixed(0)}pts
                                                    </span>
                                                </label>
                                            ))}
                                        </div>

                                        <div className="flex items-center justify-between mt-3">
                                            <button
                                                onClick={() => { setSuggestions([]); setSelectedSuggestions(new Set()) }}
                                                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                                            >
                                                <X className="h-3 w-3" /> Dismiss
                                            </button>
                                            <Button
                                                size="sm"
                                                disabled={selectedSuggestions.size === 0}
                                                onClick={handleAddSuggestions}
                                                className="gap-1.5 bg-orange-500 hover:bg-orange-600 text-white"
                                            >
                                                <Check className="h-3.5 w-3.5" />
                                                Add {selectedSuggestions.size} Keyword{selectedSuggestions.size !== 1 ? "s" : ""}
                                            </Button>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>

                            {/* Manual Add Keyword */}
                            <Card className="shadow-sm border-zinc-200">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">Add Keyword Manually</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form
                                        onSubmit={(e) => { e.preventDefault(); handleAddKeyword() }}
                                        className="flex gap-2"
                                    >
                                        <input
                                            type="text"
                                            value={newKeyword}
                                            onChange={(e) => setNewKeyword(e.target.value)}
                                            placeholder='e.g. "seo audit tool" or "best seo software"'
                                            className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                                        />
                                        <Button
                                            type="submit"
                                            disabled={!newKeyword.trim()}
                                            className="gap-1.5 bg-orange-500 hover:bg-orange-600 text-white"
                                        >
                                            <Plus className="h-4 w-4" /> Add
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>

                            {/* Keyword List */}
                            {keywords.length > 0 && (
                                <Card className="shadow-sm border-zinc-200">
                                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                        <CardTitle className="text-base">
                                            Tracked Keywords ({keywords.length})
                                        </CardTitle>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-1.5"
                                            onClick={handleCheckRanks}
                                            disabled={checkingRanks}
                                        >
                                            {checkingRanks ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <RefreshCw className="h-3.5 w-3.5" />
                                            )}
                                            {checkingRanks ? rankProgress : "Check All Rankings"}
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b text-xs text-muted-foreground uppercase tracking-wider">
                                                    <th className="text-left py-2.5 px-4 font-semibold">Keyword</th>
                                                    <th className="text-center py-2.5 px-4 font-semibold">Position</th>
                                                    <th className="text-center py-2.5 px-4 font-semibold">Trend</th>
                                                    <th className="text-center py-2.5 px-4 font-semibold">History</th>
                                                    <th className="text-right py-2.5 px-4 font-semibold">Last Checked</th>
                                                    <th className="text-right py-2.5 px-4 font-semibold w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {keywords.map((kw) => (
                                                    <tr key={kw.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                                        <td className="py-3 px-4">
                                                            <p className="font-medium text-sm">{kw.keyword}</p>
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            {kw.currentRank != null ? (
                                                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${kw.currentRank <= 3 ? "bg-green-100 text-green-700" :
                                                                    kw.currentRank <= 10 ? "bg-blue-100 text-blue-700" :
                                                                        kw.currentRank <= 30 ? "bg-orange-100 text-orange-700" :
                                                                            "bg-red-100 text-red-700"
                                                                    }`}>
                                                                    {kw.currentRank}
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">—</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <RankTrend current={kw.currentRank} previous={kw.previousRank} />
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <RankSparkline history={rankHistories[kw.id] || []} />
                                                        </td>
                                                        <td className="py-3 px-4 text-right text-xs text-muted-foreground">
                                                            {kw.lastChecked
                                                                ? new Date(kw.lastChecked).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                                                : "Never"
                                                            }
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            <button
                                                                onClick={() => handleRemoveKeyword(kw.id)}
                                                                className="text-muted-foreground hover:text-red-500 transition-colors"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Rank Check Note */}
                            {keywords.length > 0 && (
                                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                                    <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                                    <p className="text-xs text-blue-700 dark:text-blue-300">
                                        Rank positions are estimated and may vary from actual Google results. For the most accurate tracking,
                                        consider integrating a dedicated SERP API. Use the &ldquo;Check All Rankings&rdquo; button to update positions.
                                    </p>
                                </div>
                            )}

                            {/* Empty state */}
                            {keywords.length === 0 && (
                                <Card className="shadow-sm border-zinc-200">
                                    <CardContent className="text-center py-12">
                                        <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold mb-2">No Keywords Tracked</h3>
                                        <p className="text-sm text-muted-foreground mb-1">
                                            Add target keywords to track your search engine positions.
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Use the form above to start tracking a keyword.
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    {/* ============================================================ */}
                    {/*  LOCAL RANKINGS TAB (GEO-GRID)                                 */}
                    {/* ============================================================ */}
                    {activeTab === "local" && (
                        <div className="space-y-6">
                            <Card className="shadow-sm border-zinc-200">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-orange-500" />
                                        Local Rank Grid
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Business Address */}
                                    <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/30">
                                        <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-2 flex items-center gap-1.5">
                                            <MapPin className="h-3.5 w-3.5" /> Business Address (grid center)
                                        </p>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={businessAddress}
                                                onChange={(e) => setBusinessAddress(e.target.value)}
                                                placeholder="e.g. 123 Main St, Portland, OR 97201"
                                                className="flex-1 border border-orange-200 dark:border-orange-800/40 rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-orange-500 outline-none"
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={!businessAddress.trim() || geocoding}
                                                className="text-xs border-orange-300"
                                                onClick={async () => {
                                                    setGeocoding(true)
                                                    try {
                                                        const res = await fetch(
                                                            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(businessAddress)}&limit=1`,
                                                            { headers: { "User-Agent": "AuditorPro/1.0" } }
                                                        )
                                                        const data = await res.json()
                                                        if (data[0]) {
                                                            const loc: BusinessLocation = {
                                                                lat: parseFloat(data[0].lat),
                                                                lng: parseFloat(data[0].lon),
                                                                label: businessAddress,
                                                            }
                                                            setBusinessLocation(loc)
                                                            localStorage.setItem("auditor:businessLocation", JSON.stringify(loc))
                                                        }
                                                    } catch { /* silent */ }
                                                    finally { setGeocoding(false) }
                                                }}
                                            >
                                                {geocoding ? <Loader2 className="h-3 w-3 animate-spin" /> : "Set Location"}
                                            </Button>
                                        </div>
                                        {businessLocation && (
                                            <p className="text-[11px] text-orange-600/70 dark:text-orange-400/60 mt-1.5">
                                                📍 {businessLocation.label} ({businessLocation.lat.toFixed(4)}, {businessLocation.lng.toFixed(4)})
                                            </p>
                                        )}
                                    </div>

                                    {/* Keyword + Grid Config */}
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <input
                                            type="text"
                                            value={localRankKeyword}
                                            onChange={(e) => setLocalRankKeyword(e.target.value)}
                                            placeholder="Enter keyword to check locally..."
                                            className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-orange-500 outline-none"
                                        />
                                        <select
                                            value={gridSize}
                                            onChange={(e) => setGridSize(Number(e.target.value))}
                                            className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-orange-500 outline-none w-full sm:w-auto"
                                        >
                                            <option value={3}>3×3 Grid</option>
                                            <option value={5}>5×5 Grid</option>
                                            <option value={7}>7×7 Grid</option>
                                        </select>
                                        <select
                                            value={radiusMiles}
                                            onChange={(e) => setRadiusMiles(Number(e.target.value))}
                                            className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-orange-500 outline-none w-full sm:w-auto"
                                        >
                                            <option value={1}>1 mile</option>
                                            <option value={3}>3 miles</option>
                                            <option value={5}>5 miles</option>
                                            <option value={10}>10 miles</option>
                                            <option value={15}>15 miles</option>
                                            <option value={25}>25 miles</option>
                                        </select>
                                    </div>

                                    <Button
                                        disabled={!localRankKeyword.trim() || !businessLocation || localRankLoading}
                                        className="w-full gap-2 bg-orange-500 hover:bg-orange-600 text-white"
                                        onClick={async () => {
                                            if (!localRankKeyword.trim() || !selectedSite || !businessLocation) return
                                            setLocalRankLoading(true)
                                            setGridError("")
                                            try {
                                                // Check for BYOK key from Settings
                                                const serpConfig = localStorage.getItem("auditor:serpApiKey")
                                                const byok = serpConfig ? JSON.parse(serpConfig) : null
                                                const settings = getSettings()

                                                const res = await fetch("/api/local-rank", {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({
                                                        keyword: localRankKeyword,
                                                        url: selectedSite.url,
                                                        mode: "grid",
                                                        centerLat: businessLocation.lat,
                                                        centerLng: businessLocation.lng,
                                                        gridSize,
                                                        radiusMiles,
                                                        userTier: settings.tier,
                                                        ...(byok?.key ? {
                                                            userApiKey: byok.key,
                                                            userApiProvider: byok.provider,
                                                        } : {}),
                                                    }),
                                                })
                                                const data = await res.json()

                                                if (res.status === 429) {
                                                    setGridError(data.message || "Monthly grid check limit reached.")
                                                    setGridUsage({ used: data.used || 0, remaining: 0, limit: data.limit || 0 })
                                                    return
                                                }

                                                if (data.gridResults) {
                                                    setGridResults(data.gridResults)
                                                    setGridProvider(data.provider || "simulated")
                                                    if (data.usage && data.usage.limit > 0) {
                                                        setGridUsage(data.usage)
                                                    }
                                                }
                                            } catch {
                                                setGridError("Grid check failed. Please try again.")
                                            } finally {
                                                setLocalRankLoading(false)
                                            }
                                        }}
                                    >
                                        {localRankLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                                        {localRankLoading ? `Checking ${gridSize * gridSize} grid points...` : `Run ${gridSize}×${gridSize} Grid Check`}
                                    </Button>

                                    {/* Usage counter */}
                                    {gridUsage && gridUsage.limit > 0 && (
                                        <p className="text-xs text-muted-foreground text-center">
                                            {gridUsage.remaining} of {gridUsage.limit} grid checks remaining this month
                                        </p>
                                    )}

                                    {/* Rate limit error */}
                                    {gridError && (
                                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30">
                                            <p className="text-xs text-red-600 dark:text-red-400">{gridError}</p>
                                        </div>
                                    )}

                                    {!businessLocation && (
                                        <p className="text-xs text-muted-foreground text-center">
                                            Set your business address above to enable the grid check.
                                        </p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Rank Grid */}
                            {gridResults.length > 0 && businessLocation && (
                                <Card className="shadow-sm border-zinc-200">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base">Local Rank Grid</CardTitle>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${gridProvider === "simulated"
                                                ? "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                                                : "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                                                }`}>
                                                {gridProvider === "simulated" ? "⚠ Simulated" : `✓ Live · ${gridProvider}`}
                                            </span>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <RankGrid
                                            gridData={gridResults}
                                            gridSize={gridSize}
                                            radiusMiles={radiusMiles}
                                            keyword={localRankKeyword}
                                            businessLocation={businessLocation}
                                        />
                                    </CardContent>
                                </Card>
                            )}

                            {/* Loading State */}
                            {localRankLoading && (
                                <Card className="shadow-sm border-zinc-200">
                                    <CardContent className="py-12 text-center">
                                        <Loader2 className="h-10 w-10 mx-auto text-orange-500 animate-spin mb-4" />
                                        <p className="text-sm font-medium">Checking {gridSize * gridSize} locations...</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {gridSize}×{gridSize} grid · {radiusMiles}mi radius around your business
                                        </p>
                                    </CardContent>
                                </Card>
                            )}

                            {gridResults.length === 0 && !localRankLoading && (
                                <Card className="shadow-sm border-zinc-200">
                                    <CardContent className="text-center py-12">
                                        <MapPin className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold mb-2">No Grid Data Yet</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Set your business address, enter a keyword, and run a grid check to see<br />
                                            how you rank across different locations around your business.
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
