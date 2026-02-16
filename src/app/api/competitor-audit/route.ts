import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { SECURITY } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit";
import { analyzeOnPage } from "@/lib/audit/on-page";
import { analyzeTechnical } from "@/lib/audit/technical";
import { analyzeAccessibility } from "@/lib/audit/accessibility";
import { analyzeStructuredData } from "@/lib/audit/structured-data";
import { analyzeRobotsSitemap } from "@/lib/audit/robots-sitemap";
import { analyzeSecurityHeaders } from "@/lib/audit/security";
import { analyzeAEO } from "@/lib/audit/aeo";
import { analyzeGEO } from "@/lib/audit/geo";
import { analyzePageSpeed } from "@/lib/audit/pagespeed";
import { analyzeHTMLValidation } from "@/lib/audit/html-validator";
import { analyzeSafeBrowsing } from "@/lib/audit/safe-browsing";
import { scoreCategory, calculateOverallScore } from "@/lib/audit/scoring";

export async function POST(request: Request) {
    // Rate limiting
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

    try {
        const { url } = await request.json();

        // SSRF protection
        if (SECURITY.SSRF_FORBIDDEN_PATTERNS.some((pattern) => url.includes(pattern))) {
            return NextResponse.json({ error: "Restricted URL" }, { status: 403 });
        }

        // Fetch the site
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), SECURITY.FETCH_TIMEOUT_MS);

        const fetchStart = Date.now();
        let response: Response;
        try {
            response = await fetch(url, {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                },
                signal: controller.signal,
                redirect: "follow",
            });
        } finally {
            clearTimeout(timeoutId);
        }

        if (!response.ok) throw new Error(`Failed to visit site. Status: ${response.status}`);

        const html = await response.text();
        const $ = cheerio.load(html);
        const httpStatus = response.status;
        const fetchTimeMs = Date.now() - fetchStart;
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
        });

        // Run analyzers in parallel where possible
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

        return NextResponse.json({
            score: overallScore,
            categories: categories.map((c) => ({
                name: c.name,
                label: c.label,
                score: c.score,
            })),
        });
    } catch (error: unknown) {
        const message =
            error instanceof Error ? error.message : "Failed to audit competitor";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
