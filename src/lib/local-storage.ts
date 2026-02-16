// Local storage persistence layer
// Replaces mock-data.ts — swap to Prisma queries when DATABASE_URL is set

// ============================================================================
// TYPES
// ============================================================================

export interface StoredSite {
    id: string
    domain: string
    url: string
    name: string
    status: "active" | "pending" | "error"
    auditSchedule?: "manual" | "weekly" | "monthly"
    lastScheduledAudit?: string
    createdAt: string
}

export interface StoredCheck {
    title: string
    status: "pass" | "fail" | "warning" | "info"
    description: string
    recommendation?: string
    category: string
    categoryLabel: string
}

export interface StoredAudit {
    id: string
    siteId: string
    url: string
    domain: string
    score: number
    issuesCount: number
    categorySummary: { name: string; label: string; score: number; total: number; passed: number }[]
    failedChecks: StoredCheck[]
    fullCategories?: StoredFullCategory[]
    createdAt: string
}

/** Full category data — stores every check so past audits can be viewed in detail */
export interface StoredFullCategory {
    name: string
    label: string
    score: number
    checks: StoredFullCheck[]
    passCount: number
    failCount: number
    warningCount: number
}

export interface StoredFullCheck {
    id: string
    title: string
    description: string
    status: "pass" | "fail" | "warning" | "info"
    severity: "critical" | "major" | "minor" | "info"
    value?: string | number | null
    expected?: string | number | null
    details?: string
    recommendation?: string
    codeSnippet?: string
    learnMoreUrl?: string
}

export type UserTier = "free" | "starter" | "pro" | "agency"

export const TIER_LIMITS: Record<UserTier, { sites: number; keywords: number; label: string; pdfBranding: boolean }> = {
    free: { sites: 1, keywords: 5, label: "Free", pdfBranding: false },
    starter: { sites: 3, keywords: 20, label: "Starter", pdfBranding: false },
    pro: { sites: 5, keywords: 50, label: "Pro", pdfBranding: false },
    agency: { sites: Infinity, keywords: Infinity, label: "Agency", pdfBranding: true },
}

export interface StoredSettings {
    userName: string
    userEmail: string
    workspaceName: string
    tier: UserTier
    // Branding (Agency tier)
    brandLogo?: string       // base64 data-url
    brandName?: string       // e.g. "Acme Digital Agency"
    brandColor?: string      // hex, e.g. "#FF6B00"
    notifications: {
        auditComplete: boolean
        weeklyReport: boolean
        scoreDrops: boolean
        newIssues: boolean
        teamUpdates: boolean
    }
}

export interface StoredCompetitor {
    id: string
    siteId: string
    url: string
    domain: string
    name: string
    latestScore?: number
    latestCategories?: { name: string; label: string; score: number }[]
    createdAt: string
}

export interface StoredKeyword {
    id: string
    siteId: string
    keyword: string
    currentRank?: number | null
    previousRank?: number | null
    lastChecked?: string
    createdAt: string
}

export interface StoredRankSnapshot {
    id: string
    keywordId: string
    siteId: string
    rank: number | null
    checkedAt: string
}

// ============================================================================
// KEYS
// ============================================================================

const KEYS = {
    sites: "auditor:sites",
    audits: "auditor:audits",
    settings: "auditor:settings",
    competitors: "auditor:competitors",
    keywords: "auditor:keywords",
    ranks: "auditor:ranks",
} as const

// ============================================================================
// UTILITIES
// ============================================================================

function genId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function read<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback
    try {
        const raw = localStorage.getItem(key)
        return raw ? (JSON.parse(raw) as T) : fallback
    } catch {
        return fallback
    }
}

function write<T>(key: string, data: T): void {
    if (typeof window === "undefined") return
    localStorage.setItem(key, JSON.stringify(data))
}

// ============================================================================
// SITES
// ============================================================================

export function getSites(): StoredSite[] {
    return read<StoredSite[]>(KEYS.sites, [])
}

export function getSiteById(id: string): StoredSite | undefined {
    return getSites().find((s) => s.id === id)
}

export function getSiteByDomain(domain: string): StoredSite | undefined {
    return getSites().find((s) => s.domain === domain)
}

export function addSite(url: string, name?: string): StoredSite {
    const sites = getSites()
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`)
    const domain = parsed.hostname.replace(/^www\./, "")
    const fullUrl = parsed.origin

    // Return existing if already tracked
    const existing = sites.find((s) => s.domain === domain)
    if (existing) return existing

    const site: StoredSite = {
        id: genId(),
        domain,
        url: fullUrl,
        name: name || domain,
        status: "active",
        createdAt: new Date().toISOString(),
    }
    write(KEYS.sites, [...sites, site])
    return site
}

export function updateSite(id: string, updates: Partial<Pick<StoredSite, "name" | "status" | "auditSchedule" | "lastScheduledAudit">>): void {
    const sites = getSites().map((s) => (s.id === id ? { ...s, ...updates } : s))
    write(KEYS.sites, sites)
}

export function removeSite(id: string): void {
    write(KEYS.sites, getSites().filter((s) => s.id !== id))
    // Cascade: remove audits for this site
    const site = getSites().find((s) => s.id === id)
    if (site) {
        write(KEYS.audits, getAudits().filter((a) => a.siteId !== id))
    }
}

// ============================================================================
// AUDITS
// ============================================================================

export function getAudits(): StoredAudit[] {
    return read<StoredAudit[]>(KEYS.audits, [])
}

export function getAuditsForSite(siteId: string): StoredAudit[] {
    return getAudits().filter((a) => a.siteId === siteId)
}

export function getLatestAuditForSite(siteId: string): StoredAudit | undefined {
    const audits = getAuditsForSite(siteId)
    return audits.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
}

export function getAuditById(id: string): StoredAudit | undefined {
    return getAudits().find((a) => a.id === id)
}

export function saveAudit(
    url: string,
    score: number,
    issuesCount: number,
    categorySummary: StoredAudit["categorySummary"],
    failedChecks: StoredCheck[] = [],
    fullCategories?: StoredFullCategory[]
): StoredAudit {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`)
    const domain = parsed.hostname.replace(/^www\./, "")

    // Auto-register site if not tracked
    const site = addSite(url)

    const audit: StoredAudit = {
        id: genId(),
        siteId: site.id,
        url,
        domain,
        score,
        issuesCount,
        categorySummary,
        failedChecks,
        fullCategories,
        createdAt: new Date().toISOString(),
    }

    write(KEYS.audits, [...getAudits(), audit])
    return audit
}

export function removeAudit(id: string): void {
    const audits = getAudits().filter(a => a.id !== id)
    localStorage.setItem(KEYS.audits, JSON.stringify(audits))
}

export function removeAudits(ids: string[]): void {
    const idSet = new Set(ids)
    const audits = getAudits().filter(a => !idSet.has(a.id))
    localStorage.setItem(KEYS.audits, JSON.stringify(audits))
}

export function getRecentAudits(limit = 10): StoredAudit[] {
    return getAudits()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit)
}

// ============================================================================
// SETTINGS
// ============================================================================

const DEFAULT_SETTINGS: StoredSettings = {
    userName: "Jeremy Marcott",
    userEmail: "jeremy@theviablesource.com",
    workspaceName: "The Viable Source",
    tier: "pro",
    notifications: {
        auditComplete: true,
        weeklyReport: true,
        scoreDrops: true,
        newIssues: false,
        teamUpdates: true,
    },
}

export function getSettings(): StoredSettings {
    return read<StoredSettings>(KEYS.settings, DEFAULT_SETTINGS)
}

export function updateSettings(updates: Partial<StoredSettings>): void {
    const current = getSettings()
    write(KEYS.settings, { ...current, ...updates })
}

// Tier helpers
export function getTierLimits() {
    const s = getSettings()
    return TIER_LIMITS[s.tier]
}

export function canAddSite(): boolean {
    const limits = getTierLimits()
    return getSites().length < limits.sites
}

export function canAddKeyword(siteId: string): boolean {
    const limits = getTierLimits()
    const keywords = getKeywordsForSite(siteId)
    return keywords.length < limits.keywords
}

export function isAgencyTier(): boolean {
    return getSettings().tier === "agency"
}

// ============================================================================
// DASHBOARD STATS
// ============================================================================

export function getDashboardStats() {
    const sites = getSites()
    const audits = getAudits()
    const completedAudits = audits.filter((a) => a.score > 0)

    const avgScore = completedAudits.length > 0
        ? Math.round(completedAudits.reduce((sum, a) => sum + a.score, 0) / completedAudits.length)
        : 0

    const totalIssues = audits.reduce((sum, a) => sum + a.issuesCount, 0)

    // Score change: compare last 5 audits avg vs previous 5
    const sorted = [...completedAudits].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    const recent5 = sorted.slice(0, 5)
    const prev5 = sorted.slice(5, 10)
    const recentAvg = recent5.length > 0 ? recent5.reduce((s, a) => s + a.score, 0) / recent5.length : 0
    const prevAvg = prev5.length > 0 ? prev5.reduce((s, a) => s + a.score, 0) / prev5.length : recentAvg
    const scoreChange = Math.round(recentAvg - prevAvg)

    return {
        totalSites: sites.length,
        totalAudits: audits.length,
        avgScore,
        totalIssues,
        scoreChange,
    }
}

export function getScoreTrend(limit = 7): { date: string; score: number }[] {
    return getAudits()
        .filter((a) => a.score > 0)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .slice(-limit)
        .map((a) => ({
            date: new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            score: a.score,
        }))
}

export function getScoreTrendForSite(siteId: string, limit = 10): { date: string; score: number; id: string }[] {
    return getAuditsForSite(siteId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .slice(-limit)
        .map((a) => ({
            date: new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            score: a.score,
            id: a.id,
        }))
}

// ============================================================================
// QUICK WINS
// ============================================================================

export interface QuickWin {
    check: StoredCheck
    domain: string
    siteId: string
    auditDate: string
    url: string
}

export function getQuickWins(limit = 5): QuickWin[] {
    const sites = getSites()
    const wins: QuickWin[] = []

    for (const site of sites) {
        const latest = getLatestAuditForSite(site.id)
        if (!latest || !latest.failedChecks) continue

        for (const check of latest.failedChecks) {
            if (check.status === "fail" && check.recommendation) {
                wins.push({
                    check,
                    domain: site.domain,
                    siteId: site.id,
                    auditDate: latest.createdAt,
                    url: latest.url,
                })
            }
        }
    }

    // Prioritize by severity: warn checks first, then fail
    return wins.slice(0, limit)
}

// ============================================================================
// COMPARISON
// ============================================================================

export function getComparableAudits(siteId: string): StoredAudit[] {
    return getAuditsForSite(siteId).filter(
        (a) => a.fullCategories && a.fullCategories.length > 0
    )
}

// ============================================================================
// EXPORT / IMPORT
// ============================================================================

export function exportAllData(): string {
    return JSON.stringify({
        sites: getSites(),
        audits: getAudits(),
        settings: getSettings(),
        competitors: getCompetitors(),
        keywords: getKeywords(),
        ranks: getRanks(),
        exportedAt: new Date().toISOString(),
    }, null, 2)
}

export function importData(json: string): { sites: number; audits: number } {
    const data = JSON.parse(json)
    if (data.sites) write(KEYS.sites, data.sites)
    if (data.audits) write(KEYS.audits, data.audits)
    if (data.settings) write(KEYS.settings, data.settings)
    if (data.competitors) write(KEYS.competitors, data.competitors)
    if (data.keywords) write(KEYS.keywords, data.keywords)
    if (data.ranks) write(KEYS.ranks, data.ranks)
    return {
        sites: (data.sites || []).length,
        audits: (data.audits || []).length,
    }
}

// ============================================================================
// COMPETITORS
// ============================================================================

export function getCompetitors(): StoredCompetitor[] {
    return read<StoredCompetitor[]>(KEYS.competitors, [])
}

export function getCompetitorsForSite(siteId: string): StoredCompetitor[] {
    return getCompetitors().filter((c) => c.siteId === siteId)
}

export function addCompetitor(siteId: string, url: string, name?: string): StoredCompetitor {
    const competitors = getCompetitors()
    let domain: string
    try { domain = new URL(url).hostname.replace(/^www\./, "") } catch { domain = url }
    const comp: StoredCompetitor = {
        id: genId(),
        siteId,
        url: url.startsWith("http") ? url : `https://${url}`,
        domain,
        name: name || domain,
        createdAt: new Date().toISOString(),
    }
    competitors.push(comp)
    write(KEYS.competitors, competitors)
    return comp
}

export function updateCompetitor(id: string, updates: Partial<Pick<StoredCompetitor, "name" | "latestScore" | "latestCategories">>): void {
    const competitors = getCompetitors()
    const idx = competitors.findIndex((c) => c.id === id)
    if (idx >= 0) {
        competitors[idx] = { ...competitors[idx], ...updates }
        write(KEYS.competitors, competitors)
    }
}

export function removeCompetitor(id: string): void {
    write(KEYS.competitors, getCompetitors().filter((c) => c.id !== id))
}

// ============================================================================
// KEYWORDS
// ============================================================================

export function getKeywords(): StoredKeyword[] {
    return read<StoredKeyword[]>(KEYS.keywords, [])
}

export function getKeywordsForSite(siteId: string): StoredKeyword[] {
    return getKeywords().filter((k) => k.siteId === siteId)
}

export function addKeyword(siteId: string, keyword: string): StoredKeyword {
    const keywords = getKeywords()
    const kw: StoredKeyword = {
        id: genId(),
        siteId,
        keyword: keyword.trim().toLowerCase(),
        createdAt: new Date().toISOString(),
    }
    keywords.push(kw)
    write(KEYS.keywords, keywords)
    return kw
}

export function updateKeywordRank(id: string, rank: number | null): void {
    const keywords = getKeywords()
    const idx = keywords.findIndex((k) => k.id === id)
    if (idx >= 0) {
        keywords[idx].previousRank = keywords[idx].currentRank ?? null
        keywords[idx].currentRank = rank
        keywords[idx].lastChecked = new Date().toISOString()
        write(KEYS.keywords, keywords)
    }
}

export function removeKeyword(id: string): void {
    write(KEYS.keywords, getKeywords().filter((k) => k.id !== id))
    // Also remove associated rank snapshots
    write(KEYS.ranks, getRanks().filter((r) => r.keywordId !== id))
}

// ============================================================================
// RANK SNAPSHOTS
// ============================================================================

export function getRanks(): StoredRankSnapshot[] {
    return read<StoredRankSnapshot[]>(KEYS.ranks, [])
}

export function saveRankSnapshot(keywordId: string, siteId: string, rank: number | null): StoredRankSnapshot {
    const ranks = getRanks()
    const snapshot: StoredRankSnapshot = {
        id: genId(),
        keywordId,
        siteId,
        rank,
        checkedAt: new Date().toISOString(),
    }
    ranks.push(snapshot)
    write(KEYS.ranks, ranks)
    return snapshot
}

export function getRankHistory(keywordId: string, limit = 30): StoredRankSnapshot[] {
    return getRanks()
        .filter((r) => r.keywordId === keywordId)
        .sort((a, b) => new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime())
        .slice(-limit)
}
