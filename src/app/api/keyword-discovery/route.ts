import { NextResponse } from "next/server"
import * as cheerio from "cheerio"
import { SECURITY } from "@/lib/constants"
import { checkRateLimit } from "@/lib/rate-limit"
import { discoverKeywords } from "@/lib/audit/keyword-discovery"

export async function POST(request: Request) {
    // --- Rate limiting ---
    const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip") ??
        "unknown"

    if (!checkRateLimit(ip)) {
        return NextResponse.json(
            { error: "Too many requests. Please try again later." },
            { status: 429 }
        )
    }

    // --- Origin check ---
    const origin = request.headers.get("origin")
    const isAllowed = origin && (SECURITY.ALLOWED_ORIGINS as readonly string[]).includes(origin)
    if (origin && !isAllowed) {
        return NextResponse.json({ error: "Unauthorized source" }, { status: 403 })
    }

    try {
        const { url } = await request.json()

        if (!url || typeof url !== "string") {
            return NextResponse.json({ error: "URL is required" }, { status: 400 })
        }

        // --- SSRF protection ---
        if (SECURITY.SSRF_FORBIDDEN_PATTERNS.some((p: string) => url.includes(p))) {
            return NextResponse.json({ error: "Restricted URL" }, { status: 403 })
        }

        // Fetch page
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), SECURITY.FETCH_TIMEOUT_MS)

        let response: Response
        try {
            response = await fetch(url, {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                },
                signal: controller.signal,
                redirect: "follow",
            })
        } finally {
            clearTimeout(timeoutId)
        }

        if (!response.ok) {
            throw new Error(`Failed to fetch page. Status: ${response.status}`)
        }

        const html = await response.text()
        const $ = cheerio.load(html)

        // Run keyword discovery
        const keywords = discoverKeywords($, url)

        return NextResponse.json({
            keywords,
            url,
            discoveredAt: new Date().toISOString(),
        })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to discover keywords"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
