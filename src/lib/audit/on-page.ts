import type { CheerioAPI } from "cheerio"
import type { AuditCheck } from "@/lib/types"

/**
 * On-Page SEO Analyzer — 12 checks with actionable recommendations
 */
export function analyzeOnPage($: CheerioAPI, url: string): AuditCheck[] {
    const checks: AuditCheck[] = []

    // --- 1. TITLE TAG ---
    const title = $("title").text().trim()
    const titleLen = title.length
    checks.push({
        id: "title-tag",
        title: "Title Tag",
        description: "Pages need a unique, descriptive title tag between 30–60 characters.",
        status: !title ? "fail" : titleLen < 30 || titleLen > 60 ? "warning" : "pass",
        severity: "critical",
        value: title || "(missing)",
        expected: "30–60 characters",
        details: title ? `${titleLen} characters` : "No title tag found",
        recommendation: !title
            ? "Add a <title> tag inside <head> that describes this page's content. Include your primary keyword near the beginning."
            : titleLen < 30
                ? "Your title is too short. Expand it to at least 30 characters to give search engines more context. Include your main keyword and a value proposition."
                : titleLen > 60
                    ? "Your title may get truncated in search results. Trim it to 60 characters max, keeping the most important keywords at the start."
                    : "Your title tag length is optimal. Make sure it's unique across all pages on your site.",
        codeSnippet: !title ? `<title>Your Primary Keyword — Brand Name</title>` : undefined,
        learnMoreUrl: "https://developers.google.com/search/docs/appearance/title-link",
    })

    // --- 2. META DESCRIPTION ---
    const desc = $('meta[name="description"]').attr("content")?.trim() || ""
    const descLen = desc.length
    checks.push({
        id: "meta-description",
        title: "Meta Description",
        description: "A compelling meta description between 120–160 characters improves click-through rates.",
        status: !desc ? "fail" : descLen < 120 || descLen > 160 ? "warning" : "pass",
        severity: "major",
        value: desc || "(missing)",
        expected: "120–160 characters",
        details: desc ? `${descLen} characters` : "No meta description found",
        recommendation: !desc
            ? "Add a meta description that summarizes this page. Include a call-to-action and your target keyword. This is your 'ad copy' in search results."
            : descLen < 120
                ? "Your meta description is too short — you're leaving free advertising space unused. Expand to 120-160 characters with a compelling call-to-action."
                : descLen > 160
                    ? "Your description may get truncated in search results. Keep it under 160 characters, front-loading the most important information."
                    : "Your meta description length is optimal. Ensure it includes a clear call-to-action.",
        codeSnippet: !desc ? `<meta name="description" content="Your compelling page description with target keyword and call-to-action. Aim for 120-160 characters." />` : undefined,
        learnMoreUrl: "https://developers.google.com/search/docs/appearance/snippet",
    })

    // --- 3. H1 TAG ---
    const h1s = $("h1")
    const h1Text = h1s.first().text().trim()
    const h1Count = h1s.length
    checks.push({
        id: "h1-tag",
        title: "H1 Heading",
        description: "Each page should have exactly one H1 that matches the page topic.",
        status: h1Count === 0 ? "fail" : h1Count > 1 ? "warning" : "pass",
        severity: "critical",
        value: h1Count === 0 ? "(missing)" : h1Text,
        expected: "Exactly 1 H1",
        details: `${h1Count} H1 tag(s) found`,
        recommendation: h1Count === 0
            ? "Add a single <h1> tag that clearly describes this page's main topic. It should include your primary keyword and be unique to this page."
            : h1Count > 1
                ? `You have ${h1Count} H1 tags — use only one per page. Demote the extras to <h2> or <h3>. Multiple H1s confuse search engines about the main topic.`
                : "Your H1 is properly set. Make sure it's relevant to the page content and includes your target keyword.",
        codeSnippet: h1Count === 0 ? `<h1>Your Main Page Topic with Primary Keyword</h1>` : undefined,
        learnMoreUrl: "https://developers.google.com/search/docs/appearance/title-link#headings",
    })

    // --- 4. HEADING HIERARCHY ---
    const headings = ["h1", "h2", "h3", "h4", "h5", "h6"].map((tag) => $(tag).length)
    const hasGaps = headings.some((count, i) => i > 0 && count > 0 && headings[i - 1] === 0)
    checks.push({
        id: "heading-hierarchy",
        title: "Heading Hierarchy",
        description: "Headings should follow a logical hierarchy without skipping levels.",
        status: hasGaps ? "warning" : "pass",
        severity: "minor",
        value: headings.map((c, i) => `H${i + 1}:${c}`).join(" "),
        recommendation: hasGaps
            ? "Your heading structure skips levels (e.g., H1 → H3 with no H2). Restructure so each level nests logically. Think of headings like an outline — they should flow from general (H1) to specific (H2 → H3)."
            : "Your heading hierarchy is properly structured.",
        learnMoreUrl: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements",
    })

    // --- 5. WORD COUNT ---
    const bodyText = $("body").text().replace(/\s+/g, " ").trim()
    const wordCount = bodyText.split(/\s+/).filter(Boolean).length
    checks.push({
        id: "word-count",
        title: "Content Length",
        description: "Pages with thin content (< 300 words) tend to rank poorly.",
        status: wordCount < 300 ? "warning" : "pass",
        severity: "major",
        value: `${wordCount} words`,
        expected: "300+ words",
        recommendation: wordCount < 300
            ? `Your page has only ${wordCount} words. Add more meaningful content — answer common user questions, explain your value proposition, or add FAQs. Studies show pages with 1,000+ words tend to rank higher.`
            : `Your page has ${wordCount} words, which is above the minimum threshold. Focus on quality, depth, and comprehensiveness rather than just length.`,
        learnMoreUrl: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
    })

    // --- 6. URL STRUCTURE ---
    const urlObj = new URL(url)
    const pathSegments = urlObj.pathname.split("/").filter(Boolean)
    const hasUglyChars = /[A-Z_]/.test(urlObj.pathname)
    const tooDeep = pathSegments.length > 3
    checks.push({
        id: "url-structure",
        title: "URL Structure",
        description: "URLs should be lowercase, use hyphens, and be 3 levels deep or less.",
        status: hasUglyChars || tooDeep ? "warning" : "pass",
        severity: "minor",
        value: urlObj.pathname,
        recommendation: hasUglyChars
            ? "Use lowercase letters and hyphens (-) instead of underscores or mixed case. Example: /my-page-topic instead of /My_Page_Topic. Set up 301 redirects from old URLs."
            : tooDeep
                ? `Your URL is ${pathSegments.length} levels deep. Flatten your site structure to 3 levels or fewer for better crawlability and user experience.`
                : "Your URL structure is clean and well-formatted.",
        learnMoreUrl: "https://developers.google.com/search/docs/crawling-indexing/url-structure",
    })

    // --- 7. CANONICAL TAG ---
    const canonical = $('link[rel="canonical"]').attr("href")?.trim() || ""
    checks.push({
        id: "canonical-tag",
        title: "Canonical Tag",
        description: "A canonical tag prevents duplicate content issues by specifying the preferred URL.",
        status: canonical ? "pass" : "warning",
        severity: "major",
        value: canonical || "(missing)",
        recommendation: !canonical
            ? "Add a canonical tag to prevent duplicate content issues. This tells Google which version of the page is the 'original' when multiple URLs serve similar content."
            : "Your canonical tag is set. Verify it points to the correct, preferred version of this URL.",
        codeSnippet: !canonical ? `<link rel="canonical" href="${url}" />` : undefined,
        learnMoreUrl: "https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls",
    })

    // --- 8. INTERNAL & EXTERNAL LINKS ---
    const links = $("a[href]")
    let internal = 0, external = 0
    links.each((_, el) => {
        const href = $(el).attr("href") || ""
        if (href.startsWith("http") && !href.includes(urlObj.hostname)) { external++ }
        else if (href.startsWith("/") || href.includes(urlObj.hostname)) { internal++ }
    })
    checks.push({
        id: "links",
        title: "Internal & External Links",
        description: "Good internal linking helps SEO; external links to authoritative sources add credibility.",
        status: internal < 3 ? "warning" : "pass",
        severity: "minor",
        value: `${internal} internal, ${external} external`,
        recommendation: internal < 3
            ? `Only ${internal} internal links found. Add links to your other relevant pages to spread link equity and help users discover more content. Aim for 3+ internal links per page.`
            : external === 0
                ? "Consider adding a few external links to authoritative sources. This adds credibility and helps search engines understand your content's context."
                : `Good link profile with ${internal} internal and ${external} external links.`,
        learnMoreUrl: "https://developers.google.com/search/docs/crawling-indexing/links-crawlable",
    })

    // --- 9. IMAGE OPTIMIZATION ---
    const images = $("img")
    let missingAlt = 0
    images.each((_, el) => { if (!$(el).attr("alt")) { missingAlt++ } })
    checks.push({
        id: "image-alt",
        title: "Image Alt Text",
        description: "All images should have descriptive alt text for accessibility and SEO.",
        status: missingAlt > 0 ? "fail" : images.length === 0 ? "info" : "pass",
        severity: missingAlt > 3 ? "critical" : "major",
        value: images.length > 0 ? `${images.length - missingAlt}/${images.length} have alt text` : "No images",
        recommendation: missingAlt > 0
            ? `${missingAlt} images are missing alt text. Add descriptive alt attributes that explain what each image shows. For decorative images, use alt="" (empty). Good alt text helps visually impaired users AND helps your images rank in Google Image Search.`
            : "All images have alt text. Make sure each description is meaningful and includes relevant keywords naturally.",
        codeSnippet: missingAlt > 0 ? `<img src="photo.jpg" alt="Descriptive text about what the image shows" />` : undefined,
        learnMoreUrl: "https://developers.google.com/search/docs/appearance/google-images",
    })

    // --- 10. MIXED CONTENT ---
    let httpResources = 0
    $("img[src^='http:'], script[src^='http:'], link[href^='http:']").each(() => { httpResources++ })
    checks.push({
        id: "mixed-content",
        title: "Mixed Content",
        description: "HTTPS pages should not load resources over insecure HTTP.",
        status: httpResources > 0 ? "warning" : "pass",
        severity: "major",
        value: httpResources > 0 ? `${httpResources} insecure resource(s)` : "All resources secure",
        recommendation: httpResources > 0
            ? `${httpResources} resources are loaded over HTTP on your HTTPS page. This triggers browser security warnings and may block resources from loading. Update all resource URLs to use https:// instead of http://.`
            : "All resources are loaded securely over HTTPS.",
        learnMoreUrl: "https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content",
    })

    // --- 11. EMPTY / BROKEN LINKS ---
    let emptyLinks = 0
    $("a").each((_, el) => {
        const href = $(el).attr("href")?.trim()
        if (!href || href === "#" || href === "javascript:void(0)") { emptyLinks++ }
    })
    checks.push({
        id: "empty-links",
        title: "Empty / Placeholder Links",
        description: "Links with empty hrefs, '#', or javascript:void(0) provide no value.",
        status: emptyLinks > 3 ? "warning" : emptyLinks > 0 ? "info" : "pass",
        severity: "minor",
        value: `${emptyLinks} placeholder link(s)`,
        recommendation: emptyLinks > 0
            ? `${emptyLinks} links have empty or placeholder destinations. Replace '#' and 'javascript:void(0)' with real URLs, or convert them to <button> elements if they trigger actions. Dead links frustrate users and waste crawl budget.`
            : "No empty or placeholder links found.",
        learnMoreUrl: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a",
    })

    // --- 12. META KEYWORDS (deprecated) ---
    const metaKeywords = $('meta[name="keywords"]').attr("content")?.trim() || ""
    checks.push({
        id: "meta-keywords",
        title: "Meta Keywords Tag",
        description: "The meta keywords tag is ignored by Google and can expose your keyword strategy.",
        status: metaKeywords ? "info" : "pass",
        severity: "info",
        value: metaKeywords ? "Present" : "Not used",
        recommendation: metaKeywords
            ? "Google has officially ignored the meta keywords tag since 2009. Remove it — it provides no SEO value and reveals your keyword strategy to competitors."
            : "Correctly not using the deprecated meta keywords tag.",
        learnMoreUrl: "https://developers.google.com/search/blog/2009/09/google-does-not-use-keywords-meta-tag",
    })

    return checks
}

/**
 * Extract on-page details for backward-compatible response
 */
export function extractOnPageDetails($: CheerioAPI, url: string) {
    const urlObj = new URL(url)
    const links = $("a[href]")
    let internal = 0, external = 0
    links.each((_, el) => {
        const href = $(el).attr("href") || ""
        if (href.startsWith("http") && !href.includes(urlObj.hostname)) external++
        else if (href.startsWith("/") || href.includes(urlObj.hostname)) internal++
    })
    let missingAlt = 0
    $("img").each((_, el) => { if (!$(el).attr("alt")) missingAlt++ })

    return {
        title: $("title").text().trim(),
        description: $('meta[name="description"]').attr("content")?.trim() || "",
        h1: $("h1").first().text().trim(),
        canonical: $('link[rel="canonical"]').attr("href")?.trim() || "",
        wordCount: $("body").text().replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean).length,
        internalLinks: internal,
        externalLinks: external,
        imageCount: $("img").length,
        missingAlt,
    }
}
