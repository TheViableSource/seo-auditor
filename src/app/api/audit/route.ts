import { NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function POST(request: Request) {
  // --- SECURITY LAYER 1: ORIGIN CHECK ---
  const origin = request.headers.get("origin");

  // 1. Define allowed Localhost ports for testing
  const allowedOrigins = ["http://localhost:3000", "http://localhost:3005", "https://seo-auditor-ibg8.vercel.app/"];

  // 2. Logic: Allow if it is Localhost OR if it is ANY Vercel app
  const isVercel = origin && origin.includes(".vercel.app");
  const isAllowed = origin && allowedOrigins.includes(origin);

  // 3. The Guard: If there is an origin, and it is NOT allowed, and NOT Vercel -> Block it.
  if (origin && !isAllowed && !isVercel) {
    return NextResponse.json({ error: "Unauthorized source" }, { status: 403 });
  }

  try {
    const { url } = await request.json();

    // --- SECURITY LAYER 2: SSRF PROTECTION ---
    // Prevent the server from scanning itself or private networks
    const forbidden = ["localhost", "127.0.0.1", "0.0.0.0", "192.168", "10.", "172.16", "metadata.google.internal"];
    
    // Quick check: Does the URL contain any forbidden keywords?
    if (forbidden.some(ip => url.includes(ip))) {
      return NextResponse.json({ error: "Restricted URL" }, { status: 403 });
    }

    // 1. Fetch the site
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });

    if (!response.ok) throw new Error(`Failed to visit site. Status: ${response.status}`);

    const html = await response.text();
    const $ = cheerio.load(html);

    // --- BASIC METADATA ---
    const title = $("title").text() || "";
    const description = $('meta[name="description"]').attr("content") || "";
    const h1 = $("h1").first().text() || "";
    const canonical = $('link[rel="canonical"]').attr("href") || null;

    // --- NEW: SOCIAL & MOBILE METADATA ---
    const ogTitle = $('meta[property="og:title"]').attr("content") || null;
    const ogImage = $('meta[property="og:image"]').attr("content") || null;
    const viewport = $('meta[name="viewport"]').attr("content") || null;
    const icon = $('link[rel="icon"]').attr("href") || $('link[rel="shortcut icon"]').attr("href") || null;

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

    links.each((i, el) => {
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
    images.each((i, img) => {
      const alt = $(img).attr("alt");
      if (!alt || alt.trim() === "") missingAlt++;
    });

    // --- SCORING LOGIC ---
    let score = 100;
    const issues = [];

    // Critical Checks
    if (!title) { score -= 10; issues.push("Missing Title Tag"); }
    if (!description) { score -= 10; issues.push("Missing Meta Description"); }
    if (!h1) { score -= 10; issues.push("Missing H1 Header"); }
    
    // Content Checks
    if (wordCount < 300) { 
      score -= 10; 
      issues.push(`Thin Content: Only ${wordCount} words (Recommended: 300+)`); 
    }
    
    // Technical Checks
    if (!canonical) { 
      score -= 10; 
      issues.push("Missing Canonical Tag (Risk of duplicate content)"); 
    }
    if (missingAlt > 0) { 
      score -= 5; 
      issues.push(`${missingAlt} images missing Alt Text`); 
    }

    // NEW: Mobile & Social Checks
    if (!viewport) {
      score -= 10;
      issues.push("Not Mobile Friendly (Missing Viewport Tag)");
    }
    if (!ogImage) {
      score -= 5;
      issues.push("Missing Social Share Image (og:image)");
    }
    if (!icon) {
      score -= 2; 
      issues.push("Missing Favicon");
    }

    score = Math.max(0, score);

    // --- RETURN RESULTS (The Merged Object) ---
    return NextResponse.json({
      score,
      details: {
        // Standard Data
        title: title || "Missing",
        description: description || "Missing",
        h1: h1 || "Missing",
        canonical: canonical || "Missing",
        
        // Deep Dive Data
        wordCount,
        internalLinks,
        externalLinks,
        imageCount: images.length,
        missingAlt,

        // NEW: Social Data
        social: {
          ogTitle: ogTitle || "Missing",
          ogImage: ogImage || null,
        },

        // NEW: Mobile Data
        mobile: {
          viewport: viewport ? "Optimized" : "Missing",
          icon: icon || null
        },

        // Errors List
        issues
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to audit site" },
      { status: 500 }
    );
  }
}