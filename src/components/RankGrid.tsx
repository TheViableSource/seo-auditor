"use client"

import { useState } from "react"

// ── Local Rank Grid ──
// Local Falcon-style NxN geo-grid centered on a business location.
// Each circle shows the rank for a keyword at that geographic point.
// Green (1-3), Orange (4-10), Red (11+), Gray (unranked)

export interface GridPoint {
    row: number
    col: number
    lat: number
    lng: number
    rank: number | null
    distanceMi: number
    label?: string
}

export interface BusinessLocation {
    lat: number
    lng: number
    label: string
}

function getRankColor(rank: number | null): string {
    if (!rank) return "#a1a1aa"
    if (rank <= 3) return "#22c55e"
    if (rank <= 10) return "#f97316"
    return "#ef4444"
}

function getRankBg(rank: number | null): string {
    if (!rank) return "#a1a1aa15"
    if (rank <= 3) return "#22c55e18"
    if (rank <= 10) return "#f9731618"
    return "#ef444418"
}

interface RankGridProps {
    gridData: GridPoint[]
    gridSize: number
    radiusMiles: number
    keyword?: string
    businessLocation: BusinessLocation
    className?: string
}

export function RankGrid({
    gridData,
    gridSize,
    radiusMiles,
    keyword,
    businessLocation,
    className = "",
}: RankGridProps) {
    const [hoveredPoint, setHoveredPoint] = useState<GridPoint | null>(null)

    if (gridData.length === 0) {
        return (
            <div className={`flex items-center justify-center h-64 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-zinc-200 dark:border-zinc-700 ${className}`}>
                <p className="text-sm text-muted-foreground">
                    Set your business address and run a grid check to see local rankings.
                </p>
            </div>
        )
    }

    // SVG dimensions
    const padding = 40
    const size = 400
    const innerSize = size - padding * 2
    const cellSize = innerSize / (gridSize - 1 || 1)
    const circleR = Math.min(cellSize * 0.35, 22)
    const center = size / 2

    // Compute grid stats
    const rankedPoints = gridData.filter((p) => p.rank !== null)
    const avgRank = rankedPoints.length > 0
        ? (rankedPoints.reduce((s, p) => s + (p.rank || 0), 0) / rankedPoints.length).toFixed(1)
        : "–"
    const bestRank = rankedPoints.length > 0 ? Math.min(...rankedPoints.map((p) => p.rank!)) : null
    const worstRank = rankedPoints.length > 0 ? Math.max(...rankedPoints.map((p) => p.rank!)) : null
    const top3Count = rankedPoints.filter((p) => p.rank! <= 3).length
    const top3Pct = gridData.length > 0 ? Math.round((top3Count / gridData.length) * 100) : 0

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Stats Bar */}
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

            {/* Grid SVG */}
            <div className="relative">
                <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto" style={{ maxHeight: 520 }}>
                    {/* Background */}
                    <rect x="0" y="0" width={size} height={size} rx="12" fill="none" />

                    {/* Concentric radius rings */}
                    {[0.33, 0.66, 1].map((pct, i) => (
                        <circle
                            key={`ring-${i}`}
                            cx={center}
                            cy={center}
                            r={(innerSize / 2) * pct}
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="0.8"
                            strokeDasharray="3,3"
                            opacity={0.5}
                        />
                    ))}

                    {/* Radius labels */}
                    {[0.33, 0.66, 1].map((pct, i) => (
                        <text
                            key={`rlabel-${i}`}
                            x={center + (innerSize / 2) * pct + 2}
                            y={center - 3}
                            fontSize="8"
                            fill="#a1a1aa"
                            fontWeight="500"
                        >
                            {(radiusMiles * pct).toFixed(1)}mi
                        </text>
                    ))}

                    {/* Grid light crosshairs */}
                    <line x1={center} y1={padding - 10} x2={center} y2={size - padding + 10} stroke="#e5e7eb" strokeWidth="0.5" opacity={0.4} />
                    <line x1={padding - 10} y1={center} x2={size - padding + 10} y2={center} stroke="#e5e7eb" strokeWidth="0.5" opacity={0.4} />

                    {/* Grid points */}
                    {gridData.map((point) => {
                        const halfGrid = Math.floor(gridSize / 2)
                        const x = center + (point.col - halfGrid) * cellSize
                        const y = center + (point.row - halfGrid) * cellSize
                        const color = getRankColor(point.rank)
                        const bg = getRankBg(point.rank)
                        const isCenter = point.row === halfGrid && point.col === halfGrid
                        const isHovered = hoveredPoint?.row === point.row && hoveredPoint?.col === point.col

                        return (
                            <g
                                key={`${point.row}-${point.col}`}
                                onMouseEnter={() => setHoveredPoint(point)}
                                onMouseLeave={() => setHoveredPoint(null)}
                                style={{ cursor: "pointer" }}
                            >
                                {/* Hover glow */}
                                {isHovered && (
                                    <circle cx={x} cy={y} r={circleR + 4} fill={color} opacity={0.15} />
                                )}

                                {/* Background circle */}
                                <circle cx={x} cy={y} r={circleR} fill={bg} stroke={color} strokeWidth={isCenter ? 2.5 : 1.5} />

                                {/* Rank number */}
                                <text
                                    x={x}
                                    y={y + (circleR * 0.35)}
                                    textAnchor="middle"
                                    fontSize={circleR * 0.85}
                                    fontWeight="800"
                                    fill={color}
                                    style={{ pointerEvents: "none" }}
                                >
                                    {point.rank || "–"}
                                </text>

                                {/* Center marker badge */}
                                {isCenter && (
                                    <>
                                        <circle cx={x} cy={y} r={circleR + 2} fill="none" stroke="#f97316" strokeWidth="1.5" strokeDasharray="2,2">
                                            <animate attributeName="stroke-dashoffset" from="0" to="12" dur="3s" repeatCount="indefinite" />
                                        </circle>
                                    </>
                                )}
                            </g>
                        )
                    })}

                    {/* Center business label */}
                    <text
                        x={center}
                        y={size - padding + 25}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="700"
                        fill="#f97316"
                    >
                        📍 {businessLocation.label.length > 40 ? businessLocation.label.slice(0, 37) + "..." : businessLocation.label}
                    </text>
                </svg>

                {/* Hover tooltip */}
                {hoveredPoint && (
                    <div className="absolute top-3 right-3 p-3 rounded-lg bg-background border border-border shadow-lg text-xs space-y-1 min-w-[160px] z-10">
                        <p className="font-semibold text-foreground">
                            Grid Point ({hoveredPoint.row + 1}, {hoveredPoint.col + 1})
                        </p>
                        <p className="text-muted-foreground">
                            Rank: <span className="font-bold" style={{ color: getRankColor(hoveredPoint.rank) }}>
                                #{hoveredPoint.rank || "Not ranked"}
                            </span>
                        </p>
                        <p className="text-muted-foreground">
                            Distance: {hoveredPoint.distanceMi.toFixed(1)} mi
                        </p>
                        <p className="text-muted-foreground font-mono text-[10px]">
                            {hoveredPoint.lat.toFixed(4)}, {hoveredPoint.lng.toFixed(4)}
                        </p>
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground flex-wrap">
                {keyword && <span className="font-medium text-foreground">&quot;{keyword}&quot;</span>}
                <span className="text-[11px] text-muted-foreground">{gridSize}×{gridSize} grid · {radiusMiles}mi radius</span>
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
