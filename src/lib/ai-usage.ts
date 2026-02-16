// ============================================================
// AI Usage Tracking — per-tier monthly quotas
// ============================================================

import type { UserTier } from "./local-storage"

const STORAGE_KEY = "auditor:aiUsage"

export const AI_TIER_LIMITS: Record<UserTier, number> = {
    free: 0,
    starter: 5,
    pro: 25,
    agency: 100,
}

interface AiUsageData {
    count: number
    month: string  // "YYYY-MM" — resets each month
}

function currentMonth(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function getAiUsage(): AiUsageData {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return { count: 0, month: currentMonth() }
        const data: AiUsageData = JSON.parse(raw)
        // Reset if it's a new month
        if (data.month !== currentMonth()) {
            return { count: 0, month: currentMonth() }
        }
        return data
    } catch {
        return { count: 0, month: currentMonth() }
    }
}

export function incrementAiUsage(): AiUsageData {
    const usage = getAiUsage()
    usage.count += 1
    usage.month = currentMonth()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage))
    return usage
}

export function canUseAi(tier: UserTier): boolean {
    const limit = AI_TIER_LIMITS[tier]
    if (limit === 0) return false
    const usage = getAiUsage()
    return usage.count < limit
}

export function getAiRemaining(tier: UserTier): number {
    const limit = AI_TIER_LIMITS[tier]
    const usage = getAiUsage()
    return Math.max(0, limit - usage.count)
}
