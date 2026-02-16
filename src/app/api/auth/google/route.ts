import { NextResponse } from "next/server"
import { getAuthUrl, isGoogleConfigured } from "@/lib/google-auth"

/**
 * GET /api/auth/google
 * Redirects the user to Google's OAuth consent screen.
 */
export async function GET() {
    if (!isGoogleConfigured()) {
        return NextResponse.json(
            {
                error: "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local",
            },
            { status: 500 }
        )
    }

    const url = getAuthUrl()
    return NextResponse.redirect(url)
}
