"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
    ArrowLeft,
    CheckCircle2,
    Circle,
    AlertTriangle,
    AlertOctagon,
    ArrowUpCircle,
    ArrowDownCircle,
    Filter,
    Search,
    BarChart3,
    MapPin,
    Globe,
    Loader2,
    ListChecks,
    Zap,
    X,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useActiveSite } from "@/context/ActiveSiteContext"
import type { ActionTask, TaskPriority, TaskSource } from "@/lib/tasks-engine"

const PRIORITY_CONFIG: Record<
    TaskPriority,
    { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
    critical: {
        label: "Critical",
        color: "text-red-600",
        bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/40",
        icon: <AlertOctagon className="h-4 w-4 text-red-500" />,
    },
    high: {
        label: "High",
        color: "text-orange-600",
        bg: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800/40",
        icon: <ArrowUpCircle className="h-4 w-4 text-orange-500" />,
    },
    medium: {
        label: "Medium",
        color: "text-yellow-600",
        bg: "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800/40",
        icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
    },
    low: {
        label: "Low",
        color: "text-blue-600",
        bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/40",
        icon: <ArrowDownCircle className="h-4 w-4 text-blue-500" />,
    },
}

const SOURCE_ICONS: Record<TaskSource, React.ReactNode> = {
    audit: <Globe className="h-3.5 w-3.5" />,
    gsc: <Search className="h-3.5 w-3.5" />,
    ga: <BarChart3 className="h-3.5 w-3.5" />,
    gmb: <MapPin className="h-3.5 w-3.5" />,
    general: <Zap className="h-3.5 w-3.5" />,
}

const SOURCE_LABELS: Record<TaskSource, string> = {
    audit: "Audit",
    gsc: "Search Console",
    ga: "Analytics",
    gmb: "Business Profile",
    general: "General",
}

export default function TasksPage() {
    const { activeSiteId, activeSite, sites, ready } = useActiveSite()
    const [tasks, setTasks] = useState<ActionTask[]>([])
    const [loading, setLoading] = useState(false)
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
    const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())

    // Filters
    const [filterSource, setFilterSource] = useState<TaskSource | "all">("all")
    const [filterPriority, setFilterPriority] = useState<TaskPriority | "all">("all")

    // Load dismissed/completed from localStorage
    useEffect(() => {
        try {
            const d = localStorage.getItem("auditor:dismissedTasks")
            if (d) setDismissedIds(new Set(JSON.parse(d)))
            const c = localStorage.getItem("auditor:completedTasks")
            if (c) setCompletedIds(new Set(JSON.parse(c)))
        } catch { /* ignore */ }
    }, [])

    const fetchTasks = useCallback(async () => {
        if (!activeSiteId) return
        setLoading(true)
        try {
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ siteId: activeSiteId }),
            })
            const data = await res.json()
            if (data.tasks) setTasks(data.tasks)
        } catch { /* silent */ }
        finally { setLoading(false) }
    }, [activeSiteId])

    useEffect(() => {
        if (ready && activeSiteId) {
            fetchTasks()
        }
    }, [ready, activeSiteId, fetchTasks])

    const toggleComplete = (taskId: string) => {
        setCompletedIds((prev) => {
            const next = new Set(prev)
            if (next.has(taskId)) next.delete(taskId)
            else next.add(taskId)
            localStorage.setItem("auditor:completedTasks", JSON.stringify([...next]))
            return next
        })
    }

    const dismissTask = (taskId: string) => {
        setDismissedIds((prev) => {
            const next = new Set(prev)
            next.add(taskId)
            localStorage.setItem("auditor:dismissedTasks", JSON.stringify([...next]))
            return next
        })
    }

    // Filter tasks
    const visibleTasks = tasks.filter((t) => {
        if (dismissedIds.has(t.id)) return false
        if (filterSource !== "all" && t.source !== filterSource) return false
        if (filterPriority !== "all" && t.priority !== filterPriority) return false
        return true
    })

    // Stats
    const totalActive = tasks.filter((t) => !dismissedIds.has(t.id)).length
    const completedCount = tasks.filter(
        (t) => completedIds.has(t.id) && !dismissedIds.has(t.id)
    ).length
    const criticalCount = tasks.filter(
        (t) => t.priority === "critical" && !dismissedIds.has(t.id) && !completedIds.has(t.id)
    ).length
    const progressPct = totalActive > 0 ? Math.round((completedCount / totalActive) * 100) : 0

    if (!ready) return null

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="sm" className="gap-1">
                            <ArrowLeft className="h-4 w-4" /> Back
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <ListChecks className="h-6 w-6 text-orange-500" />
                            Action Items
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Prioritized tasks to improve your SEO
                            {activeSite && (
                                <span className="font-medium text-foreground"> · {activeSite.domain}</span>
                            )}
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={fetchTasks}
                    disabled={loading}
                >
                    {loading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Zap className="h-3.5 w-3.5" />
                    )}
                    Refresh
                </Button>
            </div>

            {/* No site selected */}
            {!activeSiteId && sites.length > 0 && (
                <Card className="shadow-sm border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                    <CardContent className="p-6 text-center">
                        <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                        <p className="font-medium">Select a site first</p>
                        <p className="text-sm text-muted-foreground">
                            Choose a site from the sidebar to view its action items.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* No sites at all */}
            {sites.length === 0 && (
                <Card className="shadow-sm">
                    <CardContent className="p-6 text-center">
                        <Globe className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="font-medium">No sites added</p>
                        <p className="text-sm text-muted-foreground mb-4">
                            Add a site first to get actionable SEO tasks.
                        </p>
                        <Link href="/sites">
                            <Button variant="outline" size="sm">
                                Add a Site
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            )}

            {/* Progress & Stats */}
            {activeSiteId && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="shadow-sm">
                            <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground font-medium">Total Tasks</p>
                                <p className="text-2xl font-bold">{totalActive}</p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm">
                            <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground font-medium">Completed</p>
                                <p className="text-2xl font-bold text-green-600">{completedCount}</p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm">
                            <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground font-medium">Critical</p>
                                <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm">
                            <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground font-medium">Progress</p>
                                <p className="text-2xl font-bold">{progressPct}%</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-orange-500 to-green-500 rounded-full transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground font-medium mr-1">Source:</span>
                        {(["all", "audit", "gsc", "ga", "gmb", "general"] as const).map((s) => (
                            <button
                                key={s}
                                onClick={() => setFilterSource(s)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${filterSource === s
                                        ? "bg-orange-500 text-white"
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                    }`}
                            >
                                {s === "all" ? "All" : SOURCE_LABELS[s]}
                            </button>
                        ))}
                        <span className="text-xs text-muted-foreground font-medium ml-3 mr-1">Priority:</span>
                        {(["all", "critical", "high", "medium", "low"] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setFilterPriority(p)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${filterPriority === p
                                        ? "bg-orange-500 text-white"
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                    }`}
                            >
                                {p === "all" ? "All" : PRIORITY_CONFIG[p].label}
                            </button>
                        ))}
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="flex items-center justify-center gap-2 py-12">
                            <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                            <span className="text-sm text-muted-foreground">Analyzing your data…</span>
                        </div>
                    )}

                    {/* Task List */}
                    {!loading && visibleTasks.length === 0 && tasks.length > 0 && (
                        <Card className="shadow-sm">
                            <CardContent className="p-6 text-center">
                                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                                <p className="font-medium">All clear!</p>
                                <p className="text-sm text-muted-foreground">
                                    No matching tasks with current filters.
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {!loading && tasks.length === 0 && (
                        <Card className="shadow-sm">
                            <CardContent className="p-8 text-center">
                                <ListChecks className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                                <p className="font-semibold text-lg mb-1">No tasks generated yet</p>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Run an audit and add some keywords to generate actionable tasks.
                                </p>
                                <div className="flex gap-3 justify-center">
                                    <Link href="/">
                                        <Button variant="outline" size="sm">Run Audit</Button>
                                    </Link>
                                    <Link href="/integrations">
                                        <Button variant="outline" size="sm">Connect Integrations</Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="space-y-3">
                        {visibleTasks.map((task) => {
                            const config = PRIORITY_CONFIG[task.priority]
                            const isCompleted = completedIds.has(task.id)

                            return (
                                <Card
                                    key={task.id}
                                    className={`shadow-sm border transition-all ${isCompleted
                                            ? "opacity-60 border-green-200 dark:border-green-800/30"
                                            : config.bg
                                        }`}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            {/* Checkbox */}
                                            <button
                                                onClick={() => toggleComplete(task.id)}
                                                className="mt-0.5 shrink-0"
                                            >
                                                {isCompleted ? (
                                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                ) : (
                                                    <Circle className="h-5 w-5 text-muted-foreground hover:text-orange-500 transition-colors" />
                                                )}
                                            </button>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    {config.icon}
                                                    <h3
                                                        className={`font-semibold text-sm ${isCompleted ? "line-through text-muted-foreground" : ""
                                                            }`}
                                                    >
                                                        {task.title}
                                                    </h3>
                                                </div>
                                                <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                                                    {task.description}
                                                </p>

                                                {/* Action */}
                                                <div className="p-2.5 rounded-lg bg-background/60 border border-border/50 mb-2">
                                                    <p className="text-xs font-medium text-foreground">
                                                        💡 {task.action}
                                                    </p>
                                                </div>

                                                {/* Impact */}
                                                <p className="text-[11px] text-muted-foreground italic">
                                                    📈 {task.impact}
                                                </p>

                                                {/* Tags */}
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${config.color} bg-background/80 border`}
                                                    >
                                                        {config.label}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-muted-foreground bg-muted">
                                                        {SOURCE_ICONS[task.source]}
                                                        {SOURCE_LABELS[task.source]}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Dismiss */}
                                            <button
                                                onClick={() => dismissTask(task.id)}
                                                className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
                                                title="Dismiss"
                                            >
                                                <X className="h-3.5 w-3.5 text-muted-foreground" />
                                            </button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </>
            )}
        </div>
    )
}
