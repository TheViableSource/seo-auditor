"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Copy, Check, Code, Globe, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/toast-provider"

export default function WidgetPage() {
    const toast = useToast()
    const [copied, setCopied] = useState<string | null>(null)
    const [badgeUrl, setBadgeUrl] = useState("https://example.com")

    const origin = typeof window !== "undefined" ? window.location.origin : ""

    const badgeCode = `<img src="${origin}/api/badge?url=${encodeURIComponent(badgeUrl)}" alt="SEO Score" />`
    const badgeMarkdown = `![SEO Score](${origin}/api/badge?url=${encodeURIComponent(badgeUrl)})`
    const widgetCode = `<script src="${origin}/api/widget"></script>`
    const widgetCodeDark = `<script src="${origin}/api/widget?theme=dark&position=bottom-right"></script>`
    const widgetCodeLight = `<script src="${origin}/api/widget?theme=light&position=bottom-left"></script>`

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text)
        setCopied(label)
        toast.success(`${label} copied to clipboard!`)
        setTimeout(() => setCopied(null), 2000)
    }

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                </Link>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Embeddable Widgets</h2>
                    <p className="text-muted-foreground">Share your SEO scores with embeddable badges and floating widgets.</p>
                </div>
            </div>

            {/* SEO Health Badge */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-orange-500" />
                        SEO Health Badge
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Embed a shields.io-style badge showing any site&apos;s live SEO score. Perfect for READMEs, portfolios, and dashboards.</p>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* URL Input */}
                    <div>
                        <label className="text-sm font-medium mb-1.5 block">Target URL</label>
                        <input
                            type="text"
                            value={badgeUrl}
                            onChange={(e) => setBadgeUrl(e.target.value)}
                            placeholder="https://example.com"
                            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-background text-foreground"
                        />
                    </div>

                    {/* Preview */}
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Preview</p>
                        <div className="p-4 bg-muted/30 rounded-lg border border-border flex items-center gap-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`${origin}/api/badge?url=${encodeURIComponent(badgeUrl)}`} alt="SEO Badge Preview" className="h-5" />
                            <span className="text-xs text-muted-foreground">Live preview — score is fetched on demand</span>
                        </div>
                    </div>

                    {/* Code Snippets */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">HTML</p>
                                <button onClick={() => copyToClipboard(badgeCode, "HTML")} className="text-xs text-orange-500 hover:underline flex items-center gap-1">
                                    {copied === "HTML" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                    {copied === "HTML" ? "Copied" : "Copy"}
                                </button>
                            </div>
                            <pre className="p-3 bg-zinc-950 text-green-400 rounded-lg text-xs overflow-x-auto"><code>{badgeCode}</code></pre>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Markdown</p>
                                <button onClick={() => copyToClipboard(badgeMarkdown, "Markdown")} className="text-xs text-orange-500 hover:underline flex items-center gap-1">
                                    {copied === "Markdown" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                    {copied === "Markdown" ? "Copied" : "Copy"}
                                </button>
                            </div>
                            <pre className="p-3 bg-zinc-950 text-green-400 rounded-lg text-xs overflow-x-auto"><code>{badgeMarkdown}</code></pre>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Content Score Widget */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Code className="h-5 w-5 text-violet-500" />
                        Content Score Widget
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Drop a single script tag into any page to show a floating SEO score pill. Great for CMS integrations and client demos.</p>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Widget variants */}
                    <div className="space-y-4">
                        {[
                            { label: "Default (Dark, Bottom-Right)", code: widgetCode, id: "default" },
                            { label: "Dark Theme, Bottom-Right", code: widgetCodeDark, id: "dark" },
                            { label: "Light Theme, Bottom-Left", code: widgetCodeLight, id: "light" },
                        ].map(({ label, code, id }) => (
                            <div key={id}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-sm font-medium text-foreground">{label}</p>
                                    <button onClick={() => copyToClipboard(code, id)} className="text-xs text-orange-500 hover:underline flex items-center gap-1">
                                        {copied === id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                        {copied === id ? "Copied" : "Copy"}
                                    </button>
                                </div>
                                <pre className="p-3 bg-zinc-950 text-green-400 rounded-lg text-xs overflow-x-auto"><code>{code}</code></pre>
                            </div>
                        ))}
                    </div>

                    {/* Options */}
                    <div className="p-4 bg-muted/30 rounded-lg border border-border">
                        <div className="flex items-center gap-2 mb-2">
                            <Palette className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm font-medium">Configuration Options</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left py-1.5 pr-4 text-xs font-semibold text-muted-foreground">Parameter</th>
                                        <th className="text-left py-1.5 pr-4 text-xs font-semibold text-muted-foreground">Values</th>
                                        <th className="text-left py-1.5 text-xs font-semibold text-muted-foreground">Default</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    <tr>
                                        <td className="py-1.5 pr-4"><code className="text-xs bg-muted px-1 py-0.5 rounded">theme</code></td>
                                        <td className="py-1.5 pr-4 text-muted-foreground"><code className="text-xs">dark</code> | <code className="text-xs">light</code></td>
                                        <td className="py-1.5 text-muted-foreground"><code className="text-xs">dark</code></td>
                                    </tr>
                                    <tr>
                                        <td className="py-1.5 pr-4"><code className="text-xs bg-muted px-1 py-0.5 rounded">position</code></td>
                                        <td className="py-1.5 pr-4 text-muted-foreground"><code className="text-xs">bottom-right</code> | <code className="text-xs">bottom-left</code> | <code className="text-xs">top-right</code> | <code className="text-xs">top-left</code></td>
                                        <td className="py-1.5 text-muted-foreground"><code className="text-xs">bottom-right</code></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
