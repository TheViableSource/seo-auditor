import { NextRequest, NextResponse } from "next/server"

function generateBadgeSVG(score: number, label = "SEO Score"): string {
    const getColor = (s: number) => {
        if (s >= 80) return "#22c55e" // green
        if (s >= 60) return "#f97316" // orange
        return "#ef4444" // red
    }

    const scoreText = `${score}`
    const color = getColor(score)
    const labelWidth = label.length * 7 + 10
    const scoreWidth = scoreText.length * 8 + 12
    const totalWidth = labelWidth + scoreWidth

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" viewBox="0 0 ${totalWidth} 20">
  <defs>
    <linearGradient id="smooth" x2="0" y2="100%">
      <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
      <stop offset="1" stop-opacity=".1"/>
    </linearGradient>
  </defs>
  <clipPath id="r"><rect width="${totalWidth}" height="20" rx="3"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${scoreWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#smooth)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + scoreWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${scoreText}</text>
    <text x="${labelWidth + scoreWidth / 2}" y="14">${scoreText}</text>
  </g>
</svg>`
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get("url")
    const label = searchParams.get("label") || "SEO Score"

    if (!url) {
        return new NextResponse(
            generateBadgeSVG(0, "error"),
            {
                status: 400,
                headers: {
                    "Content-Type": "image/svg+xml",
                    "Cache-Control": "no-cache",
                },
            }
        )
    }

    try {
        // Run a quick audit to get the score
        const baseUrl = request.nextUrl.origin
        const auditResponse = await fetch(`${baseUrl}/api/audit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
        })

        if (!auditResponse.ok) {
            throw new Error("Audit failed")
        }

        const auditData = await auditResponse.json()
        const score = Math.round(auditData.score ?? 0)

        const svg = generateBadgeSVG(score, label)

        return new NextResponse(svg, {
            status: 200,
            headers: {
                "Content-Type": "image/svg+xml",
                "Cache-Control": "public, max-age=3600, s-maxage=3600",
            },
        })
    } catch {
        return new NextResponse(
            generateBadgeSVG(0, "error"),
            {
                status: 500,
                headers: {
                    "Content-Type": "image/svg+xml",
                    "Cache-Control": "no-cache",
                },
            }
        )
    }
}
