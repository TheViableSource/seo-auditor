import type { AuditCheck } from "@/lib/types"

/**
 * PageSpeed Insights API Integration
 * Calls Google PSI v5 to get Lighthouse performance metrics.
 * Uses PAGESPEED_API_KEY env var if set, otherwise calls without key.
 * Gracefully degrades on timeout/error.
 */

interface LighthouseAudit {
    id: string
    title: string
    score: number | null
    displayValue?: string
    numericValue?: number
    numericUnit?: string
}

interface PSIResponse {
    lighthouseResult?: {
        categories?: {
            performance?: { score: number }
        }
        audits?: Record<string, LighthouseAudit>
    }
    error?: { message: string }
}

function formatMs(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)} ms`
    return `${(ms / 1000).toFixed(1)} s`
}

function getMetricStatus(id: string, value: number): "pass" | "fail" | "warning" {
    // Thresholds from web.dev
    const thresholds: Record<string, [number, number]> = {
        "first-contentful-paint": [1800, 3000],
        "largest-contentful-paint": [2500, 4000],
        "total-blocking-time": [200, 600],
        "cumulative-layout-shift": [0.1, 0.25],
        "speed-index": [3400, 5800],
    }
    const [good, poor] = thresholds[id] || [0, 0]
    if (value <= good) return "pass"
    if (value <= poor) return "warning"
    return "fail"
}

export async function analyzePageSpeed(url: string): Promise<AuditCheck[]> {
    const apiKey = process.env.PAGESPEED_API_KEY || ""
    const endpoint = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
    const params = new URLSearchParams({
        url,
        strategy: "mobile",
        category: "performance",
    })
    if (apiKey) params.set("key", apiKey)

    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 20000) // 20s timeout

        const response = await fetch(`${endpoint}?${params}`, {
            signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
            throw new Error(`PSI API returned ${response.status}`)
        }

        const data: PSIResponse = await response.json()

        if (data.error || !data.lighthouseResult) {
            throw new Error(data.error?.message || "No Lighthouse result")
        }

        const audits = data.lighthouseResult.audits || {}
        const perfScore = data.lighthouseResult.categories?.performance?.score
        const checks: AuditCheck[] = []

        // Overall Performance Score
        if (perfScore !== undefined && perfScore !== null) {
            const score100 = Math.round(perfScore * 100)
            checks.push({
                id: "psi-performance-score",
                title: "Performance Score",
                description: "Overall Lighthouse performance score (mobile)",
                status: score100 >= 90 ? "pass" : score100 >= 50 ? "warning" : "fail",
                severity: "critical",
                value: `${score100}/100`,
                recommendation: score100 < 90
                    ? "Focus on reducing your Largest Contentful Paint and Total Blocking Time. Optimize images, defer non-critical JavaScript, and use efficient caching strategies."
                    : undefined,
                learnMoreUrl: "https://web.dev/performance-scoring/",
            })
        }

        // Core Web Vitals + Speed Index
        const metrics: { id: string; title: string; severity: "critical" | "major" | "minor"; unit: "ms" | "cls" }[] = [
            { id: "largest-contentful-paint", title: "Largest Contentful Paint (LCP)", severity: "critical", unit: "ms" },
            { id: "first-contentful-paint", title: "First Contentful Paint (FCP)", severity: "major", unit: "ms" },
            { id: "total-blocking-time", title: "Total Blocking Time (TBT)", severity: "major", unit: "ms" },
            { id: "cumulative-layout-shift", title: "Cumulative Layout Shift (CLS)", severity: "major", unit: "cls" },
            { id: "speed-index", title: "Speed Index", severity: "minor", unit: "ms" },
        ]

        for (const metric of metrics) {
            const audit = audits[metric.id]
            if (!audit || audit.numericValue === undefined) continue

            const value = audit.numericValue
            const status = getMetricStatus(metric.id, value)
            const displayValue = metric.unit === "cls"
                ? value.toFixed(3)
                : formatMs(value)

            const recommendations: Record<string, string> = {
                "largest-contentful-paint": "Optimize your largest above-the-fold image/text. Use WebP/AVIF formats, add width/height attributes, implement lazy loading for below-fold images, and preload the LCP resource.",
                "first-contentful-paint": "Reduce server response time, eliminate render-blocking resources, and inline critical CSS. Consider preloading key fonts and resources.",
                "total-blocking-time": "Break up long JavaScript tasks, defer non-critical JS, and use code splitting. Remove unused JavaScript and consider using a web worker for heavy computation.",
                "cumulative-layout-shift": "Set explicit width/height on images and videos, avoid inserting content above existing content, and use CSS containment. Reserve space for ads and embeds.",
                "speed-index": "Minimize main-thread work, reduce JavaScript execution time, and ensure text is visible during webfont load. Preload critical resources.",
            }

            checks.push({
                id: `psi-${metric.id}`,
                title: metric.title,
                description: audit.title || `${metric.title} measurement`,
                status,
                severity: metric.severity,
                value: displayValue,
                expected: metric.unit === "cls" ? "< 0.1" : metric.id === "largest-contentful-paint" ? "< 2.5s" : metric.id === "first-contentful-paint" ? "< 1.8s" : metric.id === "total-blocking-time" ? "< 200ms" : "< 3.4s",
                recommendation: status !== "pass" ? recommendations[metric.id] : undefined,
                learnMoreUrl: `https://web.dev/${metric.id}/`,
            })
        }

        return checks
    } catch {
        // Graceful degradation — return an info check
        return [
            {
                id: "psi-unavailable",
                title: "PageSpeed Insights",
                description: "Could not reach the PageSpeed Insights API. Performance data is unavailable for this audit.",
                status: "info",
                severity: "info",
                value: "unavailable",
                recommendation: "To enable performance analysis, ensure network connectivity to Google APIs. Optionally set the PAGESPEED_API_KEY environment variable for higher rate limits.",
            },
        ]
    }
}
