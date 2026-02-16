import { NextResponse } from "next/server"
import { google } from "googleapis"
import { getAuthenticatedClient, isGoogleConnected } from "@/lib/google-auth"

/**
 * POST /api/gsc/keywords
 *
 * Fetches real keyword data from Google Search Console.
 * Body: { siteUrl: string, days?: number, limit?: number }
 *
 * Returns: { keywords: [{ query, clicks, impressions, ctr, position }] }
 */
export async function POST(request: Request) {
    if (!isGoogleConnected()) {
        return NextResponse.json(
            { error: "Google Search Console is not connected" },
            { status: 401 }
        )
    }

    try {
        const { siteUrl, days = 28, limit = 50 } = await request.json()

        if (!siteUrl) {
            return NextResponse.json(
                { error: "siteUrl is required" },
                { status: 400 }
            )
        }

        const auth = await getAuthenticatedClient()
        if (!auth) {
            return NextResponse.json(
                { error: "Authentication expired. Please reconnect Google." },
                { status: 401 }
            )
        }

        const searchConsole = google.searchconsole({ version: "v1", auth })

        // Calculate date range
        const endDate = new Date()
        endDate.setDate(endDate.getDate() - 3) // GSC data has ~3 day delay
        const startDate = new Date(endDate)
        startDate.setDate(startDate.getDate() - days)

        const formatDate = (d: Date) => d.toISOString().split("T")[0]

        const response = await searchConsole.searchanalytics.query({
            siteUrl,
            requestBody: {
                startDate: formatDate(startDate),
                endDate: formatDate(endDate),
                dimensions: ["query"],
                rowLimit: limit,
                // Sort by impressions to get most relevant keywords
                // (position-sorted would only show top results)
            },
        })

        const keywords = (response.data.rows || []).map((row) => ({
            query: row.keys?.[0] ?? "",
            clicks: row.clicks ?? 0,
            impressions: row.impressions ?? 0,
            ctr: row.ctr ?? 0,
            position: row.position ? Math.round(row.position * 10) / 10 : null,
        }))

        return NextResponse.json({ keywords, source: "gsc" })
    } catch (error: unknown) {
        const message =
            error instanceof Error ? error.message : "Failed to fetch Search Console data"

        // Check if it's an auth error
        if (message.includes("invalid_grant") || message.includes("Token has been expired")) {
            return NextResponse.json(
                { error: "Google authorization expired. Please reconnect in Settings." },
                { status: 401 }
            )
        }

        return NextResponse.json({ error: message }, { status: 500 })
    }
}
