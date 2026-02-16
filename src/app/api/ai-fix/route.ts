import { NextResponse } from "next/server"

export async function POST(request: Request) {
    try {
        const { title, description, recommendation, codeSnippet, severity } = await request.json()

        // Check for API key
        const apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY
        if (!apiKey) {
            // Return a smart template-based suggestion when no API key is configured
            return NextResponse.json({
                fix: generateTemplateFix(title, description, recommendation, codeSnippet, severity),
                source: "template",
            })
        }

        // Call OpenAI if key starts with sk-
        if (apiKey.startsWith("sk-")) {
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    max_tokens: 300,
                    messages: [
                        {
                            role: "system",
                            content: "You are an SEO expert. Given an SEO audit issue, provide a SPECIFIC, actionable fix. Include exact code when applicable. Be concise (under 200 words). Format as markdown.",
                        },
                        {
                            role: "user",
                            content: `Issue: ${title}\nSeverity: ${severity || "unknown"}\nDescription: ${description}\n${recommendation ? `Recommendation: ${recommendation}` : ""}${codeSnippet ? `\nCurrent code:\n\`\`\`\n${codeSnippet}\n\`\`\`` : ""}`,
                        },
                    ],
                }),
            })

            if (!res.ok) {
                throw new Error(`OpenAI API error: ${res.status}`)
            }

            const data = await res.json()
            return NextResponse.json({
                fix: data.choices?.[0]?.message?.content || "Unable to generate suggestion.",
                source: "openai",
                tokensUsed: data.usage?.total_tokens || 0,
            })
        }

        // Gemini path
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: `You are an SEO expert. Given this SEO audit issue, provide a SPECIFIC, actionable fix. Include exact code when applicable. Be concise (under 200 words). Format as markdown.\n\nIssue: ${title}\nSeverity: ${severity || "unknown"}\nDescription: ${description}\n${recommendation ? `Recommendation: ${recommendation}` : ""}${codeSnippet ? `\nCurrent code:\n\`\`\`\n${codeSnippet}\n\`\`\`` : ""}`,
                                },
                            ],
                        },
                    ],
                    generationConfig: { maxOutputTokens: 300 },
                }),
            }
        )

        if (!res.ok) {
            throw new Error(`Gemini API error: ${res.status}`)
        }

        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to generate suggestion."
        return NextResponse.json({
            fix: text,
            source: "gemini",
            tokensUsed: data.usageMetadata?.totalTokenCount || 0,
        })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "AI fix generation failed"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

// ============================================================
// Template-based fallback when no LLM API key is configured
// ============================================================
function generateTemplateFix(
    title: string,
    description: string,
    recommendation: string | undefined,
    codeSnippet: string | undefined,
    severity: string | undefined
): string {
    const t = title.toLowerCase()
    let fix = ""

    if (t.includes("meta description")) {
        fix = `### Fix: Add/Optimize Meta Description\n\nAdd this to your \`<head>\`:\n\n\`\`\`html\n<meta name="description" content="Your compelling 150-160 character description here">\n\`\`\`\n\n**Tips:**\n- Keep it 150-160 characters\n- Include your primary keyword\n- Make it action-oriented`
    } else if (t.includes("title")) {
        fix = `### Fix: Optimize Page Title\n\nUpdate your \`<title>\` tag:\n\n\`\`\`html\n<title>Primary Keyword - Secondary Keyword | Brand Name</title>\n\`\`\`\n\n**Tips:**\n- Keep under 60 characters\n- Put primary keyword first\n- Include brand name`
    } else if (t.includes("alt") && t.includes("image")) {
        fix = `### Fix: Add Alt Text to Images\n\nUpdate all \`<img>\` tags:\n\n\`\`\`html\n<img src="photo.jpg" alt="Descriptive text about the image" />\n\`\`\`\n\n**Tips:**\n- Be descriptive but concise\n- Include keywords naturally\n- Don't start with "Image of..."`
    } else if (t.includes("heading") || t.includes("h1")) {
        fix = `### Fix: Heading Structure\n\nEnsure proper heading hierarchy:\n\n\`\`\`html\n<h1>Main Page Title (one per page)</h1>\n<h2>Section Title</h2>\n<h3>Subsection Title</h3>\n\`\`\`\n\n**Tips:**\n- Only one \`<h1>\` per page\n- Don't skip levels (h1 → h3)\n- Include keywords in h1`
    } else if (t.includes("schema") || t.includes("structured data")) {
        fix = `### Fix: Add Structured Data\n\nAdd JSON-LD to your \`<head>\`:\n\n\`\`\`html\n<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "WebPage",\n  "name": "Page Title",\n  "description": "Page description"\n}\n</script>\n\`\`\``
    } else if (t.includes("https") || t.includes("ssl") || t.includes("security")) {
        fix = `### Fix: Security Headers\n\nAdd these headers to your server configuration:\n\n\`\`\`\nStrict-Transport-Security: max-age=31536000; includeSubDomains\nX-Content-Type-Options: nosniff\nX-Frame-Options: DENY\nContent-Security-Policy: default-src 'self'\n\`\`\``
    } else if (recommendation) {
        fix = `### Suggested Fix\n\n${recommendation}\n\n${codeSnippet ? `**Current code:**\n\`\`\`\n${codeSnippet}\n\`\`\`\n\nReview and update the code above based on the recommendation.` : ""}`
    } else {
        fix = `### ${severity === "critical" ? "🔴 Critical" : severity === "major" ? "🟠 Major" : "🔵"} Fix Required\n\n**Issue:** ${description}\n\nPlease review this issue and apply the recommended best practices. ${recommendation || "Check the issue details for specific guidance."}`
    }

    return fix
}
