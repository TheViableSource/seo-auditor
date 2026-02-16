import type { CheerioAPI } from "cheerio"
import type { AuditCheck } from "@/lib/types"

/**
 * AEO (Answer Engine Optimization) Analyzer — 6 checks
 * Optimizes content for AI-powered search engines, voice assistants,
 * and featured snippets (Google AI Overviews, ChatGPT, Perplexity, Alexa, Siri).
 */
export function analyzeAEO($: CheerioAPI): AuditCheck[] {
    const checks: AuditCheck[] = []

    // --- 1. FAQ SCHEMA ---
    let hasFaqSchema = false
    $('script[type="application/ld+json"]').each((_, el) => {
        const text = $(el).html() || ""
        try {
            const json = JSON.parse(text)
            const type = json["@type"]
            if (type === "FAQPage" || (Array.isArray(type) && type.includes("FAQPage"))) {
                hasFaqSchema = true
            }
        } catch { /* invalid JSON */ }
    })
    // Also detect HTML-based FAQ patterns
    const faqSections = $('*[itemtype*="FAQPage"], .faq, #faq, [class*="faq"], [id*="faq"]').length
    const hasQAContent = hasFaqSchema || faqSections > 0

    checks.push({
        id: "aeo-faq-schema",
        title: "FAQ Schema / Q&A Content",
        description: "FAQPage schema and structured Q&A content get extracted by AI engines for direct answers.",
        status: hasFaqSchema ? "pass" : faqSections > 0 ? "warning" : "fail",
        severity: "major",
        value: hasFaqSchema ? "FAQPage schema found" : faqSections > 0 ? `${faqSections} FAQ section(s) without schema` : "No FAQ content detected",
        recommendation: !hasQAContent
            ? "Add an FAQ section with common questions about your topic. Use FAQPage JSON-LD schema so Google can display your answers directly in search results and AI engines can extract them for voice responses."
            : !hasFaqSchema
                ? "You have FAQ-like content but no FAQPage schema markup. Add JSON-LD structured data so AI engines and Google can extract your Q&A pairs."
                : "FAQPage schema is properly implemented. AI engines can extract your Q&A pairs for direct answers.",
        codeSnippet: !hasFaqSchema ? `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is your most common question?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Your concise, direct answer here."
      }
    }
  ]
}
</script>` : undefined,
        learnMoreUrl: "https://developers.google.com/search/docs/appearance/structured-data/faqpage",
    })

    // --- 2. SPEAKABLE SCHEMA ---
    let hasSpeakable = false
    $('script[type="application/ld+json"]').each((_, el) => {
        const text = $(el).html() || ""
        if (text.includes('"speakable"') || text.includes('"Speakable"')) {
            hasSpeakable = true
        }
    })
    checks.push({
        id: "aeo-speakable",
        title: "Speakable Schema",
        description: "Speakable markup tells voice assistants which sections to read aloud.",
        status: hasSpeakable ? "pass" : "warning",
        severity: "minor",
        value: hasSpeakable ? "Speakable markup found" : "Not implemented",
        recommendation: !hasSpeakable
            ? "Add Speakable schema to indicate which parts of your page are best suited for text-to-speech playback. This helps Google Assistant and other voice assistants select content to read aloud."
            : "Speakable schema is implemented. Voice assistants can identify which sections to read.",
        codeSnippet: !hasSpeakable ? `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "speakable": {
    "@type": "SpeakableSpecification",
    "cssSelector": [".article-summary", ".key-points"]
  }
}
</script>` : undefined,
        learnMoreUrl: "https://developers.google.com/search/docs/appearance/structured-data/speakable",
    })

    // --- 3. FEATURED SNIPPET FORMAT ---
    // Check for content in list, table, or concise paragraph format
    const orderedLists = $("ol").length
    const unorderedLists = $("ul:not(nav ul)").length
    const tables = $("table").length
    const definitionLists = $("dl").length
    const hasSnippetFormats = orderedLists + unorderedLists + tables + definitionLists

    checks.push({
        id: "aeo-snippet-format",
        title: "Featured Snippet Format",
        description: "Content in lists, tables, and structured formats is preferred by AI engines and featured snippets.",
        status: hasSnippetFormats >= 3 ? "pass" : hasSnippetFormats > 0 ? "warning" : "fail",
        severity: "major",
        value: `${orderedLists} ordered lists, ${unorderedLists} unordered lists, ${tables} tables`,
        recommendation: hasSnippetFormats < 3
            ? `Your page has only ${hasSnippetFormats} structured content elements. AI engines and Google's featured snippets prefer content in lists (step-by-step instructions), tables (comparisons), and concise definitions. Add more structured formats to increase your chances of being featured.`
            : "Good variety of structured content formats. AI engines can easily extract lists, tables, and structured data.",
        learnMoreUrl: "https://developers.google.com/search/docs/appearance/featured-snippets",
    })

    // --- 4. QUESTION-BASED HEADINGS ---
    let questionHeadings = 0
    let totalSubHeadings = 0
    $("h2, h3").each((_, el) => {
        totalSubHeadings++
        const text = $(el).text().trim()
        if (/^(what|how|why|when|where|who|which|can|do|does|is|are|should|will|would)\b/i.test(text) || text.endsWith("?")) {
            questionHeadings++
        }
    })
    checks.push({
        id: "aeo-question-headings",
        title: "Question-Based Headings",
        description: "Headings phrased as questions match voice search queries and AI engine question formats.",
        status: questionHeadings >= 3 ? "pass" : questionHeadings > 0 ? "warning" : "fail",
        severity: "major",
        value: `${questionHeadings}/${totalSubHeadings} headings are questions`,
        recommendation: questionHeadings === 0
            ? "None of your headings are phrased as questions. Voice search queries are natural language questions — rephrase your H2/H3 tags to match how people actually ask questions. Example: 'Our Services' → 'What Services Do We Offer?'"
            : questionHeadings < 3
                ? `Only ${questionHeadings} question-based headings found. Add more to increase coverage of voice and AI search queries. Mix 'What', 'How', 'Why', and 'When' questions.`
                : `Strong question-based heading strategy with ${questionHeadings} question headings.`,
        learnMoreUrl: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide#use-headings",
    })

    // --- 5. DIRECT ANSWER CONTENT ---
    // Look for concise definitional paragraphs after headings
    let directAnswers = 0
    $("h2, h3").each((_, el) => {
        const nextP = $(el).next("p")
        if (nextP.length) {
            const text = nextP.text().trim()
            const words = text.split(/\s+/).length
            // A good direct answer is 40-60 words — concise but complete
            if (words >= 20 && words <= 60) {
                directAnswers++
            }
        }
    })
    checks.push({
        id: "aeo-direct-answers",
        title: "Direct Answer Content",
        description: "Concise paragraphs (20-60 words) following headings get extracted as direct answers by AI engines.",
        status: directAnswers >= 3 ? "pass" : directAnswers > 0 ? "warning" : "fail",
        severity: "major",
        value: `${directAnswers} potential answer paragraph(s)`,
        recommendation: directAnswers < 3
            ? `Only ${directAnswers} concise answer paragraphs found. After each heading, write a brief 20-60 word paragraph that directly answers the heading's topic. AI engines extract these as featured snippets. Then elaborate in subsequent paragraphs.`
            : "Good direct answer content pattern. AI engines can extract concise answers from your heading-paragraph pairs.",
        learnMoreUrl: "https://developers.google.com/search/docs/appearance/featured-snippets",
    })

    // --- 6. CONCISE PARAGRAPH STRUCTURE ---
    const paragraphs = $("p")
    let shortParagraphs = 0
    let longParagraphs = 0
    let totalParagraphs = 0
    paragraphs.each((_, el) => {
        const words = $(el).text().trim().split(/\s+/).filter(Boolean).length
        if (words > 3) { // Skip tiny paragraphs
            totalParagraphs++
            if (words <= 50) shortParagraphs++
            if (words > 100) longParagraphs++
        }
    })
    const shortRatio = totalParagraphs > 0 ? shortParagraphs / totalParagraphs : 0
    checks.push({
        id: "aeo-concise-paragraphs",
        title: "Concise Paragraph Structure",
        description: "Short paragraphs (under 50 words) are easier for AI engines to extract and for voice assistants to read.",
        status: shortRatio >= 0.6 ? "pass" : shortRatio >= 0.3 ? "warning" : "fail",
        severity: "minor",
        value: `${shortParagraphs}/${totalParagraphs} paragraphs are concise (${Math.round(shortRatio * 100)}%)`,
        details: longParagraphs > 0 ? `${longParagraphs} paragraph(s) exceed 100 words` : undefined,
        recommendation: shortRatio < 0.6
            ? `Only ${Math.round(shortRatio * 100)}% of your paragraphs are concise. Break long paragraphs into shorter ones (under 50 words). This makes content scannable for users and extractable for AI engines. ${longParagraphs} paragraph(s) exceed 100 words — split those first.`
            : "Good paragraph structure. Most content is concise and extractable for AI engines.",
        learnMoreUrl: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
    })

    return checks
}
