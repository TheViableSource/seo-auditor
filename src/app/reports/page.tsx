"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import {
    FileText,
    Download,
    Mail,
    Globe,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle,
    ArrowLeft,
    Loader2,
    Sparkles,
    BarChart3,
    Shield,
    Eye,
    Copy,
    Printer,
    ChevronDown,
    Zap,
    X,
    CheckCheck,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    getSites,
    getAuditsForSite,
    getSettings,
    getLatestAuditForSite,
    type StoredSite,
    type StoredAudit,
    type StoredSettings,
} from "@/lib/local-storage"
import { generatePdfReport } from "@/lib/pdf-report"
import { useToast } from "@/components/ui/toast-provider"

// ============================================================
// SCORE RING (inline for report)
// ============================================================
function ScoreRing({ score, size = 100, strokeWidth = 8 }: { score: number; size?: number; strokeWidth?: number }) {
    const s = Number.isFinite(score) ? score : 0
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (s / 100) * circumference
    const color = s >= 80 ? "stroke-green-500" : s >= 60 ? "stroke-orange-500" : "stroke-red-500"
    const textColor = s >= 80 ? "text-green-600" : s >= 60 ? "text-orange-600" : "text-red-600"

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg className="-rotate-90" width={size} height={size}>
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-muted" />
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} strokeLinecap="round"
                    className={`${color} transition-all duration-1000`}
                    strokeDasharray={circumference} strokeDashoffset={offset} />
            </svg>
            <span className={`absolute text-2xl font-bold ${textColor}`}>{s}</span>
        </div>
    )
}

function scoreGrade(score: number): string {
    if (score >= 90) return "Excellent"
    if (score >= 80) return "Good"
    if (score >= 70) return "Needs Work"
    if (score >= 60) return "Poor"
    return "Critical"
}

function scoreColorClass(score: number): string {
    if (score >= 80) return "text-green-600 dark:text-green-400"
    if (score >= 60) return "text-orange-600 dark:text-orange-400"
    return "text-red-600 dark:text-red-400"
}

function scoreBgClass(score: number): string {
    if (score >= 80) return "bg-green-100 dark:bg-green-900/30"
    if (score >= 60) return "bg-orange-100 dark:bg-orange-900/30"
    return "bg-red-100 dark:bg-red-900/30"
}

// ============================================================
// PAGE
// ============================================================
export default function ReportsPage() {
    const toast = useToast()
    const [sites, setSites] = useState<StoredSite[]>([])
    const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)
    const [audit, setAudit] = useState<StoredAudit | null>(null)
    const [previousAudit, setPreviousAudit] = useState<StoredAudit | null>(null)
    const [settings, setSettings] = useState<StoredSettings | null>(null)
    const [mounted, setMounted] = useState(false)
    const [generatingPdf, setGeneratingPdf] = useState(false)
    const [emailModal, setEmailModal] = useState(false)
    const [emailTo, setEmailTo] = useState("")
    const [emailSending, setEmailSending] = useState(false)
    const [emailSent, setEmailSent] = useState(false)
    const reportRef = useRef<HTMLDivElement>(null)

    const load = useCallback(() => {
        const allSites = getSites()
        setSites(allSites)
        setSettings(getSettings())
        if (allSites.length > 0 && !selectedSiteId) {
            setSelectedSiteId(allSites[0].id)
        }
    }, [selectedSiteId])

    useEffect(() => {
        load()
        setMounted(true)
    }, [load])

    useEffect(() => {
        if (!selectedSiteId) return
        const audits = getAuditsForSite(selectedSiteId)
        if (audits.length > 0) {
            setAudit(audits[0])
            setPreviousAudit(audits.length > 1 ? audits[1] : null)
        } else {
            setAudit(null)
            setPreviousAudit(null)
        }
    }, [selectedSiteId])

    const handleDownloadPdf = async () => {
        if (!audit || !settings) return
        setGeneratingPdf(true)
        try {
            const filename = `${audit.domain.replace(/[^a-z0-9]/gi, "-")}-report-${new Date().toISOString().split("T")[0]}`
            await generatePdfReport(audit, settings, filename)
            toast.success("PDF report downloaded!")
        } catch {
            toast.error("Failed to generate PDF report")
        } finally {
            setGeneratingPdf(false)
        }
    }

    const handleEmailReport = async () => {
        if (!emailTo || !audit) return
        setEmailSending(true)
        try {
            const res = await fetch("/api/email-report", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: emailTo,
                    subject: `SEO Audit Report — ${audit.domain} (Score: ${audit.score}/100)`,
                    html: `<h2>SEO Audit Report for ${audit.domain}</h2><p>Overall Score: <strong>${audit.score}/100</strong></p><p>Audited on ${new Date(audit.createdAt).toLocaleDateString()}</p><p>Full details in the attached PDF.</p>`,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to send")
            setEmailSent(true)
            toast.success(`Report sent to ${emailTo}!`)
            setTimeout(() => { setEmailModal(false); setEmailSent(false); setEmailTo("") }, 2000)
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to send email")
        } finally {
            setEmailSending(false)
        }
    }

    const handlePrint = () => {
        window.print()
        toast.info("Print dialog opened")
    }

    if (!mounted) return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
            <div className="h-10 w-64 bg-muted rounded-lg animate-pulse" />
            <div className="h-64 bg-muted rounded-xl animate-pulse" />
            <div className="grid md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}
            </div>
        </div>
    )

    // No sites yet
    if (sites.length === 0) {
        return (
            <div className="p-8 max-w-4xl mx-auto text-center space-y-6">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto opacity-50" />
                <div>
                    <h1 className="text-2xl font-bold mb-2">No Reports Available</h1>
                    <p className="text-muted-foreground">Add a site and run your first audit to generate a client report.</p>
                </div>
                <Link href="/">
                    <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
                        <Zap className="w-4 h-4" /> Run Quick Audit
                    </Button>
                </Link>
            </div>
        )
    }

    const scoreDelta = audit && previousAudit ? audit.score - previousAudit.score : null
    const topIssues = audit?.failedChecks?.filter(c => c.status === "fail").slice(0, 5) || []
    const topWins = audit?.failedChecks?.filter(c => c.status === "pass").slice(0, 3) || []
    const categories = audit?.categorySummary || []

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <FileText className="w-7 h-7 text-orange-500" />
                        Client Reports
                    </h1>
                    <p className="text-muted-foreground mt-1">Generate branded, client-ready audit summaries</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Site selector */}
                    <div className="relative">
                        <select
                            value={selectedSiteId || ""}
                            onChange={(e) => setSelectedSiteId(e.target.value)}
                            className="appearance-none px-4 py-2 pr-8 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                        >
                            {sites.map(site => (
                                <option key={site.id} value={site.id}>{site.name || site.domain}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                </div>
            </div>

            {!audit ? (
                <div className="text-center py-16 space-y-4">
                    <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
                    <p className="text-muted-foreground">No audits found for this site. Run an audit first.</p>
                    <Link href={`/?url=${encodeURIComponent(sites.find(s => s.id === selectedSiteId)?.url || "")}`}>
                        <Button className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
                            <Zap className="w-4 h-4" /> Run Audit
                        </Button>
                    </Link>
                </div>
            ) : (
                <div ref={reportRef} className="space-y-8 print:space-y-4">

                    {/* ── Action Bar ── */}
                    <div className="flex flex-wrap items-center gap-3 print:hidden">
                        <Button onClick={handleDownloadPdf} disabled={generatingPdf} variant="outline" className="gap-2">
                            {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            {generatingPdf ? "Generating…" : "Download PDF"}
                        </Button>
                        <Button onClick={() => setEmailModal(true)} variant="outline" className="gap-2">
                            <Mail className="w-4 h-4" /> Email to Client
                        </Button>
                        <Button onClick={handlePrint} variant="outline" className="gap-2">
                            <Printer className="w-4 h-4" /> Print
                        </Button>
                    </div>

                    {/* ── Executive Summary Card ── */}
                    <Card className="shadow-md border-zinc-200 dark:border-zinc-700 overflow-hidden">
                        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-5 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold">
                                        {settings?.brandName || "SEO Audit Report"}
                                    </h2>
                                    <p className="text-orange-100 text-sm mt-0.5">
                                        {audit.domain} · {new Date(audit.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                                    </p>
                                </div>
                                {settings?.brandLogo && (
                                    <img src={settings.brandLogo} alt="Logo" className="h-10 w-auto rounded" />
                                )}
                            </div>
                        </div>
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row items-center gap-8">
                                {/* Score */}
                                <div className="flex flex-col items-center gap-2">
                                    <ScoreRing score={audit.score} size={140} strokeWidth={10} />
                                    <span className={`text-lg font-bold ${scoreColorClass(audit.score)}`}>
                                        {scoreGrade(audit.score)}
                                    </span>
                                    {scoreDelta !== null && scoreDelta !== 0 && (
                                        <span className={`text-sm flex items-center gap-1 ${scoreDelta > 0 ? "text-green-600" : "text-red-600"}`}>
                                            {scoreDelta > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                            {scoreDelta > 0 ? "+" : ""}{scoreDelta} from last audit
                                        </span>
                                    )}
                                </div>
                                {/* Key Stats */}
                                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                                    <div className="text-center p-4 bg-muted/40 rounded-xl">
                                        <p className="text-2xl font-bold text-foreground">{audit.score}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Overall Score</p>
                                    </div>
                                    <div className="text-center p-4 bg-muted/40 rounded-xl">
                                        <p className="text-2xl font-bold text-foreground">{categories.length}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Categories</p>
                                    </div>
                                    <div className="text-center p-4 bg-muted/40 rounded-xl">
                                        <p className="text-2xl font-bold text-green-600">
                                            {categories.reduce((sum, c) => sum + c.passed, 0)}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">Checks Passed</p>
                                    </div>
                                    <div className="text-center p-4 bg-muted/40 rounded-xl">
                                        <p className="text-2xl font-bold text-red-600">{audit.issuesCount}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Issues Found</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ── Category Breakdown ── */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-orange-500" /> Category Breakdown
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {categories.map(cat => {
                                const pct = cat.total > 0 ? Math.round((cat.passed / cat.total) * 100) : 0
                                return (
                                    <Card key={cat.name} className="shadow-sm">
                                        <CardContent className="p-5">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-sm font-medium text-foreground">{cat.label}</span>
                                                <span className={`text-xl font-bold ${scoreColorClass(cat.score)}`}>{cat.score}</span>
                                            </div>
                                            <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${cat.score >= 80 ? "bg-green-500" : cat.score >= 60 ? "bg-orange-500" : "bg-red-500"}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>{cat.passed}/{cat.total} passed</span>
                                                <span>{pct}%</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    </div>

                    {/* ── Top Issues ── */}
                    {topIssues.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-500" /> Priority Issues
                            </h3>
                            <div className="space-y-3">
                                {topIssues.map((issue, i) => (
                                    <div key={i} className="flex items-start gap-4 p-4 bg-red-50/50 dark:bg-red-950/10 border border-red-200 dark:border-red-800 rounded-xl">
                                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 text-sm font-bold shrink-0">{i + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground">{issue.title}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{issue.categoryLabel}</p>
                                            {issue.recommendation && (
                                                <p className="text-xs text-red-600 dark:text-red-400 mt-1.5 bg-red-100/50 dark:bg-red-950/20 rounded-md px-2 py-1">
                                                    💡 {issue.recommendation}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Quick Wins ── */}
                    {audit.fullCategories && audit.fullCategories.length > 0 && (() => {
                        const wins = audit.fullCategories
                            .flatMap(c => c.checks.filter(ch => ch.status === "pass"))
                            .slice(0, 5)
                        if (wins.length === 0) return null
                        return (
                            <div>
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-500" /> What&apos;s Working Well
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {wins.map((win, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 bg-green-50/50 dark:bg-green-950/10 border border-green-200 dark:border-green-800 rounded-lg">
                                            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                                            <span className="text-sm text-foreground">{win.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })()}

                    {/* ── Recommendations Summary ── */}
                    {audit.fullCategories && audit.fullCategories.length > 0 && (() => {
                        const recs = audit.fullCategories
                            .flatMap(c => c.checks.filter(ch => (ch.status === "fail" || ch.status === "warning") && ch.recommendation))
                            .slice(0, 8)
                        if (recs.length === 0) return null
                        return (
                            <div>
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-violet-500" /> Recommended Actions
                                </h3>
                                <div className="space-y-2">
                                    {recs.map((rec, i) => (
                                        <div key={i} className="flex items-start gap-3 p-3 bg-violet-50/50 dark:bg-violet-950/10 border border-violet-200 dark:border-violet-800 rounded-lg">
                                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 text-xs font-bold shrink-0">{i + 1}</span>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-foreground">{rec.title}</p>
                                                {rec.recommendation && <p className="text-xs text-muted-foreground mt-0.5">{rec.recommendation}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })()}

                    {/* ── Footer ── */}
                    <div className="border-t pt-6 text-center text-xs text-muted-foreground print:mt-6">
                        <p>Generated by {settings?.brandName || settings?.workspaceName || "SEO Auditor"} · {new Date().toLocaleDateString()}</p>
                        <p className="mt-1">Powered by AuditorPro™</p>
                    </div>
                </div>
            )}

            {/* Email Modal */}
            {emailModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEmailModal(false)} />
                    <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6">
                        <button onClick={() => setEmailModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                            <X className="w-5 h-5" />
                        </button>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                            <Mail className="w-5 h-5 text-orange-500" /> Email Report to Client
                        </h3>
                        {emailSent ? (
                            <div className="flex flex-col items-center gap-3 py-6 text-green-600">
                                <CheckCheck className="w-10 h-10" />
                                <p className="font-medium">Report sent successfully!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-foreground">Client Email</label>
                                    <input
                                        type="email"
                                        value={emailTo}
                                        onChange={(e) => setEmailTo(e.target.value)}
                                        placeholder="client@example.com"
                                        className="mt-1 w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                                <button
                                    onClick={handleEmailReport}
                                    disabled={!emailTo || emailSending}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                    {emailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                    {emailSending ? "Sending…" : "Send Report"}
                                </button>
                                <p className="text-xs text-muted-foreground text-center">
                                    Requires SMTP configuration. See docs/EMAIL_SETUP.md
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
