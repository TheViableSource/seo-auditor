// ============================================================
// Grid Usage Tracking — server-side rate limiter
// ============================================================
// In-memory monthly counter per user. Keyed by user ID (from
// NextAuth JWT) or IP address for anonymous users. Resets on
// server restart and each calendar month.
//
// This protects against excessive SERP API costs by capping
// grid checks per tier. Users who provide their own API key
// (BYOK) bypass this limit entirely.
// ============================================================

export type GridTier = "free" | "starter" | "pro" | "agency" | "enterprise"

/** Maximum grid checks per calendar month per tier */
export const GRID_TIER_LIMITS: Record<GridTier, number> = {
    free: 0,
    starter: 0,
    pro: 20,
    agency: 100,
    enterprise: 500,
}

interface UsageEntry {
    count: number
    month: string // "YYYY-MM"
}

// In-memory store — survives for the lifetime of the server process
const usageMap = new Map<string, UsageEntry>()

function currentMonth(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function getOrCreate(key: string): UsageEntry {
    const existing = usageMap.get(key)
    const month = currentMonth()

    if (!existing || existing.month !== month) {
        // New month or new user — reset
        const entry = { count: 0, month }
        usageMap.set(key, entry)
        return entry
    }

    return existing
}

/** Check if a user can run a grid check */
export function canRunGridCheck(userKey: string, tier: GridTier): boolean {
    const limit = GRID_TIER_LIMITS[tier]
    if (limit === 0) return false
    const entry = getOrCreate(userKey)
    return entry.count < limit
}

/** Increment usage after a successful grid check */
export function incrementGridUsage(userKey: string): UsageEntry {
    const entry = getOrCreate(userKey)
    entry.count += 1
    usageMap.set(userKey, entry)
    return entry
}

/** Get current usage for a user */
export function getGridUsage(userKey: string): { used: number; month: string } {
    const entry = getOrCreate(userKey)
    return { used: entry.count, month: entry.month }
}

/** Get remaining checks for a user at a given tier */
export function getGridRemaining(userKey: string, tier: GridTier): number {
    const limit = GRID_TIER_LIMITS[tier]
    if (limit === 0) return 0
    const entry = getOrCreate(userKey)
    return Math.max(0, limit - entry.count)
}

/** Map client-side UserTier or Prisma Plan to GridTier */
export function toGridTier(tier: string): GridTier {
    const normalized = tier.toLowerCase().replace("professional", "pro")
    if (normalized in GRID_TIER_LIMITS) return normalized as GridTier
    return "free"
}
