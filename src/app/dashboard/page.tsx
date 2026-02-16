"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    Globe,
    FileSearch,
    TrendingUp,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight,
    ArrowRight,
    Plus,
    Zap,
    Clock,
    Inbox,
} from "lucide-react"
import Link from "next/link"
import {
    getSites,
    getRecentAudits,
    getDashboardStats,
    getScoreTrend,
    getLatestAuditForSite,
    type StoredSite,
    type StoredAudit,
} from "@/lib/local-storage"

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

function EmptyDashboard() {
    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
            <div className="text-center py-20">
                <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white mb-6 shadow-lg">
                    <Inbox className="h-10 w-10" />
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-3">Welcome to AuditorPro</h1>
                <p className="text-muted-foreground max-w-md mx-auto mb-8">
                    Run your first SEO audit to start tracking sites and building your dashboard.
                </p>
                <div className="flex gap-3 justify-center">
                    <Link href="/">
                        <Button className="gap-2 bg-orange-500 hover:bg-orange-600 text-white shadow-md">
                            <Zap className="h-4 w-4" />
                            Run Your First Audit
                        </Button>
                    </Link>
                    <Link href="/sites">
                        <Button variant="outline" className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add a Site
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default function DashboardPage() {
    const [sites, setSites] = useState<StoredSite[]>([])
    const [audits, setAudits] = useState<StoredAudit[]>([])
    const [stats, setStats] = useState({ totalSites: 0, totalAudits: 0, avgScore: 0, totalIssues: 0, scoreChange: 0 })
    const [trend, setTrend] = useState<{ date: string; score: number }[]>([])
    const [mounted, setMounted] = useState(false)

    const load = useCallback(() => {
        setSites(getSites())
        setAudits(getRecentAudits(10))
        setStats(getDashboardStats())
        setTrend(getScoreTrend(7))
    }, [])

    useEffect(() => {
        load()
        setMounted(true)
        // Listen for audit saves from other pages
        const handler = () => load()
        window.addEventListener("storage", handler)
        window.addEventListener("auditor:update", handler)
        return () => {
            window.removeEventListener("storage", handler)
            window.removeEventListener("auditor:update", handler)
        }
    }, [load])

    if (!mounted) return null

    // Show onboarding if no data
    if (stats.totalSites === 0 && stats.totalAudits === 0) {
        return <EmptyDashboard />
    }

    // Build sites with latest scores
    const sitesWithScores = sites.map((site) => {
        const latest = getLatestAuditForSite(site.id)
        return { ...site, lastScore: latest?.score ?? null, lastDate: latest?.createdAt ?? null }
    })

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Welcome back 👋
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {stats.totalAudits > 0
                            ? `You've run ${stats.totalAudits} audit${stats.totalAudits !== 1 ? "s" : ""} across ${stats.totalSites} site${stats.totalSites !== 1 ? "s" : ""}.`
                            : "Here's your workspace overview."}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link href="/sites">
                        <Button variant="outline" className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add Site
                        </Button>
                    </Link>
                    <Link href="/">
                        <Button className="gap-2 bg-orange-500 hover:bg-orange-600 text-white">
                            <Zap className="h-4 w-4" />
                            Quick Audit
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="shadow-sm hover:shadow-md transition-shadow border-zinc-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <Globe className="h-5 w-5 text-blue-600" />
                            </div>
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Sites</span>
                        </div>
                        <div className="mt-3">
                            <div className="text-3xl font-bold text-foreground">{stats.totalSites}</div>
                            <p className="text-sm text-muted-foreground mt-1">Tracked websites</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm hover:shadow-md transition-shadow border-zinc-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="p-2 bg-purple-50 rounded-lg">
                                <FileSearch className="h-5 w-5 text-purple-600" />
                            </div>
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Audits</span>
                        </div>
                        <div className="mt-3">
                            <div className="text-3xl font-bold text-foreground">{stats.totalAudits}</div>
                            <p className="text-sm text-muted-foreground mt-1">Total audits run</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm hover:shadow-md transition-shadow border-zinc-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="p-2 bg-green-50 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-green-600" />
                            </div>
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Avg Score</span>
                        </div>
                        <div className="mt-3">
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-foreground">{stats.avgScore || "—"}</span>
                                {stats.scoreChange !== 0 && (
                                    <span className={`text-sm font-medium flex items-center gap-0.5 ${stats.scoreChange > 0 ? "text-green-600" : "text-red-600"}`}>
                                        {stats.scoreChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                        {stats.scoreChange > 0 ? "+" : ""}{stats.scoreChange}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">Across all sites</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm hover:shadow-md transition-shadow border-zinc-200">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="p-2 bg-orange-50 rounded-lg">
                                <AlertTriangle className="h-5 w-5 text-orange-600" />
                            </div>
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Issues</span>
                        </div>
                        <div className="mt-3">
                            <div className="text-3xl font-bold text-foreground">{stats.totalIssues}</div>
                            <p className="text-sm text-muted-foreground mt-1">Total issues found</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Score Trend + Sites Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Score Trend */}
                <Card className="lg:col-span-2 shadow-sm border-zinc-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg font-semibold">Score Trend</CardTitle>
                        <span className="text-xs text-muted-foreground">Last {trend.length} audit{trend.length !== 1 ? "s" : ""}</span>
                    </CardHeader>
                    <CardContent>
                        {trend.length > 0 ? (
                            <div className="flex items-end justify-between gap-2 h-40 pt-4">
                                {trend.map((point, i) => (
                                    <div key={`${point.date}-${i}`} className="flex flex-col items-center gap-2 flex-1">
                                        <span className="text-xs font-medium text-foreground">{point.score}</span>
                                        <div className="w-full max-w-[40px] bg-muted rounded-t-md overflow-hidden relative" style={{ height: "100%" }}>
                                            <div
                                                className={`absolute bottom-0 w-full rounded-t-md transition-all duration-700 ${point.score >= 80 ? "bg-green-500" : point.score >= 60 ? "bg-orange-500" : "bg-red-500"}`}
                                                style={{ height: `${point.score}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{point.date}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                                <p>Run audits to see your score trend</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Sites Overview */}
                <Card className="shadow-sm border-zinc-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg font-semibold">Your Sites</CardTitle>
                        <Link href="/sites" className="text-xs text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1">
                            View all <ArrowRight className="h-3 w-3" />
                        </Link>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {sitesWithScores.length > 0 ? (
                            sitesWithScores.slice(0, 5).map((site) => (
                                <div key={site.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                                            {site.domain.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium text-sm text-foreground truncate">{site.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {site.lastDate
                                                    ? `Last: ${new Date(site.lastDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                                                    : "No audits yet"}
                                            </p>
                                        </div>
                                    </div>
                                    {site.lastScore ? (
                                        <ScoreBadge score={site.lastScore} />
                                    ) : (
                                        <span className="text-xs text-muted-foreground italic">Pending</span>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-6 text-muted-foreground text-sm">
                                <Globe className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                <p>No sites tracked yet</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Audits Table */}
            {audits.length > 0 && (
                <Card className="shadow-sm border-zinc-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg font-semibold">Recent Audits</CardTitle>
                        <Link href="/audits">
                            <Button variant="ghost" size="sm" className="text-orange-500 hover:text-orange-600 gap-1">
                                View all <ArrowRight className="h-3 w-3" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Site</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">URL</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Issues</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                                        <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {audits.map((audit) => (
                                        <tr key={audit.id} className="hover:bg-muted/30 transition-colors">
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
                                            <td className="py-3 px-4 text-sm text-muted-foreground whitespace-nowrap">
                                                {new Date(audit.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <Link href={`/?url=${encodeURIComponent(audit.url)}`}>
                                                    <Button size="sm" variant="ghost" className="text-orange-500 hover:text-orange-600 gap-1 text-xs">
                                                        <Clock className="h-3 w-3" />
                                                        Re-audit
                                                    </Button>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Score Legend */}
            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    Good (80-100)
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    Needs Work (60-79)
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    Poor (0-59)
                </div>
            </div>
        </div>
    )
}
