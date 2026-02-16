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
    createdAt: string
}

export interface StoredAudit {
    id: string
    siteId: string
    url: string
    domain: string
    score: number
    issuesCount: number
    categorySummary: { name: string; label: string; score: number; total: number; passed: number }[]
    createdAt: string
}

export interface StoredSettings {
    userName: string
    userEmail: string
    workspaceName: string
    notifications: {
        auditComplete: boolean
        weeklyReport: boolean
        scoreDrops: boolean
        newIssues: boolean
        teamUpdates: boolean
    }
}

// ============================================================================
// KEYS
// ============================================================================

const KEYS = {
    sites: "auditor:sites",
    audits: "auditor:audits",
    settings: "auditor:settings",
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

export function updateSite(id: string, updates: Partial<Pick<StoredSite, "name" | "status">>): void {
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

export function saveAudit(
    url: string,
    score: number,
    issuesCount: number,
    categorySummary: StoredAudit["categorySummary"]
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
        createdAt: new Date().toISOString(),
    }

    write(KEYS.audits, [...getAudits(), audit])
    return audit
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

// ============================================================================
// EXPORT / IMPORT
// ============================================================================

export function exportAllData(): string {
    return JSON.stringify({
        sites: getSites(),
        audits: getAudits(),
        settings: getSettings(),
        exportedAt: new Date().toISOString(),
    }, null, 2)
}

export function importData(json: string): { sites: number; audits: number } {
    const data = JSON.parse(json)
    if (data.sites) write(KEYS.sites, data.sites)
    if (data.audits) write(KEYS.audits, data.audits)
    if (data.settings) write(KEYS.settings, data.settings)
    return {
        sites: (data.sites || []).length,
        audits: (data.audits || []).length,
    }
}
