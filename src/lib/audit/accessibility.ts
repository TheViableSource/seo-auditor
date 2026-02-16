import type { CheerioAPI } from "cheerio"
import type { AuditCheck } from "@/lib/types"

/**
 * Accessibility Analyzer — 8 checks with actionable recommendations
 */
export function analyzeAccessibility($: CheerioAPI): AuditCheck[] {
    const checks: AuditCheck[] = []

    // --- 1. LANGUAGE DECLARATION ---
    const lang = $("html").attr("lang") || ""
    checks.push({
        id: "a11y-lang",
        title: "Language Declaration",
        description: "The page must declare a language for screen readers to use correct pronunciation.",
        status: lang ? "pass" : "fail",
        severity: "critical",
        value: lang || "(missing)",
        recommendation: !lang
            ? "Screen readers use the lang attribute to select the correct voice profile. Without it, assistive technology may mispronounce your content. Add lang to the <html> element."
            : `Language is set to '${lang}'. If you have content in other languages, use the lang attribute on those specific elements too.`,
        codeSnippet: !lang ? `<html lang="en">` : undefined,
        learnMoreUrl: "https://www.w3.org/WAI/WCAG21/Understanding/language-of-page.html",
    })

    // --- 2. HEADING HIERARCHY ---
    const headingLevels: number[] = []
    $("h1, h2, h3, h4, h5, h6").each((_, el) => {
        headingLevels.push(parseInt(el.tagName.replace("h", "")))
    })
    let skipped = false
    for (let i = 1; i < headingLevels.length; i++) {
        if (headingLevels[i] - headingLevels[i - 1] > 1) { skipped = true; break }
    }
    checks.push({
        id: "a11y-headings",
        title: "Heading Hierarchy",
        description: "Headings must follow sequential order (H1 → H2 → H3) without skipping levels.",
        status: skipped ? "warning" : "pass",
        severity: "major",
        value: skipped ? "Levels skipped" : "Properly nested",
        recommendation: skipped
            ? "Screen reader users navigate pages by headings. Skipping levels (e.g., H2 → H4) makes the page structure confusing. Restructure headings to descend sequentially, like a document outline."
            : "Heading hierarchy follows a logical, sequential order.",
        learnMoreUrl: "https://www.w3.org/WAI/tutorials/page-structure/headings/",
    })

    // --- 3. IMAGE ALT TEXT ---
    const images = $("img")
    let missingAlt = 0, decorativeAlt = 0
    images.each((_, el) => {
        const alt = $(el).attr("alt")
        if (alt === undefined) missingAlt++
        else if (alt === "") decorativeAlt++
    })
    checks.push({
        id: "a11y-img-alt",
        title: "Image Alt Text (A11Y)",
        description: "Every image must have an alt attribute — descriptive for informative images, empty for decorative.",
        status: missingAlt > 0 ? "fail" : "pass",
        severity: "critical",
        value: `${missingAlt} missing, ${decorativeAlt} decorative`,
        recommendation: missingAlt > 0
            ? `${missingAlt} images have no alt attribute at all. Add descriptive alt text for informative images (e.g., alt="Team photo at office") and empty alt="" for purely decorative images. Screen readers announce images without alt as the filename, which is confusing.`
            : "All images have alt attributes. Ensure descriptive images have meaningful text and decorative images use empty alt.",
        codeSnippet: missingAlt > 0 ? `<!-- Informative image: -->\n<img src="chart.png" alt="Q4 revenue grew 25% year-over-year" />\n\n<!-- Decorative image: -->\n<img src="divider.png" alt="" />` : undefined,
        learnMoreUrl: "https://www.w3.org/WAI/tutorials/images/",
    })

    // --- 4. FORM LABELS ---
    const inputs = $("input:not([type='hidden']):not([type='submit']):not([type='button']), select, textarea")
    let unlabeled = 0
    inputs.each((_, el) => {
        const id = $(el).attr("id")
        const ariaLabel = $(el).attr("aria-label")
        const ariaLabelledby = $(el).attr("aria-labelledby")
        const hasLabel = id && $(`label[for="${id}"]`).length > 0
        if (!hasLabel && !ariaLabel && !ariaLabelledby) unlabeled++
    })
    checks.push({
        id: "a11y-form-labels",
        title: "Form Field Labels",
        description: "All form inputs need associated <label> elements or ARIA labels for screen readers.",
        status: unlabeled > 0 ? "fail" : inputs.length === 0 ? "info" : "pass",
        severity: "major",
        value: inputs.length === 0 ? "No form fields" : `${unlabeled} unlabeled field(s)`,
        recommendation: unlabeled > 0
            ? `${unlabeled} form fields lack labels. Screen reader users can't tell what to enter. Use <label for="fieldId"> or aria-label. Placeholder text alone is NOT a substitute — it disappears when the user starts typing.`
            : inputs.length === 0
                ? "No form fields detected on this page."
                : "All form fields have proper labels.",
        codeSnippet: unlabeled > 0 ? `<label for="email">Email Address</label>\n<input type="email" id="email" name="email" />\n\n<!-- Or with aria-label: -->\n<input type="search" aria-label="Search the site" />` : undefined,
        learnMoreUrl: "https://www.w3.org/WAI/tutorials/forms/labels/",
    })

    // --- 5. ARIA LANDMARKS ---
    const hasNav = $("nav, [role='navigation']").length > 0
    const hasMain = $("main, [role='main']").length > 0
    const landmarks = hasNav && hasMain
    checks.push({
        id: "a11y-landmarks",
        title: "ARIA Landmarks",
        description: "Pages should use landmark elements (<nav>, <main>) for screen reader navigation.",
        status: landmarks ? "pass" : "warning",
        severity: "major",
        value: `nav: ${hasNav ? "✓" : "✗"}, main: ${hasMain ? "✓" : "✗"}`,
        recommendation: !landmarks
            ? `Missing ${[!hasNav && "<nav>", !hasMain && "<main>"].filter(Boolean).join(" and ")} landmark(s). Screen reader users use landmarks to jump between page sections. Wrap your navigation in <nav> and your main content in <main>.`
            : "Both <nav> and <main> landmarks are present, enabling efficient screen reader navigation.",
        codeSnippet: !landmarks ? `<nav aria-label="Main navigation">\n  <!-- navigation links -->\n</nav>\n<main>\n  <!-- page content -->\n</main>` : undefined,
        learnMoreUrl: "https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/",
    })

    // --- 6. SKIP NAVIGATION ---
    const skipLink = $('a[href="#main"], a[href="#content"], a[href="#main-content"], .skip-link, .skip-nav, [class*="skip"]')
    checks.push({
        id: "a11y-skip-nav",
        title: "Skip Navigation Link",
        description: "A 'Skip to content' link lets keyboard users bypass repetitive navigation.",
        status: skipLink.length > 0 ? "pass" : "warning",
        severity: "minor",
        value: skipLink.length > 0 ? "Found" : "(missing)",
        recommendation: skipLink.length === 0
            ? "Keyboard users must tab through every navigation link to reach content. Add a hidden 'Skip to content' link as the first focusable element. It becomes visible on focus."
            : "Skip navigation link is present for keyboard users.",
        codeSnippet: skipLink.length === 0 ? `<!-- First element in <body>: -->\n<a href="#main-content" class="skip-link">Skip to main content</a>\n\n<!-- CSS: -->\n<style>\n.skip-link {\n  position: absolute;\n  top: -40px;\n  left: 0;\n  padding: 8px;\n  z-index: 100;\n}\n.skip-link:focus {\n  top: 0;\n}\n</style>` : undefined,
        learnMoreUrl: "https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks.html",
    })

    // --- 7. LINK TEXT QUALITY ---
    let vagueLinkCount = 0
    const vagueTexts = ["click here", "here", "read more", "more", "link", "learn more"]
    $("a").each((_, el) => {
        const text = $(el).text().trim().toLowerCase()
        if (vagueTexts.includes(text)) vagueLinkCount++
    })
    checks.push({
        id: "a11y-link-text",
        title: "Descriptive Link Text",
        description: "Link text like 'click here' or 'read more' provides no context for screen readers.",
        status: vagueLinkCount > 3 ? "warning" : vagueLinkCount > 0 ? "info" : "pass",
        severity: "minor",
        value: `${vagueLinkCount} vague link(s)`,
        recommendation: vagueLinkCount > 0
            ? `${vagueLinkCount} links use vague text like "click here" or "read more." Screen reader users often navigate by links alone — "click here" tells them nothing. Change to descriptive text like "Read our pricing guide" or "View the full report."`
            : "All links have descriptive, meaningful text.",
        codeSnippet: vagueLinkCount > 0 ? `<!-- Instead of: -->\n<a href="/pricing">Click here</a>\n\n<!-- Use: -->\n<a href="/pricing">View our pricing plans</a>` : undefined,
        learnMoreUrl: "https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html",
    })

    // --- 8. SEMANTIC HTML ---
    const semanticElements = ["header", "footer", "article", "section", "aside"]
    const found = semanticElements.filter((tag) => $(tag).length > 0)
    checks.push({
        id: "a11y-semantic",
        title: "Semantic HTML Elements",
        description: "Using semantic elements (<header>, <footer>, <article>, etc.) improves structure for assistive tech.",
        status: found.length >= 3 ? "pass" : found.length > 0 ? "warning" : "fail",
        severity: "minor",
        value: found.length > 0 ? found.map((t) => `<${t}>`).join(", ") : "None found",
        recommendation: found.length < 3
            ? `Only using ${found.length} semantic elements. Replace generic <div> wrappers with semantic HTML: <header> for site header, <footer> for footer, <article> for blog posts, <section> for content groups, <aside> for sidebars. This helps screen readers understand page structure.`
            : `Good use of semantic HTML with ${found.length} element types.`,
        learnMoreUrl: "https://developer.mozilla.org/en-US/docs/Learn/Accessibility/HTML",
    })

    return checks
}
