import { NextRequest, NextResponse } from "next/server"

// Validate embed tokens and return site + audit data
// This runs server-side, reading from a token stored in the request

export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get("token")

    if (!token) {
        return NextResponse.json({ error: "Token required" }, { status: 400 })
    }

    // For server-side validation, we read from the audit API
    // In production, this would query a database
    // For now, return the token for client-side validation
    return NextResponse.json({
        token,
        message: "Use client-side validateEmbedToken() for localStorage-based validation",
    })
}
