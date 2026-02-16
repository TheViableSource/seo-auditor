"use client"

import { useState } from "react"
import Link from "next/link"
import {
    ArrowLeft,
    BookOpen,
    Search,
    ChevronDown,
    ChevronRight,
    ExternalLink,
    Lightbulb,
    Sparkles,
    BarChart3,
    Shield,
    Code,
    Globe,
    FileText,
    Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

// ── SEO Knowledge Base ──
// Glossary + how-to articles for users

interface GlossaryTerm {
    term: string
    definition: string
    category: string
}

interface HowToArticle {
    title: string
    icon: React.ReactNode
    category: string
    steps: string[]
    tip?: string
}

const GLOSSARY: GlossaryTerm[] = [
    { term: "SEO", definition: "Search Engine Optimization — the practice of optimizing web pages to rank higher in search engine results.", category: "Basics" },
    { term: "SERP", definition: "Search Engine Results Page — the page displayed by search engines in response to a query.", category: "Basics" },
    { term: "Backlink", definition: "A link from one website to another. Backlinks from high-authority sites improve your rankings.", category: "Off-Page" },
    { term: "Domain Authority", definition: "A score (1–100) predicting how likely a website is to rank in SERPs. Higher is better.", category: "Metrics" },
    { term: "Crawlability", definition: "How easily search engine bots can discover and index your pages.", category: "Technical" },
    { term: "Meta Description", definition: "An HTML tag that provides a brief summary of a page. Shown in search results below the title.", category: "On-Page" },
    { term: "Title Tag", definition: "The HTML <title> element that defines the title of a page, displayed in browser tabs and SERPs.", category: "On-Page" },
    { term: "Alt Text", definition: "Descriptive text for images that helps search engines understand image content and improves accessibility.", category: "On-Page" },
    { term: "Schema Markup", definition: "Structured data added to HTML to help search engines understand page content and display rich results.", category: "Technical" },
    { term: "Core Web Vitals", definition: "A set of real-world, user-centered metrics (LCP, FID, CLS) that measure page experience quality.", category: "Technical" },
    { term: "Canonical URL", definition: "The preferred URL for a page when duplicate content exists. Prevents duplicate content penalties.", category: "Technical" },
    { term: "Robots.txt", definition: "A file that tells search engine crawlers which pages to access or avoid on your site.", category: "Technical" },
    { term: "Sitemap", definition: "An XML file listing all important pages on your site to help search engines discover and index them.", category: "Technical" },
    { term: "301 Redirect", definition: "A permanent redirect from one URL to another. Passes ~90-99% of link equity to the new URL.", category: "Technical" },
    { term: "Keyword Density", definition: "The percentage of times a keyword appears on a page relative to total word count. Aim for 1-2%.", category: "On-Page" },
    { term: "Long-tail Keyword", definition: "A longer, more specific keyword phrase that typically has lower volume but higher conversion intent.", category: "Basics" },
    { term: "Bounce Rate", definition: "The percentage of visitors who leave after viewing only one page. Lower is generally better.", category: "Metrics" },
    { term: "Internal Link", definition: "A hyperlink that points to another page on the same domain. Helps distribute page authority.", category: "On-Page" },
    { term: "Anchor Text", definition: "The clickable text of a hyperlink. Descriptive anchor text helps search engines understand linked content.", category: "On-Page" },
    { term: "Organic Traffic", definition: "Visitors who arrive at your site from unpaid search results.", category: "Metrics" },
    { term: "Local SEO", definition: "Optimization focused on improving visibility for location-based searches.", category: "Basics" },
    { term: "Hreflang", definition: "An HTML attribute that tells search engines which language and region a page targets.", category: "Technical" },
    { term: "SSL/TLS", definition: "Security protocols (HTTPS) that encrypt data between browser and server. A Google ranking factor.", category: "Technical" },
    { term: "Link Equity", definition: "The value passed from one page to another through hyperlinks. Also called 'link juice.'", category: "Off-Page" },
]

const HOW_TO_ARTICLES: HowToArticle[] = [
    {
        title: "How to Improve Your SEO Score",
        icon: <Sparkles className="h-5 w-5 text-orange-500" />,
        category: "Getting Started",
        steps: [
            "Run an audit on your site using the Quick Audit page",
            "Review the category breakdown to identify weak areas",
            "Focus on critical and major issues first (red/orange indicators)",
            "Use the AI Fix suggestions to get code-level recommendations",
            "Re-audit after making changes to track improvement",
        ],
        tip: "Scores above 80 are considered 'good'. Focus on bringing your weakest categories up first."
    },
    {
        title: "How to Fix Common On-Page Issues",
        icon: <FileText className="h-5 w-5 text-blue-500" />,
        category: "On-Page SEO",
        steps: [
            "Ensure every page has a unique, descriptive title tag (50-60 characters)",
            "Write compelling meta descriptions (150-160 characters) with a call to action",
            "Use one H1 tag per page with your primary keyword",
            "Add descriptive alt text to all images",
            "Include internal links to related pages (aim for 3-5 per page)",
            "Keep keyword density around 1-2% for your primary keyword",
        ],
    },
    {
        title: "How to Improve Technical SEO",
        icon: <Code className="h-5 w-5 text-violet-500" />,
        category: "Technical",
        steps: [
            "Ensure your site uses HTTPS everywhere",
            "Submit an XML sitemap to Google Search Console",
            "Check that robots.txt isn't blocking important pages",
            "Fix all 404 errors and set up 301 redirects for moved pages",
            "Implement schema markup for your content type (Article, Product, etc.)",
            "Optimize Core Web Vitals — compress images, minimize JavaScript",
        ],
    },
    {
        title: "How to Track Keyword Rankings",
        icon: <BarChart3 className="h-5 w-5 text-green-500" />,
        category: "Rankings",
        steps: [
            "Navigate to the Rankings page from the sidebar",
            "Select a site and add keywords you want to track",
            "Use 'Discover Keywords' to find keyword suggestions automatically",
            "Click 'Check Ranks' to get current positioning for all keywords",
            "Monitor the sparkline charts to see rank trends over time",
        ],
        tip: "Track 10-20 primary keywords and check ranks weekly for the best overview."
    },
    {
        title: "How to Use the SERP Simulator",
        icon: <Search className="h-5 w-5 text-teal-500" />,
        category: "Tools",
        steps: [
            "Go to the SERP Simulator page from the sidebar",
            "Enter your page title, URL, and meta description",
            "Preview exactly how your page will appear in Google search results",
            "Adjust title length (keep under 60 characters to avoid truncation)",
            "Adjust description (keep under 160 characters)",
            "Use the character counters to optimize length",
        ],
    },
    {
        title: "How to Generate Schema Markup",
        icon: <Globe className="h-5 w-5 text-indigo-500" />,
        category: "Tools",
        steps: [
            "Navigate to the Schema Generator from the sidebar",
            "Choose the schema type (Article, Product, FAQ, LocalBusiness, etc.)",
            "Fill in the required fields for your content type",
            "Copy the generated JSON-LD code",
            "Paste it into your page's <head> section or before </body>",
            "Validate with Google's Rich Results Test tool",
        ],
    },
    {
        title: "How to Analyze Internal Links",
        icon: <Zap className="h-5 w-5 text-amber-500" />,
        category: "Tools",
        steps: [
            "Go to the Internal Link Analyzer from the sidebar",
            "Enter the URL you want to analyze",
            "Toggle 'Deep Crawl' to scan up to 10 internal pages",
            "Review the link health score and broken link count",
            "Filter by type (internal, external, broken) to focus on issues",
            "Fix broken links and add internal links to orphan pages",
        ],
    },
    {
        title: "How to Set Up Competitor Analysis",
        icon: <Shield className="h-5 w-5 text-rose-500" />,
        category: "Rankings",
        steps: [
            "Go to the Rankings page and select a site",
            "Add competitor URLs in the Competitors section",
            "Click 'Audit Competitors' to fetch their scores",
            "Compare your category scores using the radar chart",
            "Identify categories where competitors outperform you",
            "Focus improvements on those specific categories",
        ],
    },
]

export default function KnowledgePage() {
    const [searchQuery, setSearchQuery] = useState("")
    const [expandedArticle, setExpandedArticle] = useState<number | null>(null)
    const [activeCategory, setActiveCategory] = useState("all")

    const glossaryCategories = Array.from(new Set(GLOSSARY.map(t => t.category)))
    const articleCategories = Array.from(new Set(HOW_TO_ARTICLES.map(a => a.category)))

    const filteredGlossary = GLOSSARY.filter(t =>
        (activeCategory === "all" || t.category === activeCategory) &&
        (t.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.definition.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    const filteredArticles = HOW_TO_ARTICLES.filter(a =>
        (activeCategory === "all" || a.category === activeCategory) &&
        (a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.steps.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())))
    )

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/dashboard">
                    <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                </Link>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <BookOpen className="h-7 w-7 text-orange-500" />
                        Knowledge Base
                    </h2>
                    <p className="text-muted-foreground">SEO glossary, how-to guides, and best practices</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search terms, articles, or topics..."
                    className="w-full pl-10 pr-4 py-3 border border-border rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-background text-foreground"
                />
            </div>

            {/* Category Filters */}
            <div className="flex gap-1.5 flex-wrap">
                <button
                    onClick={() => setActiveCategory("all")}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${activeCategory === "all" ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                    All
                </button>
                {[...glossaryCategories, ...articleCategories].filter((v, i, a) => a.indexOf(v) === i).map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${activeCategory === cat ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* How-To Articles */}
            {filteredArticles.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-amber-500" />
                        How-To Guides
                    </h3>
                    <div className="space-y-2">
                        {filteredArticles.map((article, i) => (
                            <Card key={i} className="shadow-sm">
                                <button
                                    onClick={() => setExpandedArticle(expandedArticle === i ? null : i)}
                                    className="w-full text-left"
                                >
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {article.icon}
                                            <div>
                                                <p className="font-medium text-sm">{article.title}</p>
                                                <p className="text-xs text-muted-foreground">{article.category} · {article.steps.length} steps</p>
                                            </div>
                                        </div>
                                        {expandedArticle === i ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                    </CardContent>
                                </button>
                                {expandedArticle === i && (
                                    <div className="px-4 pb-4 pt-0 border-t border-border/50">
                                        <ol className="space-y-2 mt-3">
                                            {article.steps.map((step, j) => (
                                                <li key={j} className="flex items-start gap-2.5 text-sm">
                                                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-50 dark:bg-orange-950/30 text-orange-500 text-xs font-bold flex items-center justify-center mt-0.5">
                                                        {j + 1}
                                                    </span>
                                                    <span className="text-muted-foreground">{step}</span>
                                                </li>
                                            ))}
                                        </ol>
                                        {article.tip && (
                                            <div className="mt-3 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 text-xs flex items-start gap-2">
                                                <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                                <span>{article.tip}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Glossary */}
            {filteredGlossary.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-violet-500" />
                        SEO Glossary ({filteredGlossary.length} terms)
                    </h3>
                    <div className="grid gap-2">
                        {filteredGlossary.map((term, i) => (
                            <div key={i} className="p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">{term.term}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{term.definition}</p>
                                    </div>
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">{term.category}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {filteredGlossary.length === 0 && filteredArticles.length === 0 && (
                <div className="text-center py-12">
                    <Search className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">No results found for &quot;{searchQuery}&quot;</p>
                </div>
            )}

            {/* External Resources */}
            <Card className="shadow-sm">
                <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-3">External Resources</h4>
                    <div className="grid sm:grid-cols-2 gap-2">
                        {[
                            { label: "Google Search Central", url: "https://developers.google.com/search" },
                            { label: "Google Rich Results Test", url: "https://search.google.com/test/rich-results" },
                            { label: "PageSpeed Insights", url: "https://pagespeed.web.dev/" },
                            { label: "Schema.org Documentation", url: "https://schema.org/" },
                        ].map((link) => (
                            <a
                                key={link.url}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                {link.label}
                            </a>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
