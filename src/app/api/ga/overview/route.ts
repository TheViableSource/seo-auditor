import { NextResponse } from "next/server"
import { google } from "googleapis"
import { getAuthenticatedClient, isGoogleConnected } from "@/lib/google-auth"

/**
 * POST /api/ga/overview
 *
 * Fetches GA4 traffic overview for a property.
 * Body: { propertyId?: string, days?: number }
 *
 * If no propertyId, returns available GA4 properties.
 * If propertyId given, returns metrics: sessions, pageviews, bounce rate, avg duration, traffic sources.
 */
export async function POST(request: Request) {
    if (!isGoogleConnected()) {
        return NextResponse.json(
            { error: "Google account is not connected" },
            { status: 401 }
        )
    }

    try {
        const body = await request.json()
        const { propertyId, days = 28 } = body

        const auth = await getAuthenticatedClient()
        if (!auth) {
            return NextResponse.json(
                { error: "Authentication expired. Please reconnect Google." },
                { status: 401 }
            )
        }

        // If no propertyId, list available GA4 properties
        if (!propertyId) {
            const admin = google.analyticsadmin({ version: "v1beta", auth })
            const acctRes = await admin.accounts.list()
            const accounts = acctRes.data.accounts || []

            const properties: { id: string; name: string; account: string }[] = []
            for (const acct of accounts) {
                if (!acct.name) continue
                const propRes = await admin.properties.list({
                    filter: `parent:${acct.name}`,
                })
                for (const prop of propRes.data.properties || []) {
                    properties.push({
                        id: prop.name?.replace("properties/", "") || "",
                        name: prop.displayName || prop.name || "",
                        account: acct.displayName || acct.name || "",
                    })
                }
            }

            return NextResponse.json({ properties })
        }

        // Fetch GA4 report
        const analyticsData = google.analyticsdata({ version: "v1beta", auth })

        const endDate = new Date()
        endDate.setDate(endDate.getDate() - 1) // yesterday
        const startDate = new Date(endDate)
        startDate.setDate(startDate.getDate() - days)

        const formatDate = (d: Date) => d.toISOString().split("T")[0]

        // Core metrics
        const metricsResponse = await analyticsData.properties.runReport({
            property: `properties/${propertyId}`,
            requestBody: {
                dateRanges: [
                    { startDate: formatDate(startDate), endDate: formatDate(endDate) },
                ],
                metrics: [
                    { name: "sessions" },
                    { name: "screenPageViews" },
                    { name: "bounceRate" },
                    { name: "averageSessionDuration" },
                    { name: "activeUsers" },
                    { name: "newUsers" },
                ],
            },
        })

        const row = metricsResponse.data.rows?.[0]
        const vals = row?.metricValues || []

        const overview = {
            sessions: parseInt(vals[0]?.value || "0"),
            pageviews: parseInt(vals[1]?.value || "0"),
            bounceRate: parseFloat(vals[2]?.value || "0"),
            avgSessionDuration: parseFloat(vals[3]?.value || "0"),
            activeUsers: parseInt(vals[4]?.value || "0"),
            newUsers: parseInt(vals[5]?.value || "0"),
        }

        // Top pages
        const pagesResponse = await analyticsData.properties.runReport({
            property: `properties/${propertyId}`,
            requestBody: {
                dateRanges: [
                    { startDate: formatDate(startDate), endDate: formatDate(endDate) },
                ],
                dimensions: [{ name: "pagePath" }],
                metrics: [
                    { name: "screenPageViews" },
                    { name: "bounceRate" },
                    { name: "averageSessionDuration" },
                ],
                limit: "10",
                orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
            },
        })

        const topPages = (pagesResponse.data.rows || []).map((r) => ({
            path: r.dimensionValues?.[0]?.value || "",
            views: parseInt(r.metricValues?.[0]?.value || "0"),
            bounceRate: parseFloat(r.metricValues?.[1]?.value || "0"),
            avgDuration: parseFloat(r.metricValues?.[2]?.value || "0"),
        }))

        // Traffic sources
        const sourcesResponse = await analyticsData.properties.runReport({
            property: `properties/${propertyId}`,
            requestBody: {
                dateRanges: [
                    { startDate: formatDate(startDate), endDate: formatDate(endDate) },
                ],
                dimensions: [{ name: "sessionDefaultChannelGroup" }],
                metrics: [{ name: "sessions" }],
                limit: "8",
                orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
            },
        })

        const trafficSources = (sourcesResponse.data.rows || []).map((r) => ({
            channel: r.dimensionValues?.[0]?.value || "",
            sessions: parseInt(r.metricValues?.[0]?.value || "0"),
        }))

        return NextResponse.json({
            overview,
            topPages,
            trafficSources,
            source: "ga4",
            propertyId,
        })
    } catch (error: unknown) {
        const message =
            error instanceof Error ? error.message : "Failed to fetch Analytics data"

        if (
            message.includes("invalid_grant") ||
            message.includes("Token has been expired")
        ) {
            return NextResponse.json(
                { error: "Google authorization expired. Please reconnect in Settings." },
                { status: 401 }
            )
        }

        // Check for "not enabled" or permission errors
        if (message.includes("not enabled") || message.includes("PERMISSION_DENIED")) {
            return NextResponse.json(
                { error: "Google Analytics API access is not enabled or you lack permissions. Make sure the GA4 property is linked to your Google account." },
                { status: 403 }
            )
        }

        return NextResponse.json({ error: message }, { status: 500 })
    }
}
