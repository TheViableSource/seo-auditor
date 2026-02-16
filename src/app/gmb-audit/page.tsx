"use client"

import { useState } from "react"
import Link from "next/link"
import {
    ArrowLeft,
    MapPin,
    Building2,
    Phone,
    Globe,
    Loader2,
    CheckCircle,
    XCircle,
    AlertTriangle,
    BarChart3,
    Star,
    Map,
    Code,
    FileText,
    Zap,
    ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface GmbCheck {
    id: string
    category: "nap" | "schema" | "content" | "technical" | "reviews"
    title: string
    description: string
    status: "pass" | "fail" | "warning"
    impact: "critical" | "major" | "minor"
    recommendation?: string
}

interface GmbResult {
    score: number
    totalChecks: number
    passed: number
    warnings: number
    failed: number
    checks: GmbCheck[]
    categoryScores: Record<string, number>
    url: string
}

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    nap: { label: "NAP Consistency", icon: <Building2 className="h-4 w-4" />, color: "text-blue-500" },
    schema: { label: "Schema Markup", icon: <Code className="h-4 w-4" />, color: "text-violet-500" },
    content: { label: "Local Content", icon: <FileText className="h-4 w-4" />, color: "text-teal-500" },
    technical: { label: "Technical", icon: <Zap className="h-4 w-4" />, color: "text-orange-500" },
    reviews: { label: "Reviews & Social", icon: <Star className="h-4 w-4" />, color: "text-amber-500" },
}

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
    const r = (size - 12) / 2
    const circ = 2 * Math.PI * r
    const offset = circ - (score / 100) * circ
    const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f97316" : "#ef4444"

    return (
        <svg width={size} height={size} className="block">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
            <circle
                cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={color} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: "stroke-dashoffset 0.8s ease" }}
            />
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
                fontSize={size * 0.3} fontWeight="800" fill={color}
            >
                {score}
            </text>
        </svg>
    )
}

export default function GmbAuditPage() {
    const [url, setUrl] = useState("")
    const [businessName, setBusinessName] = useState("")
    const [businessAddress, setBusinessAddress] = useState("")
    const [businessPhone, setBusinessPhone] = useState("")
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<GmbResult | null>(null)
    const [error, setError] = useState("")
    const [expandedCheck, setExpandedCheck] = useState<string | null>(null)

    const handleAudit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!url) return
        setLoading(true)
        setError("")
        setResult(null)

        try {
            const res = await fetch("/api/gmb-audit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url, businessName, businessAddress, businessPhone }),
            })
            const data = await res.json()
            if (data.error) {
                setError(data.error)
            } else {
                setResult(data)
            }
        } catch {
            setError("Network error. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Map className="h-7 w-7 text-orange-500" />
                        GMB &amp; Local SEO Audit
                    </h1>
                    <p className="text-muted-foreground">Analyze your website&apos;s local search optimization</p>
                </div>
            </div>

            {/* Audit Form */}
            <Card className="shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Enter Your Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAudit} className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-3">
                            <div className="sm:col-span-2 space-y-1.5">
                                <label className="text-sm font-medium flex items-center gap-1.5">
                                    <Globe className="h-3.5 w-3.5 text-muted-foreground" /> Website URL *
                                </label>
                                <input
                                    type="url" required
                                    value={url} onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://yourbusiness.com"
                                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium flex items-center gap-1.5">
                                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> Business Name
                                </label>
                                <input
                                    value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                                    placeholder="Acme Coffee Shop"
                                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium flex items-center gap-1.5">
                                    <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Phone Number
                                </label>
                                <input
                                    value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)}
                                    placeholder="(555) 123-4567"
                                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                            </div>
                            <div className="sm:col-span-2 space-y-1.5">
                                <label className="text-sm font-medium flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Business Address
                                </label>
                                <input
                                    value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)}
                                    placeholder="123 Main St, Portland, OR 97201"
                                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-600 text-sm flex items-center gap-2">
                                <XCircle className="h-4 w-4 shrink-0" /> {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={loading || !url}
                            className="w-full gap-2 bg-orange-500 hover:bg-orange-600 text-white"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Map className="h-4 w-4" />}
                            {loading ? "Auditing Local SEO..." : "Run GMB Audit"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Loading State */}
            {loading && (
                <Card className="shadow-sm">
                    <CardContent className="py-12 text-center">
                        <Loader2 className="h-10 w-10 mx-auto text-orange-500 animate-spin mb-4" />
                        <p className="text-sm text-muted-foreground">Analyzing local SEO signals...</p>
                    </CardContent>
                </Card>
            )}

            {/* Results */}
            {result && (
                <div className="space-y-6">
                    {/* Score Overview */}
                    <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-center">
                        <div className="flex justify-center">
                            <ScoreRing score={result.score} size={140} />
                        </div>
                        <div className="space-y-3">
                            <div>
                                <h3 className="text-xl font-bold">Local SEO Score: {result.score}/100</h3>
                                <p className="text-sm text-muted-foreground">
                                    {result.passed} passed · {result.warnings} warnings · {result.failed} failed out of {result.totalChecks} checks
                                </p>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="flex items-center gap-2 text-sm">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <span className="font-medium">{result.passed} Passed</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                                    <span className="font-medium">{result.warnings} Warnings</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <XCircle className="h-4 w-4 text-red-500" />
                                    <span className="font-medium">{result.failed} Failed</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Category Breakdown */}
                    <Card className="shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-orange-500" /> Category Scores
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {Object.entries(result.categoryScores).map(([cat, score]) => {
                                const meta = CATEGORY_META[cat]
                                if (!meta) return null
                                return (
                                    <div key={cat} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className={`flex items-center gap-2 font-medium ${meta.color}`}>
                                                {meta.icon} {meta.label}
                                            </span>
                                            <span className={`font-bold ${score >= 80 ? "text-green-600" : score >= 60 ? "text-orange-600" : "text-red-600"}`}>
                                                {score}%
                                            </span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${score >= 80 ? "bg-green-500" : score >= 60 ? "bg-orange-500" : "bg-red-500"}`}
                                                style={{ width: `${score}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>

                    {/* Detailed Checks */}
                    <Card className="shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Detailed Checks</CardTitle>
                        </CardHeader>
                        <CardContent className="divide-y divide-border/50">
                            {result.checks.map((check) => (
                                <div key={check.id} className="py-3">
                                    <button
                                        onClick={() => setExpandedCheck(expandedCheck === check.id ? null : check.id)}
                                        className="w-full text-left flex items-start gap-3"
                                    >
                                        <div className="mt-0.5">
                                            {check.status === "pass" ? (
                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                            ) : check.status === "warning" ? (
                                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-red-500" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-medium">{check.title}</p>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${check.impact === "critical" ? "bg-red-50 dark:bg-red-950/20 text-red-600" :
                                                        check.impact === "major" ? "bg-orange-50 dark:bg-orange-950/20 text-orange-600" :
                                                            "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                                                    }`}>
                                                    {check.impact}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5">{check.description}</p>
                                        </div>
                                    </button>
                                    {expandedCheck === check.id && check.recommendation && (
                                        <div className="ml-7 mt-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 text-xs">
                                            <span className="font-semibold">Fix: </span>{check.recommendation}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Quick Win Recommendations */}
                    <Card className="shadow-sm border-green-200 dark:border-green-800/30">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
                                <Zap className="h-4 w-4" /> Quick Wins to Boost Your Local Rankings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {result.checks.filter((c) => c.status === "fail" && c.impact === "critical").length > 0 && (
                                <div className="text-sm space-y-1.5">
                                    {result.checks.filter((c) => c.status === "fail" && c.impact === "critical").map((check) => (
                                        <div key={check.id} className="flex items-start gap-2 text-muted-foreground">
                                            <span className="text-red-500 font-bold mt-0.5">1.</span>
                                            <span>{check.recommendation}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="pt-2 border-t border-border/50 space-y-2">
                                <a
                                    href="https://business.google.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                    Manage your Google Business Profile
                                </a>
                                <Link
                                    href="/schema-generator"
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Code className="h-3.5 w-3.5 shrink-0" />
                                    Generate LocalBusiness Schema
                                </Link>
                                <Link
                                    href="/rankings"
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                                    Track Local Rankings
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
