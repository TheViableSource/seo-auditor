import { NextResponse } from "next/server"
import { google } from "googleapis"
import { getAuthenticatedClient, isGoogleConnected } from "@/lib/google-auth"

/**
 * POST /api/gmb/insights
 *
 * Fetches Google Business Profile data.
 * Body: { locationId?: string }
 *
 * If no locationId, returns available accounts and locations.
 * If locationId given, returns profile data and reviews.
 */
export async function POST(request: Request) {
    if (!isGoogleConnected()) {
        return NextResponse.json(
            { error: "Google account is not connected" },
            { status: 401 }
        )
    }

    try {
        const body = await request.json()
        const { locationId } = body

        const auth = await getAuthenticatedClient()
        if (!auth) {
            return NextResponse.json(
                { error: "Authentication expired. Please reconnect Google." },
                { status: 401 }
            )
        }

        const mybusiness = google.mybusinessbusinessinformation({
            version: "v1",
            auth,
        })

        // If no locationId, list available accounts & locations
        if (!locationId) {
            const accountMgmt = google.mybusinessaccountmanagement({
                version: "v1",
                auth,
            })

            const accountsRes = await accountMgmt.accounts.list()
            const accounts = accountsRes.data.accounts || []

            const locations: {
                id: string
                name: string
                address: string
                account: string
                phone?: string
                website?: string
            }[] = []

            for (const acct of accounts) {
                if (!acct.name) continue
                try {
                    const locsRes = await mybusiness.accounts.locations.list({
                        parent: acct.name,
                        readMask: "name,title,storefrontAddress,phoneNumbers,websiteUri",
                    })
                    for (const loc of locsRes.data.locations || []) {
                        const addr = loc.storefrontAddress
                        const addressParts = [
                            ...(addr?.addressLines || []),
                            addr?.locality,
                            addr?.administrativeArea,
                            addr?.postalCode,
                        ].filter(Boolean)

                        locations.push({
                            id: loc.name || "",
                            name: loc.title || "",
                            address: addressParts.join(", "),
                            account: acct.accountName || acct.name || "",
                            phone: loc.phoneNumbers?.primaryPhone ?? undefined,
                            website: loc.websiteUri ?? undefined,
                        })
                    }
                } catch {
                    // May not have access to this account's locations
                }
            }

            return NextResponse.json({ accounts: accounts.length, locations })
        }

        // Fetch location details
        const locationRes = await mybusiness.locations.get({
            name: locationId,
            readMask:
                "name,title,storefrontAddress,phoneNumbers,websiteUri,regularHours,categories,profile,metadata",
        })

        const loc = locationRes.data
        const addr = loc.storefrontAddress
        const addressParts = [
            ...(addr?.addressLines || []),
            addr?.locality,
            addr?.administrativeArea,
            addr?.postalCode,
        ].filter(Boolean)

        // Fetch reviews
        let reviews: {
            reviewer: string
            rating: number
            comment: string
            createTime: string
            replyText?: string
        }[] = []

        try {
            // The mybusinessreviews API isn't fully typed in googleapis,
            // so we use a direct REST call with the auth token.
            const accessToken = (await auth.getAccessToken())?.token
            if (accessToken) {
                const reviewsRes = await fetch(
                    `https://mybusiness.googleapis.com/v4/${locationId}/reviews?pageSize=20`,
                    {
                        headers: { Authorization: `Bearer ${accessToken}` },
                    }
                )
                if (reviewsRes.ok) {
                    const reviewsData = await reviewsRes.json()
                    reviews = (reviewsData.reviews || []).map((r: Record<string, unknown>) => {
                        const reviewer = r.reviewer as Record<string, string> | undefined
                        const reply = r.reviewReply as Record<string, string> | undefined
                        const ratingMap: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }
                        return {
                            reviewer: reviewer?.displayName || "Anonymous",
                            rating: ratingMap[r.starRating as string] || 0,
                            comment: (r.comment as string) || "",
                            createTime: (r.createTime as string) || "",
                            replyText: reply?.comment,
                        }
                    })
                }
            }
        } catch {
            // Reviews API might not be available
        }

        const profile = {
            name: loc.title || "",
            address: addressParts.join(", "),
            phone: loc.phoneNumbers?.primaryPhone || "",
            website: loc.websiteUri || "",
            category: loc.categories?.primaryCategory?.displayName || "",
            additionalCategories: (loc.categories?.additionalCategories || []).map(
                (c) => c.displayName || ""
            ),
            description: loc.profile?.description || "",
            hasHours: Boolean(loc.regularHours?.periods?.length),
            mapsUrl: loc.metadata?.mapsUri || "",
            placeId: loc.metadata?.placeId || "",
        }

        // Calculate review stats
        const totalReviews = reviews.length
        const avgRating =
            totalReviews > 0
                ? reviews.reduce((s, r) => s + r.rating, 0) / totalReviews
                : 0
        const unansweredReviews = reviews.filter((r) => !r.replyText).length

        return NextResponse.json({
            profile,
            reviews,
            stats: {
                totalReviews,
                avgRating: Math.round(avgRating * 10) / 10,
                unansweredReviews,
            },
            source: "gmb",
        })
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to fetch Business Profile data"

        if (
            message.includes("invalid_grant") ||
            message.includes("Token has been expired")
        ) {
            return NextResponse.json(
                {
                    error: "Google authorization expired. Please reconnect in Settings.",
                },
                { status: 401 }
            )
        }

        if (
            message.includes("not enabled") ||
            message.includes("PERMISSION_DENIED")
        ) {
            return NextResponse.json(
                {
                    error: "Google Business Profile API access is not enabled or you lack permissions.",
                },
                { status: 403 }
            )
        }

        return NextResponse.json({ error: message }, { status: 500 })
    }
}
