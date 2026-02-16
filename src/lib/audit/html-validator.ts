import type { AuditCheck } from "@/lib/types"

/**
 * W3C Nu HTML Validator Integration
 * Sends raw HTML to the W3C validator API and converts results to audit checks.
 * Gracefully degrades on timeout/error.
 */

interface ValidatorMessage {
    type: "error" | "info" | "non-document-error"
    subType?: "warning"
    message: string
    firstLine?: number
    lastLine?: number
    extract?: string
}

interface ValidatorResponse {
    messages: ValidatorMessage[]
}

export async function analyzeHTMLValidation(html: string): Promise<AuditCheck[]> {
    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

        const response = await fetch("https://validator.w3.org/nu/?out=json", {
            method: "POST",
            headers: {
                "Content-Type": "text/html; charset=utf-8",
                "User-Agent": "SEOAuditorPro/1.0 (HTML Validation Check)",
            },
            body: html,
            signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
            throw new Error(`W3C Validator returned ${response.status}`)
        }

        const data: ValidatorResponse = await response.json()
        const messages = data.messages || []

        const errors = messages.filter((m) => m.type === "error")
        const warnings = messages.filter(
            (m) => m.type === "info" && m.subType === "warning"
        )
        const infos = messages.filter(
            (m) => m.type === "info" && !m.subType
        )

        const checks: AuditCheck[] = []

        // 1. Overall HTML Validity
        checks.push({
            id: "html-validity",
            title: "HTML Validity",
            description: "Whether the page HTML is valid per W3C standards",
            status: errors.length === 0 ? "pass" : errors.length <= 3 ? "warning" : "fail",
            severity: "major",
            value: errors.length === 0 ? "Valid" : `${errors.length} error${errors.length > 1 ? "s" : ""}`,
            expected: "0 errors",
            details: errors.length > 0
                ? errors.slice(0, 5).map((e) => `Line ${e.lastLine || "?"}: ${e.message}`).join("\n")
                : undefined,
            recommendation: errors.length > 0
                ? "Fix HTML validation errors to ensure consistent rendering across browsers and improve search engine parsing. Common issues include unclosed tags, missing required attributes, and duplicate IDs."
                : undefined,
            learnMoreUrl: "https://validator.w3.org/",
        })

        // 2. Critical HTML Errors (specific patterns)
        const criticalErrors = errors.filter(
            (e) =>
                e.message.includes("Stray end tag") ||
                e.message.includes("duplicate") ||
                e.message.includes("not allowed as child") ||
                e.message.includes("Unclosed element")
        )

        if (criticalErrors.length > 0) {
            checks.push({
                id: "html-critical-errors",
                title: "Critical HTML Structure Errors",
                description: "Severe structural issues like unclosed elements, stray tags, or invalid nesting",
                status: "fail",
                severity: "critical",
                value: `${criticalErrors.length} structural error${criticalErrors.length > 1 ? "s" : ""}`,
                details: criticalErrors.slice(0, 3).map((e) => `Line ${e.lastLine || "?"}: ${e.message}`).join("\n"),
                recommendation: "Fix structural HTML errors immediately — these cause browsers to guess your intent, leading to inconsistent rendering and confusing search engine crawlers.",
                codeSnippet: criticalErrors[0]?.extract || undefined,
            })
        }

        // 3. HTML Warnings
        checks.push({
            id: "html-warnings",
            title: "HTML Warnings",
            description: "Non-critical warnings from W3C validation",
            status: warnings.length === 0 ? "pass" : warnings.length <= 5 ? "info" : "warning",
            severity: "minor",
            value: `${warnings.length} warning${warnings.length !== 1 ? "s" : ""}`,
            details: warnings.length > 0
                ? warnings.slice(0, 3).map((w) => `Line ${w.lastLine || "?"}: ${w.message}`).join("\n")
                : undefined,
        })

        // 4. Deprecated Elements
        const deprecatedErrors = errors.filter(
            (e) =>
                e.message.includes("obsolete") ||
                e.message.includes("deprecated") ||
                e.message.includes("not allowed")
        )

        checks.push({
            id: "html-deprecated",
            title: "Deprecated / Obsolete Elements",
            description: "Checks for use of obsolete HTML elements or attributes",
            status: deprecatedErrors.length === 0 ? "pass" : "warning",
            severity: "minor",
            value: deprecatedErrors.length === 0 ? "None found" : `${deprecatedErrors.length} found`,
            details: deprecatedErrors.length > 0
                ? deprecatedErrors.slice(0, 3).map((e) => e.message).join("\n")
                : undefined,
            recommendation: deprecatedErrors.length > 0
                ? "Replace deprecated HTML elements and attributes with modern equivalents. For example, use CSS instead of presentational attributes, and semantic elements instead of generic divs."
                : undefined,
            learnMoreUrl: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element#obsolete_and_deprecated_elements",
        })

        // 5. Doctype check
        const doctypeError = errors.find((e) =>
            e.message.toLowerCase().includes("doctype")
        )
        checks.push({
            id: "html-doctype",
            title: "DOCTYPE Declaration",
            description: "Checks for a proper HTML5 DOCTYPE declaration",
            status: doctypeError ? "fail" : "pass",
            severity: "major",
            value: doctypeError ? "Missing or incorrect" : "Valid HTML5",
            recommendation: doctypeError
                ? "Add <!DOCTYPE html> as the very first line of your HTML document to ensure standards-mode rendering."
                : undefined,
            codeSnippet: doctypeError ? "<!DOCTYPE html>" : undefined,
        })

        return checks
    } catch {
        // Graceful degradation
        return [
            {
                id: "html-validator-unavailable",
                title: "HTML Validation",
                description: "Could not reach the W3C Validator API. HTML validation data is unavailable for this audit.",
                status: "info",
                severity: "info",
                value: "unavailable",
                recommendation: "The W3C HTML Validator service may be temporarily unavailable. Try again later, or manually validate at https://validator.w3.org/",
            },
        ]
    }
}
