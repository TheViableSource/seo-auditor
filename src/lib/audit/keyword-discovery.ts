import type { CheerioAPI } from "cheerio"

/* ------------------------------------------------------------------ */
/*  Stop words — common English words excluded from keyword extraction  */
/* ------------------------------------------------------------------ */
const STOP_WORDS = new Set([
    "the", "be", "to", "of", "and", "a", "in", "that", "have", "i",
    "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
    "this", "but", "his", "by", "from", "they", "we", "her", "she",
    "or", "an", "will", "my", "one", "all", "would", "there", "their",
    "what", "so", "up", "out", "if", "about", "who", "get", "which",
    "go", "me", "when", "make", "can", "like", "time", "no", "just",
    "him", "know", "take", "people", "into", "year", "your", "some",
    "could", "them", "see", "other", "than", "then", "now", "look",
    "only", "come", "its", "over", "think", "also", "back", "after",
    "use", "two", "how", "our", "work", "first", "well", "way", "even",
    "new", "want", "because", "any", "these", "give", "day", "most",
    "us", "are", "is", "was", "were", "been", "being", "has", "had",
    "did", "does", "doing", "am", "may", "here", "more", "very", "much",
    "own", "such", "each", "while", "don", "should", "still", "said",
    "every", "where", "those", "must", "before", "many", "through",
    "too", "same", "right", "off", "big", "high", "need", "try",
    "last", "long", "find", "say", "ask", "help", "let", "put", "old",
    "tell", "great", "under", "end", "why", "call", "between", "home",
    "never", "start", "read", "learn", "service", "services", "page",
    "click", "menu", "site", "website", "web",
])

export interface DiscoveredKeyword {
    phrase: string
    score: number
    source: "title" | "meta" | "h1" | "h2" | "h3" | "body"
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Clean a string: lowercase, trim, collapse whitespace */
function clean(s: string): string {
    return s.toLowerCase().replace(/[^\w\s'-]/g, " ").replace(/\s+/g, " ").trim()
}

/** Check if a token is a meaningful word (not a stop word, min 3 chars) */
function isMeaningful(word: string): boolean {
    return word.length >= 3 && !STOP_WORDS.has(word)
}

/** 
 * Generate n-grams from a list of words.
 * Returns phrases of length `min` to `max` words.
 */
function ngrams(words: string[], min: number, max: number): string[] {
    const results: string[] = []
    for (let n = min; n <= max; n++) {
        for (let i = 0; i <= words.length - n; i++) {
            const gram = words.slice(i, i + n)
            // At least half the words must be meaningful
            const meaningfulCount = gram.filter(isMeaningful).length
            if (meaningfulCount >= Math.ceil(n / 2)) {
                results.push(gram.join(" "))
            }
        }
    }
    return results
}

/** Split title/heading by common separators */
function splitByDelimiters(text: string): string[] {
    return text.split(/[|–—\-·•»:,]/).map((s) => s.trim()).filter((s) => s.length >= 3)
}

/* ------------------------------------------------------------------ */
/*  Main extractor                                                      */
/* ------------------------------------------------------------------ */
export function discoverKeywords($: CheerioAPI, url: string): DiscoveredKeyword[] {
    const scored = new Map<string, { score: number; source: DiscoveredKeyword["source"] }>()

    const addPhrase = (phrase: string, score: number, source: DiscoveredKeyword["source"]) => {
        const key = clean(phrase)
        if (key.length < 3) return
        // Skip if it's just numbers or purely stop words
        const words = key.split(/\s+/)
        if (words.every((w) => !isMeaningful(w))) return
        if (/^\d+$/.test(key)) return

        const existing = scored.get(key)
        if (existing) {
            existing.score += score
        } else {
            scored.set(key, { score, source })
        }
    }

    // 1. TITLE — highest weight
    const title = $("title").text().trim()
    if (title) {
        const segments = splitByDelimiters(title)
        for (const seg of segments) {
            addPhrase(seg, 10, "title")
            // Also add n-grams of each segment
            const words = clean(seg).split(/\s+/)
            for (const ng of ngrams(words, 2, 4)) {
                addPhrase(ng, 8, "title")
            }
        }
    }

    // 2. H1 — very high weight
    $("h1").each((_, el) => {
        const text = $(el).text().trim()
        if (!text) return
        addPhrase(text, 9, "h1")
        const words = clean(text).split(/\s+/)
        for (const ng of ngrams(words, 2, 4)) {
            addPhrase(ng, 7, "h1")
        }
    })

    // 3. META DESCRIPTION — high weight
    const metaDesc = $('meta[name="description"]').attr("content")?.trim()
    if (metaDesc) {
        const words = clean(metaDesc).split(/\s+/)
        for (const ng of ngrams(words, 2, 4)) {
            addPhrase(ng, 6, "meta")
        }
    }

    // 4. META KEYWORDS (if present)
    const metaKeywords = $('meta[name="keywords"]').attr("content")?.trim()
    if (metaKeywords) {
        for (const kw of metaKeywords.split(",")) {
            addPhrase(kw.trim(), 8, "meta")
        }
    }

    // 5. H2 headings — medium weight
    $("h2").each((_, el) => {
        const text = $(el).text().trim()
        if (!text || text.length > 80) return
        addPhrase(text, 5, "h2")
        const words = clean(text).split(/\s+/)
        for (const ng of ngrams(words, 2, 3)) {
            addPhrase(ng, 4, "h2")
        }
    })

    // 6. H3 headings — lower weight
    $("h3").each((_, el) => {
        const text = $(el).text().trim()
        if (!text || text.length > 60) return
        addPhrase(text, 3, "h3")
        const words = clean(text).split(/\s+/)
        for (const ng of ngrams(words, 2, 3)) {
            addPhrase(ng, 2, "h3")
        }
    })

    // 7. BODY TEXT — n-gram frequency analysis
    const $clone = $.root().clone()
    $clone.find("script, style, noscript, nav, header, footer, aside").remove()
    const bodyText = $clone.find("body").text().replace(/\s+/g, " ").trim()
    const bodyWords = clean(bodyText).split(/\s+/)

    // Count 2-gram and 3-gram frequencies
    const phraseFreq = new Map<string, number>()
    for (let n = 2; n <= 3; n++) {
        for (let i = 0; i <= bodyWords.length - n; i++) {
            const gram = bodyWords.slice(i, i + n)
            const meaningfulCount = gram.filter(isMeaningful).length
            if (meaningfulCount >= Math.ceil(n / 2)) {
                const phrase = gram.join(" ")
                phraseFreq.set(phrase, (phraseFreq.get(phrase) || 0) + 1)
            }
        }
    }

    // Add body phrases that appear 2+ times
    for (const [phrase, count] of phraseFreq) {
        if (count >= 2) {
            addPhrase(phrase, Math.min(count, 5), "body")
        }
    }

    // 8. URL SLUG — extract meaningful phrases from the path
    try {
        const { pathname } = new URL(url)
        const slugWords = pathname
            .split(/[/\-_]/)
            .filter((w) => w.length >= 3 && isMeaningful(w))
        if (slugWords.length >= 2) {
            addPhrase(slugWords.join(" "), 4, "body")
        }
    } catch { /* ignore bad urls */ }

    // Sort by score descending, take top 20
    return Array.from(scored.entries())
        .map(([phrase, { score, source }]) => ({ phrase, score, source }))
        .filter((k) => k.phrase.split(/\s+/).length >= 2 || k.score >= 8) // prefer multi-word, but allow high-scoring singles
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)
}
