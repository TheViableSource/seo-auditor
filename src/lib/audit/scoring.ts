import type { AuditCheck, AuditCategory, AuditCategoryName } from "@/lib/types"

/**
 * Calculate score for a single category based on its checks.
 * Critical failures = 15 pts, major = 10, minor = 5, info = 0.
 * Warnings count as half the penalty.
 */
export function scoreCategory(
    name: AuditCategoryName,
    label: string,
    checks: AuditCheck[]
): AuditCategory {
    let score = 100
    let passCount = 0
    let failCount = 0
    let warningCount = 0

    const penaltyMap = {
        critical: 15,
        major: 10,
        minor: 5,
        info: 0,
    }

    for (const check of checks) {
        if (check.status === "pass") {
            passCount++
        } else if (check.status === "fail") {
            failCount++
            score -= penaltyMap[check.severity]
        } else if (check.status === "warning") {
            warningCount++
            score -= Math.floor(penaltyMap[check.severity] / 2)
        }
        // "info" checks don't affect score
    }

    return {
        name,
        label,
        score: Math.max(0, Math.min(100, score)),
        checks,
        passCount,
        failCount,
        warningCount,
    }
}

/**
 * Calculate overall score from categories with weighting.
 */
export function calculateOverallScore(categories: AuditCategory[]): number {
    const weights: Record<AuditCategoryName, number> = {
        "on-page": 0.25,
        technical: 0.20,
        accessibility: 0.12,
        "structured-data": 0.10,
        security: 0.08,
        "robots-sitemap": 0.08,
        aeo: 0.10,
        geo: 0.07,
    }

    let totalWeight = 0
    let weightedSum = 0

    for (const cat of categories) {
        const w = weights[cat.name] || 0.25
        weightedSum += cat.score * w
        totalWeight += w
    }

    return Math.round(weightedSum / totalWeight)
}
