import type { CheerioAPI } from "cheerio"

export interface ContentAnalysis {
    wordCount: number
    readingTimeMinutes: number
    readabilityGrade: string
    readabilityScore: number
    topKeywords: { word: string; count: number; density: string }[]
    sentenceCount: number
    avgWordsPerSentence: number
    paragraphCount: number
}

export interface PageResources {
    scripts: { src: string; async: boolean; defer: boolean }[]
    stylesheets: { href: string }[]
    images: { src: string; alt: string; hasAlt: boolean }[]
    fonts: { href: string }[]
    totalScripts: number
    totalStylesheets: number
    totalImages: number
    totalFonts: number
    htmlSizeKb: number
}

export interface SocialPreview {
    og: {
        title: string | null
        description: string | null
        image: string | null
        url: string | null
        siteName: string | null
        type: string | null
    }
    twitter: {
        card: string | null
        title: string | null
        description: string | null
        image: string | null
        site: string | null
    }
}

// ============================================================
// STOP WORDS — common words to exclude from keyword analysis
// ============================================================
const STOP_WORDS = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "it", "as", "are", "was", "were",
    "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "will", "would", "could", "should", "may", "might", "shall", "can",
    "this", "that", "these", "those", "i", "you", "he", "she", "we",
    "they", "me", "him", "her", "us", "them", "my", "your", "his",
    "its", "our", "their", "what", "which", "who", "whom", "whose",
    "when", "where", "why", "how", "all", "each", "every", "both",
    "few", "more", "most", "other", "some", "such", "no", "nor", "not",
    "only", "own", "same", "so", "than", "too", "very", "just", "about",
    "above", "after", "again", "also", "any", "because", "before",
    "below", "between", "come", "down", "during", "even", "first",
    "get", "go", "her", "here", "if", "into", "its", "like", "make",
    "many", "much", "new", "now", "off", "old", "one", "out", "over",
    "see", "still", "then", "there", "through", "under", "up", "use",
    "way", "well", "work", "year", "also", "back", "know", "take",
    "want", "give", "good", "think", "say", "find", "great", "tell",
    "look", "while"
])

/**
 * Calculate Flesch-Kincaid reading ease score and grade level
 */
function calculateReadability(text: string): { score: number; grade: string } {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)
    const words = text.split(/\s+/).filter(Boolean)
    const syllables = words.reduce((acc, word) => acc + countSyllables(word), 0)

    if (words.length === 0 || sentences.length === 0) {
        return { score: 0, grade: "N/A" }
    }

    // Flesch Reading Ease
    const score = 206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syllables / words.length)
    const clamped = Math.max(0, Math.min(100, Math.round(score)))

    // Grade level
    let grade: string
    if (clamped >= 90) grade = "5th Grade — Very Easy"
    else if (clamped >= 80) grade = "6th Grade — Easy"
    else if (clamped >= 70) grade = "7th Grade — Fairly Easy"
    else if (clamped >= 60) grade = "8th-9th Grade — Standard"
    else if (clamped >= 50) grade = "10th-12th Grade — Fairly Difficult"
    else if (clamped >= 30) grade = "College — Difficult"
    else grade = "Graduate — Very Difficult"

    return { score: clamped, grade }
}

function countSyllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, "")
    if (word.length <= 3) return 1
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    word = word.replace(/^y/, "")
    const matches = word.match(/[aeiouy]{1,2}/g)
    return matches ? matches.length : 1
}

/**
 * Analyze content for readability, keywords, and structure
 */
export function analyzeContent($: CheerioAPI, html: string): ContentAnalysis {
    // Get clean body text
    const $clone = $.root().clone()
    $clone.find("script, style, noscript, nav, header, footer").remove()
    const bodyText = $clone.find("body").text().replace(/\s+/g, " ").trim()

    const words = bodyText.split(/\s+/).filter(Boolean)
    const wordCount = words.length
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 238)) // avg reading speed

    const sentences = bodyText.split(/[.!?]+/).filter((s) => s.trim().length > 0)
    const sentenceCount = sentences.length
    const avgWordsPerSentence = sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0

    const paragraphCount = $("p").length

    // Readability
    const { score: readabilityScore, grade: readabilityGrade } = calculateReadability(bodyText)

    // Top keywords (excluding stop words, min 3 chars)
    const wordFreq: Record<string, number> = {}
    for (const w of words) {
        const clean = w.toLowerCase().replace(/[^a-z0-9]/g, "")
        if (clean.length >= 3 && !STOP_WORDS.has(clean)) {
            wordFreq[clean] = (wordFreq[clean] || 0) + 1
        }
    }
    const topKeywords = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([word, count]) => ({
            word,
            count,
            density: wordCount > 0 ? ((count / wordCount) * 100).toFixed(1) + "%" : "0%",
        }))

    return {
        wordCount,
        readingTimeMinutes,
        readabilityGrade,
        readabilityScore,
        topKeywords,
        sentenceCount,
        avgWordsPerSentence,
        paragraphCount,
    }
}

/**
 * Extract page resources (scripts, stylesheets, images, fonts)
 */
export function extractPageResources($: CheerioAPI, html: string): PageResources {
    const scripts: PageResources["scripts"] = []
    $("script[src]").each((_i, el) => {
        scripts.push({
            src: $(el).attr("src") || "",
            async: $(el).attr("async") !== undefined,
            defer: $(el).attr("defer") !== undefined,
        })
    })

    const stylesheets: PageResources["stylesheets"] = []
    $('link[rel="stylesheet"]').each((_i, el) => {
        stylesheets.push({ href: $(el).attr("href") || "" })
    })

    const images: PageResources["images"] = []
    $("img").each((_i, el) => {
        const alt = $(el).attr("alt")
        images.push({
            src: $(el).attr("src") || $(el).attr("data-src") || "",
            alt: alt || "",
            hasAlt: alt !== undefined && alt !== null,
        })
    })

    const fonts: PageResources["fonts"] = []
    $('link[rel="preload"][as="font"], link[href*="fonts.googleapis.com"], link[href*="fonts.gstatic.com"]').each((_i, el) => {
        fonts.push({ href: $(el).attr("href") || "" })
    })

    const htmlSizeKb = Math.round(Buffer.byteLength(html, "utf8") / 1024)

    return {
        scripts,
        stylesheets,
        images,
        fonts,
        totalScripts: scripts.length,
        totalStylesheets: stylesheets.length,
        totalImages: images.length,
        totalFonts: fonts.length,
        htmlSizeKb,
    }
}

/**
 * Extract social media preview data (OG + Twitter)
 */
export function extractSocialPreview($: CheerioAPI): SocialPreview {
    return {
        og: {
            title: $('meta[property="og:title"]').attr("content") || null,
            description: $('meta[property="og:description"]').attr("content") || null,
            image: $('meta[property="og:image"]').attr("content") || null,
            url: $('meta[property="og:url"]').attr("content") || null,
            siteName: $('meta[property="og:site_name"]').attr("content") || null,
            type: $('meta[property="og:type"]').attr("content") || null,
        },
        twitter: {
            card: $('meta[name="twitter:card"]').attr("content") || null,
            title: $('meta[name="twitter:title"]').attr("content") || null,
            description: $('meta[name="twitter:description"]').attr("content") || null,
            image: $('meta[name="twitter:image"]').attr("content") || null,
            site: $('meta[name="twitter:site"]').attr("content") || null,
        },
    }
}
