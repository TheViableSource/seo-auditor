import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
    canRunGridCheck,
    incrementGridUsage,
    getGridUsage,
    getGridRemaining,
    toGridTier,
    GRID_TIER_LIMITS,
    type GridTier,
} from "@/lib/grid-usage"

// ============================================================
// LOCAL RANK CHECK API
// ============================================================
// Two modes:
//   1. "cities" — checks preset US cities (legacy)
//   2. "grid"  — generates NxN grid points around a business
//      location and checks rank at each point
//
// Rate limiting:
//   - Enforced per-user (JWT ID or IP fallback)
//   - Tier caps: Free/Starter: 0, Pro: 20, Agency: 100, Enterprise: 500
//   - BYOK (user-provided API key) bypasses rate limits
//
// Supported SERP providers (set via env vars):
//   - DataForSEO (recommended): DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD
//   - SerpAPI:                   SERPAPI_KEY
//   - Fallback:                  Simulated data
// ============================================================

// Preset US cities with coordinates
const US_CITIES = [
    { city: "New York", state: "NY", lat: 40.7128, lng: -74.006 },
    { city: "Los Angeles", state: "CA", lat: 34.0522, lng: -118.2437 },
    { city: "Chicago", state: "IL", lat: 41.8781, lng: -87.6298 },
    { city: "Houston", state: "TX", lat: 29.7604, lng: -95.3698 },
    { city: "Phoenix", state: "AZ", lat: 33.4484, lng: -112.074 },
    { city: "Philadelphia", state: "PA", lat: 39.9526, lng: -75.1652 },
    { city: "San Antonio", state: "TX", lat: 29.4241, lng: -98.4936 },
    { city: "San Diego", state: "CA", lat: 32.7157, lng: -117.1611 },
    { city: "Dallas", state: "TX", lat: 32.7767, lng: -96.797 },
    { city: "Austin", state: "TX", lat: 30.2672, lng: -97.7431 },
    { city: "Portland", state: "OR", lat: 45.5152, lng: -122.6784 },
    { city: "Seattle", state: "WA", lat: 47.6062, lng: -122.3321 },
    { city: "Denver", state: "CO", lat: 39.7392, lng: -104.9903 },
    { city: "Miami", state: "FL", lat: 25.7617, lng: -80.1918 },
    { city: "Atlanta", state: "GA", lat: 33.749, lng: -84.388 },
    { city: "Boston", state: "MA", lat: 42.3601, lng: -71.0589 },
    { city: "Nashville", state: "TN", lat: 36.1627, lng: -86.7816 },
    { city: "Las Vegas", state: "NV", lat: 36.1699, lng: -115.1398 },
    { city: "Minneapolis", state: "MN", lat: 44.9778, lng: -93.265 },
    { city: "Charlotte", state: "NC", lat: 35.2271, lng: -80.8431 },
]

export { US_CITIES }

// ── Haversine helpers ──
const EARTH_RADIUS_MI = 3958.8
const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI

/** Offset a lat/lng by a distance in miles at a given bearing (degrees) */
function offsetLatLng(
    lat: number,
    lng: number,
    distanceMi: number,
    bearingDeg: number,
): { lat: number; lng: number } {
    const angularDist = distanceMi / EARTH_RADIUS_MI
    const bearing = bearingDeg * DEG_TO_RAD
    const lat1 = lat * DEG_TO_RAD
    const lng1 = lng * DEG_TO_RAD

    const lat2 = Math.asin(
        Math.sin(lat1) * Math.cos(angularDist) +
        Math.cos(lat1) * Math.sin(angularDist) * Math.cos(bearing),
    )
    const lng2 =
        lng1 +
        Math.atan2(
            Math.sin(bearing) * Math.sin(angularDist) * Math.cos(lat1),
            Math.cos(angularDist) - Math.sin(lat1) * Math.sin(lat2),
        )

    return { lat: lat2 * RAD_TO_DEG, lng: lng2 * RAD_TO_DEG }
}

/** Distance between two lat/lng points in miles */
function haversineDist(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLat = (lat2 - lat1) * DEG_TO_RAD
    const dLng = (lng2 - lng1) * DEG_TO_RAD
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.sin(dLng / 2) ** 2
    return 2 * EARTH_RADIUS_MI * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Generate NxN grid points centered on a location */
function generateGridPoints(
    centerLat: number,
    centerLng: number,
    gridSize: number,
    radiusMiles: number,
): { row: number; col: number; lat: number; lng: number; distanceMi: number }[] {
    const points: { row: number; col: number; lat: number; lng: number; distanceMi: number }[] = []
    const half = Math.floor(gridSize / 2)
    const stepMi = half > 0 ? radiusMiles / half : 0

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const rowOffset = row - half
            const colOffset = col - half

            if (rowOffset === 0 && colOffset === 0) {
                points.push({ row, col, lat: centerLat, lng: centerLng, distanceMi: 0 })
                continue
            }

            const nsDistance = Math.abs(rowOffset) * stepMi
            const nsBearing = rowOffset < 0 ? 0 : 180
            const ewDistance = Math.abs(colOffset) * stepMi
            const ewBearing = colOffset > 0 ? 90 : 270

            const intermediate = rowOffset !== 0
                ? offsetLatLng(centerLat, centerLng, nsDistance, nsBearing)
                : { lat: centerLat, lng: centerLng }

            const final = colOffset !== 0
                ? offsetLatLng(intermediate.lat, intermediate.lng, ewDistance, ewBearing)
                : intermediate

            const dist = haversineDist(centerLat, centerLng, final.lat, final.lng)
            points.push({ row, col, lat: final.lat, lng: final.lng, distanceMi: dist })
        }
    }

    return points
}

// ── Competitor type ──
interface Competitor {
    rank: number
    name: string
    domain: string
    isClient: boolean
}

// ══════════════════════════════════════════════════════════════
// LIVE SERP PROVIDERS
// ══════════════════════════════════════════════════════════════

/**
 * DataForSEO — Google Maps SERP API (Live mode)
 * Docs: https://docs.dataforseo.com/v3/serp/google/maps/live/advanced/
 * 
 * Makes one API call per grid point. Each call returns the top
 * local results at that lat/lng, from which we extract rank and
 * competitor data for the client's domain.
 */
async function fetchDataForSEO(
    keyword: string,
    lat: number,
    lng: number,
    clientDomain: string,
    overrideLogin?: string,
    overridePassword?: string,
): Promise<{ rank: number | null; competitors: Competitor[] }> {
    const login = overrideLogin || process.env.DATAFORSEO_LOGIN!
    const password = overridePassword || process.env.DATAFORSEO_PASSWORD!
    const auth = Buffer.from(`${login}:${password}`).toString("base64")

    const response = await fetch("https://api.dataforseo.com/v3/serp/google/maps/live/advanced", {
        method: "POST",
        headers: {
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify([{
            keyword,
            location_coordinate: `${lat},${lng},15z`,   // lat,lng,zoom
            language_code: "en",
            device: "mobile",
            os: "android",
            depth: 20,                                      // top 20 results
        }]),
    })

    const data = await response.json()

    // Parse results
    const items = data?.tasks?.[0]?.result?.[0]?.items || []
    const competitors: Competitor[] = []
    let clientRank: number | null = null

    for (let i = 0; i < Math.min(items.length, 20); i++) {
        const item = items[i]
        if (item.type !== "maps_search") continue

        const position = item.rank_absolute || (i + 1)
        const title = item.title || "Unknown"
        const domain = item.domain || item.url || ""
        const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/.*$/, "")

        // Check if this is the client
        const isClient = clientDomain && cleanDomain.toLowerCase().includes(clientDomain.toLowerCase())

        if (isClient) {
            clientRank = position
        }

        if (competitors.length < 4 || isClient) {
            competitors.push({
                rank: position,
                name: isClient ? "You" : title,
                domain: cleanDomain,
                isClient: !!isClient,
            })
        }
    }

    // Ensure we always show client if found
    if (clientRank && !competitors.find(c => c.isClient)) {
        competitors.push({
            rank: clientRank,
            name: "You",
            domain: clientDomain,
            isClient: true,
        })
    }

    // Keep top 4 + client
    const top4 = competitors.filter(c => !c.isClient).slice(0, 4)
    const clientEntry = competitors.find(c => c.isClient)
    const finalCompetitors = clientEntry
        ? [...top4.filter(c => c.rank < clientEntry.rank).slice(0, clientEntry.rank - 1),
            clientEntry,
        ...top4.filter(c => c.rank > clientEntry.rank)].slice(0, 5)
        : top4.slice(0, 4)

    return { rank: clientRank, competitors: finalCompetitors }
}

/**
 * SerpAPI — Google Maps Results
 * Docs: https://serpapi.com/google-maps-api
 * 
 * Uses the `ll` parameter for lat/lng targeting.
 */
async function fetchSerpAPI(
    keyword: string,
    lat: number,
    lng: number,
    clientDomain: string,
    overrideKey?: string,
): Promise<{ rank: number | null; competitors: Competitor[] }> {
    const apiKey = overrideKey || process.env.SERPAPI_KEY!

    const params = new URLSearchParams({
        engine: "google_maps",
        q: keyword,
        ll: `@${lat},${lng},15z`,
        type: "search",
        api_key: apiKey,
    })

    const response = await fetch(`https://serpapi.com/search?${params}`)
    const data = await response.json()

    const items = data?.local_results || []
    const competitors: Competitor[] = []
    let clientRank: number | null = null

    for (let i = 0; i < Math.min(items.length, 20); i++) {
        const item = items[i]
        const position = item.position || (i + 1)
        const title = item.title || "Unknown"
        const link = item.website || item.link || ""
        const cleanDomain = link.replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/.*$/, "")

        const isClient = clientDomain && cleanDomain.toLowerCase().includes(clientDomain.toLowerCase())

        if (isClient) {
            clientRank = position
        }

        if (competitors.length < 4 || isClient) {
            competitors.push({
                rank: position,
                name: isClient ? "You" : title,
                domain: cleanDomain,
                isClient: !!isClient,
            })
        }
    }

    if (clientRank && !competitors.find(c => c.isClient)) {
        competitors.push({
            rank: clientRank,
            name: "You",
            domain: clientDomain,
            isClient: true,
        })
    }

    const top4 = competitors.filter(c => !c.isClient).slice(0, 4)
    const clientEntry = competitors.find(c => c.isClient)
    const finalCompetitors = clientEntry
        ? [...top4.filter(c => c.rank < clientEntry.rank),
            clientEntry,
        ...top4.filter(c => c.rank > clientEntry.rank)].slice(0, 5)
        : top4.slice(0, 4)

    return { rank: clientRank, competitors: finalCompetitors }
}

/**
 * Simulated fallback — generates deterministic fake data.
 * Used when no API keys are configured.
 */
function fetchSimulated(
    keyword: string,
    lat: number,
    lng: number,
    distanceMi: number,
    clientDomain: string,
): { rank: number | null; competitors: Competitor[] } {
    const FAKE_COMPETITORS = [
        { name: "Joe's Coffee", domain: "joescoffee.com" },
        { name: "Brew Brothers", domain: "brewbros.co" },
        { name: "Morning Grind", domain: "morninggrind.com" },
        { name: "Daily Drip", domain: "dailydrip.cafe" },
        { name: "Bean Counter", domain: "beancounter.com" },
        { name: "Perk Up", domain: "perkupcafe.com" },
        { name: "Roast House", domain: "roasthouse.co" },
        { name: "The Coffee Spot", domain: "thecoffeespot.com" },
        { name: "Grind & Brew", domain: "grindandbrew.com" },
        { name: "Cup of Joy", domain: "cupofjoy.cafe" },
        { name: "Espresso Lane", domain: "espressolane.com" },
        { name: "Rise & Grind", domain: "riseandgrind.co" },
    ]

    const hash = (keyword + lat.toFixed(3) + lng.toFixed(3))
        .split("")
        .reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)
    const absHash = Math.abs(hash)

    const distancePenalty = Math.floor(distanceMi * 1.5)
    const baseRank = (absHash % 15) + 1
    const adjustedRank = Math.min(baseRank + distancePenalty, 30)
    const hasRank = absHash % 12 !== 0
    const clientRank = hasRank ? adjustedRank : null

    const top4: Competitor[] = []
    const usedIndexes = new Set<number>()
    for (let r = 1; r <= 4; r++) {
        if (clientRank === r) {
            top4.push({ rank: r, name: "You", domain: clientDomain, isClient: true })
        } else {
            const cHash = Math.abs((hash + r * 7919) % FAKE_COMPETITORS.length)
            let idx = cHash
            while (usedIndexes.has(idx)) idx = (idx + 1) % FAKE_COMPETITORS.length
            usedIndexes.add(idx)
            top4.push({ rank: r, name: FAKE_COMPETITORS[idx].name, domain: FAKE_COMPETITORS[idx].domain, isClient: false })
        }
    }
    if (clientRank && clientRank > 4) {
        top4.push({ rank: clientRank, name: "You", domain: clientDomain, isClient: true })
    }

    return { rank: clientRank, competitors: top4 }
}

// ══════════════════════════════════════════════════════════════
// Detect which provider to use
// ══════════════════════════════════════════════════════════════
type Provider = "dataforseo" | "serpapi" | "simulated"

function detectProvider(byokProvider?: string): Provider {
    // BYOK takes precedence
    if (byokProvider === "dataforseo" || byokProvider === "serpapi") return byokProvider
    // Then check server env vars
    if (process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD) return "dataforseo"
    if (process.env.SERPAPI_KEY) return "serpapi"
    return "simulated"
}

/** Resolve user identity for rate limiting */
async function resolveUser(request: NextRequest): Promise<{ userId: string; tier: GridTier }> {
    try {
        const session = await auth()
        if (session?.user?.id) {
            // TODO: look up workspace plan from DB for accurate tier
            // For now, use "agency" as default for logged-in users
            return { userId: session.user.id, tier: "agency" }
        }
    } catch {
        // Auth not configured or failed — fall through
    }

    // Fallback: IP-based identification with free tier
    const forwarded = request.headers.get("x-forwarded-for")
    const ip = forwarded?.split(",")[0]?.trim() || "anonymous"
    return { userId: `ip:${ip}`, tier: "free" }
}

// ══════════════════════════════════════════════════════════════
// POST handler
// ══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { keyword, url, mode } = body

        if (!keyword || !url) {
            return NextResponse.json({ error: "keyword and url are required" }, { status: 400 })
        }

        // ── GRID MODE ──
        if (mode === "grid") {
            const {
                centerLat, centerLng, gridSize = 5, radiusMiles = 5,
                userApiKey, userApiProvider, userTier,
            } = body

            if (!centerLat || !centerLng) {
                return NextResponse.json({ error: "centerLat and centerLng required for grid mode" }, { status: 400 })
            }

            const clampedSize = Math.min(Math.max(gridSize, 3), 9)
            const clampedRadius = Math.min(Math.max(radiusMiles, 0.5), 50)
            const points = generateGridPoints(centerLat, centerLng, clampedSize, clampedRadius)

            // BYOK: user-provided API key bypasses rate limiting
            const isBYOK = !!userApiKey
            const provider = isBYOK
                ? detectProvider(userApiProvider)
                : detectProvider()

            // Rate limiting (only for server-key usage, not BYOK or simulated)
            const { userId, tier: authTier } = await resolveUser(request)
            const effectiveTier = userTier ? toGridTier(userTier) : authTier

            if (!isBYOK && provider !== "simulated") {
                const limit = GRID_TIER_LIMITS[effectiveTier]
                const usage = getGridUsage(userId)

                if (!canRunGridCheck(userId, effectiveTier)) {
                    return NextResponse.json({
                        error: "Monthly grid check limit reached",
                        limit,
                        used: usage.used,
                        remaining: 0,
                        tier: effectiveTier,
                        month: usage.month,
                        message: effectiveTier === "free" || effectiveTier === "starter"
                            ? "Upgrade to Pro or add your own API key in Settings to unlock live grid checks."
                            : "You've used all your grid checks this month. Add your own API key in Settings for unlimited checks.",
                    }, { status: 429 })
                }
            }

            // Extract client domain
            let clientDomain = "your-site.com"
            try { clientDomain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "") } catch { /* ignore */ }

            // Fetch rank data for each grid point
            let gridResults

            if (provider === "dataforseo") {
                // Parse BYOK credentials (format: "login:password")
                const byokLogin = isBYOK ? userApiKey.split(":")[0] : undefined
                const byokPass = isBYOK ? userApiKey.split(":")[1] : undefined

                // Parallel fetch — DataForSEO allows concurrent requests
                gridResults = await Promise.all(
                    points.map(async (pt) => {
                        try {
                            const { rank, competitors } = await fetchDataForSEO(keyword, pt.lat, pt.lng, clientDomain, byokLogin, byokPass)
                            return { ...pt, rank, competitors }
                        } catch (err) {
                            console.error(`DataForSEO error at (${pt.lat}, ${pt.lng}):`, err)
                            return { ...pt, rank: null, competitors: [] }
                        }
                    })
                )
            } else if (provider === "serpapi") {
                // Sequential with small delay to respect rate limits
                gridResults = []
                for (const pt of points) {
                    try {
                        const { rank, competitors } = await fetchSerpAPI(keyword, pt.lat, pt.lng, clientDomain, isBYOK ? userApiKey : undefined)
                        gridResults.push({ ...pt, rank, competitors })
                    } catch (err) {
                        console.error(`SerpAPI error at (${pt.lat}, ${pt.lng}):`, err)
                        gridResults.push({ ...pt, rank: null, competitors: [] })
                    }
                    // Small delay between requests
                    await new Promise(r => setTimeout(r, 200))
                }
            } else {
                // Simulated fallback
                gridResults = points.map((pt) => {
                    const { rank, competitors } = fetchSimulated(keyword, pt.lat, pt.lng, pt.distanceMi, clientDomain)
                    return { ...pt, rank, competitors }
                })
            }

            // Track usage (only for server-key, non-simulated checks)
            let usageInfo = { used: 0, remaining: 0, limit: 0, month: "" }
            if (!isBYOK && provider !== "simulated") {
                const updated = incrementGridUsage(userId)
                const limit = GRID_TIER_LIMITS[effectiveTier]
                usageInfo = {
                    used: updated.count,
                    remaining: Math.max(0, limit - updated.count),
                    limit,
                    month: updated.month,
                }
            }

            return NextResponse.json({
                mode: "grid",
                gridResults,
                gridSize: clampedSize,
                radiusMiles: clampedRadius,
                keyword,
                url,
                provider,
                simulated: provider === "simulated",
                byok: isBYOK,
                tier: effectiveTier,
                usage: usageInfo,
                ...(provider === "simulated" ? {
                    message: "⚠️ Using simulated data. Set DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD or SERPAPI_KEY in .env.local for live SERP data.",
                } : {}),
            })
        }

        // ── CITIES MODE (legacy) ──
        const { locations } = body
        const targetLocations = locations && Array.isArray(locations)
            ? US_CITIES.filter(c => locations.includes(`${c.city}, ${c.state}`))
            : US_CITIES.slice(0, 5)

        const results = targetLocations.map((loc) => {
            const hash = (keyword + loc.city).split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)
            const absHash = Math.abs(hash)
            const simulatedRank = (absHash % 30) + 1
            const hasRank = absHash % 10 !== 0

            return {
                ...loc,
                location: `${loc.city}, ${loc.state}`,
                rank: hasRank ? simulatedRank : null,
            }
        })

        return NextResponse.json({
            results,
            keyword,
            url,
            simulated: true,
            message: "Set DATAFORSEO_LOGIN + DATAFORSEO_PASSWORD or SERPAPI_KEY in .env.local for real SERP data",
        })
    } catch (error) {
        console.error("Local rank check error:", error)
        return NextResponse.json({ error: "Rank check failed" }, { status: 500 })
    }
}

// GET — return available cities + current provider status
export async function GET() {
    const provider = detectProvider()
    return NextResponse.json({
        cities: US_CITIES.map(c => ({ ...c, location: `${c.city}, ${c.state}` })),
        provider,
        configured: provider !== "simulated",
    })
}
