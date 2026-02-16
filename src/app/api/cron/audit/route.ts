import { NextResponse } from "next/server"

/**
 * GET /api/cron/audit
 *
 * Designed to be called by a Plesk cron job:
 *
 *   curl -s "https://yourdomain.com/api/cron/audit?secret=YOUR_SECRET&sites=https://site1.com,https://site2.com"
 *
 * This endpoint receives sites as a query parameter and audits each one,
 * storing results that can be fetched by the client-side app.
 *
 * For a Plesk/Node.js setup:
 *   1. Go to Plesk → Scheduled Tasks (cron jobs)
 *   2. Add a weekly or monthly task:
 *      curl -s "https://yourdomain.com/api/cron/audit?secret=YOUR_CRON_SECRET&sites=https://site1.com,https://site2.com"
 *   3. Set CRON_SECRET env var in Plesk Node.js settings
 */
export async function GET(request: Request) {
    // Auth guard
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get("secret")

    if (secret !== (process.env.CRON_SECRET || "auditorpro-cron")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get sites to audit from query params
    const sitesParam = searchParams.get("sites")
    if (!sitesParam) {
        return NextResponse.json({
            ok: true,
            message: "Cron endpoint ready. Pass ?sites=url1,url2 to audit specific sites.",
            usage: "curl 'https://yourdomain.com/api/cron/audit?secret=YOUR_SECRET&sites=https://site1.com,https://site2.com'",
            timestamp: new Date().toISOString(),
        })
    }

    const sites = sitesParam.split(",").map(s => s.trim()).filter(Boolean)
    const results: { url: string; score?: number; error?: string }[] = []

    for (const siteUrl of sites) {
        try {
            // Self-call the audit API
            const baseUrl = new URL(request.url).origin
            const auditRes = await fetch(`${baseUrl}/api/audit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: siteUrl }),
            })

            if (!auditRes.ok) {
                const err = await auditRes.json().catch(() => ({ error: "Audit failed" }))
                results.push({ url: siteUrl, error: err.error || `HTTP ${auditRes.status}` })
                continue
            }

            const data = await auditRes.json()
            results.push({ url: siteUrl, score: data.score ?? data.overallScore ?? 0 })
        } catch (e) {
            results.push({ url: siteUrl, error: e instanceof Error ? e.message : "Unknown error" })
        }
    }

    return NextResponse.json({
        ok: true,
        audited: results.length,
        results,
        timestamp: new Date().toISOString(),
    })
}
