"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useActiveSite } from "@/context/ActiveSiteContext"
import {
    ArrowLeft,
    ArrowRight,
    TrendingUp,
    TrendingDown,
    Minus,
    CheckCircle,
    XCircle,
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    GitCompareArrows,
    Zap,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    getSites,
    getAuditById,
    getComparableAudits,
    type StoredSite,
    type StoredAudit,
    type StoredFullCategory,
    type StoredFullCheck,
} from "@/lib/local-storage"

/* ------------------------------------------------------------------ */
/*  Score ring component                                                */
/* ------------------------------------------------------------------ */
function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
    const s = typeof score === "number" && !isNaN(score) ? score : 0
    const radius = (size - 8) / 2
    const circumference = 2 * Math.PI * radius
    const progress = (s / 100) * circumference
    const color = s >= 80 ? "#22c55e" : s >= 60 ? "#f59e0b" : "#ef4444"

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth="6" className="stroke-muted" />
                <circle
                    cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth="6"
                    strokeLinecap="round" stroke={color}
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - progress}
                    className="transition-all duration-1000"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold" style={{ color }}>{s}</span>
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ */
/*  Delta badge                                                         */
/* ------------------------------------------------------------------ */
function DeltaBadge({ before, after, suffix = "" }: { before: number; after: number; suffix?: string }) {
    const b = typeof before === "number" && !isNaN(before) ? before : 0
    const a = typeof after === "number" && !isNaN(after) ? after : 0
    const diff = a - b
    if (diff === 0) return <span className="text-xs text-muted-foreground font-medium">No change</span>
    const positive = diff > 0
    return (
        <span className={`inline-flex items-center gap-0.5 text-sm font-bold ${positive ? "text-green-600" : "text-red-600"}`}>
            {positive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {positive ? "+" : ""}{diff}{suffix}
        </span>
    )
}

/* ------------------------------------------------------------------ */
/*  Check status icon                                                   */
/* ------------------------------------------------------------------ */
function StatusIcon({ status }: { status: string }) {
    switch (status) {
        case "pass": return <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
        case "fail": return <XCircle className="w-4 h-4 text-red-500 shrink-0" />
        case "warning": return <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
        default: return <Minus className="w-4 h-4 text-muted-foreground shrink-0" />
    }
}

/* ------------------------------------------------------------------ */
/*  Audit Picker (when no query params)                                 */
/* ------------------------------------------------------------------ */
function AuditPicker({ onCompare }: { onCompare: (a: string, b: string) => void }) {
    const [sites, setSites] = useState<StoredSite[]>([])
    const { activeSiteId } = useActiveSite()
    const [selectedSite, setSelectedSite] = useState<string | null>(null)
    const [comparableAudits, setComparableAudits] = useState<StoredAudit[]>([])
    const [selectedA, setSelectedA] = useState<string | null>(null)
    const [selectedB, setSelectedB] = useState<string | null>(null)

    useEffect(() => {
        const allSites = getSites()
        setSites(allSites)
        // Pre-select from global active site
        if (activeSiteId && allSites.some(s => s.id === activeSiteId)) {
            setSelectedSite(activeSiteId)
        }
    }, [activeSiteId])

    useEffect(() => {
        if (selectedSite) {
            setComparableAudits(getComparableAudits(selectedSite))
            setSelectedA(null)
            setSelectedB(null)
        }
    }, [selectedSite])

    return (
        <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8">
            <div className="flex items-center gap-3">
                <Link href="/dashboard">
                    <Button variant="ghost" size="sm" className="gap-1">
                        <ArrowLeft className="h-4 w-4" /> Back
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold tracking-tight">Compare Audits</h1>
            </div>

            {/* Step 1: Pick Site */}
            <Card className="shadow-sm border-zinc-200">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold text-muted-foreground">Step 1 — Select a Site</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {sites.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No sites tracked yet. Run some audits first.</p>
                    ) : (
                        sites.map((site) => (
                            <button
                                key={site.id}
                                onClick={() => setSelectedSite(site.id)}
                                className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center gap-3 ${selectedSite === site.id
                                    ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30"
                                    : "border-border hover:bg-muted/50"
                                    }`}
                            >
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                                    {site.domain.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-medium text-sm">{site.name}</p>
                                    <p className="text-xs text-muted-foreground">{site.domain}</p>
                                </div>
                            </button>
                        ))
                    )}
                </CardContent>
            </Card>

            {/* Step 2: Pick Two Audits */}
            {selectedSite && (
                <Card className="shadow-sm border-zinc-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-muted-foreground">Step 2 — Select Two Audits to Compare</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {comparableAudits.length < 2 ? (
                            <div className="text-center py-6">
                                <p className="text-sm text-muted-foreground">
                                    Need at least 2 audits with full data for this site.
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Run more audits to enable comparison.
                                </p>
                                <Link href="/" className="inline-block mt-3">
                                    <Button size="sm" className="gap-2 bg-orange-500 hover:bg-orange-600 text-white">
                                        <Zap className="h-3.5 w-3.5" /> Run Audit
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                                            Before (Older)
                                        </label>
                                        {comparableAudits.map((audit) => (
                                            <button
                                                key={audit.id}
                                                onClick={() => setSelectedA(audit.id)}
                                                disabled={selectedB === audit.id}
                                                className={`w-full text-left p-2.5 rounded-lg border mb-1.5 transition-colors ${selectedA === audit.id
                                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                                                    : selectedB === audit.id
                                                        ? "border-border opacity-40 cursor-not-allowed"
                                                        : "border-border hover:bg-muted/50"
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium">
                                                        {new Date(audit.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                    </span>
                                                    <span className={`text-sm font-bold ${audit.score >= 80 ? "text-green-600" : audit.score >= 60 ? "text-orange-600" : "text-red-600"}`}>
                                                        {audit.score}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(audit.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · {audit.issuesCount} issues
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                                            After (Newer)
                                        </label>
                                        {comparableAudits.map((audit) => (
                                            <button
                                                key={audit.id}
                                                onClick={() => setSelectedB(audit.id)}
                                                disabled={selectedA === audit.id}
                                                className={`w-full text-left p-2.5 rounded-lg border mb-1.5 transition-colors ${selectedB === audit.id
                                                    ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30"
                                                    : selectedA === audit.id
                                                        ? "border-border opacity-40 cursor-not-allowed"
                                                        : "border-border hover:bg-muted/50"
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium">
                                                        {new Date(audit.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                    </span>
                                                    <span className={`text-sm font-bold ${audit.score >= 80 ? "text-green-600" : audit.score >= 60 ? "text-orange-600" : "text-red-600"}`}>
                                                        {audit.score}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(audit.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · {audit.issuesCount} issues
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {selectedA && selectedB && (
                                    <Button
                                        className="w-full gap-2 bg-orange-500 hover:bg-orange-600 text-white"
                                        onClick={() => onCompare(selectedA, selectedB)}
                                    >
                                        <GitCompareArrows className="h-4 w-4" />
                                        Compare Audits
                                    </Button>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

/* ------------------------------------------------------------------ */
/*  Category diff row                                                   */
/* ------------------------------------------------------------------ */
interface CategoryDiff {
    name: string
    label: string
    before: StoredFullCategory
    after: StoredFullCategory
    checks: CheckDiff[]
}

interface CheckDiff {
    id: string
    title: string
    description: string
    beforeStatus: string | null
    afterStatus: string | null
    change: "fixed" | "regressed" | "changed" | "unchanged" | "new" | "removed"
    recommendation?: string
    codeSnippet?: string
    beforeSeverity?: string
    afterSeverity?: string
}

function computeDiffs(before: StoredAudit, after: StoredAudit): CategoryDiff[] {
    const beforeCats = before.fullCategories ?? []
    const afterCats = after.fullCategories ?? []

    // Build lookup by category name
    const beforeMap = new Map(beforeCats.map((c) => [c.name, c]))
    const afterMap = new Map(afterCats.map((c) => [c.name, c]))
    const allNames = [...new Set([...beforeMap.keys(), ...afterMap.keys()])]

    return allNames.map((name) => {
        const bCat = beforeMap.get(name)
        const aCat = afterMap.get(name)
        const label = (aCat ?? bCat)!.label
        const bChecks = bCat?.checks ?? []
        const aChecks = aCat?.checks ?? []

        // Build check map by id
        const bCheckMap = new Map(bChecks.map((c) => [c.id, c]))
        const aCheckMap = new Map(aChecks.map((c) => [c.id, c]))
        const allCheckIds = [...new Set([...bCheckMap.keys(), ...aCheckMap.keys()])]

        const checks: CheckDiff[] = allCheckIds.map((id) => {
            const bc = bCheckMap.get(id)
            const ac = aCheckMap.get(id)
            const check = ac ?? bc!

            let change: CheckDiff["change"] = "unchanged"
            if (!bc) change = "new"
            else if (!ac) change = "removed"
            else if (bc.status !== ac.status) {
                if (bc.status === "fail" && ac.status === "pass") change = "fixed"
                else if (bc.status === "pass" && ac.status === "fail") change = "regressed"
                else change = "changed"
            }

            return {
                id,
                title: check.title,
                description: check.description,
                beforeStatus: bc?.status ?? null,
                afterStatus: ac?.status ?? null,
                change,
                recommendation: ac?.recommendation ?? bc?.recommendation,
                codeSnippet: ac?.codeSnippet ?? bc?.codeSnippet,
                beforeSeverity: bc?.severity,
                afterSeverity: ac?.severity,
            }
        })

        // Sort: fixed first, then regressed, then changed, then new, then unchanged
        const order: Record<string, number> = { fixed: 0, regressed: 1, changed: 2, new: 3, removed: 4, unchanged: 5 }
        checks.sort((a, b) => (order[a.change] ?? 5) - (order[b.change] ?? 5))

        return {
            name,
            label,
            before: bCat ?? { name, label, score: 0, checks: [], passCount: 0, failCount: 0, warningCount: 0 },
            after: aCat ?? { name, label, score: 0, checks: [], passCount: 0, failCount: 0, warningCount: 0 },
            checks,
        }
    })
}

/* ------------------------------------------------------------------ */
/*  Category Comparison Card                                            */
/* ------------------------------------------------------------------ */
function CategoryCard({ diff }: { diff: CategoryDiff }) {
    const [expanded, setExpanded] = useState(false)
    const fixedCount = diff.checks.filter((c) => c.change === "fixed").length
    const regressedCount = diff.checks.filter((c) => c.change === "regressed").length
    const changedCount = diff.checks.filter((c) => c.change === "changed" || c.change === "new").length
    const hasChanges = fixedCount > 0 || regressedCount > 0 || changedCount > 0

    const scoreDelta = diff.after.score - diff.before.score
    const scoreColor = scoreDelta > 0 ? "text-green-600" : scoreDelta < 0 ? "text-red-600" : "text-muted-foreground"

    return (
        <Card className="shadow-sm border-zinc-200 overflow-hidden">
            <button className="w-full text-left" onClick={() => setExpanded(!expanded)}>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                            <h3 className="font-semibold text-sm">{diff.label}</h3>
                        </div>
                        <div className="flex items-center gap-3">
                            {fixedCount > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                                    {fixedCount} fixed
                                </span>
                            )}
                            {regressedCount > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                                    {regressedCount} regressed
                                </span>
                            )}
                            {changedCount > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                                    {changedCount} changed
                                </span>
                            )}
                            {!hasChanges && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                                    No changes
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Score bars */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Before</span>
                                <span className="font-bold">{Math.round(diff.before.score)}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${diff.before.score}%`,
                                        backgroundColor: diff.before.score >= 80 ? "#22c55e" : diff.before.score >= 60 ? "#f59e0b" : "#ef4444",
                                    }}
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                {diff.before.passCount}/{diff.before.passCount + diff.before.failCount + diff.before.warningCount} passed
                            </p>
                        </div>
                        <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground">After</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold">{Math.round(diff.after.score)}%</span>
                                    {scoreDelta !== 0 && (
                                        <span className={`text-[10px] font-bold ${scoreColor}`}>
                                            {scoreDelta > 0 ? "+" : ""}{Math.round(scoreDelta)}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${diff.after.score}%`,
                                        backgroundColor: diff.after.score >= 80 ? "#22c55e" : diff.after.score >= 60 ? "#f59e0b" : "#ef4444",
                                    }}
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                {diff.after.passCount}/{diff.after.passCount + diff.after.failCount + diff.after.warningCount} passed
                            </p>
                        </div>
                    </div>
                </CardContent>
            </button>

            {/* Expanded check list */}
            {expanded && (
                <div className="border-t border-border">
                    {diff.checks.map((check) => (
                        <div
                            key={check.id}
                            className={`px-4 py-2.5 border-b last:border-0 flex items-start gap-3 ${check.change === "fixed" ? "bg-green-50/50 dark:bg-green-950/20" :
                                check.change === "regressed" ? "bg-red-50/50 dark:bg-red-950/20" :
                                    check.change === "changed" ? "bg-yellow-50/50 dark:bg-yellow-950/20" : ""
                                }`}
                        >
                            {/* Before → After status */}
                            <div className="flex items-center gap-1 shrink-0 mt-0.5">
                                <StatusIcon status={check.beforeStatus ?? "info"} />
                                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                <StatusIcon status={check.afterStatus ?? "info"} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-medium">{check.title}</p>
                                    {check.change === "fixed" && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">Fixed ✓</span>
                                    )}
                                    {check.change === "regressed" && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">Regressed ✗</span>
                                    )}
                                    {check.change === "changed" && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-semibold">Changed</span>
                                    )}
                                    {check.change === "new" && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">New</span>
                                    )}
                                </div>
                                {check.recommendation && check.change !== "unchanged" && (
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{check.recommendation}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    )
}

/* ------------------------------------------------------------------ */
/*  Main Comparison View                                                */
/* ------------------------------------------------------------------ */
function ComparisonView({ auditA, auditB }: { auditA: StoredAudit; auditB: StoredAudit }) {
    const router = useRouter()

    // Ensure A is the older audit
    const [before, after] = useMemo(() => {
        const a = new Date(auditA.createdAt).getTime()
        const b = new Date(auditB.createdAt).getTime()
        return a <= b ? [auditA, auditB] : [auditB, auditA]
    }, [auditA, auditB])

    const diffs = useMemo(() => computeDiffs(before, after), [before, after])

    const totalFixed = diffs.reduce((sum, d) => sum + d.checks.filter((c) => c.change === "fixed").length, 0)
    const totalRegressed = diffs.reduce((sum, d) => sum + d.checks.filter((c) => c.change === "regressed").length, 0)

    // Compute overall score: use stored score, or derive from category averages
    const deriveScore = (audit: StoredAudit): number => {
        if (typeof audit.score === "number" && !isNaN(audit.score) && audit.score > 0) return audit.score
        const cats = audit.fullCategories ?? []
        if (cats.length === 0) return 0
        const avg = cats.reduce((sum, c) => sum + (typeof c.score === "number" && !isNaN(c.score) ? c.score : 0), 0) / cats.length
        return Math.round(avg)
    }
    const beforeScore = deriveScore(before)
    const afterScore = deriveScore(after)
    const scoreDelta = afterScore - beforeScore

    const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    const formatTime = (d: string) => new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <GitCompareArrows className="h-6 w-6 text-orange-500" />
                        Audit Comparison
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{before.domain}</p>
                </div>
            </div>

            {/* Overall Score Comparison */}
            <Card className="shadow-sm border-zinc-200">
                <CardContent className="p-6">
                    <div className="flex items-center justify-center gap-8 sm:gap-16">
                        {/* Before */}
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-semibold">Before</p>
                            <ScoreRing score={beforeScore} />
                            <p className="text-sm font-medium mt-2">{formatDate(before.createdAt)}</p>
                            <p className="text-xs text-muted-foreground">{formatTime(before.createdAt)}</p>
                        </div>

                        {/* Arrow + Delta */}
                        <div className="flex flex-col items-center gap-2">
                            <ArrowRight className="h-8 w-8 text-muted-foreground/30" />
                            <div className={`text-2xl font-bold ${scoreDelta > 0 ? "text-green-600" : scoreDelta < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                                {scoreDelta > 0 ? "+" : ""}{scoreDelta}
                            </div>
                            <p className="text-xs text-muted-foreground">points</p>
                        </div>

                        {/* After */}
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-semibold">After</p>
                            <ScoreRing score={afterScore} />
                            <p className="text-sm font-medium mt-2">{formatDate(after.createdAt)}</p>
                            <p className="text-xs text-muted-foreground">{formatTime(after.createdAt)}</p>
                        </div>
                    </div>

                    {/* Summary stats */}
                    <div className="flex justify-center gap-8 mt-6 pt-4 border-t border-border">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">{totalFixed}</p>
                            <p className="text-xs text-muted-foreground">Fixed</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-red-600">{totalRegressed}</p>
                            <p className="text-xs text-muted-foreground">Regressed</p>
                        </div>
                        <div className="text-center">
                            <DeltaBadge before={before.issuesCount} after={after.issuesCount} />
                            <p className="text-xs text-muted-foreground mt-0.5">Issues</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Category Diffs */}
            <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    Category Breakdown
                    <span className="text-xs text-muted-foreground font-normal">({diffs.length} categories)</span>
                </h2>
                <div className="space-y-3">
                    {diffs.map((diff) => (
                        <CategoryCard key={diff.name} diff={diff} />
                    ))}
                </div>
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                      */
/* ------------------------------------------------------------------ */
export default function ComparePage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [mounted, setMounted] = useState(false)

    const auditIdA = searchParams.get("a")
    const auditIdB = searchParams.get("b")

    const [auditA, setAuditA] = useState<StoredAudit | null>(null)
    const [auditB, setAuditB] = useState<StoredAudit | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        setMounted(true)
        if (auditIdA && auditIdB) {
            const a = getAuditById(auditIdA)
            const b = getAuditById(auditIdB)
            if (!a || !b) {
                setError("One or both audits not found.")
            } else if (!a.fullCategories || !b.fullCategories) {
                setError("One or both audits don't have detailed data for comparison. Run new audits to enable comparison.")
            } else {
                setAuditA(a)
                setAuditB(b)
            }
        }
    }, [auditIdA, auditIdB])

    if (!mounted) return null

    // Error state
    if (error) {
        return (
            <div className="p-6 md:p-8 max-w-3xl mx-auto text-center py-20">
                <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Cannot Compare</h2>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button variant="outline" onClick={() => router.push("/compare")}>
                    Try Again
                </Button>
            </div>
        )
    }

    // Picker mode (no params)
    if (!auditIdA || !auditIdB) {
        return (
            <AuditPicker
                onCompare={(a, b) => router.push(`/compare?a=${a}&b=${b}`)}
            />
        )
    }

    // Loading
    if (!auditA || !auditB) {
        return (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
        )
    }

    // Comparison view
    return <ComparisonView auditA={auditA} auditB={auditB} />
}
