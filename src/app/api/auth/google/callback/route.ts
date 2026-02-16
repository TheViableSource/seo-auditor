import { NextResponse } from "next/server"
import { exchangeCode } from "@/lib/google-auth"

/**
 * GET /api/auth/google/callback
 * Handles the OAuth callback from Google, exchanges the code for tokens,
 * stores them, and redirects back to the settings page.
 */
export async function GET(request: Request) {
    const url = new URL(request.url)
    const code = url.searchParams.get("code")
    const error = url.searchParams.get("error")

    if (error) {
        // User denied access or other error
        const settingsUrl = new URL("/settings", url.origin)
        settingsUrl.searchParams.set("google_error", error)
        return NextResponse.redirect(settingsUrl.toString())
    }

    if (!code) {
        return NextResponse.json(
            { error: "No authorization code provided" },
            { status: 400 }
        )
    }

    try {
        await exchangeCode(code)
        const settingsUrl = new URL("/settings", url.origin)
        settingsUrl.searchParams.set("google_connected", "true")
        return NextResponse.redirect(settingsUrl.toString())
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to exchange code"
        const settingsUrl = new URL("/settings", url.origin)
        settingsUrl.searchParams.set("google_error", message)
        return NextResponse.redirect(settingsUrl.toString())
    }
}
