import type { AuditCheck } from "@/lib/types"

/**
 * Robots.txt & Sitemap Analyzer — 3 checks with actionable recommendations
 */
export async function analyzeRobotsSitemap(url: string): Promise<AuditCheck[]> {
    const checks: AuditCheck[] = []
    const origin = new URL(url).origin

    // --- 1. ROBOTS.TXT ---
    let robotsContent = ""
    let robotsFound = false
    try {
        const res = await fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(5000) })
        if (res.ok) {
            robotsContent = await res.text()
            robotsFound = robotsContent.toLowerCase().includes("user-agent")
        }
    } catch { /* timeout or error */ }

    const isBlocking = robotsContent.includes("Disallow: /") && !robotsContent.includes("Disallow: /\n")
    checks.push({
        id: "rs-robots",
        title: "Robots.txt",
        description: "A valid robots.txt helps search engines crawl your site efficiently.",
        status: !robotsFound ? "fail" : isBlocking ? "warning" : "pass",
        severity: !robotsFound ? "major" : isBlocking ? "critical" : "info",
        value: !robotsFound ? "(not found or invalid)" : isBlocking ? "Contains broad blocking rules" : "Valid",
        recommendation: !robotsFound
            ? "Create a robots.txt at your site root. This file tells search engines which pages to crawl and where your sitemap is. Without it, crawlers may waste time on unimportant pages."
            : isBlocking
                ? "Your robots.txt contains broad Disallow rules that may be blocking important pages. Review each rule to ensure you're not accidentally hiding content from Google. Use Google Search Console's robots.txt tester to validate."
                : "Your robots.txt is valid and not blocking important content.",
        codeSnippet: !robotsFound ? `# robots.txt — place at site root\nUser-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml` : undefined,
        learnMoreUrl: "https://developers.google.com/search/docs/crawling-indexing/robots/create-robots-txt",
    })

    // --- 2. XML SITEMAP ---
    let sitemapFound = false
    let sitemapUrl = ""
    // Check robots.txt for sitemap reference
    const sitemapMatch = robotsContent.match(/Sitemap:\s*(.+)/i)
    if (sitemapMatch) sitemapUrl = sitemapMatch[1].trim()
    else sitemapUrl = `${origin}/sitemap.xml`

    try {
        const res = await fetch(sitemapUrl, { signal: AbortSignal.timeout(5000) })
        if (res.ok) {
            const body = await res.text()
            sitemapFound = body.includes("<urlset") || body.includes("<sitemapindex")
        }
    } catch { /* timeout or error */ }

    checks.push({
        id: "rs-sitemap",
        title: "XML Sitemap",
        description: "An XML sitemap helps search engines discover all your pages, especially new or deeply nested ones.",
        status: sitemapFound ? "pass" : "fail",
        severity: "major",
        value: sitemapFound ? sitemapUrl : "(not found)",
        recommendation: !sitemapFound
            ? "Create an XML sitemap listing all important pages. Submit it to Google Search Console. This is especially important for large sites, new sites, or sites with pages not well-linked internally. Most CMS platforms can generate one automatically."
            : "XML sitemap found and accessible. Submit it to Google Search Console if you haven't already, and ensure it stays up to date as you add new pages.",
        codeSnippet: !sitemapFound ? `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${origin}/</loc>\n    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>\n    <priority>1.0</priority>\n  </url>\n  <url>\n    <loc>${origin}/about</loc>\n    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>\n    <priority>0.8</priority>\n  </url>\n</urlset>` : undefined,
        learnMoreUrl: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap",
    })

    // --- 3. SITEMAP IN ROBOTS.TXT ---
    const hasSitemapRef = /Sitemap:/i.test(robotsContent)
    checks.push({
        id: "rs-sitemap-ref",
        title: "Sitemap Reference in Robots.txt",
        description: "Referencing your sitemap in robots.txt helps search engines find it automatically.",
        status: hasSitemapRef ? "pass" : robotsFound ? "warning" : "info",
        severity: "minor",
        value: hasSitemapRef ? "Referenced" : "(not referenced)",
        recommendation: !hasSitemapRef && robotsFound
            ? "Add a Sitemap directive to your robots.txt pointing to your XML sitemap. This is how search engines automatically discover your sitemap without you manually submitting it."
            : hasSitemapRef
                ? "Your robots.txt correctly references your sitemap location."
                : "Create a robots.txt first, then add a Sitemap reference.",
        codeSnippet: !hasSitemapRef && robotsFound ? `# Add this line to your robots.txt:\nSitemap: ${origin}/sitemap.xml` : undefined,
        learnMoreUrl: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap#addsitemap",
    })

    return checks
}
