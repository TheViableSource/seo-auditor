/**
 * Tasks Engine — Analyzes data from integrations + audits and generates
 * prioritized, actionable SEO tasks.
 *
 * Each task has: id, priority, category, source, title, description, action, siteId
 */

import {
    getSites,
    getAuditsForSite,
    getKeywordsForSite,
    type StoredSite,
    type StoredAudit,
    type StoredKeyword,
} from "@/lib/local-storage"

// ─── Types ───────────────────────────────────────────────────────────
export type TaskPriority = "critical" | "high" | "medium" | "low"
export type TaskSource = "audit" | "gsc" | "ga" | "gmb" | "general"
export type TaskCategory =
    | "technical"
    | "content"
    | "performance"
    | "local-seo"
    | "reviews"
    | "keywords"
    | "mobile"
    | "schema"

export interface ActionTask {
    id: string
    priority: TaskPriority
    category: TaskCategory
    source: TaskSource
    title: string
    description: string
    action: string
    impact: string
    siteId: string
    siteDomain: string
}

// ─── Priority weight for sorting ──────────────────────────────────
const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
}

// ─── Generate tasks from audit data ───────────────────────────────
function generateAuditTasks(site: StoredSite, audit: StoredAudit): ActionTask[] {
    const tasks: ActionTask[] = []
    const domain = site.domain

    // Overall score tasks
    if (audit.score < 50) {
        tasks.push({
            id: `${site.id}-audit-critical-score`,
            priority: "critical",
            category: "technical",
            source: "audit",
            title: `Critical: Overall score is ${audit.score}/100`,
            description: `Your site ${domain} scored ${audit.score}/100 — well below the 80+ target. Multiple areas need immediate attention.`,
            action: "Run a full audit and address all critical and major issues first.",
            impact: "Fixing critical issues can improve your score by 20-40 points.",
            siteId: site.id,
            siteDomain: domain,
        })
    } else if (audit.score < 80) {
        tasks.push({
            id: `${site.id}-audit-improve-score`,
            priority: "high",
            category: "technical",
            source: "audit",
            title: `Improve audit score from ${audit.score} to 80+`,
            description: `Your site scores ${audit.score}/100. Target 80+ for competitive rankings.`,
            action: "Review the latest audit report and fix high-priority issues.",
            impact: "Reaching 80+ signals strong technical health to search engines.",
            siteId: site.id,
            siteDomain: domain,
        })
    }

    // Issue count tasks
    if (audit.issuesCount > 10) {
        tasks.push({
            id: `${site.id}-audit-many-issues`,
            priority: audit.issuesCount > 20 ? "critical" : "high",
            category: "technical",
            source: "audit",
            title: `${audit.issuesCount} issues found in latest audit`,
            description: `Your latest audit found ${audit.issuesCount} issues across multiple categories.`,
            action: "Open the audit report, sort by severity, and fix critical issues first.",
            impact: "Each fixed issue improves crawlability and ranking potential.",
            siteId: site.id,
            siteDomain: domain,
        })
    }

    // Category-specific tasks from full categories
    if (audit.fullCategories) {
        for (const cat of audit.fullCategories) {
            if (cat.score < 60) {
                const catLabel = cat.label || cat.name
                tasks.push({
                    id: `${site.id}-audit-cat-${cat.name}`,
                    priority: cat.score < 40 ? "critical" : "high",
                    category: (cat.name === "technical-seo" || cat.name === "performance"
                        ? "technical"
                        : cat.name === "on-page" || cat.name === "content"
                            ? "content"
                            : cat.name === "mobile"
                                ? "mobile"
                                : cat.name === "structured-data"
                                    ? "schema"
                                    : "technical") as TaskCategory,
                    source: "audit",
                    title: `${catLabel} score is ${Math.round(cat.score)}%`,
                    description: `The ${catLabel} category scored ${Math.round(cat.score)}% with ${cat.failCount} failures and ${cat.warningCount} warnings.`,
                    action: `Review the ${catLabel} section in your audit report and fix the ${cat.failCount} failed checks.`,
                    impact: `Improving ${catLabel} directly affects search engine ranking factors.`,
                    siteId: site.id,
                    siteDomain: domain,
                })
            }
        }
    }

    return tasks
}

// ─── Generate tasks from keyword data ─────────────────────────────
function generateKeywordTasks(site: StoredSite, keywords: StoredKeyword[]): ActionTask[] {
    const tasks: ActionTask[] = []
    const domain = site.domain

    if (keywords.length === 0) {
        tasks.push({
            id: `${site.id}-kw-none`,
            priority: "medium",
            category: "keywords",
            source: "general",
            title: "No keywords tracked yet",
            description: "Start tracking keywords to monitor your search positions over time.",
            action: "Go to Rankings → Keywords tab and add your target keywords.",
            impact: "Keyword tracking helps you measure SEO progress and identify opportunities.",
            siteId: site.id,
            siteDomain: domain,
        })
    }

    // Keywords on page 2 (positions 11-20) — quick wins
    const page2Keywords = keywords.filter(
        (kw) => kw.currentRank && kw.currentRank >= 11 && kw.currentRank <= 20
    )
    if (page2Keywords.length > 0) {
        tasks.push({
            id: `${site.id}-kw-page2`,
            priority: "high",
            category: "keywords",
            source: "gsc",
            title: `${page2Keywords.length} keyword${page2Keywords.length > 1 ? "s" : ""} on page 2 — quick wins`,
            description: `These keywords are close to page 1: ${page2Keywords.slice(0, 3).map((k) => `"${k.keyword}" (#${k.currentRank})`).join(", ")}${page2Keywords.length > 3 ? ` and ${page2Keywords.length - 3} more` : ""}.`,
            action: "Optimize content, improve internal linking, and build topical authority for these terms.",
            impact: "Moving from page 2 to page 1 can increase click-through rate by 10x.",
            siteId: site.id,
            siteDomain: domain,
        })
    }

    // Keywords dropping in rank
    const droppingKeywords = keywords.filter(
        (kw) => kw.previousRank && kw.currentRank && kw.currentRank > kw.previousRank
    )
    if (droppingKeywords.length > 0) {
        tasks.push({
            id: `${site.id}-kw-dropping`,
            priority: "high",
            category: "keywords",
            source: "gsc",
            title: `${droppingKeywords.length} keyword${droppingKeywords.length > 1 ? "s" : ""} losing rank`,
            description: `Some keywords are dropping: ${droppingKeywords.slice(0, 3).map((k) => `"${k.keyword}" (${k.previousRank}→${k.currentRank})`).join(", ")}.`,
            action: "Review content freshness, check for new competitors, and update pages targeting these terms.",
            impact: "Stopping rank drops preserves existing traffic and prevents further decline.",
            siteId: site.id,
            siteDomain: domain,
        })
    }

    return tasks
}

// ─── Generate tasks from GA data (passed in from API) ─────────────
export function generateGATasks(
    site: StoredSite,
    gaData: {
        overview?: { sessions: number; bounceRate: number; avgSessionDuration: number }
        topPages?: { path: string; bounceRate: number; views: number }[]
    }
): ActionTask[] {
    const tasks: ActionTask[] = []
    const domain = site.domain

    if (gaData.overview) {
        // High bounce rate
        if (gaData.overview.bounceRate > 0.7) {
            tasks.push({
                id: `${site.id}-ga-bounce`,
                priority: "high",
                category: "content",
                source: "ga",
                title: `Bounce rate is ${Math.round(gaData.overview.bounceRate * 100)}%`,
                description: `Over ${Math.round(gaData.overview.bounceRate * 100)}% of visitors leave without interacting. This signals content mismatch or poor UX.`,
                action: "Improve page load speed, add compelling CTAs, and ensure content matches search intent.",
                impact: "Reducing bounce rate improves engagement signals that search engines use for ranking.",
                siteId: site.id,
                siteDomain: domain,
            })
        }

        // Low session duration
        if (gaData.overview.avgSessionDuration < 30) {
            tasks.push({
                id: `${site.id}-ga-duration`,
                priority: "medium",
                category: "content",
                source: "ga",
                title: "Average session duration is under 30 seconds",
                description: `Visitors spend only ${Math.round(gaData.overview.avgSessionDuration)}s on average. Content may not be engaging enough.`,
                action: "Add more engaging content: videos, infographics, interactive elements, and internal links to keep users exploring.",
                impact: "Longer sessions signal quality content to search engines.",
                siteId: site.id,
                siteDomain: domain,
            })
        }
    }

    // High-bounce pages
    if (gaData.topPages) {
        const highBouncPages = gaData.topPages.filter(
            (p) => p.bounceRate > 0.8 && p.views > 50
        )
        if (highBouncPages.length > 0) {
            tasks.push({
                id: `${site.id}-ga-page-bounce`,
                priority: "medium",
                category: "content",
                source: "ga",
                title: `${highBouncPages.length} high-traffic page${highBouncPages.length > 1 ? "s" : ""} with 80%+ bounce rate`,
                description: `Pages with high views but high bounce: ${highBouncPages.slice(0, 3).map((p) => `${p.path} (${Math.round(p.bounceRate * 100)}%)`).join(", ")}.`,
                action: "Review these pages for content-intent mismatch, slow loading, or missing CTAs.",
                impact: "Fixing high-bounce pages on popular content has the biggest impact on overall engagement.",
                siteId: site.id,
                siteDomain: domain,
            })
        }
    }

    return tasks
}

// ─── Generate tasks from GMB data (passed in from API) ────────────
export function generateGMBTasks(
    site: StoredSite,
    gmbData: {
        profile?: {
            description: string
            hasHours: boolean
            category: string
            phone: string
            website: string
        }
        stats?: { totalReviews: number; avgRating: number; unansweredReviews: number }
    }
): ActionTask[] {
    const tasks: ActionTask[] = []
    const domain = site.domain

    if (gmbData.profile) {
        if (!gmbData.profile.description) {
            tasks.push({
                id: `${site.id}-gmb-desc`,
                priority: "high",
                category: "local-seo",
                source: "gmb",
                title: "Business description is empty",
                description: "Your Google Business Profile has no description. This is a missed opportunity for local SEO.",
                action: "Add a keyword-rich business description (750 chars max) highlighting your services and location.",
                impact: "A complete profile ranks higher in local search results and Google Maps.",
                siteId: site.id,
                siteDomain: domain,
            })
        }

        if (!gmbData.profile.hasHours) {
            tasks.push({
                id: `${site.id}-gmb-hours`,
                priority: "high",
                category: "local-seo",
                source: "gmb",
                title: "Business hours not set",
                description: "Your Google Business Profile doesn't have business hours configured.",
                action: "Set your regular business hours and any special hours (holidays, etc.).",
                impact: "Business hours help customers and improve your local search visibility.",
                siteId: site.id,
                siteDomain: domain,
            })
        }
    }

    if (gmbData.stats) {
        if (gmbData.stats.unansweredReviews > 0) {
            tasks.push({
                id: `${site.id}-gmb-reviews-reply`,
                priority: gmbData.stats.unansweredReviews > 3 ? "critical" : "high",
                category: "reviews",
                source: "gmb",
                title: `${gmbData.stats.unansweredReviews} unanswered review${gmbData.stats.unansweredReviews > 1 ? "s" : ""}`,
                description: `You have ${gmbData.stats.unansweredReviews} reviews without replies. Responding to reviews shows engagement.`,
                action: "Reply to each review — thank positive reviewers and address negative feedback professionally.",
                impact: "Responding to reviews improves local ranking signals and builds customer trust.",
                siteId: site.id,
                siteDomain: domain,
            })
        }

        if (gmbData.stats.avgRating < 4.0 && gmbData.stats.totalReviews > 0) {
            tasks.push({
                id: `${site.id}-gmb-rating`,
                priority: "high",
                category: "reviews",
                source: "gmb",
                title: `Average rating is ${gmbData.stats.avgRating}/5`,
                description: `Your average rating of ${gmbData.stats.avgRating} is below the 4.0 threshold that most customers look for.`,
                action: "Address negative feedback, improve service quality, and encourage satisfied customers to leave reviews.",
                impact: "Businesses with 4.0+ ratings get significantly more clicks in local search results.",
                siteId: site.id,
                siteDomain: domain,
            })
        }

        if (gmbData.stats.totalReviews < 5) {
            tasks.push({
                id: `${site.id}-gmb-few-reviews`,
                priority: "medium",
                category: "reviews",
                source: "gmb",
                title: `Only ${gmbData.stats.totalReviews} review${gmbData.stats.totalReviews !== 1 ? "s" : ""}`,
                description: "Fewer than 5 reviews makes your business look less established in search results.",
                action: "Create a review link and send it to recent customers. Add it to receipts or follow-up emails.",
                impact: "More reviews improve click-through rates and local pack rankings.",
                siteId: site.id,
                siteDomain: domain,
            })
        }
    }

    return tasks
}

// ─── General best-practice tasks ──────────────────────────────────
function generateGeneralTasks(site: StoredSite): ActionTask[] {
    const tasks: ActionTask[] = []
    const domain = site.domain
    const audits = getAuditsForSite(site.id)

    // No audits run
    if (audits.length === 0) {
        tasks.push({
            id: `${site.id}-gen-no-audit`,
            priority: "critical",
            category: "technical",
            source: "general",
            title: "No audits have been run",
            description: `${domain} hasn't been audited yet. Run an audit to discover issues.`,
            action: "Go to Quick Audit and run a full audit on your site.",
            impact: "An audit reveals technical issues, content gaps, and optimization opportunities.",
            siteId: site.id,
            siteDomain: domain,
        })
    }

    // Stale audit (> 7 days old)
    if (audits.length > 0) {
        const latest = audits[0]
        const daysSinceAudit = Math.floor(
            (Date.now() - new Date(latest.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        )
        if (daysSinceAudit > 7) {
            tasks.push({
                id: `${site.id}-gen-stale-audit`,
                priority: "medium",
                category: "technical",
                source: "general",
                title: `Last audit was ${daysSinceAudit} days ago`,
                description: "Regular audits help track progress and catch new issues early.",
                action: "Run a fresh audit to check for changes since your last scan.",
                impact: "Weekly audits help you stay ahead of technical debt and competitor changes.",
                siteId: site.id,
                siteDomain: domain,
            })
        }
    }

    return tasks
}

// ─── Main entry point ─────────────────────────────────────────────
export function generateTasksForSite(
    siteId: string,
    gaData?: Parameters<typeof generateGATasks>[1],
    gmbData?: Parameters<typeof generateGMBTasks>[1]
): ActionTask[] {
    const sites = getSites()
    const site = sites.find((s) => s.id === siteId)
    if (!site) return []

    const audits = getAuditsForSite(siteId)
    const keywords = getKeywordsForSite(siteId)
    const latestAudit = audits[0] || null

    const allTasks: ActionTask[] = [
        ...generateGeneralTasks(site),
        ...(latestAudit ? generateAuditTasks(site, latestAudit) : []),
        ...generateKeywordTasks(site, keywords),
        ...(gaData ? generateGATasks(site, gaData) : []),
        ...(gmbData ? generateGMBTasks(site, gmbData) : []),
    ]

    // Sort by priority
    allTasks.sort((a, b) => PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority])

    return allTasks
}
