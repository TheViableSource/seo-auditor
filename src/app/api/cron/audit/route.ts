import { NextResponse } from "next/server"

/**
 * GET /api/cron/audit
 *
 * Checks all sites with a schedule (weekly / monthly). If enough time
 * has passed since the last scheduled audit, triggers a new one.
 *
 * Designed to be called by an external scheduler:
 *   - Vercel Cron (vercel.json)
 *   - GitHub Actions
 *   - System cron on Plesk / VPS
 *
 * Because localStorage is client-side only, this endpoint can't read
 * stored sites directly. Instead, the client-side sites page will call
 * the audit API for due sites automatically when it detects them.
 *
 * This stub exists so you can wire it up to a database-backed system
 * later, or use it as a health-check for your cron scheduler.
 */
export async function GET(request: Request) {
    // Auth guard — require a secret to prevent abuse
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get("secret")

    if (secret !== (process.env.CRON_SECRET || "auditorpro-cron")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // In a DB-backed setup, you would:
    // 1. Query all sites with auditSchedule != "manual"
    // 2. Check if (now - lastScheduledAudit) >= interval
    // 3. Enqueue audits for due sites

    return NextResponse.json({
        ok: true,
        message: "Cron endpoint ready. Wire up to a database for server-side scheduling. Client-side scheduling is handled automatically.",
        timestamp: new Date().toISOString(),
    })
}
