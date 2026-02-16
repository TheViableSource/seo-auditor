import * as cheerio from "cheerio";
import { SECURITY } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit";
import { analyzeOnPage, extractOnPageDetails } from "@/lib/audit/on-page";
import { analyzeTechnical, extractTechnicalDetails } from "@/lib/audit/technical";
import { analyzeAccessibility } from "@/lib/audit/accessibility";
import { analyzeStructuredData } from "@/lib/audit/structured-data";
import { analyzeRobotsSitemap } from "@/lib/audit/robots-sitemap";
import { analyzeSecurityHeaders } from "@/lib/audit/security";
import { analyzeAEO } from "@/lib/audit/aeo";
import { analyzeGEO } from "@/lib/audit/geo";
import { analyzePageSpeed } from "@/lib/audit/pagespeed";
import { analyzeHTMLValidation } from "@/lib/audit/html-validator";
import { analyzeSafeBrowsing } from "@/lib/audit/safe-browsing";
import { analyzeContent, extractPageResources, extractSocialPreview } from "@/lib/audit/content";
import { scoreCategory, calculateOverallScore } from "@/lib/audit/scoring";
import { NextResponse } from "next/server";

/* ------------------------------------------------------------------ */
/*  SSE helper                                                         */
/* ------------------------------------------------------------------ */
function sseEvent(type: string, data: unknown): string {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

/* ------------------------------------------------------------------ */
/*  POST /api/audit — streams audit progress via SSE                    */
/* ------------------------------------------------------------------ */
export async function POST(request: Request) {
  // --- Check if client wants SSE ---
  const acceptSSE = request.headers.get("accept")?.includes("text/event-stream");

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

  // --- SECURITY: ORIGIN CHECK ---
  const origin = request.headers.get("origin");
  const isAllowed = origin && (SECURITY.ALLOWED_ORIGINS as readonly string[]).includes(origin);
  if (origin && !isAllowed) {
    return NextResponse.json({ error: "Unauthorized source" }, { status: 403 });
  }

  let url: string;
  try {
    const body = await request.json();
    url = body.url;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // --- SSRF PROTECTION ---
  if (SECURITY.SSRF_FORBIDDEN_PATTERNS.some((pattern) => url.includes(pattern))) {
    return NextResponse.json({ error: "Restricted URL" }, { status: 403 });
  }

  // --- SSE STREAMING PATH ---
  if (acceptSSE) {
    const stream = new ReadableStream({
      async start(controller) {
        const send = (type: string, data: unknown) => {
          controller.enqueue(new TextEncoder().encode(sseEvent(type, data)));
        };

        try {
          // Step 1: Fetch
          send("progress", { step: 1, total: 13, label: "Fetching page…" });
          const ac = new AbortController();
          const timeoutId = setTimeout(() => ac.abort(), SECURITY.FETCH_TIMEOUT_MS);
          const fetchStart = Date.now();
          let response: Response;
          try {
            response = await fetch(url, {
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
              signal: ac.signal,
              redirect: "follow",
            });
          } finally {
            clearTimeout(timeoutId);
          }
          const fetchTimeMs = Date.now() - fetchStart;
          if (!response.ok) throw new Error(`Failed to visit site. Status: ${response.status}`);
          const html = await response.text();
          const $ = cheerio.load(html);
          const httpStatus = response.status;
          const responseHeaders: Record<string, string> = {};
          response.headers.forEach((value, key) => { responseHeaders[key] = value; });

          // Step 2–5: Async analyzers
          send("progress", { step: 2, total: 13, label: "Checking robots & sitemap…" });
          const robotsSitemapChecks = await analyzeRobotsSitemap(url);

          send("progress", { step: 3, total: 13, label: "Analyzing page speed…" });
          const pagespeedChecks = await analyzePageSpeed(url);

          send("progress", { step: 4, total: 13, label: "Validating HTML…" });
          const htmlValidationChecks = await analyzeHTMLValidation(html);

          send("progress", { step: 5, total: 13, label: "Checking safe browsing…" });
          const safeBrowsingChecks = await analyzeSafeBrowsing(url);

          // Step 6–13: Sync analyzers
          send("progress", { step: 6, total: 13, label: "Analyzing on-page SEO…" });
          const onPageChecks = analyzeOnPage($, url);

          send("progress", { step: 7, total: 13, label: "Analyzing technical SEO…" });
          const technicalChecks = analyzeTechnical($, url, httpStatus, responseHeaders, fetchTimeMs);

          send("progress", { step: 8, total: 13, label: "Checking accessibility…" });
          const accessibilityChecks = analyzeAccessibility($);

          send("progress", { step: 9, total: 13, label: "Analyzing structured data…" });
          const structuredDataChecks = analyzeStructuredData($);

          send("progress", { step: 10, total: 13, label: "Checking security headers…" });
          const securityChecks = analyzeSecurityHeaders(responseHeaders);

          send("progress", { step: 11, total: 13, label: "Analyzing AEO readiness…" });
          const aeoChecks = analyzeAEO($);

          send("progress", { step: 12, total: 13, label: "Analyzing GEO readiness…" });
          const geoChecks = analyzeGEO($, url);

          send("progress", { step: 13, total: 13, label: "Calculating scores…" });
          const contentAnalysis = analyzeContent($, html);
          const pageResources = extractPageResources($, html);
          const socialPreview = extractSocialPreview($);

          const categories = [
            scoreCategory("on-page", "On-Page SEO", onPageChecks),
            scoreCategory("technical", "Technical SEO", technicalChecks),
            scoreCategory("accessibility", "Accessibility", accessibilityChecks),
            scoreCategory("structured-data", "Structured Data", structuredDataChecks),
            scoreCategory("security", "Security Headers", securityChecks),
            scoreCategory("robots-sitemap", "Robots & Sitemap", robotsSitemapChecks),
            scoreCategory("aeo", "Answer Engine (AEO)", aeoChecks),
            scoreCategory("geo", "Generative Engine (GEO)", geoChecks),
            scoreCategory("performance", "Performance", pagespeedChecks),
            scoreCategory("html-validation", "HTML Validation", htmlValidationChecks),
            scoreCategory("safe-browsing", "Safe Browsing", safeBrowsingChecks),
          ];

          const overallScore = calculateOverallScore(categories);
          const onPageDetails = extractOnPageDetails($, url);
          const technicalDetails = extractTechnicalDetails($);
          const issues = categories.flatMap((cat) =>
            cat.checks
              .filter((c) => c.status === "fail" || c.status === "warning")
              .map((c) => c.title + (c.value ? `: ${c.value}` : ""))
          );

          send("result", {
            score: overallScore,
            categories,
            details: { ...onPageDetails, social: technicalDetails.social, mobile: technicalDetails.mobile, issues },
            contentAnalysis,
            pageResources,
            socialPreview,
            meta: { url, fetchTimeMs, timestamp: new Date().toISOString(), httpStatus },
          });
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Failed to audit site";
          send("error", { error: message });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // --- LEGACY JSON PATH (backward compat) ---
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SECURITY.FETCH_TIMEOUT_MS);
    const fetchStart = Date.now();
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
        signal: controller.signal,
        redirect: "follow",
      });
    } finally {
      clearTimeout(timeoutId);
    }
    const fetchTimeMs = Date.now() - fetchStart;
    if (!response.ok) throw new Error(`Failed to visit site. Status: ${response.status}`);
    const html = await response.text();
    const $ = cheerio.load(html);
    const httpStatus = response.status;
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => { responseHeaders[key] = value; });

    const [robotsSitemapChecks, pagespeedChecks, htmlValidationChecks, safeBrowsingChecks] = await Promise.all([
      analyzeRobotsSitemap(url),
      analyzePageSpeed(url),
      analyzeHTMLValidation(html),
      analyzeSafeBrowsing(url),
    ]);

    const onPageChecks = analyzeOnPage($, url);
    const technicalChecks = analyzeTechnical($, url, httpStatus, responseHeaders, fetchTimeMs);
    const accessibilityChecks = analyzeAccessibility($);
    const structuredDataChecks = analyzeStructuredData($);
    const securityChecks = analyzeSecurityHeaders(responseHeaders);
    const aeoChecks = analyzeAEO($);
    const geoChecks = analyzeGEO($, url);
    const contentAnalysis = analyzeContent($, html);
    const pageResources = extractPageResources($, html);
    const socialPreview = extractSocialPreview($);

    const categories = [
      scoreCategory("on-page", "On-Page SEO", onPageChecks),
      scoreCategory("technical", "Technical SEO", technicalChecks),
      scoreCategory("accessibility", "Accessibility", accessibilityChecks),
      scoreCategory("structured-data", "Structured Data", structuredDataChecks),
      scoreCategory("security", "Security Headers", securityChecks),
      scoreCategory("robots-sitemap", "Robots & Sitemap", robotsSitemapChecks),
      scoreCategory("aeo", "Answer Engine (AEO)", aeoChecks),
      scoreCategory("geo", "Generative Engine (GEO)", geoChecks),
      scoreCategory("performance", "Performance", pagespeedChecks),
      scoreCategory("html-validation", "HTML Validation", htmlValidationChecks),
      scoreCategory("safe-browsing", "Safe Browsing", safeBrowsingChecks),
    ];

    const overallScore = calculateOverallScore(categories);
    const onPageDetails = extractOnPageDetails($, url);
    const technicalDetails = extractTechnicalDetails($);
    const issues = categories.flatMap((cat) =>
      cat.checks
        .filter((c) => c.status === "fail" || c.status === "warning")
        .map((c) => c.title + (c.value ? `: ${c.value}` : ""))
    );

    return NextResponse.json({
      score: overallScore,
      categories,
      details: { ...onPageDetails, social: technicalDetails.social, mobile: technicalDetails.mobile, issues },
      contentAnalysis,
      pageResources,
      socialPreview,
      meta: { url, fetchTimeMs, timestamp: new Date().toISOString(), httpStatus },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to audit site";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
