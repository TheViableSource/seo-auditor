"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import {
    validateEmbedToken,
    getAuditsForSite,
    getSettings,
    type StoredSite,
    type StoredAudit,
} from "@/lib/local-storage"

// ── Standalone Embeddable Dashboard ──
// No sidebar, no nav — designed to be loaded inside an iframe.
// URL: /embed/dashboard?token=emb_xxx

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
    const radius = (size - 12) / 2
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (score / 100) * circumference
    const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f97316" : "#ef4444"
    const grade = score >= 90 ? "A+" : score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F"

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e5e7eb" strokeWidth="8" fill="none" />
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    stroke={color} strokeWidth="8" fill="none"
                    strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 1s ease-out" }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold" style={{ color }}>{score}</span>
                <span className="text-xs text-zinc-500 font-medium">Grade {grade}</span>
            </div>
        </div>
    )
}

function CategoryBar({ label, score }: { label: string; score: number }) {
    const color = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-orange-500" : "bg-red-500"
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs">
                <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{score}%</span>
            </div>
            <div className="h-2 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full ${color} transition-all duration-1000`}
                    style={{ width: `${score}%` }}
                />
            </div>
        </div>
    )
}

export default function EmbedDashboardPage() {
    const searchParams = useSearchParams()
    const token = searchParams.get("token")
    const [site, setSite] = useState<StoredSite | null>(null)
    const [audit, setAudit] = useState<StoredAudit | null>(null)
    const [previousAudit, setPreviousAudit] = useState<StoredAudit | null>(null)
    const [error, setError] = useState("")
    const [brandName, setBrandName] = useState("")
    const [brandColor, setBrandColor] = useState("#f97316")
    const [mounted, setMounted] = useState(false)

    const load = useCallback(() => {
        if (!token) {
            setError("No embed token provided")
            return
        }
        const result = validateEmbedToken(token)
        if (!result) {
            setError("Invalid or expired embed token")
            return
        }
        setSite(result.site)
        setAudit(result.audit)

        // Get previous audit for trend
        const allAudits = getAuditsForSite(result.site.id)
        if (allAudits.length > 1) {
            setPreviousAudit(allAudits[1])
        }

        // Get branding
        const settings = getSettings()
        if (settings?.brandName) setBrandName(settings.brandName)
        if (settings?.brandColor) setBrandColor(settings.brandColor)
    }, [token])

    useEffect(() => {
        load()
        setMounted(true)
    }, [load])

    if (!mounted) {
        return (
            <div className="min-h-screen bg-white dark:bg-zinc-900 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white dark:bg-zinc-900 flex items-center justify-center p-8">
                <div className="text-center max-w-sm">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">Dashboard Unavailable</h2>
                    <p className="text-sm text-zinc-500 mt-2">{error}</p>
                </div>
            </div>
        )
    }

    if (!site || !audit) {
        return (
            <div className="min-h-screen bg-white dark:bg-zinc-900 flex items-center justify-center p-8">
                <div className="text-center max-w-sm">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                        <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">No Audit Data Yet</h2>
                    <p className="text-sm text-zinc-500 mt-2">Run your first audit on {site?.domain || "this site"} to see results here.</p>
                </div>
            </div>
        )
    }

    const scoreDelta = previousAudit ? audit.score - previousAudit.score : null
    const issueCount = audit.failedChecks?.length || audit.issuesCount || 0

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-950">
            {/* Header Bar */}
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800" style={{ borderBottomColor: brandColor + "40" }}>
                <div className="flex items-center justify-between max-w-4xl mx-auto">
                    <div>
                        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">SEO Dashboard</h1>
                        <p className="text-xs text-zinc-500">{site.domain}</p>
                    </div>
                    {brandName && (
                        <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ background: brandColor + "15", color: brandColor }}>
                            Powered by {brandName}
                        </span>
                    )}
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-6 space-y-6">
                {/* Score + Summary */}
                <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-white dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
                    <ScoreRing score={audit.score} />
                    <div className="flex-1 text-center sm:text-left">
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                            {audit.score >= 80 ? "Great job!" : audit.score >= 60 ? "Room for improvement" : "Needs attention"}
                        </h2>
                        <p className="text-sm text-zinc-500 mt-1">
                            Last audited {new Date(audit.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        </p>
                        <div className="flex items-center gap-4 mt-3 justify-center sm:justify-start">
                            {scoreDelta !== null && (
                                <span className={`text-sm font-medium ${scoreDelta > 0 ? "text-green-600" : scoreDelta < 0 ? "text-red-600" : "text-zinc-400"}`}>
                                    {scoreDelta > 0 ? "↑" : scoreDelta < 0 ? "↓" : "→"} {Math.abs(scoreDelta)} pts since last audit
                                </span>
                            )}
                            <span className="text-sm text-zinc-400">·</span>
                            <span className="text-sm text-zinc-500">{issueCount} issue{issueCount !== 1 ? "s" : ""} found</span>
                        </div>
                    </div>
                </div>

                {/* Category Breakdown */}
                <div className="p-6 bg-white dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
                    <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">Category Breakdown</h3>
                    <div className="space-y-3">
                        {audit.categorySummary?.map((cat) => (
                            <CategoryBar key={cat.name} label={cat.label} score={cat.score} />
                        ))}
                    </div>
                </div>

                {/* Top Issues */}
                {audit.failedChecks && audit.failedChecks.length > 0 && (
                    <div className="p-6 bg-white dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
                        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">
                            Top Issues ({Math.min(audit.failedChecks.length, 5)})
                        </h3>
                        <div className="space-y-2.5">
                            {audit.failedChecks.slice(0, 5).map((check, i) => (
                                <div key={i} className="flex items-start gap-3 py-2 border-b border-zinc-100 dark:border-zinc-700/50 last:border-0">
                                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${check.status === "fail" ? "bg-red-500" : "bg-orange-400"}`} />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{check.title}</p>
                                        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{check.description}</p>
                                        {check.recommendation && (
                                            <p className="text-xs mt-1 px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
                                                💡 {check.recommendation}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center pt-4 pb-8 text-xs text-zinc-400">
                    {brandName ? `Report by ${brandName}` : "Powered by AuditorPro"} · Updated {new Date(audit.createdAt).toLocaleDateString()}
                </div>
            </div>
        </div>
    )
}
