"use client"

/**
 * PDF Report Generator
 *
 * Uses html2canvas to capture the ReportPreview component, then
 * assembles the captures into a multi-page PDF with jsPDF.
 */

import jsPDF from "jspdf"
import html2canvas from "html2canvas"

/**
 * Captures a container element and generates a multi-page PDF.
 *
 * @param container — the ReportPreview root div
 * @param filename — output filename (without .pdf)
 */
export async function generatePdfFromElement(
    container: HTMLElement,
    filename: string
): Promise<void> {
    // Make the container visible temporarily for html2canvas
    const originalStyle = container.style.cssText
    container.style.cssText = `
        position: fixed;
        left: 0;
        top: 0;
        z-index: -9999;
        opacity: 0;
        pointer-events: none;
        width: 816px;
    `

    // Wait a frame for layout
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await new Promise((resolve) => setTimeout(resolve, 200))

    try {
        const canvas = await html2canvas(container, {
            scale: 2,                // 2x for crisp text
            useCORS: true,           // for external images
            allowTaint: true,
            backgroundColor: "#ffffff",
            width: 816,
            windowWidth: 816,
            logging: false,
            // Fix: html2canvas doesn't support modern CSS color functions
            // (lab, oklch, oklab, lch) used by Tailwind CSS v4.
            // Strip them from both inline styles AND <style> tags in the clone.
            onclone: (_doc: Document, cloned: HTMLElement) => {
                const unsupported = /\b(lab|oklch|oklab|lch)\s*\(/i
                const colorFnGlobal = /\b(lab|oklch|oklab|lch)\s*\([^)]*\)/gi

                // 1. Sanitize all <style> tags (where Tailwind defines lab() vars)
                const doc = cloned.ownerDocument || document
                const styleTags = doc.querySelectorAll("style")
                for (const tag of Array.from(styleTags)) {
                    if (tag.textContent && unsupported.test(tag.textContent)) {
                        tag.textContent = tag.textContent.replace(colorFnGlobal, "transparent")
                    }
                }

                // 2. Walk CSSOM rules to catch computed properties html2canvas reads
                try {
                    for (const sheet of Array.from(doc.styleSheets)) {
                        try {
                            const rules = sheet.cssRules || sheet.rules
                            if (!rules) continue
                            for (let r = 0; r < rules.length; r++) {
                                const rule = rules[r] as CSSStyleRule
                                if (!rule.style) continue
                                for (let p = rule.style.length - 1; p >= 0; p--) {
                                    const prop = rule.style[p]
                                    const val = rule.style.getPropertyValue(prop)
                                    if (unsupported.test(val)) {
                                        rule.style.setProperty(prop, "transparent")
                                    }
                                }
                            }
                        } catch {
                            // Cross-origin stylesheets will throw — skip
                        }
                    }
                } catch {
                    // styleSheets access can fail in some environments
                }

                // 3. Override CSS custom properties on :root / html / body
                //    that resolve to lab()/oklch() in computed styles.
                //    This is critical because html2canvas calls getComputedStyle
                //    which resolves custom properties containing lab() values.
                const roots = [doc.documentElement, doc.body, cloned]
                for (const root of roots) {
                    if (!root) continue
                    const computed = window.getComputedStyle(root)
                    for (let i = 0; i < computed.length; i++) {
                        const prop = computed[i]
                        if (prop.startsWith("--")) {
                            const val = computed.getPropertyValue(prop)
                            if (unsupported.test(val)) {
                                root.style.setProperty(prop, "transparent")
                            }
                        }
                    }
                }

                // 4. Sanitize inline styles on all elements
                const allElements = cloned.querySelectorAll("*")
                const els = [cloned, ...Array.from(allElements)] as HTMLElement[]
                for (const el of els) {
                    if (!el.style) continue
                    for (let i = el.style.length - 1; i >= 0; i--) {
                        const prop = el.style[i]
                        const val = el.style.getPropertyValue(prop)
                        if (unsupported.test(val)) {
                            el.style.setProperty(prop, "transparent")
                        }
                    }
                }
            },
        })

        // PDF page dimensions in mm (Letter)
        const pageWidth = 215.9
        const pageHeight = 279.4
        const imgWidthMm = pageWidth
        const imgHeightMm = (canvas.height * pageWidth) / canvas.width

        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "letter",
        })

        // Split into pages
        const pagesNeeded = Math.ceil(imgHeightMm / pageHeight)
        const canvasPageHeightPx = canvas.width * (pageHeight / pageWidth)

        for (let page = 0; page < pagesNeeded; page++) {
            if (page > 0) pdf.addPage()

            // Create a sub-canvas for this page
            const pageCanvas = document.createElement("canvas")
            pageCanvas.width = canvas.width
            pageCanvas.height = Math.min(
                canvasPageHeightPx,
                canvas.height - page * canvasPageHeightPx
            )

            const ctx = pageCanvas.getContext("2d")
            if (!ctx) continue

            ctx.drawImage(
                canvas,
                0, page * canvasPageHeightPx,       // source x, y
                canvas.width, pageCanvas.height,      // source w, h
                0, 0,                                  // dest x, y
                pageCanvas.width, pageCanvas.height    // dest w, h
            )

            const pageImgData = pageCanvas.toDataURL("image/jpeg", 0.95)
            const thisPageHeightMm = (pageCanvas.height * pageWidth) / pageCanvas.width

            pdf.addImage(pageImgData, "JPEG", 0, 0, imgWidthMm, thisPageHeightMm)
        }

        pdf.save(`${filename}.pdf`)
    } finally {
        // Restore hidden state
        container.style.cssText = originalStyle
    }
}
