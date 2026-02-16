"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
    ArrowLeft,
    Globe,
    CalendarDays,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle,
    Zap,
    BarChart3,
    ExternalLink,
    Trash2,
    RefreshCw,
    GitCompareArrows,
    Plus,
    Search,
    Target,
} from "lucide-react"
import {
    getSiteById,
    getAuditsForSite,
    getLatestAuditForSite,
    getScoreTrendForSite,
    removeSite,
    getCompetitorsForSite,
    addCompetitor,
    removeCompetitor,
    getKeywordsForSite,
    addKeyword,
    removeKeyword,
} from "@/lib/local-storage"
import type { StoredSite, StoredAudit, StoredCompetitor, StoredKeyword } from "@/lib/local-storage"

/* ------------------------------------------------------------------ */
/*  Score ring component                                                */
/* ------------------------------------------------------------------ */
function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
    const radius = (size - 12) / 2
    const circumference = 2 * Math.PI * radius
    const progress = (score / 100) * circumference
    const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444"

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" className="text-muted/20" strokeWidth="8" />
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="8"
                    strokeDasharray={circumference} strokeDashoffset={circumference - progress}
                    strokeLinecap="round" className="transition-all duration-700" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold" style={{ color }}>{score}</span>
                <span className="text-[10px] text-muted-foreground">/ 100</span>
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ */
/*  Mini chart for score trend                                          */
/* ------------------------------------------------------------------ */
function MiniTrendChart({ data }: { data: { date: string; score: number; id: string }[] }) {
    if (data.length < 2) return <p className="text-sm text-muted-foreground">Need 2+ audits to show trends</p>

    const maxScore = Math.max(...data.map(d => d.score))
    const minScore = Math.min(...data.map(d => d.score))
    const range = Math.max(maxScore - minScore, 10)
    const w = 100
    const h = 50

    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * w
        const y = h - ((d.score - minScore) / range) * h
        return `${x},${y}`
    }).join(" ")

    return (
        <div className="w-full">
            <svg viewBox={`-4 -4 ${w + 8} ${h + 8}`} className="w-full h-24">
                <polyline fill="none" stroke="url(#trendGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
                {data.map((d, i) => {
                    const x = (i / (data.length - 1)) * w
                    const y = h - ((d.score - minScore) / range) * h
                    const color = d.score >= 80 ? "#22c55e" : d.score >= 60 ? "#f59e0b" : "#ef4444"
                    return <circle key={i} cx={x} cy={y} r="3" fill={color} />
                })}
                <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#f97316" />
                        <stop offset="100%" stopColor="#22c55e" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                {data.map((d, i) => <span key={i}>{d.date}</span>)}
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
export default function SiteDetailPage() {
    const params = useParams()
    const router = useRouter()
    const siteId = params.id as string

    const [site, setSite] = useState<StoredSite | null>(null)
    const [audits, setAudits] = useState<StoredAudit[]>([])
    const [latest, setLatest] = useState<StoredAudit | null>(null)
    const [trend, setTrend] = useState<{ date: string; score: number; id: string }[]>([])
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [compareSelected, setCompareSelected] = useState<string[]>([])
    const [mounted, setMounted] = useState(false)

    const load = useCallback(() => {
        const s = getSiteById(siteId)
        if (!s) return
        setSite(s)
        const a = getAuditsForSite(siteId).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        setAudits(a)
        setLatest(getLatestAuditForSite(siteId) || null)
        setTrend(getScoreTrendForSite(siteId))
    }, [siteId])

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

    const handleDelete = () => {
        removeSite(siteId)
        window.dispatchEvent(new Event("auditor:update"))
        router.push("/sites")
    }

    if (!mounted) return null
    if (!site) {
        return (
            <div className="p-8 max-w-4xl mx-auto text-center">
                <h1 className="text-2xl font-bold mb-2">Site not found</h1>
                <p className="text-muted-foreground mb-6">This site may have been removed.</p>
                <Link href="/sites" className="text-orange-500 hover:underline flex items-center gap-2 justify-center">
                    <ArrowLeft className="w-4 h-4" /> Back to Sites
                </Link>
            </div>
        )
    }

    const scoreChange = audits.length >= 2 ? audits[0].score - audits[1].score : 0
    const totalIssues = latest?.issuesCount || 0

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                    <Link href="/sites" className="p-2 hover:bg-muted rounded-lg transition-colors" aria-label="Back to sites">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <Globe className="w-5 h-5 text-orange-500" />
                            <h1 className="text-2xl md:text-3xl font-bold">{site.name}</h1>
                        </div>
                        <p className="text-muted-foreground text-sm mt-0.5 flex items-center gap-2">
                            {site.domain}
                            <a href={site.url} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-400">
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        href={`/?url=${encodeURIComponent(site.url)}`}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" /> Re-Audit
                    </Link>
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        aria-label="Delete site"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Delete confirmation */}
            {showDeleteConfirm && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center justify-between">
                    <p className="text-sm text-red-400">
                        Delete <strong>{site.domain}</strong> and all {audits.length} audit records?
                    </p>
                    <div className="flex gap-2">
                        <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1.5 text-sm rounded-md hover:bg-muted transition-colors">Cancel</button>
                        <button onClick={handleDelete} className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">Delete</button>
                    </div>
                </div>
            )}

            {/* Stats row */}
            {latest ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Score */}
                    <div className="bg-card rounded-xl border p-6 flex items-center gap-6">
                        <ScoreRing score={latest.score} size={96} />
                        <div>
                            <p className="text-sm text-muted-foreground">Latest Score</p>
                            {scoreChange !== 0 && (
                                <div className={`flex items-center gap-1 mt-1 text-sm ${scoreChange > 0 ? "text-green-500" : "text-red-500"}`}>
                                    {scoreChange > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                    {scoreChange > 0 ? "+" : ""}{scoreChange} pts
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Total audits */}
                    <div className="bg-card rounded-xl border p-6">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <BarChart3 className="w-4 h-4 text-blue-500" />
                            <span className="text-xs font-medium uppercase tracking-wider">Audits</span>
                        </div>
                        <p className="text-3xl font-bold">{audits.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">Total audits run</p>
                    </div>

                    {/* Issues */}
                    <div className="bg-card rounded-xl border p-6">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                            <span className="text-xs font-medium uppercase tracking-wider">Issues</span>
                        </div>
                        <p className="text-3xl font-bold">{totalIssues}</p>
                        <p className="text-xs text-muted-foreground mt-1">In latest audit</p>
                    </div>

                    {/* Last audited */}
                    <div className="bg-card rounded-xl border p-6">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <CalendarDays className="w-4 h-4 text-green-500" />
                            <span className="text-xs font-medium uppercase tracking-wider">Last Audited</span>
                        </div>
                        <p className="text-lg font-semibold">
                            {new Date(latest.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {new Date(latest.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="bg-card rounded-xl border p-8 text-center">
                    <Zap className="w-10 h-10 text-orange-500 mx-auto mb-3" />
                    <h3 className="font-semibold text-lg mb-1">No audits yet</h3>
                    <p className="text-muted-foreground text-sm mb-4">Run your first audit to see performance data.</p>
                    <Link
                        href={`/?url=${encodeURIComponent(site.url)}`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <Zap className="w-4 h-4" /> Audit Now
                    </Link>
                </div>
            )}

            {/* Score Trend & Category Breakdown */}
            {latest && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Score trend */}
                    <div className="bg-card rounded-xl border p-6">
                        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-orange-500" /> Score Trend
                        </h2>
                        <MiniTrendChart data={trend} />
                    </div>

                    {/* Category breakdown */}
                    <div className="bg-card rounded-xl border p-6">
                        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-blue-500" /> Category Breakdown
                        </h2>
                        <div className="space-y-3">
                            {latest.categorySummary.map((cat) => {
                                const pct = cat.total > 0 ? Math.round((cat.passed / cat.total) * 100) : 0
                                const color = pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-yellow-500" : "bg-red-500"
                                return (
                                    <div key={cat.name}>
                                        <div className="flex items-center justify-between text-sm mb-1">
                                            <span className="font-medium">{cat.label}</span>
                                            <span className="text-muted-foreground text-xs">{cat.passed}/{cat.total} passed</span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Failed checks / Quick Wins for this site */}
            {latest && latest.failedChecks && latest.failedChecks.length > 0 && (
                <div className="bg-card rounded-xl border p-6">
                    <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" /> Issues to Fix
                        <span className="ml-auto text-xs text-muted-foreground font-normal">{latest.failedChecks.length} issues</span>
                    </h2>
                    <div className="space-y-3">
                        {latest.failedChecks.slice(0, 10).map((check, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${check.status === "fail" ? "bg-red-500" : "bg-yellow-500"}`} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-sm">{check.title}</p>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{check.categoryLabel}</span>
                                    </div>
                                    {check.recommendation && (
                                        <p className="text-xs text-muted-foreground mt-1">{check.recommendation}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                        {latest.failedChecks.length > 10 && (
                            <p className="text-xs text-muted-foreground text-center pt-2">
                                + {latest.failedChecks.length - 10} more issues
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Audit History Table */}
            {audits.length > 0 && (
                <div className="bg-card rounded-xl border p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-lg">Audit History</h2>
                        {compareSelected.length === 2 && (
                            <button
                                onClick={() => router.push(`/compare?a=${compareSelected[0]}&b=${compareSelected[1]}`)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors"
                            >
                                <GitCompareArrows className="w-3.5 h-3.5" />
                                Compare Selected
                            </button>
                        )}
                        {compareSelected.length === 1 && (
                            <span className="text-xs text-muted-foreground">Select one more audit to compare</span>
                        )}
                    </div>
                    <div className="overflow-x-auto -mx-6 px-6">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-muted-foreground text-xs uppercase tracking-wider border-b">
                                    <th className="py-3 w-8"></th>
                                    <th className="text-left py-3 font-medium">Date</th>
                                    <th className="text-left py-3 font-medium">URL</th>
                                    <th className="text-right py-3 font-medium">Score</th>
                                    <th className="text-right py-3 font-medium">Issues</th>
                                    <th className="text-right py-3 font-medium">Change</th>
                                </tr>
                            </thead>
                            <tbody>
                                {audits.map((audit, i) => {
                                    const prev = audits[i + 1]
                                    const rawChange = prev ? Number(audit.score) - Number(prev.score) : null
                                    const change = rawChange !== null && !isNaN(rawChange) ? rawChange : null
                                    const s = Number(audit.score)
                                    const scoreColor = s >= 80 ? "text-green-500" : s >= 60 ? "text-yellow-500" : "text-red-500"
                                    const isSelected = compareSelected.includes(audit.id)
                                    const hasFullData = audit.fullCategories && audit.fullCategories.length > 0
                                    return (
                                        <tr key={audit.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer ${isSelected ? "bg-orange-50 dark:bg-orange-950/20" : ""}`} onClick={() => router.push(`/audits/${audit.id}`)}>
                                            <td className="py-3 pr-2" onClick={(e) => e.stopPropagation()}>
                                                {hasFullData && (
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => {
                                                            setCompareSelected((prev) => {
                                                                if (prev.includes(audit.id)) return prev.filter((id) => id !== audit.id)
                                                                if (prev.length >= 2) return [prev[1], audit.id]
                                                                return [...prev, audit.id]
                                                            })
                                                        }}
                                                        className="w-4 h-4 rounded border-border accent-orange-500 cursor-pointer"
                                                    />
                                                )}
                                            </td>
                                            <td className="py-3 pr-4">
                                                <div className="text-sm font-medium">
                                                    {new Date(audit.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {new Date(audit.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                                </div>
                                            </td>
                                            <td className="py-3 pr-4 text-muted-foreground truncate max-w-[200px]">{audit.url}</td>
                                            <td className={`py-3 pr-4 text-right font-bold ${scoreColor}`}>{isNaN(s) ? "—" : s}</td>
                                            <td className="py-3 pr-4 text-right text-muted-foreground">{audit.issuesCount}</td>
                                            <td className="py-3 text-right">
                                                {change !== null ? (
                                                    <span className={`flex items-center gap-1 justify-end text-sm ${change > 0 ? "text-green-500" : change < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                                                        {change > 0 ? <TrendingUp className="w-3 h-3" /> : change < 0 ? <TrendingDown className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                                                        {change > 0 ? "+" : ""}{change}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/*  COMPETITORS & KEYWORDS QUICK ADD                             */}
            {/* ============================================================ */}
            <CompetitorKeywordSection siteId={siteId} />
        </div>
    )
}

/* ------------------------------------------------------------------ */
/*  Compact Competitor & Keyword Management                             */
/* ------------------------------------------------------------------ */
function CompetitorKeywordSection({ siteId }: { siteId: string }) {
    const [competitors, setCompetitors] = useState<StoredCompetitor[]>([])
    const [keywords, setKeywords] = useState<StoredKeyword[]>([])
    const [compUrl, setCompUrl] = useState("")
    const [kwText, setKwText] = useState("")

    const load = useCallback(() => {
        setCompetitors(getCompetitorsForSite(siteId))
        setKeywords(getKeywordsForSite(siteId))
    }, [siteId])

    useEffect(() => { load() }, [load])

    const handleAddComp = () => {
        if (!compUrl.trim()) return
        addCompetitor(siteId, compUrl.trim())
        setCompUrl("")
        load()
        window.dispatchEvent(new Event("auditor:update"))
    }

    const handleAddKw = () => {
        if (!kwText.trim()) return
        addKeyword(siteId, kwText.trim())
        setKwText("")
        load()
        window.dispatchEvent(new Event("auditor:update"))
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Competitors */}
            <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Target className="w-4 h-4 text-orange-500" /> Competitors ({competitors.length})
                    </h3>
                    <Link href="/rankings" className="text-xs text-orange-500 hover:underline">View all →</Link>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); handleAddComp() }} className="flex gap-1.5 mb-3">
                    <input
                        value={compUrl}
                        onChange={(e) => setCompUrl(e.target.value)}
                        placeholder="competitor.com"
                        className="flex-1 border border-border rounded-md px-2.5 py-1.5 text-xs bg-background placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-orange-500/30"
                    />
                    <button type="submit" disabled={!compUrl.trim()} className="px-2 py-1.5 rounded-md bg-orange-500 text-white text-xs font-medium disabled:opacity-40 hover:bg-orange-600 transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </form>
                {competitors.length > 0 ? (
                    <ul className="space-y-1.5">
                        {competitors.slice(0, 5).map((c) => (
                            <li key={c.id} className="flex items-center justify-between text-xs py-1">
                                <span className="truncate">{c.domain}</span>
                                <div className="flex items-center gap-2">
                                    {c.latestScore != null && (
                                        <span className={`font-bold ${c.latestScore >= 80 ? "text-green-600" : c.latestScore >= 60 ? "text-orange-600" : "text-red-600"}`}>
                                            {c.latestScore}
                                        </span>
                                    )}
                                    <button onClick={() => { removeCompetitor(c.id); load(); window.dispatchEvent(new Event("auditor:update")); }} className="text-muted-foreground hover:text-red-500">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">No competitors added yet</p>
                )}
            </div>

            {/* Keywords */}
            <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Search className="w-4 h-4 text-blue-500" /> Keywords ({keywords.length})
                    </h3>
                    <Link href="/rankings" className="text-xs text-orange-500 hover:underline">View all →</Link>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); handleAddKw() }} className="flex gap-1.5 mb-3">
                    <input
                        value={kwText}
                        onChange={(e) => setKwText(e.target.value)}
                        placeholder="target keyword"
                        className="flex-1 border border-border rounded-md px-2.5 py-1.5 text-xs bg-background placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-orange-500/30"
                    />
                    <button type="submit" disabled={!kwText.trim()} className="px-2 py-1.5 rounded-md bg-blue-500 text-white text-xs font-medium disabled:opacity-40 hover:bg-blue-600 transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </form>
                {keywords.length > 0 ? (
                    <ul className="space-y-1.5">
                        {keywords.slice(0, 5).map((kw) => (
                            <li key={kw.id} className="flex items-center justify-between text-xs py-1">
                                <span className="truncate">{kw.keyword}</span>
                                <div className="flex items-center gap-2">
                                    {kw.currentRank != null && (
                                        <span className={`font-bold ${kw.currentRank <= 10 ? "text-green-600" : kw.currentRank <= 30 ? "text-orange-600" : "text-red-600"}`}>
                                            #{kw.currentRank}
                                        </span>
                                    )}
                                    <button onClick={() => { removeKeyword(kw.id); load(); window.dispatchEvent(new Event("auditor:update")); }} className="text-muted-foreground hover:text-red-500">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-xs text-muted-foreground text-center py-2">No keywords tracked yet</p>
                )}
            </div>
        </div>
    )
}
