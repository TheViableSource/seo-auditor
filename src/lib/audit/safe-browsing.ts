import type { AuditCheck } from "@/lib/types"

/**
 * Safe Browsing / Site Safety Module
 *
 * Two modes:
 * - API mode: Uses Google Safe Browsing Lookup API v4 when SAFE_BROWSING_API_KEY is set
 * - Heuristic mode: Performs URL pattern analysis when no key is configured
 */

interface ThreatMatch {
    threatType: string
    platformType: string
    threat: { url: string }
    cacheDuration: string
}

interface SafeBrowsingResponse {
    matches?: ThreatMatch[]
}

async function checkWithAPI(url: string, apiKey: string): Promise<AuditCheck[]> {
    const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`

    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)

        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                client: {
                    clientId: "seo-auditor-pro",
                    clientVersion: "1.0.0",
                },
                threatInfo: {
                    threatTypes: [
                        "MALWARE",
                        "SOCIAL_ENGINEERING",
                        "UNWANTED_SOFTWARE",
                        "POTENTIALLY_HARMFUL_APPLICATION",
                    ],
                    platformTypes: ["ANY_PLATFORM"],
                    threatEntryTypes: ["URL"],
                    threatEntries: [{ url }],
                },
            }),
            signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (!response.ok) throw new Error(`Safe Browsing API returned ${response.status}`)

        const data: SafeBrowsingResponse = await response.json()
        const matches = data.matches || []

        const checks: AuditCheck[] = []

        // Main threat check
        if (matches.length === 0) {
            checks.push({
                id: "sb-threat-free",
                title: "Safe Browsing Status",
                description: "Google Safe Browsing found no threats for this URL",
                status: "pass",
                severity: "critical",
                value: "No threats detected",
                learnMoreUrl: "https://transparencyreport.google.com/safe-browsing/search",
            })
        } else {
            for (const match of matches) {
                const threatLabels: Record<string, string> = {
                    MALWARE: "Malware",
                    SOCIAL_ENGINEERING: "Phishing / Social Engineering",
                    UNWANTED_SOFTWARE: "Unwanted Software",
                    POTENTIALLY_HARMFUL_APPLICATION: "Potentially Harmful App",
                }
                const label = threatLabels[match.threatType] || match.threatType

                checks.push({
                    id: `sb-threat-${match.threatType.toLowerCase()}`,
                    title: `Threat Detected: ${label}`,
                    description: `Google Safe Browsing flagged this URL as containing ${label.toLowerCase()}`,
                    status: "fail",
                    severity: match.threatType === "UNWANTED_SOFTWARE" ? "major" : "critical",
                    value: label,
                    recommendation: `This site has been flagged by Google Safe Browsing for ${label.toLowerCase()}. This will cause browsers to show warning pages and severely harm SEO rankings. Investigate and remove the threat immediately, then request a review at https://search.google.com/search-console/security-issues`,
                    learnMoreUrl: "https://support.google.com/webmasters/answer/9044175",
                })
            }
        }

        return checks
    } catch {
        // Fall back to heuristic mode
        return checkWithHeuristics(url)
    }
}

function checkWithHeuristics(url: string): AuditCheck[] {
    const checks: AuditCheck[] = []
    let suspiciousCount = 0
    const suspiciousReasons: string[] = []

    try {
        const parsed = new URL(url)

        // 1. IP-only host (no domain name)
        const ipPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/
        if (ipPattern.test(parsed.hostname)) {
            suspiciousCount++
            suspiciousReasons.push("IP address used instead of domain name")
        }

        // 2. Excessive subdomains (commonly used in phishing)
        const subdomainCount = parsed.hostname.split(".").length - 2
        if (subdomainCount > 3) {
            suspiciousCount++
            suspiciousReasons.push(`${subdomainCount} subdomains detected (possible URL obfuscation)`)
        }

        // 3. Very long URL (phishing indicator)
        if (url.length > 500) {
            suspiciousCount++
            suspiciousReasons.push("Unusually long URL (possible obfuscation)")
        }

        // 4. Suspicious keywords in URL
        const suspiciousKeywords = ["login", "signin", "verify", "account", "update", "secure", "banking"]
        const urlLower = url.toLowerCase()
        const foundKeywords = suspiciousKeywords.filter((kw) => urlLower.includes(kw))
        if (foundKeywords.length >= 2) {
            suspiciousCount++
            suspiciousReasons.push(`Multiple suspicious keywords: ${foundKeywords.join(", ")}`)
        }

        // 5. Data URI or JavaScript URI
        if (urlLower.startsWith("data:") || urlLower.startsWith("javascript:")) {
            suspiciousCount++
            suspiciousReasons.push("Non-HTTP protocol detected")
        }

        // 6. HTTPS check
        checks.push({
            id: "sb-https",
            title: "HTTPS Protocol",
            description: "Whether the site uses a secure HTTPS connection",
            status: parsed.protocol === "https:" ? "pass" : "fail",
            severity: "critical",
            value: parsed.protocol === "https:" ? "Secure" : "Not secure (HTTP)",
            recommendation: parsed.protocol !== "https:"
                ? "Migration to HTTPS is critical for user safety, SEO rankings, and browser trust indicators. Obtain an SSL/TLS certificate and configure your server to redirect all HTTP traffic to HTTPS."
                : undefined,
            learnMoreUrl: "https://web.dev/why-https-matters/",
        })

        // Overall suspicion check
        checks.push({
            id: "sb-url-safety",
            title: "URL Safety Analysis",
            description: "Heuristic analysis of URL patterns for suspicious indicators",
            status: suspiciousCount === 0 ? "pass" : suspiciousCount === 1 ? "warning" : "fail",
            severity: suspiciousCount >= 2 ? "critical" : "minor",
            value: suspiciousCount === 0 ? "No suspicious patterns" : `${suspiciousCount} indicator${suspiciousCount > 1 ? "s" : ""}`,
            details: suspiciousReasons.length > 0 ? suspiciousReasons.join("\n") : undefined,
            recommendation: suspiciousCount > 0
                ? "Suspicious URL patterns may trigger browser warnings or cause search engines to demote the site. Ensure the domain is legitimate and follows standard URL conventions."
                : undefined,
        })

        // 7. Mixed content potential (HTTP on HTTPS site)
        checks.push({
            id: "sb-mixed-content",
            title: "Mixed Content Risk",
            description: "Checks for potential mixed content issues based on protocol",
            status: parsed.protocol === "https:" ? "pass" : "warning",
            severity: "major",
            value: parsed.protocol === "https:" ? "Low risk" : "High risk (HTTP site)",
            recommendation: parsed.protocol !== "https:"
                ? "Sites served over HTTP are flagged as 'Not Secure' by modern browsers. All resources (scripts, images, stylesheets) should also be served over HTTPS to avoid mixed content warnings."
                : undefined,
            learnMoreUrl: "https://web.dev/what-is-mixed-content/",
        })

    } catch {
        checks.push({
            id: "sb-parse-error",
            title: "URL Safety Analysis",
            description: "Could not parse the URL for safety analysis",
            status: "info",
            severity: "info",
            value: "Unparseable URL",
        })
    }

    return checks
}

export async function analyzeSafeBrowsing(url: string): Promise<AuditCheck[]> {
    const apiKey = process.env.SAFE_BROWSING_API_KEY
    if (apiKey) {
        return checkWithAPI(url, apiKey)
    }
    return checkWithHeuristics(url)
}
