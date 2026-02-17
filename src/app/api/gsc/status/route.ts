import { NextResponse } from "next/server"
import { google } from "googleapis"
import {
    getStoredTokens,
    getAuthenticatedClient,
    clearTokens,
    isGoogleConfigured,
    isGoogleConnected,
} from "@/lib/google-auth"

/**
 * GET /api/gsc/status
 * Returns Google connection status and available properties.
 */
export async function GET() {
    const configured = isGoogleConfigured()
    const connected = isGoogleConnected()

    if (!configured) {
        return NextResponse.json({
            configured: false,
            connected: false,
            message: "Google OAuth credentials not set in environment variables.",
        })
    }

    if (!connected) {
        return NextResponse.json({
            configured: true,
            connected: false,
        })
    }

    const tokens = getStoredTokens()

    try {
        const auth = await getAuthenticatedClient()
        if (!auth) {
            return NextResponse.json({
                configured: true,
                connected: false,
                error: "Failed to authenticate",
            })
        }

        // Fetch verified sites from Search Console
        const searchConsole = google.searchconsole({ version: "v1", auth })
        const sitesResponse = await searchConsole.sites.list()
        const sites = (sitesResponse.data.siteEntry || []).map((s) => ({
            siteUrl: s.siteUrl,
            permissionLevel: s.permissionLevel,
        }))

        // Determine which services are available based on granted scopes
        const grantedScope = tokens?.scope || ""
        const hasAnalytics = grantedScope.includes("analytics.readonly")
        const hasGMB = grantedScope.includes("business.manage")

        return NextResponse.json({
            configured: true,
            connected: true,
            email: tokens?.email || null,
            sites,
            services: {
                searchConsole: true,
                analytics: hasAnalytics,
                myBusiness: hasGMB,
                ads: false, // Future
            },
        })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error"
        return NextResponse.json({
            configured: true,
            connected: true,
            email: tokens?.email || null,
            error: message,
            sites: [],
            services: {
                searchConsole: false,
                analytics: false,
                myBusiness: false,
                ads: false,
            },
        })
    }
}

/**
 * DELETE /api/gsc/status
 * Disconnects Google (clears stored tokens).
 */
export async function DELETE() {
    clearTokens()
    return NextResponse.json({ disconnected: true })
}
