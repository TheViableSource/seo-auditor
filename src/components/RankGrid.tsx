"use client"

import { useState, useEffect, useRef, useMemo } from "react"

// ── Local Rank Grid on OpenStreetMap ──
// Leaflet map with rank circles overlaid at each grid point.
// Each point shows the rank + top 4 competitors on hover.
// Green (1-3), Orange (4-10), Red (11+), Gray (unranked)

export interface Competitor {
    rank: number
    name: string
    domain: string
    isClient: boolean
}

export interface GridPoint {
    row: number
    col: number
    lat: number
    lng: number
    rank: number | null
    distanceMi: number
    competitors?: Competitor[]
    label?: string
}

export interface BusinessLocation {
    lat: number
    lng: number
    label: string
}

interface RankGridProps {
    gridData: GridPoint[]
    gridSize: number
    radiusMiles: number
    keyword?: string
    businessLocation: BusinessLocation
    className?: string
}

function getRankColor(rank: number | null): string {
    if (!rank) return "#a1a1aa"
    if (rank <= 3) return "#22c55e"
    if (rank <= 10) return "#f97316"
    return "#ef4444"
}

// Stats component (rendered outside the map)
function GridStats({ gridData }: { gridData: GridPoint[] }) {
    const rankedPoints = gridData.filter((p) => p.rank !== null)
    const avgRank = rankedPoints.length > 0
        ? (rankedPoints.reduce((s, p) => s + (p.rank || 0), 0) / rankedPoints.length).toFixed(1)
        : "–"
    const bestRank = rankedPoints.length > 0 ? Math.min(...rankedPoints.map((p) => p.rank!)) : null
    const worstRank = rankedPoints.length > 0 ? Math.max(...rankedPoints.map((p) => p.rank!)) : null
    const top3Count = rankedPoints.filter((p) => p.rank! <= 3).length
    const top3Pct = gridData.length > 0 ? Math.round((top3Count / gridData.length) * 100) : 0

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700 text-center">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Avg Rank</p>
                <p className="text-xl font-bold text-foreground">{avgRank}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30 text-center">
                <p className="text-[11px] text-green-600 dark:text-green-400 font-medium uppercase tracking-wide">Best</p>
                <p className="text-xl font-bold text-green-600">#{bestRank ?? "–"}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 text-center">
                <p className="text-[11px] text-red-600 dark:text-red-400 font-medium uppercase tracking-wide">Worst</p>
                <p className="text-xl font-bold text-red-600">#{worstRank ?? "–"}</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/30 text-center">
                <p className="text-[11px] text-orange-600 dark:text-orange-400 font-medium uppercase tracking-wide">Top 3</p>
                <p className="text-xl font-bold text-orange-600">{top3Pct}%</p>
            </div>
        </div>
    )
}

// Build competitor HTML for tooltip
function buildCompetitorHTML(point: GridPoint): string {
    if (!point.competitors || point.competitors.length === 0) return ""

    const lines = point.competitors.map((c) => {
        const weight = c.isClient ? "font-weight:800;" : "font-weight:400;"
        const color = c.isClient ? getRankColor(c.rank) : "#555"
        const bg = c.isClient ? "background:#fef3c7;border-radius:3px;padding:1px 4px;" : ""
        const label = c.isClient ? `<strong>★ ${c.name}</strong>` : c.name
        return `<div style="display:flex;align-items:center;gap:6px;${weight}padding:2px 0;">
            <span style="color:${color};min-width:20px;font-weight:700;">#${c.rank}</span>
            <span style="${bg}">${label}</span>
            <span style="color:#aaa;font-size:9px;margin-left:auto;">${c.domain}</span>
        </div>`
    })

    return `<div style="border-top:1px solid #e5e7eb;margin-top:6px;padding-top:6px;">
        <div style="font-size:10px;font-weight:600;color:#888;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.5px;">Top Results</div>
        ${lines.join("")}
    </div>`
}

// The actual map component — dynamically imported to avoid SSR issues with Leaflet
function LeafletMap({
    gridData,
    gridSize,
    radiusMiles,
    keyword,
    businessLocation,
}: RankGridProps) {
    const mapRef = useRef<HTMLDivElement>(null)
    const mapInstanceRef = useRef<L.Map | null>(null)
    const [L, setL] = useState<typeof import("leaflet") | null>(null)

    // Dynamic import of leaflet (browser only)
    useEffect(() => {
        import("leaflet").then((leaflet) => {
            setL(leaflet.default || leaflet)
        })
    }, [])

    // Calculate bounds to fit all grid points
    const bounds = useMemo(() => {
        if (!L || gridData.length === 0) return null
        const lats = gridData.map((p) => p.lat)
        const lngs = gridData.map((p) => p.lng)
        const padding = 0.15
        const latRange = Math.max(...lats) - Math.min(...lats)
        const lngRange = Math.max(...lngs) - Math.min(...lngs)
        return L.latLngBounds(
            [Math.min(...lats) - latRange * padding, Math.min(...lngs) - lngRange * padding],
            [Math.max(...lats) + latRange * padding, Math.max(...lngs) + lngRange * padding],
        )
    }, [L, gridData])

    // Initialize and update map
    useEffect(() => {
        if (!L || !mapRef.current || !bounds) return

        // Clean up previous map
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove()
            mapInstanceRef.current = null
        }

        // Create map
        const map = L.map(mapRef.current, {
            zoomControl: true,
            attributionControl: true,
            scrollWheelZoom: true,
        })

        // OpenStreetMap tiles
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
        }).addTo(map)

        map.fitBounds(bounds)

        // Business location marker (pulsing orange dot)
        const businessIcon = L.divIcon({
            className: "rank-grid-business-marker",
            html: `<div style="
                width: 18px; height: 18px;
                background: #f97316;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 0 0 3px #f97316, 0 2px 8px rgba(0,0,0,0.3);
            "></div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
        })
        L.marker([businessLocation.lat, businessLocation.lng], { icon: businessIcon })
            .addTo(map)
            .bindTooltip(`📍 ${businessLocation.label}`, {
                permanent: false,
                direction: "top",
                offset: [0, -12],
                className: "rank-grid-tooltip",
            })

        // Distance rings
        const ringDistances = [radiusMiles * 0.33, radiusMiles * 0.66, radiusMiles]
        ringDistances.forEach((distMi, i) => {
            L.circle([businessLocation.lat, businessLocation.lng], {
                radius: distMi * 1609.34,
                fill: false,
                color: "#f97316",
                weight: 1,
                opacity: 0.25 - i * 0.05,
                dashArray: "6,4",
            }).addTo(map)
        })

        // Grid point markers with rank + competitor data
        gridData.forEach((point) => {
            const color = getRankColor(point.rank)
            const halfGrid = Math.floor(gridSize / 2)
            const isCenter = point.row === halfGrid && point.col === halfGrid
            const size = isCenter ? 38 : 32

            const icon = L.divIcon({
                className: "rank-grid-point",
                html: `<div style="
                    width: ${size}px; height: ${size}px;
                    background: white;
                    border: 2.5px solid ${color};
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 800;
                    font-size: ${size * 0.4}px;
                    color: ${color};
                    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                    cursor: pointer;
                    transition: transform 0.15s;
                    ${isCenter ? `box-shadow: 0 0 0 2px #f97316, 0 2px 8px rgba(0,0,0,0.25);` : ""}
                " onmouseover="this.style.transform='scale(1.25)'" onmouseout="this.style.transform='scale(1)'">${point.rank || "–"}</div>`,
                iconSize: [size, size],
                iconAnchor: [size / 2, size / 2],
            })

            const competitorHTML = buildCompetitorHTML(point)

            const tooltipContent = `
                <div style="font-size:12px; line-height:1.5; min-width:200px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <strong>Grid (${point.row + 1}, ${point.col + 1})</strong>
                        <span style="font-size:10px;color:#888;">${point.distanceMi.toFixed(1)} mi</span>
                    </div>
                    <div style="margin:4px 0;">
                        Your Rank: <span style="color:${color}; font-weight:800; font-size:14px;">${point.rank ? `#${point.rank}` : "Not ranked"}</span>
                    </div>
                    ${competitorHTML}
                    <div style="font-size:9px; color:#aaa; margin-top:4px;">
                        ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}
                    </div>
                </div>
            `
            L.marker([point.lat, point.lng], { icon })
                .addTo(map)
                .bindTooltip(tooltipContent, {
                    direction: "top",
                    offset: [0, -(size / 2 + 4)],
                    className: "rank-grid-tooltip",
                })
        })

        mapInstanceRef.current = map

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove()
                mapInstanceRef.current = null
            }
        }
    }, [L, gridData, gridSize, radiusMiles, businessLocation, bounds])

    return (
        <div className="relative">
            <div ref={mapRef} style={{ height: 480, width: "100%" }} className="rounded-xl overflow-hidden border border-border z-0" />

            {/* Legend overlay */}
            <div className="absolute bottom-3 left-3 z-[1000] bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 flex items-center gap-3 text-xs shadow-sm">
                {keyword && <span className="font-medium text-foreground">&quot;{keyword}&quot;</span>}
                <span className="text-muted-foreground">{gridSize}×{gridSize} · {radiusMiles}mi</span>
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-green-500" /> 1-3</div>
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-orange-500" /> 4-10</div>
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /> 11+</div>
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-zinc-400" /> N/A</div>
            </div>
        </div>
    )
}

// Main export — wraps the map with stats and handles empty state
export function RankGrid(props: RankGridProps) {
    const { gridData, className = "" } = props
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (gridData.length === 0) {
        return (
            <div className={`flex items-center justify-center h-64 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-zinc-200 dark:border-zinc-700 ${className}`}>
                <p className="text-sm text-muted-foreground">
                    Set your business address and run a grid check to see local rankings.
                </p>
            </div>
        )
    }

    return (
        <div className={`space-y-4 ${className}`}>
            <GridStats gridData={gridData} />
            {mounted ? (
                <LeafletMap {...props} />
            ) : (
                <div className="h-[480px] bg-zinc-100 dark:bg-zinc-800/30 rounded-xl flex items-center justify-center border border-border">
                    <p className="text-sm text-muted-foreground">Loading map...</p>
                </div>
            )}
        </div>
    )
}
