"use client"

import { useState, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  ChevronDown,
  ChevronRight,
  FileText,
  Shield,
  Accessibility,
  Code2,
  Zap,
  Lock,
  Bot,
  BookOpen,
  Clock,
  BarChart3,
  Globe,
  ExternalLink,
  Printer,
  Share2,
  Image as ImageIcon,
  FileCode,
  Lightbulb,
  Copy,
  Check,
  ArrowRight,
  MessageCircle,
  Sparkles,
} from "lucide-react"
import type { AuditResult, AuditCategory, AuditCheck, CheckStatus, ContentAnalysisData, PageResourcesData, SocialPreviewData } from "@/lib/types"
import { AuditResultsSkeleton } from "@/components/AuditResultsSkeleton"

// ============================================================
// SCORE RING COMPONENT
// ============================================================
function ScoreRing({ score, size = 80, strokeWidth = 6 }: { score: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const getColor = (s: number) => {
    if (s >= 80) return { stroke: "stroke-green-500", text: "text-green-600" }
    if (s >= 60) return { stroke: "stroke-orange-500", text: "text-orange-600" }
    return { stroke: "stroke-red-500", text: "text-red-600" }
  }
  const colors = getColor(score)

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-muted" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} strokeLinecap="round"
          className={`${colors.stroke} transition-all duration-1000`}
          strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <span className={`absolute text-lg font-bold ${colors.text}`}>{score}</span>
    </div>
  )
}

// ============================================================
// STATUS & SEVERITY
// ============================================================
function StatusIcon({ status }: { status: CheckStatus }) {
  switch (status) {
    case "pass": return <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
    case "fail": return <XCircle className="h-4 w-4 text-red-500 shrink-0" />
    case "warning": return <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
    case "info": return <Info className="h-4 w-4 text-blue-500 shrink-0" />
  }
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    critical: "bg-red-50 text-red-700 border-red-200",
    major: "bg-orange-50 text-orange-700 border-orange-200",
    minor: "bg-yellow-50 text-yellow-700 border-yellow-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
  }
  return (
    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${styles[severity] || ""}`}>
      {severity}
    </span>
  )
}

const categoryIcons: Record<string, React.ReactNode> = {
  "on-page": <FileText className="h-4 w-4" />,
  technical: <Shield className="h-4 w-4" />,
  accessibility: <Accessibility className="h-4 w-4" />,
  "structured-data": <Code2 className="h-4 w-4" />,
  security: <Lock className="h-4 w-4" />,
  "robots-sitemap": <Bot className="h-4 w-4" />,
  aeo: <MessageCircle className="h-4 w-4" />,
  geo: <Sparkles className="h-4 w-4" />,
}

// ============================================================
// COPY BUTTON (for code snippets)
// ============================================================
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded bg-muted/50 hover:bg-muted" title="Copy to clipboard">
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  )
}

// ============================================================
// CHECK ROW — with recommendations + code snippets
// ============================================================
function CheckRow({ check }: { check: AuditCheck }) {
  const [open, setOpen] = useState(false)
  const hasExtra = check.recommendation || check.details || check.codeSnippet || check.learnMoreUrl

  return (
    <div className={`border-b border-border/50 last:border-b-0 ${check.status === "fail" ? "bg-red-50/30" : check.status === "warning" ? "bg-orange-50/20" : ""}`}>
      <button className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
        onClick={() => hasExtra && setOpen(!open)}>
        <StatusIcon status={check.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-foreground">{check.title}</span>
            <SeverityBadge severity={check.severity} />
            {check.recommendation && !open && (check.status === "fail" || check.status === "warning") && (
              <span className="text-[10px] text-orange-500 flex items-center gap-0.5"><Lightbulb className="h-2.5 w-2.5" />Has fix</span>
            )}
          </div>
          {check.value && <p className="text-xs text-muted-foreground mt-0.5 truncate">{String(check.value)}</p>}
        </div>
        {hasExtra && (open ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />)}
      </button>
      {open && hasExtra && (
        <div className="px-4 pb-4 pl-11 space-y-3">
          {check.description && <p className="text-xs text-muted-foreground">{check.description}</p>}
          {check.expected && <p className="text-xs"><span className="text-muted-foreground">Expected:</span> <span className="font-medium text-foreground">{String(check.expected)}</span></p>}

          {/* RECOMMENDATION */}
          {check.recommendation && (
            <div className={`p-3 rounded-lg border ${check.status === "fail" ? "bg-red-50/50 border-red-200" : check.status === "warning" ? "bg-orange-50/50 border-orange-200" : "bg-green-50/50 border-green-200"}`}>
              <div className="flex items-start gap-2">
                <Lightbulb className={`h-4 w-4 shrink-0 mt-0.5 ${check.status === "fail" ? "text-red-500" : check.status === "warning" ? "text-orange-500" : "text-green-500"}`} />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground leading-relaxed">{check.recommendation}</p>
                </div>
              </div>
            </div>
          )}

          {/* CODE SNIPPET */}
          {check.codeSnippet && (
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Implementation</span>
                <CopyButton text={check.codeSnippet} />
              </div>
              <pre className="text-[11px] bg-zinc-900 text-zinc-100 p-3 rounded-lg overflow-x-auto font-mono leading-relaxed">
                <code>{check.codeSnippet}</code>
              </pre>
            </div>
          )}

          {/* LEARN MORE LINK */}
          {check.learnMoreUrl && (
            <a href={check.learnMoreUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 hover:underline font-medium">
              <ExternalLink className="h-3 w-3" />Learn more →
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// CATEGORY PANEL
// ============================================================
function CategoryPanel({ category }: { category: AuditCategory }) {
  return (
    <Card className="shadow-sm border-zinc-200">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          <ScoreRing score={category.score} size={56} strokeWidth={5} />
          <div>
            <CardTitle className="text-base">{category.label}</CardTitle>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" />{category.passCount} passed</span>
              {category.failCount > 0 && <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-500" />{category.failCount} failed</span>}
              {category.warningCount > 0 && <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-orange-500" />{category.warningCount} warnings</span>}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border-t border-border">
          {category.checks.map((check) => <CheckRow key={check.id} check={check} />)}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// RECOMMENDATIONS PANEL — priority fix list
// ============================================================
function RecommendationsPanel({ categories }: { categories: AuditCategory[] }) {
  const allIssues = categories.flatMap((cat) =>
    cat.checks
      .filter((c) => c.status === "fail" || c.status === "warning")
      .map((c) => ({ ...c, categoryLabel: cat.label, categoryName: cat.name }))
  )

  // Sort by severity: critical > major > minor > info, then fails before warnings
  const severityOrder: Record<string, number> = { critical: 0, major: 1, minor: 2, info: 3 }
  const statusOrder: Record<string, number> = { fail: 0, warning: 1 }
  allIssues.sort((a, b) => {
    const sevDiff = (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3)
    if (sevDiff !== 0) return sevDiff
    return (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2)
  })

  const critical = allIssues.filter((i) => i.severity === "critical")
  const major = allIssues.filter((i) => i.severity === "major")
  const minor = allIssues.filter((i) => i.severity === "minor" || i.severity === "info")

  const sections = [
    { items: critical, label: "Critical Fixes", description: "These issues are actively hurting your rankings", color: "text-red-600", borderColor: "border-red-200", bgColor: "bg-red-50/50" },
    { items: major, label: "Quick Wins", description: "High-impact fixes that are relatively easy to implement", color: "text-orange-600", borderColor: "border-orange-200", bgColor: "bg-orange-50/50" },
    { items: minor, label: "Nice to Have", description: "Minor improvements for a polished site", color: "text-yellow-600", borderColor: "border-yellow-200", bgColor: "bg-yellow-50/50" },
  ].filter((s) => s.items.length > 0)

  if (allIssues.length === 0) {
    return (
      <Card className="shadow-sm border-zinc-200">
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <p className="text-lg font-semibold text-foreground">All checks passed!</p>
          <p className="text-sm text-muted-foreground mt-1">No actionable issues found. Your site is in great shape.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="p-4 bg-muted/30 rounded-lg flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-orange-500" />
          <span className="text-sm font-semibold text-foreground">{allIssues.length} issues found</span>
        </div>
        {critical.length > 0 && <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 font-medium">{critical.length} critical</span>}
        {major.length > 0 && <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 font-medium">{major.length} major</span>}
        {minor.length > 0 && <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700 font-medium">{minor.length} minor</span>}
      </div>

      {sections.map((section) => (
        <Card key={section.label} className={`shadow-sm border ${section.borderColor}`}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm ${section.color} flex items-center gap-2`}>
              <ArrowRight className="h-4 w-4" />
              {section.label}
              <span className="text-xs font-normal text-muted-foreground">— {section.description}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-t border-border/50">
              {section.items.map((issue) => (
                <RecommendationRow key={`${issue.categoryName}-${issue.id}`} issue={issue} />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function RecommendationRow({ issue }: { issue: AuditCheck & { categoryLabel: string; categoryName: string } }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-border/30 last:border-b-0">
      <button className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors" onClick={() => setOpen(!open)}>
        <StatusIcon status={issue.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-foreground">{issue.title}</span>
            <SeverityBadge severity={issue.severity} />
            <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-muted/50 rounded">{issue.categoryLabel}</span>
          </div>
          {issue.value && <p className="text-xs text-muted-foreground mt-0.5 truncate">{String(issue.value)}</p>}
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pl-11 space-y-3">
          {issue.recommendation && (
            <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-200">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-foreground leading-relaxed">{issue.recommendation}</p>
              </div>
            </div>
          )}
          {issue.codeSnippet && (
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Implementation</span>
                <CopyButton text={issue.codeSnippet} />
              </div>
              <pre className="text-[11px] bg-zinc-900 text-zinc-100 p-3 rounded-lg overflow-x-auto font-mono leading-relaxed">
                <code>{issue.codeSnippet}</code>
              </pre>
            </div>
          )}
          {issue.learnMoreUrl && (
            <a href={issue.learnMoreUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 hover:underline font-medium">
              <ExternalLink className="h-3 w-3" />Learn more →
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// CONTENT SUMMARY PANEL
// ============================================================
function ContentSummaryPanel({ data }: { data: ContentAnalysisData }) {
  const readabilityColor = data.readabilityScore >= 60 ? "text-green-600" : data.readabilityScore >= 40 ? "text-orange-600" : "text-red-600"

  return (
    <Card className="shadow-sm border-zinc-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-orange-500" />Content Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold text-foreground">{data.wordCount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Words</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold text-foreground flex items-center justify-center gap-1"><Clock className="h-4 w-4" />{data.readingTimeMinutes}</p>
            <p className="text-xs text-muted-foreground">Min Read</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className={`text-2xl font-bold ${readabilityColor}`}>{data.readabilityScore}</p>
            <p className="text-xs text-muted-foreground">Readability</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold text-foreground">{data.sentenceCount}</p>
            <p className="text-xs text-muted-foreground">Sentences</p>
          </div>
        </div>
        <div className="p-3 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground mb-1">Reading Level</p>
          <p className="text-sm font-medium text-foreground">{data.readabilityGrade}</p>
          <p className="text-xs text-muted-foreground mt-1">{data.avgWordsPerSentence} words/sentence avg · {data.paragraphCount} paragraphs</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-orange-500" />Top Keywords
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {data.topKeywords.map((kw, i) => (
              <div key={kw.word} className="flex items-center justify-between px-3 py-1.5 rounded bg-muted/30 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                  <span className="font-medium text-foreground truncate">{kw.word}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground">{kw.count}×</span>
                  <span className="text-xs font-mono text-orange-600 w-12 text-right">{kw.density}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// SOCIAL PREVIEW PANEL
// ============================================================
function SocialPreviewPanel({ data, pageUrl }: { data: SocialPreviewData; pageUrl: string }) {
  const { og, twitter } = data
  return (
    <Card className="shadow-sm border-zinc-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Share2 className="h-4 w-4 text-orange-500" />Social Sharing Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Globe className="h-3 w-3" /> Facebook / Open Graph</p>
          <div className="border border-zinc-300 rounded-lg overflow-hidden bg-zinc-50">
            {og.image && (
              <div className="w-full h-40 bg-zinc-200 flex items-center justify-center overflow-hidden">
                <img src={og.image} alt="OG Preview" className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
              </div>
            )}
            <div className="p-3">
              <p className="text-[10px] uppercase text-zinc-500 tracking-wide">{og.siteName || new URL(pageUrl).hostname}</p>
              <p className="text-sm font-bold text-zinc-900 leading-tight mt-0.5">{og.title || "No OG title set"}</p>
              <p className="text-xs text-zinc-600 mt-1 line-clamp-2">{og.description || "No OG description set"}</p>
            </div>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><ExternalLink className="h-3 w-3" /> X / Twitter</p>
          <div className="border border-zinc-300 rounded-2xl overflow-hidden bg-zinc-50">
            {(twitter.image || og.image) && (
              <div className="w-full h-36 bg-zinc-200 flex items-center justify-center overflow-hidden">
                <img src={twitter.image || og.image || ""} alt="Twitter Preview" className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
              </div>
            )}
            <div className="p-3">
              <p className="text-sm font-bold text-zinc-900 leading-tight">{twitter.title || og.title || "No title set"}</p>
              <p className="text-xs text-zinc-600 mt-1 line-clamp-2">{twitter.description || og.description || "No description set"}</p>
              <p className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1">
                <ExternalLink className="h-2.5 w-2.5" />{new URL(pageUrl).hostname}
              </p>
            </div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
          Twitter card type: <span className="font-mono">{twitter.card || "not set"}</span>
          {twitter.site && <> · Handle: <span className="font-mono">{twitter.site}</span></>}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// PAGE RESOURCES PANEL
// ============================================================
function PageResourcesPanel({ data }: { data: PageResourcesData }) {
  const [showAll, setShowAll] = useState(false)
  return (
    <Card className="shadow-sm border-zinc-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileCode className="h-4 w-4 text-orange-500" />Page Resources
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "HTML Size", value: `${data.htmlSizeKb} KB`, icon: FileText },
            { label: "Scripts", value: data.totalScripts, icon: FileCode },
            { label: "Stylesheets", value: data.totalStylesheets, icon: FileText },
            { label: "Images", value: data.totalImages, icon: ImageIcon },
            { label: "Fonts", value: data.totalFonts, icon: FileText },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-lg bg-muted/50 text-center">
              <item.icon className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold text-foreground">{item.value}</p>
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowAll(!showAll)} className="w-full text-xs">
          {showAll ? "Hide Details" : `Show All Resources (${data.totalScripts + data.totalStylesheets + data.totalImages} items)`}
        </Button>
        {showAll && (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {data.scripts.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Scripts ({data.totalScripts})</p>
                {data.scripts.map((s, i) => (
                  <div key={i} className="text-xs py-1 px-2 bg-muted/20 rounded mb-0.5 flex items-center gap-2">
                    <span className="font-mono truncate flex-1">{s.src.split("/").pop()}</span>
                    {s.async && <span className="text-green-600 font-medium">async</span>}
                    {s.defer && <span className="text-blue-600 font-medium">defer</span>}
                    {!s.async && !s.defer && <span className="text-red-500 font-medium">blocking</span>}
                  </div>
                ))}
              </div>
            )}
            {data.stylesheets.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Stylesheets ({data.totalStylesheets})</p>
                {data.stylesheets.map((s, i) => (
                  <div key={i} className="text-xs py-1 px-2 bg-muted/20 rounded mb-0.5 font-mono truncate">{s.href.split("/").pop()}</div>
                ))}
              </div>
            )}
            {data.images.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Images ({data.totalImages})</p>
                {data.images.slice(0, 20).map((img, i) => (
                  <div key={i} className="text-xs py-1 px-2 bg-muted/20 rounded mb-0.5 flex items-center gap-2">
                    <span className="font-mono truncate flex-1">{img.src.split("/").pop() || "(empty src)"}</span>
                    {img.hasAlt ? <span className="text-green-600">✓ alt</span> : <span className="text-red-500">✗ alt</span>}
                  </div>
                ))}
                {data.images.length > 20 && <p className="text-xs text-muted-foreground pl-2">...and {data.images.length - 20} more</p>}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================
// MAIN PAGE — with URL query param auto-populate
// ============================================================
export default function Home() {
  const searchParams = useSearchParams()
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AuditResult | null>(null)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<string>("on-page")
  const [activePanel, setActivePanel] = useState<string>("checks")
  const reportRef = useRef<HTMLDivElement>(null)

  // Auto-populate URL from query params (e.g., ?url=https://example.com)
  useEffect(() => {
    const paramUrl = searchParams.get("url")
    if (paramUrl) {
      setUrl(paramUrl)
    }
  }, [searchParams])

  const runAudit = async () => {
    if (!url) return
    setLoading(true)
    setError("")
    setResult(null)

    try {
      const response = await fetch(`${window.location.origin}/api/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Audit failed")
      setResult(data)
      setActiveTab("on-page")
      setActivePanel("checks")
    } catch {
      setError("Failed to audit this site. Please check the URL and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => { window.print() }
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter") runAudit() }

  const panelTabs = [
    { id: "checks", label: "Audit Checks", icon: CheckCircle },
    { id: "recommendations", label: "Recommendations", icon: Lightbulb },
    { id: "content", label: "Content", icon: BookOpen },
    { id: "social", label: "Social Preview", icon: Share2 },
    { id: "resources", label: "Resources", icon: FileCode },
  ]

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 bg-background min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">SEO Auditor</h2>
        <p className="text-muted-foreground">Enter a URL to run a comprehensive SEO analysis across 60 checks, including AEO &amp; GEO.</p>
      </div>

      {/* Input */}
      <div className="flex gap-4 items-start p-6 bg-card rounded-xl shadow-sm border border-border">
        <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="https://example.com" aria-label="URL to audit"
          className="flex-1 px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all bg-background text-foreground" />
        <Button onClick={runAudit} disabled={loading} size="lg" className="h-[50px] bg-orange-500 hover:bg-orange-600 text-white gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {loading ? "Analyzing..." : "Audit Site"}
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 border border-red-100" role="alert">
          <AlertTriangle className="h-5 w-5" />{error}
        </div>
      )}

      {loading && <AuditResultsSkeleton />}

      {result && !loading && (
        <div className="space-y-6" ref={reportRef}>
          {/* Overall Score + Category Summary */}
          <div className="flex flex-col md:flex-row gap-6 items-stretch">
            <Card className="shadow-sm border-zinc-200 flex-shrink-0">
              <CardContent className="p-6 flex flex-col items-center justify-center gap-3">
                <ScoreRing score={result.score} size={120} strokeWidth={8} />
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">Overall Score</p>
                  {result.meta && <p className="text-xs text-muted-foreground mt-1">{result.meta.fetchTimeMs}ms · {result.meta.httpStatus} OK</p>}
                </div>
                <Button variant="outline" size="sm" onClick={handlePrint} className="mt-2 text-xs gap-1.5">
                  <Printer className="h-3 w-3" /> Print Report
                </Button>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 flex-1">
              {result.categories?.map((cat: AuditCategory) => (
                <button key={cat.name}
                  onClick={() => { setActiveTab(cat.name); setActivePanel("checks") }}
                  className={`p-4 rounded-xl border transition-all text-left ${activeTab === cat.name && activePanel === "checks"
                    ? "border-orange-400 bg-orange-50/50 shadow-sm" : "border-zinc-200 hover:border-zinc-300 bg-card"
                    }`}>
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    {categoryIcons[cat.name]}
                    <span className="text-[10px] font-medium uppercase tracking-wider">{cat.label}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-2xl font-bold ${cat.score >= 80 ? "text-green-600" : cat.score >= 60 ? "text-orange-600" : "text-red-600"}`}>{cat.score}</span>
                    <div className="text-right text-[10px] text-muted-foreground leading-tight">
                      <div className="text-green-600">{cat.passCount} pass</div>
                      {cat.failCount > 0 && <div className="text-red-600">{cat.failCount} fail</div>}
                      {cat.warningCount > 0 && <div className="text-orange-600">{cat.warningCount} warn</div>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Panel Tabs */}
          <div className="flex gap-1 bg-muted/50 p-1 rounded-lg overflow-x-auto">
            {panelTabs.map((tab) => (
              <button key={tab.id} onClick={() => setActivePanel(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activePanel === tab.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}>
                <tab.icon className="h-3.5 w-3.5" />{tab.label}
                {tab.id === "recommendations" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
                    {result.categories?.reduce((t, c) => t + c.failCount + c.warningCount, 0)}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Panel Content */}
          {activePanel === "checks" && result.categories?.map((cat: AuditCategory) => (
            activeTab === cat.name && <CategoryPanel key={cat.name} category={cat} />
          ))}

          {activePanel === "recommendations" && result.categories && (
            <RecommendationsPanel categories={result.categories} />
          )}

          {activePanel === "content" && result.contentAnalysis && (
            <ContentSummaryPanel data={result.contentAnalysis} />
          )}

          {activePanel === "social" && result.socialPreview && result.meta && (
            <SocialPreviewPanel data={result.socialPreview} pageUrl={result.meta.url} />
          )}

          {activePanel === "resources" && result.pageResources && (
            <PageResourcesPanel data={result.pageResources} />
          )}

          {/* Footer */}
          {result.meta && (
            <div className="text-center text-xs text-muted-foreground space-y-1 pb-4">
              <p>Audited: <span className="font-mono">{result.meta.url}</span></p>
              <p>{new Date(result.meta.timestamp).toLocaleString()} · {result.categories?.reduce((t, c) => t + c.checks.length, 0)} checks performed</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
