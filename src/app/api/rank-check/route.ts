import { NextResponse } from "next/server"
import { google } from "googleapis"
import { checkRateLimit } from "@/lib/rate-limit"
import { getAuthenticatedClient, isGoogleConnected } from "@/lib/google-auth"

/**
 * POST /api/rank-check
 *
 * If Google Search Console is connected, uses real data.
 * Otherwise, falls back to Google search scraping (estimated).
 */
export async function POST(request: Request) {
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

    try {
        const { keyword, domain, siteUrl } = await request.json()

        if (!keyword || !domain) {
            return NextResponse.json(
                { error: "keyword and domain are required" },
                { status: 400 }
            )
        }

        // --- Try Google Search Console first ---
        if (isGoogleConnected()) {
            try {
                const auth = await getAuthenticatedClient()
                if (auth) {
                    const searchConsole = google.searchconsole({ version: "v1", auth })
                    const endDate = new Date()
                    endDate.setDate(endDate.getDate() - 3)
                    const startDate = new Date(endDate)
                    startDate.setDate(startDate.getDate() - 28)
                    const formatDate = (d: Date) => d.toISOString().split("T")[0]

                    // Use siteUrl if provided, otherwise construct from domain
                    const gscSiteUrl = siteUrl || `sc-domain:${domain}`

                    const response = await searchConsole.searchanalytics.query({
                        siteUrl: gscSiteUrl,
                        requestBody: {
                            startDate: formatDate(startDate),
                            endDate: formatDate(endDate),
                            dimensions: ["query"],
                            dimensionFilterGroups: [
                                {
                                    filters: [
                                        {
                                            dimension: "query",
                                            expression: keyword,
                                            operator: "equals",
                                        },
                                    ],
                                },
                            ],
                            rowLimit: 1,
                        },
                    })

                    const row = response.data.rows?.[0]

                    return NextResponse.json({
                        rank: row ? Math.round(row.position ?? 0) : null,
                        keyword,
                        domain,
                        position: row ? Math.round((row.position ?? 0) * 10) / 10 : null,
                        clicks: row?.clicks ?? 0,
                        impressions: row?.impressions ?? 0,
                        ctr: row?.ctr ?? 0,
                        source: "gsc",
                        estimatedOnly: false,
                        checkedAt: new Date().toISOString(),
                    })
                }
            } catch {
                // GSC failed — fall through to estimation
            }
        }

        // --- Fallback: Google search scraping (estimated) ---
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&num=100&hl=en`
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)

        let response: Response
        try {
            response = await fetch(searchUrl, {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                },
                signal: controller.signal,
                redirect: "follow",
            })
        } finally {
            clearTimeout(timeoutId)
        }

        if (!response.ok) {
            return NextResponse.json({
                rank: null,
                keyword,
                domain,
                error: "Search temporarily unavailable. Try again later.",
                source: "estimation",
                estimatedOnly: true,
            })
        }

        const html = await response.text()
        const cleanDomain = domain.replace(/^www\./, "").toLowerCase()
        let rank: number | null = null
        let position = 0

        const linkRegex = /href="(?:\/url\?q=)?(https?:\/\/[^"&]+)/gi
        let match

        while ((match = linkRegex.exec(html)) !== null) {
            const href = match[1].toLowerCase()
            if (
                href.includes("google.com") ||
                href.includes("youtube.com/results") ||
                href.includes("webcache.googleusercontent.com") ||
                href.includes("translate.google.com") ||
                href.includes("accounts.google.com") ||
                href.includes("support.google.com") ||
                href.includes("maps.google.com")
            ) continue

            position++

            try {
                const resultDomain = new URL(href).hostname.replace(/^www\./, "").toLowerCase()
                if (resultDomain === cleanDomain || resultDomain.endsWith(`.${cleanDomain}`)) {
                    rank = position
                    break
                }
            } catch {
                // Invalid URL, skip
            }
        }

        return NextResponse.json({
            rank,
            keyword,
            domain,
            position: rank,
            totalResultsScanned: position,
            source: "estimation",
            estimatedOnly: true,
            checkedAt: new Date().toISOString(),
        })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to check rank"
        return NextResponse.json(
            {
                rank: null,
                error: message,
                source: "estimation",
                estimatedOnly: true,
            },
            { status: 200 }
        )
    }
}
