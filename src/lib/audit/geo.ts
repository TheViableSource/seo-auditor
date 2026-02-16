import type { CheerioAPI } from "cheerio"
import type { AuditCheck } from "@/lib/types"

/**
 * GEO (Generative Engine Optimization) Analyzer — 7 checks
 * Optimizes content for AI-generated search results
 * (Google AI Overviews, ChatGPT Search, Perplexity, Bing Copilot).
 */
export function analyzeGEO($: CheerioAPI, url: string): AuditCheck[] {
    const checks: AuditCheck[] = []
    const bodyText = $("body").text().replace(/\s+/g, " ").trim().toLowerCase()
    const urlObj = new URL(url)

    // --- 1. CITATION SIGNALS ---
    // AI engines cite content with verifiable claims, statistics, and attributed quotes
    const statPatterns = /\b\d+(\.\d+)?%|\b\d{1,3}(,\d{3})+\b|\$\d+|\b(million|billion|thousand)\b/gi
    const citationPhrases = /according to|research shows|studies (?:show|indicate|suggest|find)|data (?:shows|indicates)|survey (?:found|reveals)|report (?:by|from)/gi
    const statMatches = bodyText.match(statPatterns) || []
    const citationMatches = bodyText.match(citationPhrases) || []
    const totalCitations = statMatches.length + citationMatches.length

    checks.push({
        id: "geo-citations",
        title: "Citation & Data Signals",
        description: "Content with statistics, research citations, and data points is more likely to be cited by AI engines.",
        status: totalCitations >= 5 ? "pass" : totalCitations > 0 ? "warning" : "fail",
        severity: "major",
        value: `${statMatches.length} statistics, ${citationMatches.length} citation phrases`,
        recommendation: totalCitations < 5
            ? `Only ${totalCitations} citation signals found. AI engines prefer content with verifiable claims. Add specific statistics, research citations ('according to...'), data points, and percentages. Content that cites sources is more likely to be referenced in AI-generated answers.`
            : "Strong citation signals. Your content includes data points and citations that AI engines can reference.",
        learnMoreUrl: "https://research.google/pubs/pub51571/",
    })

    // --- 2. AUTHOR AUTHORITY (EEAT) ---
    let hasAuthorSchema = false
    let hasAuthorBio = false
    $('script[type="application/ld+json"]').each((_, el) => {
        const text = $(el).html() || ""
        if (text.includes('"author"') || text.includes('"Person"')) {
            hasAuthorSchema = true
        }
    })
    // Check for author bio sections
    const authorSelectors = $('[class*="author"], [class*="bio"], [rel="author"], .byline, [itemprop="author"]')
    hasAuthorBio = authorSelectors.length > 0

    checks.push({
        id: "geo-author-authority",
        title: "Author Authority (E-E-A-T)",
        description: "Author schemas and bios demonstrate Experience, Expertise, Authoritativeness, and Trustworthiness — key signals for AI engines.",
        status: hasAuthorSchema && hasAuthorBio ? "pass" : hasAuthorSchema || hasAuthorBio ? "warning" : "fail",
        severity: "major",
        value: `Author schema: ${hasAuthorSchema ? "✓" : "✗"}, Author bio: ${hasAuthorBio ? "✓" : "✗"}`,
        recommendation: !hasAuthorSchema && !hasAuthorBio
            ? "No author signals found. AI engines prioritize content from identifiable, credible authors. Add an author bio section and Author schema markup. Include credentials, experience, and links to social profiles."
            : !hasAuthorSchema
                ? "You have an author section but no Author schema. Add Person structured data with name, credentials, and sameAs social links."
                : !hasAuthorBio
                    ? "Author schema found but no visible author bio on the page. Add a visible author section so users can verify credibility."
                    : "Strong author authority signals with both schema and visible bio.",
        codeSnippet: !hasAuthorSchema ? `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "author": {
    "@type": "Person",
    "name": "Author Name",
    "url": "https://yoursite.com/about/author",
    "jobTitle": "Senior Analyst",
    "sameAs": ["https://linkedin.com/in/author"]
  }
}
</script>` : undefined,
        learnMoreUrl: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content#eeat",
    })

    // --- 3. CONTENT FRESHNESS ---
    let hasDatePublished = false
    let hasDateModified = false
    let dateValue = ""
    $('script[type="application/ld+json"]').each((_, el) => {
        const text = $(el).html() || ""
        if (text.includes('"datePublished"')) hasDatePublished = true
        if (text.includes('"dateModified"')) hasDateModified = true
    })
    // Also check meta tags and time elements
    const timeTags = $("time[datetime]")
    const metaDate = $('meta[property="article:published_time"], meta[property="article:modified_time"]')
    if (timeTags.length > 0) {
        dateValue = timeTags.first().attr("datetime") || ""
    }
    if (metaDate.length > 0) hasDatePublished = true

    checks.push({
        id: "geo-freshness",
        title: "Content Freshness Signals",
        description: "AI engines prefer recent, updated content. Date schemas help signal freshness.",
        status: hasDatePublished && hasDateModified ? "pass" : hasDatePublished || timeTags.length > 0 ? "warning" : "fail",
        severity: "major",
        value: hasDatePublished
            ? `Published: ✓${dateValue ? ` (${dateValue})` : ""}, Modified: ${hasDateModified ? "✓" : "✗"}`
            : "No date signals found",
        recommendation: !hasDatePublished
            ? "No publication date found. AI engines use dates to prioritize current information. Add datePublished and dateModified to your schema, and display a visible 'Last Updated' date on the page."
            : !hasDateModified
                ? "You have a publication date but no modification date. Add dateModified to signal that content is regularly updated. AI engines prefer actively maintained content."
                : "Both publication and modification dates are set. Regularly update content and the dateModified value.",
        codeSnippet: !hasDatePublished ? `<!-- In your JSON-LD schema: -->
"datePublished": "${new Date().toISOString().split("T")[0]}",
"dateModified": "${new Date().toISOString().split("T")[0]}"

<!-- Visible on page: -->
<time datetime="${new Date().toISOString().split("T")[0]}">
  Last updated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
</time>` : undefined,
        learnMoreUrl: "https://developers.google.com/search/docs/appearance/publication-dates",
    })

    // --- 4. TOPICAL DEPTH (internal link clusters) ---
    const internalLinks: string[] = []
    $("a[href]").each((_, el) => {
        const href = $(el).attr("href") || ""
        if (href.startsWith("/") || href.includes(urlObj.hostname)) {
            // Extract path segments for topic clustering
            try {
                const linkPath = href.startsWith("/") ? href : new URL(href).pathname
                internalLinks.push(linkPath)
            } catch { /* invalid URL */ }
        }
    })
    // Check for topic clustering — links to related pages in similar path segments
    const pathSegments = new Map<string, number>()
    for (const link of internalLinks) {
        const seg = link.split("/").filter(Boolean)[0] || ""
        if (seg) pathSegments.set(seg, (pathSegments.get(seg) || 0) + 1)
    }
    const topCluster = Math.max(0, ...Array.from(pathSegments.values()))
    const uniqueInternalPaths = new Set(internalLinks).size

    checks.push({
        id: "geo-topical-depth",
        title: "Topical Depth & Internal Linking",
        description: "Dense internal linking on related topics signals topical authority — a key factor for AI engine citation.",
        status: uniqueInternalPaths >= 10 ? "pass" : uniqueInternalPaths >= 5 ? "warning" : "fail",
        severity: "major",
        value: `${uniqueInternalPaths} unique internal links, largest topic cluster: ${topCluster}`,
        recommendation: uniqueInternalPaths < 10
            ? `Only ${uniqueInternalPaths} unique internal links found. Build topical depth by linking to related content across your site. Create content clusters — a pillar page linking to detailed subtopic pages. AI engines evaluate topical authority when deciding which sources to cite.`
            : "Strong internal linking structure supporting topical authority.",
        learnMoreUrl: "https://developers.google.com/search/docs/crawling-indexing/links-crawlable",
    })

    // --- 5. ENTITY CLARITY ---
    // Check for clear entity definitions and About schema
    let hasAboutPage = false
    let hasOrganizationSchema = false
    $('script[type="application/ld+json"]').each((_, el) => {
        const text = $(el).html() || ""
        if (text.includes('"AboutPage"')) hasAboutPage = true
        if (text.includes('"Organization"') || text.includes('"LocalBusiness"')) hasOrganizationSchema = true
    })
    // Check for strong entity signals
    const hasStrongTitle = $('meta[property="og:site_name"]').attr("content")?.length || 0
    const hasSameAs = bodyText.includes('"sameas"')

    checks.push({
        id: "geo-entity-clarity",
        title: "Entity Clarity & Disambiguation",
        description: "Clear entity definitions help AI engines understand exactly who/what your site represents.",
        status: hasOrganizationSchema && hasStrongTitle > 0 ? "pass" : hasOrganizationSchema || hasStrongTitle > 0 ? "warning" : "fail",
        severity: "major",
        value: `Organization schema: ${hasOrganizationSchema ? "✓" : "✗"}, Site name: ${hasStrongTitle > 0 ? "✓" : "✗"}`,
        recommendation: !hasOrganizationSchema
            ? "Add Organization or LocalBusiness schema with your name, logo, description, and social profiles (sameAs). This helps AI engines build a clear entity profile for your brand, making it more likely to be cited correctly."
            : "Entity schema is present. Ensure sameAs links point to all official social profiles and knowledge base entries.",
        codeSnippet: !hasOrganizationSchema ? `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Your Brand Name",
  "url": "${url}",
  "logo": "${urlObj.origin}/logo.png",
  "description": "A clear, concise description of what your organization does.",
  "sameAs": [
    "https://twitter.com/yourbrand",
    "https://linkedin.com/company/yourbrand",
    "https://facebook.com/yourbrand"
  ]
}
</script>` : undefined,
        learnMoreUrl: "https://developers.google.com/search/docs/appearance/structured-data/organization",
    })

    // --- 6. SOURCE LINKING ---
    // Check for outbound links to authoritative external sources
    let externalLinks = 0
    let authorityLinks = 0
    const authorityDomains = ["wikipedia.org", "gov", ".edu", "scholar.google", "pubmed", "who.int", "nih.gov", "cdc.gov", "bbc.com", "reuters.com", "nytimes.com"]
    $("a[href^='http']").each((_, el) => {
        const href = $(el).attr("href") || ""
        if (!href.includes(urlObj.hostname)) {
            externalLinks++
            if (authorityDomains.some((d) => href.includes(d))) authorityLinks++
        }
    })

    checks.push({
        id: "geo-source-linking",
        title: "Source & Authority Linking",
        description: "Linking to authoritative external sources demonstrates research credibility and helps AI engines verify claims.",
        status: authorityLinks >= 2 ? "pass" : externalLinks >= 3 ? "warning" : "fail",
        severity: "minor",
        value: `${externalLinks} external links (${authorityLinks} to authority sites)`,
        recommendation: externalLinks < 3
            ? `Only ${externalLinks} external links found. Cite authoritative sources (.gov, .edu, Wikipedia, academic journals) to strengthen your content's credibility. AI engines are more likely to cite content that itself references verified sources.`
            : authorityLinks < 2
                ? `You have ${externalLinks} external links but few point to recognized authorities. Add links to .gov, .edu, or major research sources to boost perceived credibility with AI engines.`
                : "Good source linking with authoritative external references.",
        learnMoreUrl: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
    })

    // --- 7. CONTENT UNIQUENESS SIGNALS ---
    // Check for first-person expertise, original data, and unique perspective markers
    const firstPersonPatterns = /\b(i |my |we |our |i've|i'm|we've|we're|in my experience|i recommend|i suggest|from my)\b/gi
    const originalDataPatterns = /\b(original research|our data|our findings|we found|we discovered|we analyzed|proprietary|exclusive|first-of-its-kind)\b/gi
    const firstPersonMatches = bodyText.match(firstPersonPatterns) || []
    const originalDataMatches = bodyText.match(originalDataPatterns) || []

    checks.push({
        id: "geo-uniqueness",
        title: "Content Uniqueness & Original Perspective",
        description: "AI engines prefer original insights over rehashed content. First-person expertise and original data signal uniqueness.",
        status: firstPersonMatches.length >= 3 || originalDataMatches.length > 0 ? "pass" : firstPersonMatches.length > 0 ? "warning" : "info",
        severity: "minor",
        value: `${firstPersonMatches.length} first-person markers, ${originalDataMatches.length} original data signals`,
        recommendation: firstPersonMatches.length === 0 && originalDataMatches.length === 0
            ? "No personal expertise or original data signals detected. AI engines deprioritize generic, rehashed content. Share your own experience, data, case studies, or unique analysis. Use 'I recommend', 'we found', or 'from our experience' to establish original perspective."
            : firstPersonMatches.length < 3
                ? "Some first-person language detected, but more original perspective would strengthen AI citation likelihood. Add case studies, personal results, or industry-specific insights."
                : "Good original content signals with personal expertise markers.",
        learnMoreUrl: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
    })

    return checks
}
