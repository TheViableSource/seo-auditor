"use client"

import { type LocalRankEntry } from "@/lib/local-storage"

// ── SVG Bubble Map ──
// Renders US city bubbles sized/colored by keyword rank
// Green = top 3, Orange = 4-10, Red = 11+, Gray = unranked

// Simplified US city positions (normalized 0-100 coordinate space)
const CITY_POSITIONS: Record<string, { x: number; y: number }> = {
    "New York, NY": { x: 82, y: 28 },
    "Los Angeles, CA": { x: 12, y: 52 },
    "Chicago, IL": { x: 64, y: 25 },
    "Houston, TX": { x: 52, y: 72 },
    "Phoenix, AZ": { x: 20, y: 58 },
    "Philadelphia, PA": { x: 80, y: 32 },
    "San Antonio, TX": { x: 46, y: 74 },
    "San Diego, CA": { x: 14, y: 58 },
    "Dallas, TX": { x: 50, y: 64 },
    "Austin, TX": { x: 48, y: 70 },
    "Portland, OR": { x: 12, y: 14 },
    "Seattle, WA": { x: 12, y: 8 },
    "Denver, CO": { x: 32, y: 38 },
    "Miami, FL": { x: 80, y: 78 },
    "Atlanta, GA": { x: 72, y: 58 },
    "Boston, MA": { x: 86, y: 22 },
    "Nashville, TN": { x: 68, y: 52 },
    "Las Vegas, NV": { x: 18, y: 46 },
    "Minneapolis, MN": { x: 52, y: 16 },
    "Charlotte, NC": { x: 76, y: 50 },
}

function getRankColor(rank: number | null): string {
    if (!rank) return "#a1a1aa" // zinc-400
    if (rank <= 3) return "#22c55e" // green-500
    if (rank <= 10) return "#f97316" // orange-500
    return "#ef4444" // red-500
}

function getRankSize(rank: number | null): number {
    if (!rank) return 6
    if (rank <= 3) return 14
    if (rank <= 10) return 10
    return 7
}

interface BubbleMapProps {
    data: LocalRankEntry[]
    keyword?: string
    className?: string
}

export function BubbleMap({ data, keyword, className = "" }: BubbleMapProps) {
    if (data.length === 0) {
        return (
            <div className={`flex items-center justify-center h-64 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-zinc-200 dark:border-zinc-700 ${className}`}>
                <p className="text-sm text-muted-foreground">No local rank data. Run a local rank check to see the bubble map.</p>
            </div>
        )
    }

    return (
        <div className={`relative ${className}`}>
            <svg viewBox="0 0 100 90" className="w-full h-auto" style={{ maxHeight: 420 }}>
                {/* Background */}
                <rect x="0" y="0" width="100" height="90" rx="4" fill="none" />

                {/* Grid lines */}
                {[20, 40, 60, 80].map(x => (
                    <line key={`vl-${x}`} x1={x} y1={0} x2={x} y2={90} stroke="#e5e7eb" strokeWidth="0.15" strokeDasharray="1,1" />
                ))}
                {[20, 40, 60, 80].map(y => (
                    <line key={`hl-${y}`} x1={0} y1={y} x2={100} y2={y} stroke="#e5e7eb" strokeWidth="0.15" strokeDasharray="1,1" />
                ))}

                {/* City bubbles */}
                {data.map((entry) => {
                    const pos = CITY_POSITIONS[entry.location]
                    if (!pos) return null
                    const color = getRankColor(entry.rank)
                    const size = getRankSize(entry.rank)

                    return (
                        <g key={entry.location}>
                            {/* Glow */}
                            <circle
                                cx={pos.x} cy={pos.y} r={size * 0.7}
                                fill={color} opacity={0.15}
                            />
                            {/* Bubble */}
                            <circle
                                cx={pos.x} cy={pos.y} r={size * 0.4}
                                fill={color} opacity={0.9}
                                stroke="white" strokeWidth="0.5"
                            >
                                <title>{entry.location}: #{entry.rank || "N/A"}</title>
                            </circle>
                            {/* Rank label */}
                            <text
                                x={pos.x} y={pos.y + 0.8}
                                textAnchor="middle" fontSize="2.8" fontWeight="700"
                                fill="white" style={{ pointerEvents: "none" }}
                            >
                                {entry.rank || "–"}
                            </text>
                            {/* City label */}
                            <text
                                x={pos.x} y={pos.y + size * 0.5 + 3}
                                textAnchor="middle" fontSize="2" fontWeight="500"
                                fill="#71717a" style={{ pointerEvents: "none" }}
                            >
                                {entry.city}
                            </text>
                        </g>
                    )
                })}
            </svg>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
                {keyword && <span className="font-medium text-foreground">&quot;{keyword}&quot;</span>}
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
