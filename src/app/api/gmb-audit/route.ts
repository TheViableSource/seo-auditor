import { NextRequest, NextResponse } from "next/server"

// ============================================================
// GMB / LOCAL SEO AUDIT API
// ============================================================
// Analyzes a website for Google My Business and local SEO signals.
// Checks for: NAP consistency, LocalBusiness schema, Google Maps embed,
// reviews markup, local keywords, geo-content, and more.
// ============================================================

interface GmbCheck {
    id: string
    category: "nap" | "schema" | "content" | "technical" | "reviews"
    title: string
    description: string
    status: "pass" | "fail" | "warning"
    impact: "critical" | "major" | "minor"
    recommendation?: string
}

export async function POST(request: NextRequest) {
    try {
        const { url, businessName, businessAddress, businessPhone } = await request.json()

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 })
        }

        // Fetch the page HTML
        let html = ""
        let fetchError = ""
        try {
            const res = await fetch(url, {
                headers: { "User-Agent": "AuditorPro GMB Checker/1.0" },
                signal: AbortSignal.timeout(15000),
            })
            html = await res.text()
        } catch (e) {
            fetchError = String(e)
        }

        if (!html && fetchError) {
            return NextResponse.json({ error: `Could not fetch URL: ${fetchError}` }, { status: 400 })
        }

        const htmlLower = html.toLowerCase()
        const checks: GmbCheck[] = []

        // ── NAP (Name, Address, Phone) Checks ──
        if (businessName) {
            checks.push({
                id: "nap-name",
                category: "nap",
                title: "Business Name on Page",
                description: "Your business name should appear on the homepage for NAP consistency.",
                status: htmlLower.includes(businessName.toLowerCase()) ? "pass" : "fail",
                impact: "critical",
                recommendation: `Ensure "${businessName}" appears on the page, ideally in the header, footer, and contact section.`,
            })
        }

        if (businessAddress) {
            const addrParts = businessAddress.toLowerCase().split(",").map((p: string) => p.trim()).filter(Boolean)
            const found = addrParts.some((part: string) => htmlLower.includes(part))
            checks.push({
                id: "nap-address",
                category: "nap",
                title: "Business Address on Page",
                description: "Your physical address should be visible for local SEO signals.",
                status: found ? "pass" : "fail",
                impact: "critical",
                recommendation: `Include your full address "${businessAddress}" on the page, preferably in a <footer> or contact section.`,
            })
        }

        if (businessPhone) {
            const phoneCleaned = businessPhone.replace(/\D/g, "")
            const phoneOnPage = html.replace(/\D/g, "").includes(phoneCleaned)
            checks.push({
                id: "nap-phone",
                category: "nap",
                title: "Phone Number on Page",
                description: "A clickable phone number improves local conversions.",
                status: phoneOnPage ? "pass" : "fail",
                impact: "major",
                recommendation: `Add your phone number as a clickable tel: link — <a href="tel:${businessPhone}">${businessPhone}</a>`,
            })
        }

        // ── Schema Markup Checks ──
        const hasLocalBusinessSchema = htmlLower.includes("localbusiness") || htmlLower.includes("store") || htmlLower.includes("restaurant")
        checks.push({
            id: "schema-localbusiness",
            category: "schema",
            title: "LocalBusiness Schema Markup",
            description: "Structured data helps Google understand your business type, location, and hours.",
            status: hasLocalBusinessSchema ? "pass" : "fail",
            impact: "critical",
            recommendation: "Add LocalBusiness JSON-LD schema with name, address, phone, hours, and geo coordinates. Use the Schema Generator tool.",
        })

        const hasGeoCoords = htmlLower.includes("geocoordinates") || htmlLower.includes('"latitude"') || htmlLower.includes('"longitude"')
        checks.push({
            id: "schema-geo",
            category: "schema",
            title: "Geo Coordinates in Schema",
            description: "Including latitude/longitude in your schema helps Google pinpoint your location.",
            status: hasGeoCoords ? "pass" : "warning",
            impact: "major",
            recommendation: 'Add "geo": {"@type": "GeoCoordinates", "latitude": XX, "longitude": XX} to your LocalBusiness schema.',
        })

        const hasOpeningHours = htmlLower.includes("openinghours") || htmlLower.includes("openinghoursspecification")
        checks.push({
            id: "schema-hours",
            category: "schema",
            title: "Business Hours in Schema",
            description: "Including opening hours helps Google display your hours in search results.",
            status: hasOpeningHours ? "pass" : "warning",
            impact: "major",
            recommendation: 'Add "openingHoursSpecification" to your LocalBusiness schema with days and hours.',
        })

        const hasReviewSchema = htmlLower.includes("aggregaterating") || htmlLower.includes("review")
        checks.push({
            id: "schema-reviews",
            category: "schema",
            title: "Review/Rating Schema",
            description: "Review markup enables star ratings in search results.",
            status: hasReviewSchema ? "pass" : "warning",
            impact: "major",
            recommendation: 'Add "aggregateRating" to your schema with ratingValue, reviewCount, and bestRating.',
        })

        // ── Content Checks ──
        const hasMapEmbed = htmlLower.includes("google.com/maps") || htmlLower.includes("maps.googleapis") || htmlLower.includes("iframe") && htmlLower.includes("map")
        checks.push({
            id: "content-map",
            category: "content",
            title: "Google Maps Embed",
            description: "An embedded map helps users find your location and signals local relevance.",
            status: hasMapEmbed ? "pass" : "fail",
            impact: "major",
            recommendation: "Embed a Google Maps iframe on your contact or location page showing your business address.",
        })

        const hasDirections = htmlLower.includes("direction") || htmlLower.includes("get directions") || htmlLower.includes("maps.google")
        checks.push({
            id: "content-directions",
            category: "content",
            title: "Directions Link",
            description: "A \"Get Directions\" link improves user experience for local visitors.",
            status: hasDirections ? "pass" : "warning",
            impact: "minor",
            recommendation: 'Add a "Get Directions" link pointing to your Google Maps listing.',
        })

        const hasLocalKeywords = htmlLower.includes("near me") || htmlLower.includes("local") || htmlLower.includes("nearby")
        checks.push({
            id: "content-local-keywords",
            category: "content",
            title: "Local Keywords",
            description: 'Using local keywords like "near me" or city names improves local rankings.',
            status: hasLocalKeywords ? "pass" : "warning",
            impact: "major",
            recommendation: "Include city, neighborhood, and 'near me' keywords naturally in your content and meta descriptions.",
        })

        const hasServiceArea = htmlLower.includes("service area") || htmlLower.includes("we serve") || htmlLower.includes("serving")
        checks.push({
            id: "content-service-area",
            category: "content",
            title: "Service Area Mentions",
            description: "Mentioning your service area helps Google understand your geographic coverage.",
            status: hasServiceArea ? "pass" : "warning",
            impact: "minor",
            recommendation: "Add a section or page listing the cities, neighborhoods, or regions you serve.",
        })

        // ── Technical Checks ──
        const hasHttps = url.startsWith("https")
        checks.push({
            id: "tech-https",
            category: "technical",
            title: "HTTPS Enabled",
            description: "HTTPS is a ranking factor and builds trust with local searchers.",
            status: hasHttps ? "pass" : "fail",
            impact: "critical",
            recommendation: "Migrate to HTTPS. Get an SSL certificate from your hosting provider or use Let's Encrypt.",
        })

        const hasMobileViewport = htmlLower.includes('viewport') && htmlLower.includes('width=device-width')
        checks.push({
            id: "tech-mobile",
            category: "technical",
            title: "Mobile-Friendly Viewport",
            description: "Over 60% of local searches happen on mobile. Your site must be mobile-responsive.",
            status: hasMobileViewport ? "pass" : "fail",
            impact: "critical",
            recommendation: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> to your <head>.",
        })

        const hasClickToCall = htmlLower.includes("tel:") || htmlLower.includes("href=\"tel")
        checks.push({
            id: "tech-click-to-call",
            category: "technical",
            title: "Click-to-Call Link",
            description: "Mobile users should be able to call your business with one tap.",
            status: hasClickToCall ? "pass" : "fail",
            impact: "major",
            recommendation: "Add clickable phone links: <a href=\"tel:+15551234567\">Call Us</a>",
        })

        // ── Reviews Section Checks ──
        const hasTestimonials = htmlLower.includes("testimonial") || htmlLower.includes("review") || htmlLower.includes("customer said") || htmlLower.includes("★")
        checks.push({
            id: "reviews-display",
            category: "reviews",
            title: "Customer Reviews/Testimonials",
            description: "Displaying customer reviews builds trust and provides fresh, keyword-rich content.",
            status: hasTestimonials ? "pass" : "fail",
            impact: "major",
            recommendation: "Add a reviews/testimonials section. Display Google Reviews on your site using a widget or embed.",
        })

        const hasGmbLink = htmlLower.includes("google.com/maps/place") || htmlLower.includes("g.page") || htmlLower.includes("google business")
        checks.push({
            id: "reviews-gmb-link",
            category: "reviews",
            title: "Google Business Profile Link",
            description: "Linking to your Google Business Profile encourages reviews and validates your listing.",
            status: hasGmbLink ? "pass" : "warning",
            impact: "major",
            recommendation: 'Add a "Leave us a Google Review" link pointing to your Google Business Profile.',
        })

        // ── Calculate Scores ──
        const totalChecks = checks.length
        const passed = checks.filter((c) => c.status === "pass").length
        const warnings = checks.filter((c) => c.status === "warning").length
        const failed = checks.filter((c) => c.status === "fail").length
        const score = Math.round(((passed + warnings * 0.5) / totalChecks) * 100)

        // Category scores
        const categories = ["nap", "schema", "content", "technical", "reviews"] as const
        const categoryScores = Object.fromEntries(
            categories.map((cat) => {
                const catChecks = checks.filter((c) => c.category === cat)
                if (catChecks.length === 0) return [cat, 0]
                const catPassed = catChecks.filter((c) => c.status === "pass").length
                const catWarnings = catChecks.filter((c) => c.status === "warning").length
                return [cat, Math.round(((catPassed + catWarnings * 0.5) / catChecks.length) * 100)]
            })
        )

        return NextResponse.json({
            score,
            totalChecks,
            passed,
            warnings,
            failed,
            checks,
            categoryScores,
            url,
        })
    } catch (error) {
        console.error("GMB audit error:", error)
        return NextResponse.json({ error: "GMB audit failed" }, { status: 500 })
    }
}
