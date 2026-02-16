import type { CheerioAPI } from "cheerio"
import type { AuditCheck } from "@/lib/types"

/**
 * Technical SEO Analyzer — 12 checks with actionable recommendations
 */
export function analyzeTechnical(
    $: CheerioAPI,
    url: string,
    httpStatus: number,
    responseHeaders: Record<string, string>,
    fetchTimeMs: number
): AuditCheck[] {
    const checks: AuditCheck[] = []

    // --- 1. HTTPS ---
    const isHttps = url.startsWith("https")
    checks.push({
        id: "https",
        title: "HTTPS Encryption",
        description: "Sites should use HTTPS for security and SEO ranking benefit.",
        status: isHttps ? "pass" : "fail",
        severity: "critical",
        value: isHttps ? "Secure (HTTPS)" : "Not secure (HTTP)",
        recommendation: !isHttps
            ? "Migrate to HTTPS immediately. Google uses HTTPS as a ranking signal, and browsers mark HTTP sites as 'Not Secure'. Get a free SSL certificate from Let's Encrypt and set up 301 redirects from HTTP to HTTPS."
            : "Your site uses HTTPS encryption. Ensure your SSL certificate stays valid and auto-renews.",
        learnMoreUrl: "https://developers.google.com/search/docs/crawling-indexing/https",
    })

    // --- 2. HTTP STATUS ---
    checks.push({
        id: "http-status",
        title: "HTTP Status Code",
        description: "Pages should return a 200 OK status code.",
        status: httpStatus === 200 ? "pass" : "fail",
        severity: "critical",
        value: `${httpStatus}`,
        expected: "200",
        recommendation: httpStatus !== 200
            ? `Your page returned status ${httpStatus}. A 200 status is required for pages to be indexed. Check your server configuration, .htaccess rules, or redirect chains. Status 301/302 may indicate unintended redirects.`
            : "Page returns 200 OK — it can be indexed normally.",
        learnMoreUrl: "https://developers.google.com/search/docs/crawling-indexing/http-network-errors",
    })

    // --- 3. RESPONSE TIME ---
    checks.push({
        id: "response-time",
        title: "Server Response Time (TTFB)",
        description: "Time to first byte should be under 200ms for optimal performance.",
        status: fetchTimeMs <= 200 ? "pass" : fetchTimeMs <= 500 ? "warning" : "fail",
        severity: fetchTimeMs > 500 ? "major" : "minor",
        value: `${fetchTimeMs}ms`,
        expected: "< 200ms",
        recommendation: fetchTimeMs > 200
            ? `Your server took ${fetchTimeMs}ms to respond. Optimize by: 1) Using a CDN closer to your users, 2) Enabling server-side caching (Redis, Varnish), 3) Optimizing database queries, 4) Upgrading your hosting plan. Google recommends TTFB under 200ms.`
            : `Excellent server response time at ${fetchTimeMs}ms.`,
        learnMoreUrl: "https://web.dev/articles/ttfb",
    })

    // --- 4. VIEWPORT META ---
    const viewport = $('meta[name="viewport"]').attr("content") || ""
    checks.push({
        id: "viewport",
        title: "Viewport Meta Tag",
        description: "The viewport meta tag is required for mobile-responsive design.",
        status: viewport ? "pass" : "fail",
        severity: "critical",
        value: viewport ? "Set" : "(missing)",
        recommendation: !viewport
            ? "Add a viewport meta tag to make your site mobile-friendly. Without it, your page will render at desktop width on mobile devices, hurting both user experience and mobile search rankings."
            : "Viewport meta tag is properly set for mobile responsiveness.",
        codeSnippet: !viewport ? `<meta name="viewport" content="width=device-width, initial-scale=1" />` : undefined,
        learnMoreUrl: "https://web.dev/articles/responsive-web-design-basics",
    })

    // --- 5. FAVICON ---
    const favicon = $('link[rel="icon"], link[rel="shortcut icon"]').attr("href") || ""
    checks.push({
        id: "favicon",
        title: "Favicon",
        description: "A favicon improves brand recognition in browser tabs and bookmarks.",
        status: favicon ? "pass" : "warning",
        severity: "minor",
        value: favicon ? "Found" : "(missing)",
        recommendation: !favicon
            ? "Add a favicon for brand recognition in browser tabs, bookmarks, and search results. Use a 32×32 PNG or ICO format. Google also shows favicons in mobile search results."
            : "Favicon is set. Consider also adding apple-touch-icon for iOS home screen bookmarks.",
        codeSnippet: !favicon ? `<link rel="icon" type="image/png" href="/favicon.png" sizes="32x32" />\n<link rel="apple-touch-icon" href="/apple-touch-icon.png" />` : undefined,
        learnMoreUrl: "https://developers.google.com/search/docs/appearance/favicon-in-search",
    })

    // --- 6. OPEN GRAPH ---
    const ogTitle = $('meta[property="og:title"]').attr("content") || ""
    const ogImage = $('meta[property="og:image"]').attr("content") || ""
    checks.push({
        id: "open-graph",
        title: "Open Graph Tags",
        description: "Open Graph meta tags control how your page appears when shared on social media.",
        status: ogTitle && ogImage ? "pass" : ogTitle || ogImage ? "warning" : "fail",
        severity: "major",
        value: ogTitle ? `Title: ${ogTitle.substring(0, 50)}…` : "(missing)",
        recommendation: !ogTitle || !ogImage
            ? `Missing ${[!ogTitle && "og:title", !ogImage && "og:image"].filter(Boolean).join(" and ")}. When shared on Facebook, LinkedIn, or Slack, your page won't display a rich preview. Add at minimum og:title, og:description, and og:image (1200×630px recommended).`
            : "Open Graph tags are properly configured for social sharing.",
        codeSnippet: !ogTitle ? `<meta property="og:title" content="Your Page Title" />\n<meta property="og:description" content="Your page description" />\n<meta property="og:image" content="https://yoursite.com/og-image.jpg" />\n<meta property="og:url" content="${url}" />` : undefined,
        learnMoreUrl: "https://ogp.me/",
    })

    // --- 7. TWITTER CARDS ---
    const twitterCard = $('meta[name="twitter:card"], meta[property="twitter:card"]').attr("content") || ""
    checks.push({
        id: "twitter-card",
        title: "Twitter Card Tags",
        description: "Twitter card meta tags enable rich previews when your page is shared on X/Twitter.",
        status: twitterCard ? "pass" : "warning",
        severity: "minor",
        value: twitterCard || "(missing)",
        recommendation: !twitterCard
            ? "Add Twitter card meta tags to control how your page appears on X/Twitter. Use 'summary_large_image' for maximum visual impact. Twitter will fall back to OG tags, but dedicated Twitter tags give you more control."
            : `Twitter card type '${twitterCard}' is set. For maximum impact, use 'summary_large_image' with a high-quality image.`,
        codeSnippet: !twitterCard ? `<meta name="twitter:card" content="summary_large_image" />\n<meta name="twitter:title" content="Your Title" />\n<meta name="twitter:description" content="Your description" />\n<meta name="twitter:image" content="https://yoursite.com/twitter-image.jpg" />` : undefined,
        learnMoreUrl: "https://developer.x.com/en/docs/twitter-for-websites/cards/overview/abouts-cards",
    })

    // --- 8. LANGUAGE ATTRIBUTE ---
    const lang = $("html").attr("lang") || ""
    checks.push({
        id: "html-lang",
        title: "HTML Language Attribute",
        description: "The lang attribute helps search engines and assistive technologies understand your content's language.",
        status: lang ? "pass" : "fail",
        severity: "major",
        value: lang || "(missing)",
        recommendation: !lang
            ? "Add a lang attribute to your <html> tag. This helps Google serve your page to the right audience and enables screen readers to use the correct pronunciation."
            : `Language set to '${lang}'. If your site serves multiple languages, also consider hreflang tags.`,
        codeSnippet: !lang ? `<html lang="en">` : undefined,
        learnMoreUrl: "https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/lang",
    })

    // --- 9. META ROBOTS ---
    const metaRobots = $('meta[name="robots"]').attr("content") || ""
    const isBlocking = metaRobots.includes("noindex") || metaRobots.includes("nofollow")
    checks.push({
        id: "meta-robots",
        title: "Meta Robots Directive",
        description: "Ensure the meta robots tag isn't accidentally blocking search engines.",
        status: isBlocking ? "warning" : "pass",
        severity: isBlocking ? "critical" : "info",
        value: metaRobots || "Not set (defaults to index, follow)",
        recommendation: isBlocking
            ? `Your meta robots tag contains '${metaRobots}' which blocks search engines from ${metaRobots.includes("noindex") ? "indexing" : "following links on"} this page. If this is intentional, keep it. Otherwise, remove the noindex/nofollow directives immediately.`
            : "No blocking robots directives found. Your page can be indexed and its links followed.",
        learnMoreUrl: "https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag",
    })

    // --- 10. CHARSET ---
    const charset = $('meta[charset]').attr("charset") || $('meta[http-equiv="Content-Type"]').attr("content") || ""
    checks.push({
        id: "charset",
        title: "Character Encoding",
        description: "Pages should declare UTF-8 character encoding to prevent display issues.",
        status: charset.toLowerCase().includes("utf-8") || charset.toLowerCase() === "utf-8" ? "pass" : charset ? "warning" : "fail",
        severity: "minor",
        value: charset || "(missing)",
        expected: "UTF-8",
        recommendation: !charset
            ? "Declare UTF-8 character encoding as the first element in <head>. Without it, special characters may display incorrectly and some browsers may have security vulnerabilities."
            : !charset.toLowerCase().includes("utf-8")
                ? `You're using '${charset}' encoding. Switch to UTF-8, which is the universal standard that supports all languages and special characters.`
                : "UTF-8 encoding is correctly declared.",
        codeSnippet: !charset ? `<meta charset="UTF-8" />` : undefined,
        learnMoreUrl: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#charset",
    })

    // --- 11. RESOURCE COUNT ---
    const scriptCount = $("script[src]").length + $("script:not([src])").length
    const styleCount = $('link[rel="stylesheet"]').length + $("style").length
    const totalResources = scriptCount + styleCount
    checks.push({
        id: "resource-count",
        title: "Resource Count",
        description: "Too many scripts and stylesheets slow page loading. Keep total under 30.",
        status: totalResources > 40 ? "fail" : totalResources > 30 ? "warning" : "pass",
        severity: totalResources > 40 ? "major" : "minor",
        value: `${scriptCount} scripts, ${styleCount} styles (${totalResources} total)`,
        expected: "< 30 total resources",
        recommendation: totalResources > 30
            ? `Your page loads ${totalResources} resources. Reduce this by: 1) Bundling multiple JS/CSS files into one, 2) Removing unused scripts and plugins, 3) Lazy-loading non-critical resources, 4) Using code splitting to load only what's needed for this page.`
            : `Resource count (${totalResources}) is within acceptable limits.`,
        learnMoreUrl: "https://web.dev/articles/resource-loading-optimization",
    })

    // --- 12. RENDER-BLOCKING RESOURCES ---
    let renderBlocking = 0
    $("script[src]:not([async]):not([defer])").each(() => { renderBlocking++ })
    $('link[rel="stylesheet"]:not([media="print"])').each(() => { renderBlocking++ })
    checks.push({
        id: "render-blocking",
        title: "Render-Blocking Resources",
        description: "Synchronous scripts and stylesheets block page rendering, causing slow visual load.",
        status: renderBlocking > 5 ? "fail" : renderBlocking > 2 ? "warning" : "pass",
        severity: renderBlocking > 5 ? "major" : "minor",
        value: `${renderBlocking} render-blocking resource(s)`,
        expected: "≤ 2",
        recommendation: renderBlocking > 2
            ? `${renderBlocking} resources block rendering. Fix by: 1) Add 'async' or 'defer' to <script> tags, 2) Inline critical CSS and lazy-load the rest, 3) Use media="print" for print-only stylesheets, 4) Move non-essential scripts to the bottom of <body>.`
            : "Render-blocking resources are minimal.",
        codeSnippet: renderBlocking > 2 ? `<!-- Instead of: -->\n<script src="app.js"></script>\n\n<!-- Use: -->\n<script src="app.js" defer></script>` : undefined,
        learnMoreUrl: "https://web.dev/articles/render-blocking-resources",
    })

    return checks
}

/**
 * Extract technical details for backward-compatible response
 */
export function extractTechnicalDetails($: CheerioAPI) {
    return {
        social: {
            ogTitle: $('meta[property="og:title"]').attr("content")?.trim() || "",
            ogImage: $('meta[property="og:image"]').attr("content")?.trim() || null,
            ogDescription: $('meta[property="og:description"]').attr("content")?.trim() || null,
            twitterCard: $('meta[name="twitter:card"]').attr("content")?.trim() || null,
            twitterTitle: $('meta[name="twitter:title"]').attr("content")?.trim() || null,
        },
        mobile: {
            viewport: ($('meta[name="viewport"]').attr("content") ? "Optimized" : "Missing") as "Optimized" | "Missing",
            icon: $('link[rel="icon"], link[rel="shortcut icon"]').attr("href")?.trim() || null,
        },
    }
}
