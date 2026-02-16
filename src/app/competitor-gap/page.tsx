"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Zap, Loader2, AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/toast-provider"

interface AuditCategory {
    name: string
    label: string
    score: number
    checks: { id: string; title: string; status: string; severity: string; description: string }[]
    passCount: number
    failCount: number
}

interface ComparisonResult {
    url: string
    score: number
    categories: AuditCategory[]
    fetchTimeMs: number
}

export default function CompetitorGapPage() {
    const toast = useToast()
    const [yourUrl, setYourUrl] = useState("")
    const [compUrl, setCompUrl] = useState("")
    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = useState("")
    const [yourResult, setYourResult] = useState<ComparisonResult | null>(null)
    const [compResult, setCompResult] = useState<ComparisonResult | null>(null)
    const [error, setError] = useState("")

    const runComparison = async () => {
        if (!yourUrl || !compUrl) return
        setLoading(true)
        setError("")
        setYourResult(null)
        setCompResult(null)

        try {
            setProgress("Auditing your site…")
            const yourRes = await fetch("/api/audit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: yourUrl }),
            })
            if (!yourRes.ok) throw new Error("Failed to audit your site")
            const yourData = await yourRes.json()
            setYourResult({
                url: yourUrl,
                score: yourData.score ?? yourData.overallScore ?? 0,
                categories: yourData.categories || [],
                fetchTimeMs: yourData.meta?.fetchTimeMs || 0,
            })

            setProgress("Auditing competitor…")
            const compRes = await fetch("/api/audit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: compUrl }),
            })
            if (!compRes.ok) throw new Error("Failed to audit competitor")
            const compData = await compRes.json()
            setCompResult({
                url: compUrl,
                score: compData.score ?? compData.overallScore ?? 0,
                categories: compData.categories || [],
                fetchTimeMs: compData.meta?.fetchTimeMs || 0,
            })

            toast.success("Competitor comparison complete!")
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Comparison failed"
            setError(msg)
            toast.error(msg)
        } finally {
            setLoading(false)
            setProgress("")
        }
    }

    const getColor = (score: number) => {
        if (score >= 80) return "text-green-600"
        if (score >= 60) return "text-orange-500"
        return "text-red-500"
    }

    const getBg = (score: number) => {
        if (score >= 80) return "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800"
        if (score >= 60) return "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800"
        return "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
    }

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                </Link>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Competitor Gap Analysis</h2>
                    <p className="text-muted-foreground">Compare your SEO performance against a competitor side-by-side.</p>
                </div>
            </div>

            {/* Input */}
            <Card>
                <CardContent className="p-6 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Your URL</label>
                            <input
                                type="text" value={yourUrl} onChange={(e) => setYourUrl(e.target.value)}
                                placeholder="https://yoursite.com"
                                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-background text-foreground"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Competitor URL</label>
                            <input
                                type="text" value={compUrl} onChange={(e) => setCompUrl(e.target.value)}
                                placeholder="https://competitor.com"
                                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-background text-foreground"
                            />
                        </div>
                    </div>
                    <Button onClick={runComparison} disabled={loading || !yourUrl || !compUrl} className="bg-orange-500 hover:bg-orange-600 text-white gap-2">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                        {loading ? progress : "Compare Sites"}
                    </Button>
                </CardContent>
            </Card>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 border border-red-100">
                    <AlertTriangle className="h-5 w-5" />{error}
                </div>
            )}

            {/* Results */}
            {yourResult && compResult && (
                <div className="space-y-6">
                    {/* Overall Scores */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card className={`border-2 ${getBg(yourResult.score)}`}>
                            <CardContent className="p-6 text-center">
                                <p className="text-sm font-medium text-muted-foreground mb-2">Your Site</p>
                                <p className={`text-5xl font-bold ${getColor(yourResult.score)}`}>{Math.round(yourResult.score)}</p>
                                <p className="text-xs text-muted-foreground mt-1 truncate">{yourResult.url}</p>
                            </CardContent>
                        </Card>
                        <Card className={`border-2 ${getBg(compResult.score)}`}>
                            <CardContent className="p-6 text-center">
                                <p className="text-sm font-medium text-muted-foreground mb-2">Competitor</p>
                                <p className={`text-5xl font-bold ${getColor(compResult.score)}`}>{Math.round(compResult.score)}</p>
                                <p className="text-xs text-muted-foreground mt-1 truncate">{compResult.url}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Category Comparison */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Category Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {yourResult.categories.map((yourCat) => {
                                const compCat = compResult.categories.find(c => c.name === yourCat.name)
                                const compScore = compCat?.score ?? 0
                                const diff = Math.round(yourCat.score) - Math.round(compScore)
                                const isGap = diff < 0

                                return (
                                    <div key={yourCat.name} className={`p-4 rounded-lg border ${isGap ? "border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-800" : "border-border"}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-sm">{yourCat.label}</span>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isGap ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" :
                                                diff > 0 ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
                                                    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                                }`}>
                                                {diff > 0 ? `+${diff}` : diff === 0 ? "Tied" : diff}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                                    <span>You</span>
                                                    <span className={getColor(yourCat.score)}>{Math.round(yourCat.score)}</span>
                                                </div>
                                                <Progress value={yourCat.score} className="h-2" />
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                                    <span>Competitor</span>
                                                    <span className={getColor(compScore)}>{Math.round(compScore)}</span>
                                                </div>
                                                <Progress value={compScore} className="h-2" />
                                            </div>
                                        </div>
                                        {isGap && (
                                            <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                                                <AlertTriangle className="h-3 w-3" />
                                                <span>Gap: competitor scores {Math.abs(diff)} points higher</span>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>

                    {/* Gaps Summary */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card className="border-red-200 dark:border-red-800">
                            <CardHeader><CardTitle className="text-red-600 text-sm flex items-center gap-2"><XCircle className="h-4 w-4" /> Where You Trail</CardTitle></CardHeader>
                            <CardContent className="space-y-2">
                                {yourResult.categories
                                    .filter(c => {
                                        const comp = compResult.categories.find(cc => cc.name === c.name)
                                        return comp && c.score < comp.score
                                    })
                                    .sort((a, b) => {
                                        const compA = compResult.categories.find(c => c.name === a.name)
                                        const compB = compResult.categories.find(c => c.name === b.name)
                                        return (a.score - (compA?.score ?? 0)) - (b.score - (compB?.score ?? 0))
                                    })
                                    .map(c => {
                                        const comp = compResult.categories.find(cc => cc.name === c.name)!
                                        return (
                                            <div key={c.name} className="flex justify-between text-sm">
                                                <span>{c.label}</span>
                                                <span className="text-red-500 font-medium">{Math.round(c.score)} vs {Math.round(comp.score)}</span>
                                            </div>
                                        )
                                    })}
                                {yourResult.categories.every(c => {
                                    const comp = compResult.categories.find(cc => cc.name === c.name)
                                    return !comp || c.score >= comp.score
                                }) && <p className="text-sm text-muted-foreground">🎉 You lead in all categories!</p>}
                            </CardContent>
                        </Card>
                        <Card className="border-green-200 dark:border-green-800">
                            <CardHeader><CardTitle className="text-green-600 text-sm flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Where You Lead</CardTitle></CardHeader>
                            <CardContent className="space-y-2">
                                {yourResult.categories
                                    .filter(c => {
                                        const comp = compResult.categories.find(cc => cc.name === c.name)
                                        return comp && c.score > comp.score
                                    })
                                    .map(c => {
                                        const comp = compResult.categories.find(cc => cc.name === c.name)!
                                        return (
                                            <div key={c.name} className="flex justify-between text-sm">
                                                <span>{c.label}</span>
                                                <span className="text-green-600 font-medium">+{Math.round(c.score - comp.score)}</span>
                                            </div>
                                        )
                                    })}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    )
}
