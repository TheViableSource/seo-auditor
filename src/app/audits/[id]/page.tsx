"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
    ArrowLeft,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Info,
    ChevronDown,
    ChevronRight,
    Globe,
    CalendarDays,
    Zap,
    Code,
    ExternalLink,
    GitCompareArrows,
    FileDown,
    Loader2,
    Mail,
    X,
    CheckCheck,
} from "lucide-react"
import { getAuditById, getSiteById, getComparableAudits, getSettings } from "@/lib/local-storage"
import type { StoredAudit, StoredFullCategory, StoredFullCheck, StoredSettings } from "@/lib/local-storage"
import { generatePdfReport } from "@/lib/pdf-report"

/* ------------------------------------------------------------------ */
/*  Score ring                                                          */
/* ------------------------------------------------------------------ */
function ScoreRing({ score, size = 96 }: { score: number; size?: number }) {
    const s = Number.isFinite(score) ? score : 0
    const radius = (size - 10) / 2
    const circumference = 2 * Math.PI * radius
    const progress = (s / 100) * circumference
    const color = s >= 80 ? "#22c55e" : s >= 60 ? "#f59e0b" : "#ef4444"

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" className="text-muted/20" strokeWidth="7" />
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="7"
                    strokeDasharray={circumference} strokeDashoffset={circumference - progress}
                    strokeLinecap="round" className="transition-all duration-700" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold" style={{ color }}>{s}</span>
                <span className="text-[10px] text-muted-foreground">/ 100</span>
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ */
/*  Status icon                                                         */
/* ------------------------------------------------------------------ */
function StatusIcon({ status }: { status: string }) {
    switch (status) {
        case "pass": return <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
        case "fail": return <XCircle className="w-4 h-4 text-red-500 shrink-0" />
        case "warning": return <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
        default: return <Info className="w-4 h-4 text-blue-500 shrink-0" />
    }
}

/* ------------------------------------------------------------------ */
/*  Check row with expandable details                                   */
/* ------------------------------------------------------------------ */
function CheckRow({ check }: { check: StoredFullCheck }) {
    const [expanded, setExpanded] = useState(false)

    return (
        <div className="border-b last:border-0">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors text-left"
            >
                <StatusIcon status={check.status} />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{check.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{check.description}</p>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium
          ${check.severity === "critical" ? "bg-red-500/20 text-red-400" :
                        check.severity === "major" ? "bg-orange-500/20 text-orange-400" :
                            check.severity === "minor" ? "bg-yellow-500/20 text-yellow-400" :
                                "bg-blue-500/20 text-blue-400"}`}>
                    {check.severity}
                </span>
                {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
            </button>

            {expanded && (
                <div className="px-10 pb-4 space-y-2">
                    {check.details && (
                        <div className="text-sm text-muted-foreground">
                            <p className="font-medium text-foreground text-xs uppercase tracking-wider mb-1">Details</p>
                            <p>{check.details}</p>
                        </div>
                    )}
                    {check.value !== undefined && check.value !== null && (
                        <div className="flex gap-4 text-sm">
                            <span className="text-muted-foreground">Current: <strong className="text-foreground">{String(check.value)}</strong></span>
                            {check.expected !== undefined && check.expected !== null && (
                                <span className="text-muted-foreground">Expected: <strong className="text-green-500">{String(check.expected)}</strong></span>
                            )}
                        </div>
                    )}
                    {check.recommendation && (
                        <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg text-sm">
                            <p className="font-medium text-orange-400 text-xs uppercase tracking-wider mb-1">💡 Recommendation</p>
                            <p>{check.recommendation}</p>
                        </div>
                    )}
                    {check.codeSnippet && (
                        <div className="relative">
                            <p className="text-xs uppercase tracking-wider mb-1 text-muted-foreground flex items-center gap-1"><Code className="w-3 h-3" /> Code Snippet</p>
                            <pre className="bg-muted/50 rounded-lg p-3 text-xs overflow-x-auto">
                                <code>{check.codeSnippet}</code>
                            </pre>
                        </div>
                    )}
                    {check.learnMoreUrl && (
                        <a href={check.learnMoreUrl} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-400 text-xs flex items-center gap-1">
                            Learn more <ExternalLink className="w-3 h-3" />
                        </a>
                    )}
                </div>
            )}
        </div>
    )
}

/* ------------------------------------------------------------------ */
/*  Category section                                                    */
/* ------------------------------------------------------------------ */
function CategorySection({ category }: { category: StoredFullCategory }) {
    const [expanded, setExpanded] = useState(true)
    const pct = category.checks.length > 0 ? Math.round((category.passCount / category.checks.length) * 100) : 0
    const color = pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-yellow-500" : "bg-red-500"

    return (
        <div className="bg-card rounded-xl border overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center gap-4 p-5 hover:bg-muted/20 transition-colors text-left"
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{category.label}</h3>
                        <span className="text-xs text-muted-foreground">{category.passCount}/{category.checks.length} passed</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2 max-w-xs">
                        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                </div>
                <div className="text-right">
                    <span className={`text-2xl font-bold ${pct >= 80 ? "text-green-500" : pct >= 60 ? "text-yellow-500" : "text-red-500"}`}>
                        {category.score}
                    </span>
                </div>
                {expanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
            </button>

            {expanded && (
                <div className="border-t">
                    {category.checks.map((check, i) => (
                        <CheckRow key={i} check={check} />
                    ))}
                </div>
            )}
        </div>
    )
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
export default function AuditDetailPage() {
    const params = useParams()
    const router = useRouter()
    const auditId = params.id as string

    const [audit, setAudit] = useState<StoredAudit | null>(null)
    const [siteName, setSiteName] = useState("")
    const [otherAudits, setOtherAudits] = useState<StoredAudit[]>([])
    const [showCompareDropdown, setShowCompareDropdown] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [generatingPdf, setGeneratingPdf] = useState(false)
    const [settings, setSettings] = useState<StoredSettings | null>(null)
    const [emailModal, setEmailModal] = useState(false)
    const [emailTo, setEmailTo] = useState("")
    const [emailSending, setEmailSending] = useState(false)
    const [emailSent, setEmailSent] = useState(false)
    const [emailError, setEmailError] = useState("")


    useEffect(() => {
        const a = getAuditById(auditId)
        if (a) {
            setAudit(a)
            const site = getSiteById(a.siteId)
            setSiteName(site?.name || a.domain)
            const comparable = getComparableAudits(a.siteId).filter(c => c.id !== auditId)
            setOtherAudits(comparable)
        }
        setSettings(getSettings())
        setMounted(true)
    }, [auditId])

    const handleDownloadPdf = async () => {
        if (!audit || !settings) return
        setGeneratingPdf(true)
        try {
            const filename = `${audit.domain.replace(/[^a-z0-9]/gi, "-")}-audit-${new Date(audit.createdAt).toISOString().split("T")[0]}`
            await generatePdfReport(audit, settings, filename)
        } catch (err) {
            console.error("PDF generation failed:", err)
        } finally {
            setGeneratingPdf(false)
        }
    }

    const handleEmailReport = async () => {
        if (!emailTo || !audit) return
        setEmailSending(true)
        setEmailError("")
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
            setTimeout(() => { setEmailModal(false); setEmailSent(false); setEmailTo("") }, 2000)
        } catch (err) {
            setEmailError(err instanceof Error ? err.message : "Failed to send email")
        } finally {
            setEmailSending(false)
        }
    }

    if (!mounted) return null

    if (!audit) {
        return (
            <div className="p-8 max-w-4xl mx-auto text-center">
                <h1 className="text-2xl font-bold mb-2">Audit not found</h1>
                <p className="text-muted-foreground mb-6">This audit record may have been deleted.</p>
                <Link href="/audits" className="text-orange-500 hover:underline flex items-center gap-2 justify-center">
                    <ArrowLeft className="w-4 h-4" /> Back to Audit History
                </Link>
            </div>
        )
    }

    const hasFullData = audit.fullCategories && audit.fullCategories.length > 0

    return (
        <>
            <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="p-2 hover:bg-muted rounded-lg transition-colors" aria-label="Go back">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                                <Globe className="w-5 h-5 text-orange-500" /> {siteName}
                            </h1>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <CalendarDays className="w-3.5 h-3.5" />
                                    {new Date(audit.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                                    {" at "}
                                    {new Date(audit.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                </span>
                                <span className="truncate max-w-[200px]">{audit.url}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {otherAudits.length > 0 && audit.fullCategories && audit.fullCategories.length > 0 && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowCompareDropdown(!showCompareDropdown)}
                                    className="flex items-center gap-2 px-4 py-2 border border-border hover:bg-muted rounded-lg text-sm font-medium transition-colors"
                                >
                                    <GitCompareArrows className="w-4 h-4" />
                                    Compare with…
                                    <ChevronDown className="w-3 h-3" />
                                </button>
                                {showCompareDropdown && (
                                    <div className="absolute right-0 top-full mt-1 w-64 bg-card border border-border rounded-lg shadow-xl z-50 py-1">
                                        <p className="px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Other Audits</p>
                                        {otherAudits.map((other) => (
                                            <a
                                                key={other.id}
                                                href={`/compare?a=${auditId}&b=${other.id}`}
                                                className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors text-sm"
                                            >
                                                <span>
                                                    {new Date(other.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                    <span className="text-xs text-muted-foreground ml-1">
                                                        {new Date(other.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                                    </span>
                                                </span>
                                                <span className={`font-bold text-xs ${other.score >= 80 ? "text-green-500" : other.score >= 60 ? "text-yellow-500" : "text-red-500"}`}>
                                                    {other.score}
                                                </span>
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        <button
                            onClick={handleDownloadPdf}
                            disabled={generatingPdf}
                            className="flex items-center gap-2 px-4 py-2 border border-border hover:bg-muted rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-wait"
                        >
                            {generatingPdf ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <FileDown className="w-4 h-4" />
                            )}
                            {generatingPdf ? "Generating…" : "Download PDF"}
                        </button>
                        <button
                            onClick={() => setEmailModal(true)}
                            className="flex items-center gap-2 px-4 py-2 border border-border hover:bg-muted rounded-lg text-sm font-medium transition-colors"
                        >
                            <Mail className="w-4 h-4" /> Email Report
                        </button>
                        <Link
                            href={`/?url=${encodeURIComponent(audit.url)}`}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <Zap className="w-4 h-4" /> Re-Audit
                        </Link>
                    </div>
                </div>

                {/* Score overview */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-card rounded-xl border p-6 flex items-center gap-6">
                        <ScoreRing score={audit.score} />
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">Overall Score</p>
                            <p className="text-lg font-semibold mt-1">
                                {audit.score >= 80 ? "Good" : audit.score >= 60 ? "Needs Work" : "Poor"}
                            </p>
                        </div>
                    </div>
                    <div className="bg-card rounded-xl border p-6">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Issues Found</p>
                        <p className="text-3xl font-bold text-orange-500">{audit.issuesCount}</p>
                        <p className="text-xs text-muted-foreground mt-1">{audit.categorySummary.length} categories analyzed</p>
                    </div>
                    <div className="bg-card rounded-xl border p-6">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Category Summary</p>
                        <div className="space-y-1 mt-2">
                            {audit.categorySummary.slice(0, 4).map((cat) => (
                                <div key={cat.name} className="flex items-center justify-between text-xs">
                                    <span className="truncate">{cat.label}</span>
                                    <span className={`font-bold ${cat.score >= 80 ? "text-green-500" : cat.score >= 60 ? "text-yellow-500" : "text-red-500"}`}>{cat.score}</span>
                                </div>
                            ))}
                            {audit.categorySummary.length > 4 && (
                                <p className="text-[10px] text-muted-foreground">+{audit.categorySummary.length - 4} more</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Full audit results */}
                {hasFullData ? (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold">Full Audit Results</h2>
                        {audit.fullCategories!.map((cat, i) => (
                            <CategorySection key={i} category={cat} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-card rounded-xl border p-8 text-center">
                        <Info className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                        <h3 className="font-semibold text-lg mb-1">Detailed results not available</h3>
                        <p className="text-muted-foreground text-sm mb-4">
                            This audit was saved before full result storage was enabled. Re-run the audit to get detailed check data.
                        </p>
                        <Link
                            href={`/?url=${encodeURIComponent(audit.url)}`}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <Zap className="w-4 h-4" /> Re-Audit Now
                        </Link>
                    </div>
                )}

                {/* Failed checks summary (from failedChecks if no full data) */}
                {!hasFullData && audit.failedChecks && audit.failedChecks.length > 0 && (
                    <div className="bg-card rounded-xl border p-6">
                        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-500" /> Issues Found
                        </h2>
                        <div className="space-y-3">
                            {audit.failedChecks.map((check, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${check.status === "fail" ? "bg-red-500" : "bg-yellow-500"}`} />
                                    <div>
                                        <p className="text-sm font-medium">{check.title}</p>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{check.categoryLabel}</span>
                                        {check.recommendation && <p className="text-xs text-muted-foreground mt-1">{check.recommendation}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>

            {/* Email Report Modal */}
            {
                emailModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEmailModal(false)} />
                        <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6">
                            <button onClick={() => setEmailModal(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                                <X className="w-5 h-5" />
                            </button>
                            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                                <Mail className="w-5 h-5 text-orange-500" /> Email Report
                            </h3>
                            {emailSent ? (
                                <div className="flex flex-col items-center gap-3 py-6 text-green-600">
                                    <CheckCheck className="w-10 h-10" />
                                    <p className="font-medium">Report sent successfully!</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-foreground">Recipient Email</label>
                                        <input
                                            type="email"
                                            value={emailTo}
                                            onChange={(e) => setEmailTo(e.target.value)}
                                            placeholder="client@example.com"
                                            className="mt-1 w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                    {emailError && (
                                        <p className="text-sm text-red-500">{emailError}</p>
                                    )}
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
                )
            }
        </>
    )
}
