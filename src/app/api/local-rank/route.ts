import { NextRequest, NextResponse } from "next/server"

// ============================================================
// LOCAL RANK CHECK API
// ============================================================
// Checks keyword rank for a specific location.
// In production, this would call an external SERP API
// (DataForSEO, BrightLocal, SerpAPI, etc.)
//
// For now, simulates geographic rank variation.
// To integrate a real provider:
// 1. Set LOCAL_RANK_API_KEY in .env.local
// 2. Uncomment the provider call below
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

export async function POST(request: NextRequest) {
    try {
        const { keyword, url, locations } = await request.json()

        if (!keyword || !url) {
            return NextResponse.json({ error: "keyword and url are required" }, { status: 400 })
        }

        // Determine which locations to check
        const targetLocations = locations && Array.isArray(locations)
            ? US_CITIES.filter(c => locations.includes(`${c.city}, ${c.state}`))
            : US_CITIES.slice(0, 5)

        // TODO: Replace with real SERP API call
        // const apiKey = process.env.LOCAL_RANK_API_KEY
        // if (apiKey) {
        //     const results = await Promise.all(targetLocations.map(async (loc) => {
        //         const resp = await fetch(`https://api.serpapi.com/search.json?q=${encodeURIComponent(keyword)}&location=${encodeURIComponent(loc.city + ", " + loc.state)}&api_key=${apiKey}`)
        //         const data = await resp.json()
        //         const rank = data.organic_results?.findIndex(r => r.link?.includes(new URL(url).hostname)) + 1
        //         return { ...loc, location: `${loc.city}, ${loc.state}`, rank: rank > 0 ? rank : null }
        //     }))
        //     return NextResponse.json({ results, keyword, url })
        // }

        // Simulated results — deterministic based on keyword + city hash
        const results = targetLocations.map((loc) => {
            // Create a simple hash for deterministic simulation
            const hash = (keyword + loc.city).split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)
            const absHash = Math.abs(hash)
            const simulatedRank = (absHash % 30) + 1 // Rank 1-30
            const hasRank = absHash % 10 !== 0 // 90% chance of ranking

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
