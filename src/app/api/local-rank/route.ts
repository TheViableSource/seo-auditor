import { NextRequest, NextResponse } from "next/server"

// ============================================================
// LOCAL RANK CHECK API
// ============================================================
// Two modes:
//   1. "cities" — checks preset US cities (legacy)
//   2. "grid"  — generates NxN grid points around a business
//      location and checks rank at each point
//
// In production, replace simulation with real SERP API.
// Set LOCAL_RANK_API_KEY in .env.local for real data.
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
    // Each step covers radiusMiles / half so edge points are at full radius
    const stepMi = half > 0 ? radiusMiles / half : 0

    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const rowOffset = row - half // -half to +half
            const colOffset = col - half

            if (rowOffset === 0 && colOffset === 0) {
                // Center point
                points.push({ row, col, lat: centerLat, lng: centerLng, distanceMi: 0 })
                continue
            }

            // Move north/south (bearing 0/180) then east/west (bearing 90/270)
            const nsDistance = Math.abs(rowOffset) * stepMi
            const nsBearing = rowOffset < 0 ? 0 : 180 // negative row = north
            const ewDistance = Math.abs(colOffset) * stepMi
            const ewBearing = colOffset > 0 ? 90 : 270

            // Step 1: move north/south from center
            const intermediate = rowOffset !== 0
                ? offsetLatLng(centerLat, centerLng, nsDistance, nsBearing)
                : { lat: centerLat, lng: centerLng }

            // Step 2: from there move east/west
            const final = colOffset !== 0
                ? offsetLatLng(intermediate.lat, intermediate.lng, ewDistance, ewBearing)
                : intermediate

            const dist = haversineDist(centerLat, centerLng, final.lat, final.lng)
            points.push({ row, col, lat: final.lat, lng: final.lng, distanceMi: dist })
        }
    }

    return points
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { keyword, url, mode } = body

        if (!keyword || !url) {
            return NextResponse.json({ error: "keyword and url are required" }, { status: 400 })
        }

        // ── GRID MODE ──
        if (mode === "grid") {
            const { centerLat, centerLng, gridSize = 5, radiusMiles = 5 } = body

            if (!centerLat || !centerLng) {
                return NextResponse.json({ error: "centerLat and centerLng required for grid mode" }, { status: 400 })
            }

            const clampedSize = Math.min(Math.max(gridSize, 3), 9)
            const clampedRadius = Math.min(Math.max(radiusMiles, 0.5), 50)

            const points = generateGridPoints(centerLat, centerLng, clampedSize, clampedRadius)

            // TODO: Replace with real SERP API calls per grid point
            // const apiKey = process.env.LOCAL_RANK_API_KEY
            // if (apiKey) { ... }

            // Simulated competitor names pool
            const COMPETITORS = [
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

            // Extract client domain from URL for labeling
            let clientDomain = "your-site.com"
            try { clientDomain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname } catch { /* ignore */ }

            // Simulated — deterministic hash-based
            const gridResults = points.map((pt) => {
                const hash = (keyword + pt.lat.toFixed(3) + pt.lng.toFixed(3))
                    .split("")
                    .reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)
                const absHash = Math.abs(hash)

                // Ranks tend to be better near center (lower distance)
                const distancePenalty = Math.floor(pt.distanceMi * 1.5)
                const baseRank = (absHash % 15) + 1
                const adjustedRank = Math.min(baseRank + distancePenalty, 30)
                const hasRank = absHash % 12 !== 0 // ~92% chance
                const clientRank = hasRank ? adjustedRank : null

                // Generate top 4 competitors at this location
                const top4: { rank: number; name: string; domain: string; isClient: boolean }[] = []
                const usedIndexes = new Set<number>()
                for (let r = 1; r <= 4; r++) {
                    if (clientRank === r) {
                        top4.push({ rank: r, name: "You", domain: clientDomain, isClient: true })
                    } else {
                        // Pick a deterministic competitor
                        const cHash = Math.abs((hash + r * 7919) % COMPETITORS.length)
                        let idx = cHash
                        while (usedIndexes.has(idx)) idx = (idx + 1) % COMPETITORS.length
                        usedIndexes.add(idx)
                        top4.push({ rank: r, name: COMPETITORS[idx].name, domain: COMPETITORS[idx].domain, isClient: false })
                    }
                }
                // If client ranks outside top 4 but has a rank, add them as a 5th entry
                if (clientRank && clientRank > 4) {
                    top4.push({ rank: clientRank, name: "You", domain: clientDomain, isClient: true })
                }

                return {
                    ...pt,
                    rank: clientRank,
                    competitors: top4,
                }
            })

            return NextResponse.json({
                mode: "grid",
                gridResults,
                gridSize: clampedSize,
                radiusMiles: clampedRadius,
                keyword,
                url,
                simulated: true,
                message: "Set LOCAL_RANK_API_KEY in .env.local for real SERP data",
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
            message: "Set LOCAL_RANK_API_KEY in .env.local for real SERP data",
        })
    } catch (error) {
        console.error("Local rank check error:", error)
        return NextResponse.json({ error: "Rank check failed" }, { status: 500 })
    }
}

// GET — return available cities
export async function GET() {
    return NextResponse.json({
        cities: US_CITIES.map(c => ({ ...c, location: `${c.city}, ${c.state}` })),
    })
}
