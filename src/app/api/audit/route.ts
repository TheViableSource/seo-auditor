import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { SECURITY, SCORING } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  // --- RATE LIMITING ---
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  // --- SECURITY LAYER 1: ORIGIN CHECK ---
  const origin = request.headers.get("origin");
  const isAllowed = origin && (SECURITY.ALLOWED_ORIGINS as readonly string[]).includes(origin);

  if (origin && !isAllowed) {
    return NextResponse.json({ error: "Unauthorized source" }, { status: 403 });
  }

  try {
    const { url } = await request.json();

    // --- SECURITY LAYER 2: SSRF PROTECTION ---
    if (SECURITY.SSRF_FORBIDDEN_PATTERNS.some((pattern) => url.includes(pattern))) {
      return NextResponse.json({ error: "Restricted URL" }, { status: 403 });
    }

    // 1. Fetch the site with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SECURITY.FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) throw new Error(`Failed to visit site. Status: ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);

    // --- BASIC METADATA ---
    const title = $("title").text() || "";
    const description = $('meta[name="description"]').attr("content") || "";
    const h1 = $("h1").first().text() || "";
    const canonical = $('link[rel="canonical"]').attr("href") || null;

    // --- SOCIAL & MOBILE METADATA ---
    const ogTitle = $('meta[property="og:title"]').attr("content") || null;
    const ogImage = $('meta[property="og:image"]').attr("content") || null;
    const viewport = $('meta[name="viewport"]').attr("content") || null;
    const icon =
      $('link[rel="icon"]').attr("href") ||
      $('link[rel="shortcut icon"]').attr("href") ||
      null;

    // --- DEEP DIVE ANALYSIS ---

    // 1. Word Count
    $("script, style, noscript").remove();
    const bodyText = $("body").text().replace(/\s+/g, " ").trim();
    const wordCount = bodyText.split(" ").length;

    // 2. Link Analysis
    const links = $("a");
    let internalLinks = 0;
    let externalLinks = 0;
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    links.each((_i, el) => {
      const href = $(el).attr("href");
      if (href) {
        if (href.startsWith("/") || href.includes(domain)) {
          internalLinks++;
        } else if (href.startsWith("http")) {
          externalLinks++;
        }
      }
    });

    // 3. Image Analysis
    const images = $("img");
    let missingAlt = 0;
    images.each((_i, img) => {
      const alt = $(img).attr("alt");
      if (!alt || alt.trim() === "") missingAlt++;
    });

    // --- SCORING LOGIC ---
    let score: number = SCORING.MAX_SCORE;
    const issues: string[] = [];

    if (!title) {
      score -= SCORING.PENALTY_MISSING_TITLE;
      issues.push("Missing Title Tag");
    }
    if (!description) {
      score -= SCORING.PENALTY_MISSING_DESCRIPTION;
      issues.push("Missing Meta Description");
    }
    if (!h1) {
      score -= SCORING.PENALTY_MISSING_H1;
      issues.push("Missing H1 Header");
    }

    if (wordCount < SCORING.MIN_WORD_COUNT) {
      score -= SCORING.PENALTY_THIN_CONTENT;
      issues.push(
        `Thin Content: Only ${wordCount} words (Recommended: ${SCORING.MIN_WORD_COUNT}+)`
      );
    }

    if (!canonical) {
      score -= SCORING.PENALTY_MISSING_CANONICAL;
      issues.push("Missing Canonical Tag (Risk of duplicate content)");
    }
    if (missingAlt > 0) {
      score -= SCORING.PENALTY_MISSING_ALT;
      issues.push(`${missingAlt} images missing Alt Text`);
    }

    if (!viewport) {
      score -= SCORING.PENALTY_MISSING_VIEWPORT;
      issues.push("Not Mobile Friendly (Missing Viewport Tag)");
    }
    if (!ogImage) {
      score -= SCORING.PENALTY_MISSING_OG_IMAGE;
      issues.push("Missing Social Share Image (og:image)");
    }
    if (!icon) {
      score -= SCORING.PENALTY_MISSING_FAVICON;
      issues.push("Missing Favicon");
    }

    score = Math.max(0, score);

    // --- RETURN RESULTS ---
    return NextResponse.json({
      score,
      details: {
        title: title || "Missing",
        description: description || "Missing",
        h1: h1 || "Missing",
        canonical: canonical || "Missing",
        wordCount,
        internalLinks,
        externalLinks,
        imageCount: images.length,
        missingAlt,
        social: {
          ogTitle: ogTitle || "Missing",
          ogImage: ogImage || null,
        },
        mobile: {
          viewport: viewport ? "Optimized" : "Missing",
          icon: icon || null,
        },
        issues,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to audit site";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
