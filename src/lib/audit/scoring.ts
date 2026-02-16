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
        "on-page": 0.20,
        technical: 0.15,
        accessibility: 0.10,
        "structured-data": 0.08,
        security: 0.06,
        "robots-sitemap": 0.06,
        aeo: 0.08,
        geo: 0.07,
        performance: 0.10,
        "html-validation": 0.05,
        "safe-browsing": 0.05,
    }

    let totalWeight = 0
    let weightedSum = 0

    for (const cat of categories) {
        const w = weights[cat.name] ?? 0
        // Skip categories where all checks are info-only (API unavailable)
        const allInfo = cat.checks.every((c) => c.status === "info")
        if (allInfo) continue
        totalWeight += w
        weightedSum += cat.score * w
    }

    if (totalWeight === 0) return 0
    return Math.round(weightedSum / totalWeight)
}
