"use client"

import { type LocalRankEntry } from "@/lib/local-storage"

// ── SVG Bubble Map ──
// Renders city bubbles sized/colored by keyword rank.
// Centers on user's business address when provided.
// Green = top 3, Orange = 4-10, Red = 11+, Gray = unranked

// Known US city coordinates for fallback positioning
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
    "New York, NY": { lat: 40.7128, lng: -74.006 },
    "Los Angeles, CA": { lat: 34.0522, lng: -118.2437 },
    "Chicago, IL": { lat: 41.8781, lng: -87.6298 },
    "Houston, TX": { lat: 29.7604, lng: -95.3698 },
    "Phoenix, AZ": { lat: 33.4484, lng: -112.074 },
    "Philadelphia, PA": { lat: 39.9526, lng: -75.1652 },
    "San Antonio, TX": { lat: 29.4241, lng: -98.4936 },
    "San Diego, CA": { lat: 32.7157, lng: -117.1611 },
    "Dallas, TX": { lat: 32.7767, lng: -96.797 },
    "Austin, TX": { lat: 30.2672, lng: -97.7431 },
    "Portland, OR": { lat: 45.5152, lng: -122.6784 },
    "Seattle, WA": { lat: 47.6062, lng: -122.3321 },
    "Denver, CO": { lat: 39.7392, lng: -104.9903 },
    "Miami, FL": { lat: 25.7617, lng: -80.1918 },
    "Atlanta, GA": { lat: 33.749, lng: -84.388 },
    "Boston, MA": { lat: 42.3601, lng: -71.0589 },
    "Nashville, TN": { lat: 36.1627, lng: -86.7816 },
    "Las Vegas, NV": { lat: 36.1699, lng: -115.1398 },
    "Minneapolis, MN": { lat: 44.9778, lng: -93.265 },
    "Charlotte, NC": { lat: 35.2271, lng: -80.8431 },
}

export interface BusinessLocation {
    lat: number
    lng: number
    label: string // e.g. "123 Main St, Portland, OR"
}

function getRankColor(rank: number | null): string {
    if (!rank) return "#a1a1aa"
    if (rank <= 3) return "#22c55e"
    if (rank <= 10) return "#f97316"
    return "#ef4444"
}

function getRankSize(rank: number | null): number {
    if (!rank) return 6
    if (rank <= 3) return 14
    if (rank <= 10) return 10
    return 7
}

// Convert lat/lng to SVG coordinates relative to a center point
function geoToSvg(
    lat: number,
    lng: number,
    centerLat: number,
    centerLng: number,
    viewWidth: number,
    viewHeight: number,
): { x: number; y: number } {
    // Scale: ~1 degree lat ≈ 69 miles, 1 degree lng ≈ 54 miles (at ~40°N)
    const lngScale = Math.cos((centerLat * Math.PI) / 180)
    const dx = (lng - centerLng) * lngScale
    const dy = -(lat - centerLat) // invert Y for SVG

    // Normalize to fit within viewbox with padding
    const maxSpan = 25 // degrees span to show
    const scaleX = (viewWidth * 0.8) / maxSpan
    const scaleY = (viewHeight * 0.8) / maxSpan

    const scale = Math.min(scaleX, scaleY)

    return {
        x: viewWidth / 2 + dx * scale,
        y: viewHeight / 2 + dy * scale,
    }
}

// Clamp coordinates into viewbox
function clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val))
}

interface BubbleMapProps {
    data: LocalRankEntry[]
    keyword?: string
    businessLocation?: BusinessLocation | null
    className?: string
}

export function BubbleMap({ data, keyword, businessLocation, className = "" }: BubbleMapProps) {
    if (data.length === 0) {
        return (
            <div className={`flex items-center justify-center h-64 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-zinc-200 dark:border-zinc-700 ${className}`}>
                <p className="text-sm text-muted-foreground">No local rank data. Run a local rank check to see the bubble map.</p>
            </div>
        )
    }

    const VW = 100
    const VH = 90

    // Determine center point — business address or geographic center of data
    const center = businessLocation
        ? { lat: businessLocation.lat, lng: businessLocation.lng }
        : (() => {
            const lats = data.map((d) => d.lat).filter(Boolean) as number[]
            const lngs = data.map((d) => d.lng).filter(Boolean) as number[]
            if (lats.length === 0) return { lat: 39.8, lng: -98.5 } // US center
            return {
                lat: lats.reduce((a, b) => a + b, 0) / lats.length,
                lng: lngs.reduce((a, b) => a + b, 0) / lngs.length,
            }
        })()

    // Plot data points relative to center
    const plotted = data.map((entry) => {
        const lat = entry.lat || CITY_COORDS[entry.location]?.lat
        const lng = entry.lng || CITY_COORDS[entry.location]?.lng
        if (!lat || !lng) return null

        const pos = geoToSvg(lat, lng, center.lat, center.lng, VW, VH)
        return {
            ...entry,
            svgX: clamp(pos.x, 8, VW - 8),
            svgY: clamp(pos.y, 8, VH - 8),
        }
    }).filter(Boolean) as (LocalRankEntry & { svgX: number; svgY: number })[]

    // Business center SVG position
    const bizPos = geoToSvg(center.lat, center.lng, center.lat, center.lng, VW, VH)

    return (
        <div className={`relative ${className}`}>
            <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full h-auto" style={{ maxHeight: 440 }}>
                {/* Background */}
                <rect x="0" y="0" width={VW} height={VH} rx="4" fill="none" />

                {/* Subtle grid */}
                {[20, 40, 60, 80].map((x) => (
                    <line key={`vl-${x}`} x1={x} y1={0} x2={x} y2={VH} stroke="#e5e7eb" strokeWidth="0.15" strokeDasharray="1,1" />
                ))}
                {[20, 40, 60, 80].map((y) => (
                    <line key={`hl-${y}`} x1={0} y1={y} x2={VW} y2={y} stroke="#e5e7eb" strokeWidth="0.15" strokeDasharray="1,1" />
                ))}

                {/* Distance rings from business center */}
                {businessLocation && (
                    <>
                        <circle cx={bizPos.x} cy={bizPos.y} r={12} fill="none" stroke="#f97316" strokeWidth="0.15" strokeDasharray="1,1" opacity={0.4} />
                        <circle cx={bizPos.x} cy={bizPos.y} r={24} fill="none" stroke="#f97316" strokeWidth="0.12" strokeDasharray="1,1" opacity={0.25} />
                        <circle cx={bizPos.x} cy={bizPos.y} r={36} fill="none" stroke="#f97316" strokeWidth="0.1" strokeDasharray="1,1" opacity={0.15} />
                    </>
                )}

                {/* Connection lines from business to cities */}
                {businessLocation &&
                    plotted.map((entry) => (
                        <line
                            key={`line-${entry.location}`}
                            x1={bizPos.x}
                            y1={bizPos.y}
                            x2={entry.svgX}
                            y2={entry.svgY}
                            stroke={getRankColor(entry.rank)}
                            strokeWidth="0.2"
                            opacity={0.25}
                            strokeDasharray="0.5,0.5"
                        />
                    ))}

                {/* City bubbles */}
                {plotted.map((entry) => {
                    const color = getRankColor(entry.rank)
                    const size = getRankSize(entry.rank)

                    return (
                        <g key={entry.location}>
                            {/* Glow */}
                            <circle cx={entry.svgX} cy={entry.svgY} r={size * 0.7} fill={color} opacity={0.15} />
                            {/* Bubble */}
                            <circle cx={entry.svgX} cy={entry.svgY} r={size * 0.4} fill={color} opacity={0.9} stroke="white" strokeWidth="0.5">
                                <title>
                                    {entry.location}: #{entry.rank || "N/A"}
                                </title>
                            </circle>
                            {/* Rank label */}
                            <text x={entry.svgX} y={entry.svgY + 0.8} textAnchor="middle" fontSize="2.8" fontWeight="700" fill="white" style={{ pointerEvents: "none" }}>
                                {entry.rank || "–"}
                            </text>
                            {/* City label */}
                            <text x={entry.svgX} y={entry.svgY + size * 0.5 + 3} textAnchor="middle" fontSize="2" fontWeight="500" fill="#71717a" style={{ pointerEvents: "none" }}>
                                {entry.city}
                            </text>
                        </g>
                    )
                })}

                {/* Business center marker */}
                {businessLocation && (
                    <g>
                        {/* Pulsing ring */}
                        <circle cx={bizPos.x} cy={bizPos.y} r="4" fill="none" stroke="#f97316" strokeWidth="0.4" opacity={0.5}>
                            <animate attributeName="r" from="3" to="6" dur="2s" repeatCount="indefinite" />
                            <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
                        </circle>
                        {/* Pin shadow */}
                        <ellipse cx={bizPos.x} cy={bizPos.y + 3.5} rx="2" ry="0.6" fill="#00000020" />
                        {/* Pin body */}
                        <path
                            d={`M ${bizPos.x} ${bizPos.y - 5} 
                                C ${bizPos.x - 3.5} ${bizPos.y - 5} ${bizPos.x - 3.5} ${bizPos.y} ${bizPos.x} ${bizPos.y + 3}
                                C ${bizPos.x + 3.5} ${bizPos.y} ${bizPos.x + 3.5} ${bizPos.y - 5} ${bizPos.x} ${bizPos.y - 5} Z`}
                            fill="#f97316"
                            stroke="#ea580c"
                            strokeWidth="0.3"
                        />
                        {/* Pin dot */}
                        <circle cx={bizPos.x} cy={bizPos.y - 2.5} r="1.2" fill="white" />
                        {/* Label */}
                        <text x={bizPos.x} y={bizPos.y + 7} textAnchor="middle" fontSize="2.2" fontWeight="700" fill="#f97316" style={{ pointerEvents: "none" }}>
                            Your Business
                        </text>
                    </g>
                )}
            </svg>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                {keyword && <span className="font-medium text-foreground">&quot;{keyword}&quot;</span>}
                {businessLocation && (
                    <span className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-orange-200" /> Your Business
                    </span>
                )}
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500" /> Top 3
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500" /> 4–10
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" /> 11+
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-400" /> Not ranked
                </div>
            </div>
        </div>
    )
}
