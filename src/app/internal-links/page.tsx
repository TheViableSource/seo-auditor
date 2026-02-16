"use client"

import { useState } from "react"
import Link from "next/link"
import {
    ArrowLeft,
    Link2,
    ExternalLink,
    Loader2,
    AlertTriangle,
    CheckCircle,
    XCircle,
    ArrowRight,
    Globe,
    Search,
    BarChart3,
    Layers,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/toast-provider"

interface InternalLink {
    href: string
    text: string
    isInternal: boolean
    status: "ok" | "broken" | "redirect" | "unknown"
    statusCode?: number
}

interface LinkAnalysis {
    url: string
    totalLinks: number
    internalLinks: number
    externalLinks: number
    brokenLinks: number
    uniqueInternalLinks: number
    links: InternalLink[]
    orphanWarning: boolean
    pagesCrawled?: number
    crawledUrls?: string[]
}

export default function InternalLinksPage() {
    const toast = useToast()
    const [url, setUrl] = useState("")
    const [loading, setLoading] = useState(false)
    const [analysis, setAnalysis] = useState<LinkAnalysis | null>(null)
    const [error, setError] = useState("")
    const [filter, setFilter] = useState<"all" | "internal" | "external" | "broken">("all")
    const [deepCrawl, setDeepCrawl] = useState(false)
    const [crawlProgress, setCrawlProgress] = useState("")

    async function fetchPageLinks(pageUrl: string): Promise<{ links: InternalLink[]; internalCount: number; externalCount: number; brokenCount: number }> {
        const response = await fetch("/api/audit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: pageUrl }),
        })
        if (!response.ok) throw new Error("Failed to fetch page")
        const data = await response.json()

        const onPage = data.categories?.find((c: { name: string }) => c.name === "on-page")
        const internalCheck = onPage?.checks?.find((c: { id: string }) => c.id === "internal-links")
        const brokenCheck = onPage?.checks?.find((c: { id: string }) => c.id === "broken-links")
        const content = data.contentAnalysis || {}

        const parsedLinks: InternalLink[] = []
        const internalCount = content.internalLinks ?? internalCheck?.details?.count ?? 0
        const externalCount = content.externalLinks ?? 0
        const brokenCount = brokenCheck?.status === "fail" ? (brokenCheck?.details?.count ?? 1) : 0

        if (data.meta?.links && Array.isArray(data.meta.links)) {
            for (const l of data.meta.links) {
                parsedLinks.push({
                    href: l.href || l.url || "#",
                    text: l.text || l.anchor || "(no anchor text)",
                    isInternal: l.isInternal ?? true,
                    status: l.broken ? "broken" : "ok",
                    statusCode: l.statusCode,
                })
            }
        }

        if (parsedLinks.length === 0) {
            const allChecks = data.categories?.flatMap((c: { checks: Array<{ id: string; title: string; description: string; status: string; details?: { items?: Array<{ href?: string; text?: string; url?: string; anchor?: string }> } }> }) => c.checks || []) || []
            for (const check of allChecks) {
                if (check.details?.items) {
                    for (const item of check.details.items) {
                        parsedLinks.push({
                            href: item.href || item.url || "#",
                            text: item.text || item.anchor || "(no anchor text)",
                            isInternal: true,
                            status: check.id?.includes("broken") ? "broken" : "ok",
                        })
                    }
                }
            }
        }

        return { links: parsedLinks, internalCount, externalCount, brokenCount }
    }

    const analyzeLinks = async () => {
        if (!url) return
        let targetUrl = url.trim()
        if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = `https://${targetUrl}`
        }

        setLoading(true)
        setError("")
        setAnalysis(null)
        setCrawlProgress("")

        try {
            // First page crawl
            setCrawlProgress(`Crawling ${targetUrl}...`)
            const firstPage = await fetchPageLinks(targetUrl)
            const allLinks: InternalLink[] = [...firstPage.links]
            const crawledUrls = [targetUrl]
            let totalInternal = firstPage.internalCount
            let totalExternal = firstPage.externalCount
            let totalBroken = firstPage.brokenCount

            // Deep crawl: follow internal links to discover more pages
            if (deepCrawl) {
                const maxPages = 10
                const host = new URL(targetUrl).host
                const discovered = new Set<string>()

                // Find internal URLs from the first page
                for (const link of firstPage.links) {
                    if (link.isInternal && link.href !== "#") {
                        try {
                            const resolved = new URL(link.href, targetUrl)
                            if (resolved.host === host && !crawledUrls.includes(resolved.href)) {
                                discovered.add(resolved.href)
                            }
                        } catch { /* invalid URL */ }
                    }
                }

                const toCrawl = Array.from(discovered).slice(0, maxPages)
                for (let i = 0; i < toCrawl.length; i++) {
                    setCrawlProgress(`Deep crawling page ${i + 2}/${toCrawl.length + 1}: ${new URL(toCrawl[i]).pathname}...`)
                    try {
                        const pageData = await fetchPageLinks(toCrawl[i])
                        allLinks.push(...pageData.links)
                        crawledUrls.push(toCrawl[i])
                        totalInternal += pageData.internalCount
                        totalExternal += pageData.externalCount
                        totalBroken += pageData.brokenCount
                    } catch {
                        // Skip pages that fail
                    }
                }
            }

            const uniqueHrefs = new Set(allLinks.filter(l => l.isInternal).map(l => l.href))

            const result: LinkAnalysis = {
                url: targetUrl,
                totalLinks: totalInternal + totalExternal || allLinks.length,
                internalLinks: totalInternal || allLinks.filter(l => l.isInternal).length,
                externalLinks: totalExternal || allLinks.filter(l => !l.isInternal).length,
                brokenLinks: totalBroken || allLinks.filter(l => l.status === "broken").length,
                uniqueInternalLinks: uniqueHrefs.size || totalInternal,
                links: allLinks,
                orphanWarning: totalInternal === 0,
                pagesCrawled: crawledUrls.length,
                crawledUrls,
            }

            setAnalysis(result)
            toast.success(`Link analysis complete! ${crawledUrls.length} page${crawledUrls.length > 1 ? "s" : ""} crawled.`)
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Analysis failed"
            setError(msg)
            toast.error(msg)
        } finally {
            setLoading(false)
            setCrawlProgress("")
        }
    }

    const filteredLinks = analysis?.links.filter(l => {
        if (filter === "internal") return l.isInternal
        if (filter === "external") return !l.isInternal
        if (filter === "broken") return l.status === "broken"
        return true
    }) ?? []

    const getStatusBadge = (status: InternalLink["status"]) => {
        switch (status) {
            case "ok":
                return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200"><CheckCircle className="h-3 w-3" /> OK</span>
            case "broken":
                return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200"><XCircle className="h-3 w-3" /> Broken</span>
            case "redirect":
                return <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200"><ArrowRight className="h-3 w-3" /> Redirect</span>
            default:
                return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-200">Unknown</span>
        }
    }

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                </Link>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Internal Link Analyzer</h2>
                    <p className="text-muted-foreground">Discover your site&apos;s internal linking structure, find broken links, and identify orphan pages.</p>
                </div>
            </div>

            {/* Input */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && analyzeLinks()}
                                placeholder="Enter a URL to analyze links..."
                                className="w-full pl-10 pr-4 py-3 border border-border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-background text-foreground"
                            />
                        </div>
                        <Button
                            onClick={analyzeLinks}
                            disabled={loading || !url.trim()}
                            className="bg-orange-500 hover:bg-orange-600 text-white gap-2 px-6"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                            {loading ? "Analyzing…" : "Analyze Links"}
                        </Button>
                    </div>
                    {/* Deep Crawl Toggle */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                        <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-violet-500" />
                            <div>
                                <p className="text-sm font-medium text-foreground">Deep Crawl</p>
                                <p className="text-xs text-muted-foreground">Crawl up to 10 discovered internal pages for site-wide analysis</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setDeepCrawl(!deepCrawl)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${deepCrawl ? "bg-orange-500" : "bg-zinc-300 dark:bg-zinc-600"}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${deepCrawl ? "translate-x-6" : "translate-x-1"}`} />
                        </button>
                    </div>
                    {/* Crawl Progress */}
                    {crawlProgress && (
                        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            {crawlProgress}
                        </p>
                    )}
                </CardContent>
            </Card>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 border border-red-100">
                    <AlertTriangle className="h-5 w-5" />{error}
                </div>
            )}

            {/* Results */}
            {analysis && (
                <div className="space-y-6">
                    {/* Stats Cards */}
                    {/* Pages Crawled Banner */}
                    {(analysis.pagesCrawled ?? 0) > 1 && (
                        <div className="p-3 bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 rounded-lg flex items-center gap-2">
                            <Layers className="h-4 w-4 text-violet-500" />
                            <p className="text-sm text-violet-700 dark:text-violet-300">
                                <span className="font-medium">{analysis.pagesCrawled} pages crawled</span>
                                <span className="text-violet-500 ml-2">· {analysis.crawledUrls?.map(u => new URL(u).pathname).join(", ")}</span>
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <Card className="shadow-sm">
                            <CardContent className="p-4 text-center">
                                <p className="text-3xl font-bold text-foreground">{analysis.totalLinks}</p>
                                <p className="text-xs text-muted-foreground mt-1">Total Links</p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm border-blue-200">
                            <CardContent className="p-4 text-center">
                                <p className="text-3xl font-bold text-blue-600">{analysis.internalLinks}</p>
                                <p className="text-xs text-muted-foreground mt-1">Internal</p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm border-purple-200">
                            <CardContent className="p-4 text-center">
                                <p className="text-3xl font-bold text-purple-600">{analysis.externalLinks}</p>
                                <p className="text-xs text-muted-foreground mt-1">External</p>
                            </CardContent>
                        </Card>
                        <Card className="shadow-sm border-green-200">
                            <CardContent className="p-4 text-center">
                                <p className="text-3xl font-bold text-green-600">{analysis.uniqueInternalLinks}</p>
                                <p className="text-xs text-muted-foreground mt-1">Unique Internal</p>
                            </CardContent>
                        </Card>
                        <Card className={`shadow-sm ${analysis.brokenLinks > 0 ? "border-red-200" : "border-green-200"}`}>
                            <CardContent className="p-4 text-center">
                                <p className={`text-3xl font-bold ${analysis.brokenLinks > 0 ? "text-red-600" : "text-green-600"}`}>{analysis.brokenLinks}</p>
                                <p className="text-xs text-muted-foreground mt-1">Broken</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Health Bar */}
                    <Card className="shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-orange-500" />
                                Link Health
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {(() => {
                                const health = analysis.totalLinks > 0
                                    ? Math.round(((analysis.totalLinks - analysis.brokenLinks) / analysis.totalLinks) * 100)
                                    : 100
                                return (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Healthy Links</span>
                                            <span className={`font-bold ${health >= 90 ? "text-green-600" : health >= 70 ? "text-orange-500" : "text-red-500"}`}>
                                                {health}%
                                            </span>
                                        </div>
                                        <Progress value={health} className="h-2" />
                                    </div>
                                )
                            })()}
                        </CardContent>
                    </Card>

                    {/* Warnings */}
                    {analysis.orphanWarning && (
                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3 dark:bg-orange-950/30 dark:border-orange-800">
                            <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-orange-700 dark:text-orange-300">Orphan Page Detected</p>
                                <p className="text-sm text-orange-600 dark:text-orange-400 mt-0.5">
                                    This page has no internal links pointing to other pages. Search engines may have trouble discovering related content. Add contextual internal links to improve crawlability.
                                </p>
                            </div>
                        </div>
                    )}

                    {analysis.brokenLinks > 0 && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 dark:bg-red-950/30 dark:border-red-800">
                            <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-red-700 dark:text-red-300">{analysis.brokenLinks} Broken Link{analysis.brokenLinks !== 1 ? "s" : ""} Found</p>
                                <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">
                                    Broken links hurt user experience and waste crawl budget. Fix or remove them as soon as possible.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Link Table */}
                    {analysis.links.length > 0 && (
                        <Card className="shadow-sm">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Search className="h-4 w-4 text-muted-foreground" />
                                        Discovered Links ({filteredLinks.length})
                                    </CardTitle>
                                    <div className="flex gap-1.5">
                                        {(["all", "internal", "external", "broken"] as const).map(f => (
                                            <button
                                                key={f}
                                                onClick={() => setFilter(f)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filter === f
                                                    ? "bg-orange-500 text-white"
                                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                                    }`}
                                            >
                                                {f.charAt(0).toUpperCase() + f.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                                    <table className="w-full">
                                        <thead className="sticky top-0 bg-card">
                                            <tr className="border-b border-border bg-muted/30">
                                                <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                                <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                                                <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Anchor Text</th>
                                                <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">URL</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {filteredLinks.map((link, i) => (
                                                <tr key={i} className="hover:bg-muted/30 transition-colors">
                                                    <td className="py-2.5 px-4">{getStatusBadge(link.status)}</td>
                                                    <td className="py-2.5 px-4">
                                                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${link.isInternal
                                                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                            : "bg-purple-50 text-purple-700 border border-purple-200"
                                                            }`}>
                                                            {link.isInternal ? "Internal" : "External"}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-4 text-sm text-foreground max-w-[200px] truncate">{link.text}</td>
                                                    <td className="py-2.5 px-4 text-sm text-muted-foreground max-w-[300px] truncate">
                                                        <a href={link.href} target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 flex items-center gap-1">
                                                            {link.href.replace(/^https?:\/\//, "")}
                                                            <ExternalLink className="h-3 w-3 shrink-0" />
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {analysis.links.length === 0 && (
                        <Card className="shadow-sm">
                            <CardContent className="p-8 text-center">
                                <Link2 className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    Link details are summarized above. For individual link inspection, re-run the audit and check the On-Page category.
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    )
}
