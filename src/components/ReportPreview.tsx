"use client"

/**
 * ReportPreview — Hidden render target for PDF generation.
 *
 * Renders a beautifully styled, print-optimized audit report that
 * html2canvas captures into a pixel-perfect PDF.
 *
 * Agency-tier users see their custom logo + business name instead of
 * the default AuditorPro branding.
 */

import React from "react"
import type { StoredAudit, StoredSettings } from "@/lib/local-storage"

interface ReportPreviewProps {
    audit: StoredAudit
    settings: StoredSettings
    containerRef: React.RefObject<HTMLDivElement | null>
}

function getScoreColor(score: number) {
    if (score >= 80) return "#22c55e" // green
    if (score >= 60) return "#f59e0b" // amber
    if (score >= 40) return "#f97316" // orange
    return "#ef4444"                   // red
}

function getScoreGrade(score: number) {
    if (score >= 90) return "A+"
    if (score >= 80) return "A"
    if (score >= 70) return "B"
    if (score >= 60) return "C"
    if (score >= 50) return "D"
    return "F"
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    })
}

export default function ReportPreview({ audit, settings, containerRef }: ReportPreviewProps) {
    const brandColor = settings.brandColor || "#f97316"
    const isAgency = settings.tier === "agency"
    const brandName = isAgency && settings.brandName ? settings.brandName : "AuditorPro"
    const categories = audit.fullCategories || []

    return (
        <div
            ref={containerRef}
            style={{
                width: "816px", // Letter width at 96dpi
                fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
                backgroundColor: "#ffffff",
                color: "#1a1a1a",
                position: "absolute",
                left: "-9999px",
                top: 0,
            }}
        >
            {/* ═══════════════ COVER PAGE ═══════════════ */}
            <div
                style={{
                    minHeight: "1056px", // Letter height at 96dpi
                    background: `linear-gradient(135deg, ${brandColor}08 0%, ${brandColor}15 30%, #f8fafc 60%, #ffffff 100%)`,
                    display: "flex",
                    flexDirection: "column",
                    padding: "60px 50px",
                    position: "relative",
                    overflow: "hidden",
                }}
            >
                {/* Decorative elements */}
                <div style={{
                    position: "absolute",
                    top: "-100px",
                    right: "-100px",
                    width: "400px",
                    height: "400px",
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${brandColor}12 0%, transparent 70%)`,
                }} />
                <div style={{
                    position: "absolute",
                    bottom: "-80px",
                    left: "-80px",
                    width: "300px",
                    height: "300px",
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${brandColor}08 0%, transparent 70%)`,
                }} />

                {/* Header bar */}
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "80px",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {isAgency && settings.brandLogo ? (
                            <img
                                src={settings.brandLogo}
                                alt={brandName}
                                style={{ height: "40px", width: "auto", objectFit: "contain" }}
                            />
                        ) : (
                            <div style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "8px",
                                background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#fff",
                                fontWeight: 800,
                                fontSize: "18px",
                            }}>
                                A
                            </div>
                        )}
                        <span style={{
                            fontSize: "18px",
                            fontWeight: 700,
                            color: "#374151",
                        }}>
                            {brandName}
                        </span>
                    </div>
                    <div style={{
                        fontSize: "13px",
                        color: "#6b7280",
                        textAlign: "right",
                    }}>
                        <div>{formatDate(audit.createdAt)}</div>
                        <div style={{ fontSize: "11px", color: "#9ca3af" }}>Prepared by {settings.userName}</div>
                    </div>
                </div>

                {/* Title section */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: brandColor,
                        textTransform: "uppercase",
                        letterSpacing: "3px",
                        marginBottom: "16px",
                    }}>
                        SEO Audit Report
                    </div>
                    <h1 style={{
                        fontSize: "42px",
                        fontWeight: 800,
                        color: "#111827",
                        lineHeight: 1.15,
                        margin: "0 0 12px 0",
                        maxWidth: "600px",
                    }}>
                        {audit.domain}
                    </h1>
                    <p style={{
                        fontSize: "16px",
                        color: "#6b7280",
                        margin: "0 0 50px 0",
                    }}>
                        {audit.url}
                    </p>

                    {/* Score hero */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "40px",
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "20px",
                        padding: "35px 40px",
                        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
                        maxWidth: "600px",
                    }}>
                        {/* Score circle */}
                        <div style={{ position: "relative", width: "120px", height: "120px", flexShrink: 0 }}>
                            <svg viewBox="0 0 120 120" width="120" height="120">
                                <circle cx="60" cy="60" r="50" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                                <circle
                                    cx="60" cy="60" r="50"
                                    fill="none"
                                    stroke={getScoreColor(audit.score)}
                                    strokeWidth="10"
                                    strokeLinecap="round"
                                    strokeDasharray={`${(audit.score / 100) * 314} 314`}
                                    transform="rotate(-90 60 60)"
                                />
                            </svg>
                            <div style={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                            }}>
                                <span style={{
                                    fontSize: "36px",
                                    fontWeight: 800,
                                    color: getScoreColor(audit.score),
                                    lineHeight: 1,
                                }}>{audit.score}</span>
                                <span style={{
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    color: "#9ca3af",
                                    marginTop: "4px",
                                }}>{getScoreGrade(audit.score)}</span>
                            </div>
                        </div>

                        {/* Score meta */}
                        <div>
                            <div style={{ fontSize: "24px", fontWeight: 700, color: "#111827", marginBottom: "8px" }}>
                                Overall Score
                            </div>
                            <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "16px" }}>
                                {audit.issuesCount} issue{audit.issuesCount !== 1 ? "s" : ""} detected across {audit.categorySummary.length} categories
                            </div>
                            <div style={{
                                display: "inline-flex",
                                padding: "6px 16px",
                                borderRadius: "999px",
                                fontSize: "13px",
                                fontWeight: 600,
                                color: "#fff",
                                background: getScoreColor(audit.score),
                            }}>
                                {audit.score >= 80 ? "Good" : audit.score >= 60 ? "Needs Work" : audit.score >= 40 ? "Poor" : "Critical"}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer watermark */}
                <div style={{
                    marginTop: "40px",
                    fontSize: "11px",
                    color: "#d1d5db",
                    textAlign: "center",
                }}>
                    Generated by {brandName} • {formatDate(audit.createdAt)}
                </div>
            </div>

            {/* ═══════════════ CATEGORY BREAKDOWN ═══════════════ */}
            <div style={{
                minHeight: "1056px",
                padding: "50px",
                background: "#ffffff",
            }}>
                {/* Page header */}
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: `2px solid ${brandColor}`,
                    paddingBottom: "12px",
                    marginBottom: "40px",
                }}>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: brandColor, textTransform: "uppercase", letterSpacing: "2px" }}>
                        Category Breakdown
                    </span>
                    <span style={{ fontSize: "11px", color: "#9ca3af" }}>{audit.domain}</span>
                </div>

                {/* Category cards */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
                    {audit.categorySummary.map((cat, i) => {
                        const full = categories.find(c => c.name === cat.name)
                        return (
                            <div key={i} style={{
                                width: "calc(50% - 8px)",
                                border: "1px solid #e5e7eb",
                                borderRadius: "14px",
                                padding: "24px",
                                background: "#fafafa",
                            }}>
                                {/* Category header */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                    <span style={{ fontSize: "15px", fontWeight: 700, color: "#111827" }}>
                                        {cat.label}
                                    </span>
                                    <div style={{
                                        width: "44px",
                                        height: "44px",
                                        borderRadius: "50%",
                                        background: `${getScoreColor(cat.score)}15`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}>
                                        <span style={{
                                            fontSize: "16px",
                                            fontWeight: 800,
                                            color: getScoreColor(cat.score),
                                        }}>{cat.score}</span>
                                    </div>
                                </div>

                                {/* Score bar */}
                                <div style={{
                                    height: "8px",
                                    borderRadius: "4px",
                                    background: "#e5e7eb",
                                    overflow: "hidden",
                                    marginBottom: "12px",
                                }}>
                                    <div style={{
                                        height: "100%",
                                        width: `${cat.score}%`,
                                        borderRadius: "4px",
                                        background: `linear-gradient(90deg, ${getScoreColor(cat.score)}cc, ${getScoreColor(cat.score)})`,
                                    }} />
                                </div>

                                {/* Stats */}
                                <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "#6b7280" }}>
                                    <span>✓ {cat.passed} passed</span>
                                    <span>✗ {cat.total - cat.passed} failed</span>
                                    {full && <span>⚠ {full.warningCount} warnings</span>}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Summary stats row */}
                <div style={{
                    display: "flex",
                    gap: "20px",
                    marginTop: "40px",
                    padding: "24px",
                    background: `linear-gradient(135deg, ${brandColor}08, ${brandColor}04)`,
                    borderRadius: "14px",
                    border: `1px solid ${brandColor}20`,
                }}>
                    {[
                        { label: "Total Checks", value: audit.categorySummary.reduce((s, c) => s + c.total, 0) },
                        { label: "Passed", value: audit.categorySummary.reduce((s, c) => s + c.passed, 0) },
                        { label: "Failed", value: audit.categorySummary.reduce((s, c) => s + (c.total - c.passed), 0) },
                        { label: "Issue Score", value: `${audit.issuesCount}` },
                    ].map((stat, i) => (
                        <div key={i} style={{ flex: 1, textAlign: "center" }}>
                            <div style={{ fontSize: "26px", fontWeight: 800, color: "#111827" }}>{stat.value}</div>
                            <div style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "1px" }}>{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══════════════ ISSUE DETAILS ═══════════════ */}
            {categories.map((cat, catIdx) => {
                const failedChecks = cat.checks.filter(c => c.status === "fail" || c.status === "warning")
                if (failedChecks.length === 0) return null

                return (
                    <div key={catIdx} style={{
                        minHeight: "400px",
                        padding: "50px",
                        background: "#ffffff",
                    }}>
                        {/* Page header */}
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderBottom: `2px solid ${brandColor}`,
                            paddingBottom: "12px",
                            marginBottom: "30px",
                        }}>
                            <span style={{ fontSize: "11px", fontWeight: 600, color: brandColor, textTransform: "uppercase", letterSpacing: "2px" }}>
                                Issues — {cat.label}
                            </span>
                            <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                                {failedChecks.length} issue{failedChecks.length !== 1 ? "s" : ""}
                            </span>
                        </div>

                        {/* Issue cards */}
                        {failedChecks.map((check, idx) => (
                            <div key={idx} style={{
                                border: "1px solid #e5e7eb",
                                borderRadius: "10px",
                                padding: "18px 20px",
                                marginBottom: "12px",
                                borderLeft: `4px solid ${check.severity === "critical" ? "#ef4444" :
                                        check.severity === "major" ? "#f59e0b" :
                                            check.severity === "minor" ? "#3b82f6" : "#9ca3af"
                                    }`,
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#111827", maxWidth: "70%" }}>
                                        {check.title}
                                    </span>
                                    <span style={{
                                        fontSize: "10px",
                                        fontWeight: 700,
                                        textTransform: "uppercase",
                                        padding: "3px 10px",
                                        borderRadius: "999px",
                                        color: "#fff",
                                        background:
                                            check.severity === "critical" ? "#ef4444" :
                                                check.severity === "major" ? "#f59e0b" :
                                                    check.severity === "minor" ? "#3b82f6" : "#9ca3af",
                                    }}>
                                        {check.severity}
                                    </span>
                                </div>
                                <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 8px 0", lineHeight: 1.6 }}>
                                    {check.description}
                                </p>
                                {check.recommendation && (
                                    <div style={{
                                        fontSize: "12px",
                                        color: "#374151",
                                        background: "#f0fdf4",
                                        padding: "10px 14px",
                                        borderRadius: "8px",
                                        border: "1px solid #dcfce7",
                                    }}>
                                        <strong style={{ color: "#15803d" }}>💡 Recommendation:</strong> {check.recommendation}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )
            })}

            {/* ═══════════════ FOOTER PAGE ═══════════════ */}
            <div style={{
                minHeight: "300px",
                padding: "60px 50px",
                background: `linear-gradient(180deg, #ffffff 0%, ${brandColor}06 100%)`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
            }}>
                <div style={{
                    width: "60px",
                    height: "4px",
                    borderRadius: "2px",
                    background: brandColor,
                    marginBottom: "30px",
                }} />
                <h2 style={{
                    fontSize: "24px",
                    fontWeight: 800,
                    color: "#111827",
                    margin: "0 0 12px 0",
                }}>
                    Next Steps
                </h2>
                <p style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    maxWidth: "500px",
                    lineHeight: 1.7,
                    margin: "0 0 30px 0",
                }}>
                    Address the critical and major issues identified in this report to improve your site&#39;s
                    SEO performance. Re-run the audit after making changes to track your progress.
                </p>
                <div style={{
                    fontSize: "12px",
                    color: "#9ca3af",
                    marginTop: "20px",
                }}>
                    Report generated by {brandName} • {formatDate(audit.createdAt)}
                </div>
            </div>
        </div>
    )
}
