import type { CheerioAPI } from "cheerio"
import type { AuditCheck } from "@/lib/types"

/**
 * Structured Data Analyzer — 5 checks with actionable recommendations
 */
export function analyzeStructuredData($: CheerioAPI): AuditCheck[] {
    const checks: AuditCheck[] = []

    // Extract all JSON-LD blocks
    const jsonLdBlocks: string[] = []
    $('script[type="application/ld+json"]').each((_, el) => {
        jsonLdBlocks.push($(el).html() || "")
    })

    // --- 1. JSON-LD PRESENCE ---
    checks.push({
        id: "sd-presence",
        title: "Structured Data Presence",
        description: "JSON-LD structured data helps search engines understand your content and enables rich results.",
        status: jsonLdBlocks.length > 0 ? "pass" : "fail",
        severity: "major",
        value: jsonLdBlocks.length > 0 ? `${jsonLdBlocks.length} JSON-LD block(s)` : "(none found)",
        recommendation: jsonLdBlocks.length === 0
            ? "Add JSON-LD structured data to help Google understand your content. This enables rich results like star ratings, FAQs, breadcrumbs, and sitelinks in search results — dramatically improving click-through rates."
            : `Found ${jsonLdBlocks.length} structured data block(s). Keep adding relevant schemas for new content types.`,
        codeSnippet: jsonLdBlocks.length === 0 ? `<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "WebPage",\n  "name": "Your Page Title",\n  "description": "Your page description",\n  "url": "https://yoursite.com/page"\n}\n</script>` : undefined,
        learnMoreUrl: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data",
    })

    // --- 2. JSON-LD VALIDITY ---
    let validCount = 0
    let invalidCount = 0
    const parsedSchemas: Record<string, unknown>[] = []
    for (const block of jsonLdBlocks) {
        try {
            const parsed = JSON.parse(block)
            parsedSchemas.push(parsed)
            validCount++
        } catch {
            invalidCount++
        }
    }
    if (jsonLdBlocks.length > 0) {
        checks.push({
            id: "sd-validity",
            title: "JSON-LD Validity",
            description: "All JSON-LD blocks must be valid JSON.",
            status: invalidCount > 0 ? "fail" : "pass",
            severity: "critical",
            value: invalidCount > 0 ? `${invalidCount} invalid block(s)` : `${validCount} valid`,
            recommendation: invalidCount > 0
                ? `${invalidCount} JSON-LD block(s) have invalid JSON syntax. Test your structured data at Google's Rich Results Test tool. Common issues: trailing commas, unescaped quotes, or missing closing brackets.`
                : "All JSON-LD blocks are syntactically valid.",
            learnMoreUrl: "https://search.google.com/test/rich-results",
        })
    }

    // --- 3. SCHEMA TYPES ---
    const types: string[] = []
    for (const schema of parsedSchemas) {
        const t = schema["@type"]
        if (typeof t === "string") types.push(t)
        else if (Array.isArray(t)) types.push(...t.map(String))
    }
    if (jsonLdBlocks.length > 0) {
        checks.push({
            id: "sd-types",
            title: "Schema Types Detected",
            description: "Different schema types enable different rich result features in search.",
            status: "info",
            severity: "info",
            value: types.length > 0 ? types.join(", ") : "No @type found",
            recommendation: types.length > 0
                ? `Detected types: ${types.join(", ")}. Consider adding more relevant types like FAQPage (for FAQ sections), HowTo (for tutorials), Product (for product pages), or BreadcrumbList (for navigation).`
                : "Your JSON-LD blocks are missing @type properties. Every schema must declare what type of content it describes.",
            learnMoreUrl: "https://developers.google.com/search/docs/appearance/structured-data/search-gallery",
        })
    }

    // --- 4. BENEFICIAL SCHEMA TYPES ---
    const beneficialTypes = ["Organization", "WebSite", "LocalBusiness", "Product", "Article", "FAQPage", "BreadcrumbList", "HowTo"]
    const hasBeneficial = types.some((t) => beneficialTypes.includes(t))
    checks.push({
        id: "sd-beneficial",
        title: "Rich Result-Eligible Schema",
        description: "Certain schema types enable special rich results in Google Search.",
        status: hasBeneficial ? "pass" : jsonLdBlocks.length > 0 ? "warning" : "fail",
        severity: "major",
        value: hasBeneficial ? types.filter((t) => beneficialTypes.includes(t)).join(", ") : "None detected",
        recommendation: !hasBeneficial
            ? `None of your schemas qualify for Google rich results. Add one of these high-impact types: Organization (brand knowledge panel), FAQPage (expandable Q&A in search), BreadcrumbList (navigation trail), Article (news/blog cards), or Product (price/rating display).`
            : "You have schema types that qualify for Google rich results. Validate them with Google's Rich Results Test.",
        codeSnippet: !hasBeneficial ? `<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "Your Company",\n  "url": "https://yoursite.com",\n  "logo": "https://yoursite.com/logo.png",\n  "sameAs": [\n    "https://facebook.com/yourpage",\n    "https://twitter.com/yourhandle"\n  ]\n}\n</script>` : undefined,
        learnMoreUrl: "https://search.google.com/test/rich-results",
    })

    // --- 5. SITE IDENTITY SCHEMA ---
    const hasOrg = types.includes("Organization") || types.includes("LocalBusiness")
    const hasWebSite = types.includes("WebSite")
    checks.push({
        id: "sd-identity",
        title: "Site Identity Schema",
        description: "Organization and WebSite schemas establish your brand identity with Google.",
        status: hasOrg && hasWebSite ? "pass" : hasOrg || hasWebSite ? "warning" : "fail",
        severity: "major",
        value: `Organization: ${hasOrg ? "✓" : "✗"}, WebSite: ${hasWebSite ? "✓" : "✗"}`,
        recommendation: !hasOrg && !hasWebSite
            ? "Add both Organization and WebSite schemas. Organization establishes your brand in Google's Knowledge Graph. WebSite enables the sitelinks search box in search results."
            : !hasOrg
                ? "Add an Organization schema with your name, logo, and social profiles to build your Google Knowledge Graph presence."
                : !hasWebSite
                    ? "Add a WebSite schema to enable the sitelinks search box directly in Google search results."
                    : "Both identity schemas are present, strengthening your brand presence in Google search.",
        codeSnippet: !hasWebSite ? `<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "WebSite",\n  "name": "Your Site Name",\n  "url": "https://yoursite.com",\n  "potentialAction": {\n    "@type": "SearchAction",\n    "target": "https://yoursite.com/search?q={search_term_string}",\n    "query-input": "required name=search_term_string"\n  }\n}\n</script>` : undefined,
        learnMoreUrl: "https://developers.google.com/search/docs/appearance/structured-data/sitelinks-searchbox",
    })

    return checks
}
