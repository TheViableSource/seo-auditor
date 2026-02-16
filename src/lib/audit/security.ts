import type { AuditCheck } from "@/lib/types"

/**
 * Security Headers Analyzer — 7 checks with actionable recommendations
 */
export function analyzeSecurityHeaders(headers: Record<string, string>): AuditCheck[] {
    const checks: AuditCheck[] = []
    const get = (name: string) => headers[name] || headers[name.toLowerCase()] || ""

    // --- 1. HSTS ---
    const hsts = get("strict-transport-security")
    checks.push({
        id: "sec-hsts",
        title: "HTTP Strict Transport Security (HSTS)",
        description: "HSTS forces browsers to always use HTTPS, preventing downgrade attacks.",
        status: hsts ? "pass" : "fail",
        severity: "critical",
        value: hsts || "(not set)",
        recommendation: !hsts
            ? "Without HSTS, browsers can still access your site via HTTP, making man-in-the-middle attacks possible. Add this header to force HTTPS for all future visits. Start with a shorter max-age and increase once confirmed working."
            : hsts.includes("includeSubDomains")
                ? "HSTS is properly configured with subdomain coverage."
                : "HSTS is set but consider adding includeSubDomains to protect all subdomains.",
        codeSnippet: !hsts ? `# Nginx:\nadd_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;\n\n# Apache (.htaccess):\nHeader always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"` : undefined,
        learnMoreUrl: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security",
    })

    // --- 2. CONTENT SECURITY POLICY ---
    const csp = get("content-security-policy")
    checks.push({
        id: "sec-csp",
        title: "Content Security Policy (CSP)",
        description: "CSP prevents XSS attacks by controlling which resources can be loaded.",
        status: csp ? "pass" : "warning",
        severity: "major",
        value: csp ? `Set (${csp.length} chars)` : "(not set)",
        recommendation: !csp
            ? "CSP is your best defense against cross-site scripting (XSS). Start with a report-only policy to identify what breaks, then enforce it. At minimum, restrict default-src to 'self' and whitelist specific CDNs."
            : "CSP is configured. Regularly audit it to ensure it's not too permissive. Avoid 'unsafe-inline' and 'unsafe-eval' if possible.",
        codeSnippet: !csp ? `# Start with report-only to test:\nContent-Security-Policy-Report-Only: default-src 'self'; script-src 'self' https://cdn.example.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;\n\n# Nginx:\nadd_header Content-Security-Policy "default-src 'self'; script-src 'self';" always;` : undefined,
        learnMoreUrl: "https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP",
    })

    // --- 3. X-FRAME-OPTIONS ---
    const xfo = get("x-frame-options")
    checks.push({
        id: "sec-xframe",
        title: "X-Frame-Options",
        description: "Prevents your site from being embedded in iframes, protecting against clickjacking.",
        status: xfo ? "pass" : "warning",
        severity: "major",
        value: xfo || "(not set)",
        recommendation: !xfo
            ? "Without X-Frame-Options, attackers can embed your site in an invisible iframe and trick users into clicking on it (clickjacking). Set to DENY or SAMEORIGIN."
            : `Set to '${xfo}'. DENY is most secure; SAMEORIGIN allows your own site to embed itself.`,
        codeSnippet: !xfo ? `# Nginx:\nadd_header X-Frame-Options "SAMEORIGIN" always;\n\n# Apache:\nHeader always set X-Frame-Options "SAMEORIGIN"` : undefined,
        learnMoreUrl: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options",
    })

    // --- 4. X-CONTENT-TYPE-OPTIONS ---
    const xcto = get("x-content-type-options")
    checks.push({
        id: "sec-xcto",
        title: "X-Content-Type-Options",
        description: "Prevents MIME-type sniffing, where browsers guess file types and execute malicious content.",
        status: xcto ? "pass" : "warning",
        severity: "minor",
        value: xcto || "(not set)",
        recommendation: !xcto
            ? "Without this header, browsers may 'sniff' content types and interpret uploaded files as executable scripts. Set to 'nosniff' to prevent this attack vector."
            : "Correctly set to prevent MIME-type sniffing.",
        codeSnippet: !xcto ? `# Nginx:\nadd_header X-Content-Type-Options "nosniff" always;\n\n# Apache:\nHeader always set X-Content-Type-Options "nosniff"` : undefined,
        learnMoreUrl: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options",
    })

    // --- 5. REFERRER-POLICY ---
    const rp = get("referrer-policy")
    checks.push({
        id: "sec-referrer",
        title: "Referrer-Policy",
        description: "Controls how much referrer information is sent with outgoing requests.",
        status: rp ? "pass" : "warning",
        severity: "minor",
        value: rp || "(not set)",
        recommendation: !rp
            ? "Without a Referrer-Policy, your full URLs (including query parameters with potential sensitive data) are sent to external sites when users click links. Set to 'strict-origin-when-cross-origin' for a good balance of privacy and analytics."
            : `Set to '${rp}'. 'strict-origin-when-cross-origin' is recommended for most sites.`,
        codeSnippet: !rp ? `# Nginx:\nadd_header Referrer-Policy "strict-origin-when-cross-origin" always;\n\n# Apache:\nHeader always set Referrer-Policy "strict-origin-when-cross-origin"\n\n# Or via HTML:\n<meta name="referrer" content="strict-origin-when-cross-origin" />` : undefined,
        learnMoreUrl: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy",
    })

    // --- 6. PERMISSIONS-POLICY ---
    const pp = get("permissions-policy") || get("feature-policy")
    checks.push({
        id: "sec-permissions",
        title: "Permissions-Policy",
        description: "Controls which browser features (camera, microphone, geolocation) your site can access.",
        status: pp ? "pass" : "warning",
        severity: "minor",
        value: pp ? `Set (${pp.length} chars)` : "(not set)",
        recommendation: !pp
            ? "Without a Permissions-Policy, embedded iframes and third-party scripts can access sensitive features like camera, microphone, and geolocation. Explicitly disable features you don't use."
            : "Permissions-Policy is configured. Review it periodically to ensure it matches your feature needs.",
        codeSnippet: !pp ? `# Nginx:\nadd_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;\n\n# Apache:\nHeader always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()"` : undefined,
        learnMoreUrl: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy",
    })

    // --- 7. X-XSS-PROTECTION ---
    const xxss = get("x-xss-protection")
    checks.push({
        id: "sec-xxss",
        title: "X-XSS-Protection",
        description: "Legacy XSS filter header. Modern browsers prefer CSP, but this is still useful for older browsers.",
        status: xxss ? "pass" : "info",
        severity: "info",
        value: xxss || "(not set)",
        recommendation: !xxss
            ? "While modern browsers rely on CSP instead, X-XSS-Protection provides XSS protection for older browsers like IE11. Set to '1; mode=block' for backward compatibility, but prioritize implementing CSP."
            : `Set to '${xxss}'. This header is deprecated in modern browsers in favor of CSP, but provides backward compatibility.`,
        codeSnippet: !xxss ? `# Nginx:\nadd_header X-XSS-Protection "1; mode=block" always;\n\n# Apache:\nHeader always set X-XSS-Protection "1; mode=block"` : undefined,
        learnMoreUrl: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-XSS-Protection",
    })

    return checks
}
