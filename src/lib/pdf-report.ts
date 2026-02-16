"use client"

/**
 * PDF Report Generator — jsPDF-only (no html2canvas)
 *
 * Composes the audit report using jsPDF's native drawing API.
 * This avoids all html2canvas / Tailwind CSS v4 lab() color issues
 * and produces clean, text-selectable, lightweight PDFs.
 */

import jsPDF from "jspdf"
import type { StoredAudit, StoredSettings } from "@/lib/local-storage"

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function scoreColor(score: number): [number, number, number] {
    if (score >= 80) return [34, 197, 94]   // green
    if (score >= 60) return [245, 158, 11]  // amber
    if (score >= 40) return [249, 115, 22]  // orange
    return [239, 68, 68]                     // red
}

function scoreGrade(score: number): string {
    if (score >= 90) return "A+"
    if (score >= 80) return "A"
    if (score >= 70) return "B"
    if (score >= 60) return "C"
    if (score >= 50) return "D"
    return "F"
}

function fmtDate(d: string): string {
    return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

function safe(n: unknown): number {
    const v = Number(n)
    return Number.isFinite(v) ? v : 0
}

/* ------------------------------------------------------------------ */
/*  Constants — Letter size in mm                                       */
/* ------------------------------------------------------------------ */
const PW = 215.9  // page width
const PH = 279.4  // page height
const ML = 20     // margin left
const MR = 20     // margin right
const MT = 20     // margin top
const MB = 20     // margin bottom
const CW = PW - ML - MR  // content width

/* ------------------------------------------------------------------ */
/*  Draw score arc (pure jsPDF arcs)                                    */
/* ------------------------------------------------------------------ */
function drawScoreCircle(
    pdf: jsPDF,
    cx: number,
    cy: number,
    radius: number,
    score: number
) {
    const s = safe(score)
    const [r, g, b] = scoreColor(s)

    // Background ring
    pdf.setDrawColor(230, 230, 230)
    pdf.setLineWidth(2.5)
    pdf.circle(cx, cy, radius, "S")

    // Score arc — draw as a thick arc
    if (s > 0) {
        pdf.setDrawColor(r, g, b)
        pdf.setLineWidth(2.5)
        const startAngle = -90  // 12 o'clock
        const endAngle = startAngle + (s / 100) * 360
        // jsPDF doesn't have native arc, so approximate with small line segments
        const steps = Math.max(2, Math.round(s / 2))
        const angleStep = ((endAngle - startAngle) * Math.PI) / (180 * steps)
        let prevX = cx + radius * Math.cos((startAngle * Math.PI) / 180)
        let prevY = cy + radius * Math.sin((startAngle * Math.PI) / 180)
        for (let i = 1; i <= steps; i++) {
            const angle = (startAngle * Math.PI) / 180 + i * angleStep
            const nx = cx + radius * Math.cos(angle)
            const ny = cy + radius * Math.sin(angle)
            pdf.line(prevX, prevY, nx, ny)
            prevX = nx
            prevY = ny
        }
    }

    // Score text centered
    pdf.setTextColor(r, g, b)
    pdf.setFontSize(22)
    pdf.setFont("helvetica", "bold")
    pdf.text(String(s), cx, cy - 1, { align: "center" })
    pdf.setFontSize(8)
    pdf.setFont("helvetica", "normal")
    pdf.setTextColor(150, 150, 150)
    pdf.text(scoreGrade(s), cx, cy + 5, { align: "center" })
}

/* ------------------------------------------------------------------ */
/*  Wrap text helper                                                    */
/* ------------------------------------------------------------------ */
function wrapText(pdf: jsPDF, text: string, maxWidth: number): string[] {
    return pdf.splitTextToSize(text, maxWidth) as string[]
}

/* ------------------------------------------------------------------ */
/*  Check if we need a new page (returns updated Y)                     */
/* ------------------------------------------------------------------ */
function ensureSpace(pdf: jsPDF, y: number, needed: number): number {
    if (y + needed > PH - MB) {
        pdf.addPage()
        return MT
    }
    return y
}

/* ------------------------------------------------------------------ */
/*  Public API                                                          */
/* ------------------------------------------------------------------ */

export async function generatePdfReport(
    audit: StoredAudit,
    settings: StoredSettings,
    filename: string
): Promise<void> {
    const brandColor: [number, number, number] = hexToRgb(settings.brandColor || "#f97316")
    const isAgency = settings.tier === "agency"
    const brandName = isAgency && settings.brandName ? settings.brandName : "AuditorPro"
    const categories = audit.fullCategories || []
    const s = safe(audit.score)

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" })

    /* ═══════════════ COVER PAGE ═══════════════ */

    // Brand bar at top
    pdf.setFillColor(...brandColor)
    pdf.rect(0, 0, PW, 6, "F")

    // Brand name
    let y = 30
    pdf.setFontSize(16)
    pdf.setFont("helvetica", "bold")
    pdf.setTextColor(55, 65, 81)
    pdf.text(brandName, ML, y)

    // Date on the right
    pdf.setFontSize(10)
    pdf.setFont("helvetica", "normal")
    pdf.setTextColor(107, 114, 128)
    pdf.text(fmtDate(audit.createdAt), PW - MR, y, { align: "right" })

    // Divider
    y += 8
    pdf.setDrawColor(229, 231, 235)
    pdf.setLineWidth(0.3)
    pdf.line(ML, y, PW - MR, y)

    // Title section
    y += 25
    pdf.setFontSize(11)
    pdf.setFont("helvetica", "bold")
    pdf.setTextColor(...brandColor)
    pdf.text("SEO AUDIT REPORT", ML, y)

    y += 12
    pdf.setFontSize(30)
    pdf.setFont("helvetica", "bold")
    pdf.setTextColor(17, 24, 39)
    const domainLines = wrapText(pdf, audit.domain, CW)
    pdf.text(domainLines, ML, y)
    y += domainLines.length * 13

    pdf.setFontSize(12)
    pdf.setFont("helvetica", "normal")
    pdf.setTextColor(107, 114, 128)
    const urlLines = wrapText(pdf, audit.url, CW)
    pdf.text(urlLines, ML, y)
    y += urlLines.length * 5.5 + 20

    // Score hero box
    const boxY = y
    const boxH = 50
    pdf.setFillColor(250, 250, 250)
    pdf.setDrawColor(229, 231, 235)
    pdf.setLineWidth(0.3)
    pdf.roundedRect(ML, boxY, CW, boxH, 4, 4, "FD")

    // Score circle
    drawScoreCircle(pdf, ML + 30, boxY + boxH / 2, 14, s)

    // Score label
    const labelX = ML + 55
    pdf.setFontSize(18)
    pdf.setFont("helvetica", "bold")
    pdf.setTextColor(17, 24, 39)
    pdf.text("Overall Score", labelX, boxY + 18)

    pdf.setFontSize(10)
    pdf.setFont("helvetica", "normal")
    pdf.setTextColor(107, 114, 128)
    const issueText = `${audit.issuesCount} issue${audit.issuesCount !== 1 ? "s" : ""} across ${audit.categorySummary.length} categories`
    const issueLines = wrapText(pdf, issueText, CW - 60)
    pdf.text(issueLines, labelX, boxY + 26)

    // Status badge
    const statusLabel = s >= 80 ? "Good" : s >= 60 ? "Needs Work" : s >= 40 ? "Poor" : "Critical"
    const [sr, sg, sb] = scoreColor(s)
    pdf.setFillColor(sr, sg, sb)
    pdf.roundedRect(labelX, boxY + 31, 28, 7, 2, 2, "F")
    pdf.setFontSize(8)
    pdf.setFont("helvetica", "bold")
    pdf.setTextColor(255, 255, 255)
    pdf.text(statusLabel, labelX + 14, boxY + 36, { align: "center" })

    y = boxY + boxH + 15

    // Footer note
    pdf.setFontSize(9)
    pdf.setFont("helvetica", "normal")
    pdf.setTextColor(200, 200, 200)
    pdf.text(`Generated by ${brandName}`, PW / 2, PH - 15, { align: "center" })

    /* ═══════════════ CATEGORY BREAKDOWN ═══════════════ */
    pdf.addPage()
    y = MT

    // Page header
    pdf.setFillColor(...brandColor)
    pdf.rect(ML, y, CW, 0.8, "F")
    y += 6
    pdf.setFontSize(9)
    pdf.setFont("helvetica", "bold")
    pdf.setTextColor(...brandColor)
    pdf.text("CATEGORY BREAKDOWN", ML, y)
    pdf.setFont("helvetica", "normal")
    pdf.setTextColor(156, 163, 175)
    pdf.text(audit.domain, PW - MR, y, { align: "right" })
    y += 10

    // Category cards (2-column layout)
    const colW = (CW - 10) / 2
    const cardH = 28

    for (let i = 0; i < audit.categorySummary.length; i++) {
        const cat = audit.categorySummary[i]
        const col = i % 2
        const cardX = ML + col * (colW + 10)

        if (col === 0) {
            y = ensureSpace(pdf, y, cardH + 6)
        }

        const cardY = y

        // Card background
        pdf.setFillColor(250, 250, 250)
        pdf.setDrawColor(229, 231, 235)
        pdf.setLineWidth(0.2)
        pdf.roundedRect(cardX, cardY, colW, cardH, 2, 2, "FD")

        // Category name (truncate to fit card minus score width)
        pdf.setFontSize(10)
        pdf.setFont("helvetica", "bold")
        pdf.setTextColor(17, 24, 39)
        const catLabelMaxW = colW - 30 // leave room for score number
        let catLabel = cat.label
        while (pdf.getTextWidth(catLabel) > catLabelMaxW && catLabel.length > 3) {
            catLabel = catLabel.slice(0, -1)
        }
        if (catLabel !== cat.label) catLabel += "…"
        pdf.text(catLabel, cardX + 5, cardY + 8)

        // Score
        const cs = safe(cat.score)
        const [cr, cg, cb] = scoreColor(cs)
        pdf.setFontSize(14)
        pdf.setFont("helvetica", "bold")
        pdf.setTextColor(cr, cg, cb)
        pdf.text(String(cs), cardX + colW - 5, cardY + 10, { align: "right" })

        // Score bar
        const barY = cardY + 14
        const barW = colW - 10
        pdf.setFillColor(229, 231, 235)
        pdf.roundedRect(cardX + 5, barY, barW, 2.5, 1, 1, "F")
        if (cs > 0) {
            pdf.setFillColor(cr, cg, cb)
            pdf.roundedRect(cardX + 5, barY, barW * (cs / 100), 2.5, 1, 1, "F")
        }

        // Stats
        pdf.setFontSize(7)
        pdf.setFont("helvetica", "normal")
        pdf.setTextColor(107, 114, 128)
        pdf.text(`✓ ${cat.passed} passed   ✗ ${cat.total - cat.passed} failed`, cardX + 5, cardY + 24)

        if (col === 1 || i === audit.categorySummary.length - 1) {
            y += cardH + 4
        }
    }

    // Summary stats
    y = ensureSpace(pdf, y + 8, 25)
    const stats = [
        { label: "TOTAL CHECKS", value: audit.categorySummary.reduce((acc, c) => acc + c.total, 0) },
        { label: "PASSED", value: audit.categorySummary.reduce((acc, c) => acc + c.passed, 0) },
        { label: "FAILED", value: audit.categorySummary.reduce((acc, c) => acc + (c.total - c.passed), 0) },
        { label: "ISSUES", value: audit.issuesCount },
    ]

    // Light tint of brand color (simulates 6% opacity over white)
    const lightR = Math.round(255 + (brandColor[0] - 255) * 0.06)
    const lightG = Math.round(255 + (brandColor[1] - 255) * 0.06)
    const lightB = Math.round(255 + (brandColor[2] - 255) * 0.06)
    pdf.setFillColor(lightR, lightG, lightB)
    pdf.roundedRect(ML, y, CW, 22, 3, 3, "F")

    const statW = CW / stats.length
    stats.forEach((stat, i) => {
        const sx = ML + i * statW + statW / 2
        pdf.setFontSize(16)
        pdf.setFont("helvetica", "bold")
        pdf.setTextColor(17, 24, 39)
        pdf.text(String(stat.value), sx, y + 10, { align: "center" })
        pdf.setFontSize(6)
        pdf.setFont("helvetica", "normal")
        pdf.setTextColor(107, 114, 128)
        pdf.text(stat.label, sx, y + 16, { align: "center" })
    })

    /* ═══════════════ ISSUE DETAILS ═══════════════ */
    // Start issues on a new page, then flow continuously
    pdf.addPage()
    y = MT

    for (const cat of categories) {
        const failedChecks = cat.checks.filter(c => c.status === "fail" || c.status === "warning")
        if (failedChecks.length === 0) continue

        // Category header — ensure it fits with at least one issue card (~30mm)
        y = ensureSpace(pdf, y, 30)

        // Category divider
        pdf.setFillColor(...brandColor)
        pdf.rect(ML, y, CW, 0.6, "F")
        y += 5
        pdf.setFontSize(9)
        pdf.setFont("helvetica", "bold")
        pdf.setTextColor(...brandColor)
        pdf.text(`ISSUES — ${cat.label.toUpperCase()}`, ML, y)
        pdf.setFont("helvetica", "normal")
        pdf.setTextColor(156, 163, 175)
        pdf.text(`${failedChecks.length} issue${failedChecks.length !== 1 ? "s" : ""}`, PW - MR, y, { align: "right" })
        y += 6

        for (const check of failedChecks) {
            // Measure wrapped text at their actual font sizes
            pdf.setFontSize(9)
            const titleLines = wrapText(pdf, check.title || "", CW - 40)
            const titleLH = 4

            pdf.setFontSize(7)
            const descLines = wrapText(pdf, check.description || "", CW - 16)
            const descLH = 3

            pdf.setFontSize(7)
            const recLines = check.recommendation ? wrapText(pdf, `Rec: ${check.recommendation}`, CW - 20) : []
            const recLH = 3

            // Calculate card height
            const titleH = titleLines.length * titleLH
            const descH = descLines.length * descLH
            const recH = recLines.length > 0 ? recLines.length * recLH + 6 : 0
            const needed = 6 + titleH + 2 + descH + recH + 4

            y = ensureSpace(pdf, y, needed)

            // Severity color bar
            const sevColor: [number, number, number] =
                check.severity === "critical" ? [239, 68, 68] :
                    check.severity === "major" ? [245, 158, 11] :
                        check.severity === "minor" ? [59, 130, 246] :
                            [156, 163, 175]

            pdf.setFillColor(...sevColor)
            pdf.rect(ML, y, 1.2, needed - 2, "F")

            // Card outline
            pdf.setDrawColor(235, 235, 235)
            pdf.setLineWidth(0.15)
            pdf.roundedRect(ML + 2, y, CW - 2, needed - 2, 1.5, 1.5, "S")

            // Title
            pdf.setFontSize(9)
            pdf.setFont("helvetica", "bold")
            pdf.setTextColor(17, 24, 39)
            pdf.text(titleLines, ML + 6, y + 4.5)

            // Severity badge
            pdf.setFillColor(...sevColor)
            const sevLabel = (check.severity || "info").toUpperCase()
            pdf.roundedRect(PW - MR - 18, y + 1.5, 16, 4, 1, 1, "F")
            pdf.setFontSize(5.5)
            pdf.setFont("helvetica", "bold")
            pdf.setTextColor(255, 255, 255)
            pdf.text(sevLabel, PW - MR - 10, y + 4.3, { align: "center" })

            // Description
            let iy = y + 4.5 + titleH + 1
            pdf.setFontSize(7)
            pdf.setFont("helvetica", "normal")
            pdf.setTextColor(107, 114, 128)
            pdf.text(descLines, ML + 6, iy)
            iy += descH

            // Recommendation
            if (recLines.length > 0) {
                iy += 2
                const recBoxH = recLines.length * recLH + 4
                pdf.setFillColor(240, 253, 244)
                pdf.roundedRect(ML + 6, iy - 2, CW - 12, recBoxH, 1, 1, "F")
                pdf.setFontSize(6.5)
                pdf.setFont("helvetica", "normal")
                pdf.setTextColor(21, 128, 61)
                pdf.text(recLines, ML + 8, iy + 1)
            }

            y += needed
        }

        y += 4  // Small gap between categories
    }

    /* ═══════════════ FOOTER ═══════════════ */
    y = ensureSpace(pdf, y, 35)
    y += 8

    // Divider
    pdf.setFillColor(...brandColor)
    pdf.rect(PW / 2 - 12, y, 24, 0.8, "F")
    y += 8

    pdf.setFontSize(12)
    pdf.setFont("helvetica", "bold")
    pdf.setTextColor(17, 24, 39)
    pdf.text("Next Steps", PW / 2, y, { align: "center" })
    y += 6

    pdf.setFontSize(8)
    pdf.setFont("helvetica", "normal")
    pdf.setTextColor(107, 114, 128)
    pdf.text("Address critical and major issues to improve SEO. Re-audit after changes to track progress.", PW / 2, y, { align: "center", maxWidth: CW - 20 })
    y += 10

    pdf.setFontSize(7)
    pdf.setTextColor(200, 200, 200)
    pdf.text(`Report generated by ${brandName} • ${fmtDate(audit.createdAt)}`, PW / 2, y, { align: "center" })

    /* ═══════════════ SAVE ═══════════════ */
    pdf.save(`${filename}.pdf`)
}

/* ------------------------------------------------------------------ */
/*  Hex to RGB helper                                                   */
/* ------------------------------------------------------------------ */
function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace("#", "")
    return [
        parseInt(h.substring(0, 2), 16) || 249,
        parseInt(h.substring(2, 4), 16) || 115,
        parseInt(h.substring(4, 6), 16) || 22,
    ]
}
