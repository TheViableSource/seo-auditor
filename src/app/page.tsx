"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Loader2,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Flag,
  FileText,
  LinkIcon,
  ImageIcon,
  LayoutTemplate,
  Smartphone
} from "lucide-react"
import type { AuditResult } from "@/lib/types"
import { sanitizeImageUrl } from "@/lib/utils"

export default function Home() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AuditResult | null>(null)
  const [error, setError] = useState("")

  const runAudit = async () => {
    if (!url) return
    setLoading(true)
    setError("")
    setResult(null)

    try {
      const response = await fetch(`${window.location.origin}/api/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Audit failed")
      setResult(data)
    } catch {
      setError("Failed to audit this site. Please check the URL and try again.")
    } finally {
      setLoading(false)
    }
  }

  const getPriority = (issue: string) => {
    if (issue.includes("Missing")) return { label: "High", color: "text-red-600 bg-red-50 border-red-100" }
    if (issue.includes("too long") || issue.includes("Thin")) return { label: "Medium", color: "text-orange-600 bg-orange-50 border-orange-100" }
    return { label: "Low", color: "text-blue-600 bg-blue-50 border-blue-100" }
  }

  // Compute sanitized image URLs when result is available
  const ogImageUrl = result?.details.social.ogImage
    ? sanitizeImageUrl(result.details.social.ogImage, url)
    : null
  const faviconUrl = result?.details.mobile.icon
    ? sanitizeImageUrl(result.details.mobile.icon, url)
    : null

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 bg-zinc-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900">SEO Auditor</h2>
        <p className="text-zinc-500">Enter a URL to generate your optimization checklist.</p>
      </div>

      {/* Input Box */}
      <div className="flex gap-4 items-start p-6 bg-white rounded-xl shadow-sm border border-zinc-200">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="flex-1 px-4 py-3 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
        />
        <Button onClick={runAudit} disabled={loading} size="lg" className="h-[50px] bg-orange-500 hover:bg-orange-600 text-white">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? "Analyzing..." : "Audit Site"}
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 border border-red-100">
          <AlertTriangle className="h-5 w-5" />
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-10">

          {/* 1. TOP METRICS ROW (Score & External Integrations) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="shadow-sm border-zinc-200">
              <CardContent className="p-6">
                <div className="text-sm text-zinc-500 font-medium uppercase tracking-wider">On-Page Score</div>
                <div className="mt-2 text-4xl font-bold text-zinc-900">{result.score}<span className="text-xl text-zinc-400">/100</span></div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-zinc-200">
              <CardContent className="p-6">
                <div className="text-sm text-zinc-500 font-medium uppercase tracking-wider">Organic Traffic</div>
                <div className="mt-2 text-2xl font-bold text-zinc-400">--</div>
                <div className="text-xs text-orange-500 mt-1 cursor-pointer hover:underline">Connect Google Analytics</div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-zinc-200">
              <CardContent className="p-6">
                <div className="text-sm text-zinc-500 font-medium uppercase tracking-wider">Keywords</div>
                <div className="mt-2 text-2xl font-bold text-zinc-400">--</div>
                <div className="text-xs text-orange-500 mt-1 cursor-pointer hover:underline">Connect Search Console</div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-zinc-200">
              <CardContent className="p-6">
                <div className="text-sm text-zinc-500 font-medium uppercase tracking-wider">Backlinks</div>
                <div className="mt-2 text-2xl font-bold text-zinc-400">--</div>
                <div className="text-xs text-orange-500 mt-1 cursor-pointer hover:underline">Connect Majestic/Moz</div>
              </CardContent>
            </Card>
          </div>

          {/* 2. SEO OPPORTUNITIES SECTION (The Issues List) */}
          <div>
            <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2 mb-4">
              <ArrowRight className="h-5 w-5 text-orange-500" />
              Top SEO Opportunities
            </h3>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {result.details.issues.length === 0 ? (
                <div className="col-span-full p-8 bg-green-50 text-green-700 rounded-xl border border-green-100 flex flex-col items-center justify-center text-center">
                  <CheckCircle className="h-12 w-12 mb-4 text-green-500" />
                  <h4 className="text-lg font-bold">Excellent Work!</h4>
                  <p>We couldn&apos;t find any critical on-page errors.</p>
                </div>
              ) : (
                result.details.issues.map((issue: string, i: number) => {
                   const priority = getPriority(issue)
                   return (
                    <Card key={i} className="shadow-sm border-zinc-200 hover:shadow-md transition-shadow">
                      <CardContent className="p-6 flex flex-col justify-between h-full space-y-4">
                        <div className="space-y-3">
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${priority.color}`}>
                            <Flag className="h-3 w-3" />
                            Priority: {priority.label}
                          </div>
                          <p className="font-medium text-zinc-800 leading-snug">
                            {issue}
                          </p>
                        </div>
                        <Button variant="outline" className="w-full border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700">
                          Fix This
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </div>

          {/* 3. DEEP DIVE ANALYSIS */}
          <div>
            <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2 mb-4">
              <ArrowRight className="h-5 w-5 text-blue-500" />
              Deep Dive Analysis
            </h3>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

                {/* Card A: Content Health */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-500">Content Health</CardTitle>
                    <FileText className="h-4 w-4 text-zinc-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-2xl font-bold">{result.details.wordCount}</div>
                        <p className="text-xs text-muted-foreground">Word Count</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${result.details.canonical !== "Missing" ? "text-green-500" : "text-red-500"}`}>
                          {result.details.canonical !== "Missing" ? "Valid" : "Missing"}
                        </div>
                        <p className="text-xs text-muted-foreground">Canonical Tag</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card B: Link Profile */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-500">Link Profile</CardTitle>
                    <LinkIcon className="h-4 w-4 text-zinc-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <div className="text-2xl font-bold">{result.details.internalLinks}</div>
                        <p className="text-xs text-muted-foreground">Internal</p>
                      </div>
                      <div className="flex-1 border-l pl-4">
                        <div className="text-2xl font-bold">{result.details.externalLinks}</div>
                        <p className="text-xs text-muted-foreground">External</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card C: Image Analysis */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-500">Image Analysis</CardTitle>
                        <ImageIcon className="h-4 w-4 text-zinc-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-end">
                        <div>
                            <div className="text-2xl font-bold">{result.details.imageCount}</div>
                            <p className="text-xs text-muted-foreground">Total Images</p>
                        </div>
                        <div className="text-right">
                            <div className={`text-xl font-bold ${result.details.missingAlt > 0 ? "text-red-500" : "text-green-500"}`}>
                            {result.details.missingAlt}
                            </div>
                            <p className="text-xs text-muted-foreground">Missing Alt Text</p>
                        </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Card D: Metadata Preview */}
                <Card className="md:col-span-3">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-500">Metadata Preview</CardTitle>
                    <LayoutTemplate className="h-4 w-4 text-zinc-400" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                        <span className="text-xs font-bold text-zinc-400 uppercase">Title Tag</span>
                        <div className="font-medium text-lg truncate" title={result.details.title}>
                            {result.details.title}
                        </div>
                    </div>
                    <div>
                        <span className="text-xs font-bold text-zinc-400 uppercase">Meta Description</span>
                        <div className="text-zinc-600">
                            {result.details.description}
                        </div>
                    </div>
                  </CardContent>
                </Card>
            </div>
          </div>

          {/* 4. SOCIAL & BRANDING SECTION */}
          <div className="grid gap-6 md:grid-cols-2">

            {/* Social Preview Card */}
            <Card className="overflow-hidden">
              <CardHeader>
                 <CardTitle className="text-sm font-medium text-zinc-500">Social Media Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border border-zinc-200 rounded-lg overflow-hidden max-w-sm mx-auto shadow-sm">
                  {/* The Image Area */}
                  <div className="h-48 bg-zinc-100 flex items-center justify-center overflow-hidden relative">
                    {ogImageUrl ? (
                      <img
                        src={ogImageUrl}
                        alt="Social Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-zinc-400 flex flex-col items-center gap-2">
                        <ImageIcon className="h-8 w-8" />
                        <span className="text-xs">No OG Image Found</span>
                      </div>
                    )}
                  </div>

                  {/* The Text Area */}
                  <div className="p-4 bg-zinc-50 border-t">
                    <div className="text-xs text-zinc-500 uppercase mb-1">{new URL(url).hostname}</div>
                    <div className="font-bold text-zinc-900 leading-tight mb-1 line-clamp-2">
                      {result.details.social.ogTitle !== "Missing" ? result.details.social.ogTitle : result.details.title}
                    </div>
                    <div className="text-xs text-zinc-600 line-clamp-1">
                      {result.details.description}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mobile & Tech Checklist */}
            <Card>
               <CardHeader>
                 <CardTitle className="text-sm font-medium text-zinc-500">Technical Presence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Mobile Check */}
                <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${result.details.mobile.viewport === "Optimized" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                       <Smartphone className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Mobile Viewport</div>
                      <div className="text-xs text-zinc-500">{result.details.mobile.viewport === "Optimized" ? "Responsive Ready" : "Not Optimized"}</div>
                    </div>
                  </div>
                  {result.details.mobile.viewport === "Optimized" ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-red-500" />}
                </div>

                {/* Favicon Check */}
                <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center overflow-hidden">
                        {faviconUrl ? (
                          <img src={faviconUrl} alt="Favicon" className="w-4 h-4" />
                        ) : (
                          <div className="w-2 h-2 bg-red-400 rounded-full" />
                        )}
                     </div>
                    <div>
                      <div className="font-medium text-sm">Favicon Brand</div>
                      <div className="text-xs text-zinc-500">{result.details.mobile.icon ? "Detected" : "Missing Branding"}</div>
                    </div>
                  </div>
                  {result.details.mobile.icon ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-red-500" />}
                </div>

              </CardContent>
            </Card>
          </div>

        </div>
      )}
    </div>
  )
}
