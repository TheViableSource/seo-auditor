import { NextRequest, NextResponse } from "next/server"

// ============================================================
// STRIPE PAYMENT INTEGRATION SCAFFOLD
// ============================================================
// This is a scaffold for Stripe payment integration.
// To activate:
// 1. Install stripe: npm install stripe
// 2. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in .env.local
// 3. Uncomment the Stripe initialization below
// ============================================================

// import Stripe from "stripe"
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" })

const TIER_PRICES: Record<string, { name: string; price: number; features: string[] }> = {
    free: { name: "Free", price: 0, features: ["5 site audits/month", "Basic reports", "1 site"] },
    pro: { name: "Pro", price: 29, features: ["Unlimited audits", "PDF reports", "10 sites", "AI Fixes", "Competitor analysis"] },
    agency: { name: "Agency", price: 99, features: ["Everything in Pro", "Unlimited sites", "White-label reports", "Priority support", "API access"] },
}

// POST /api/stripe — Create Checkout Session
export async function POST(request: NextRequest) {
    try {
        const { tier, successUrl, cancelUrl } = await request.json()

        if (!tier || !TIER_PRICES[tier]) {
            return NextResponse.json({ error: "Invalid tier" }, { status: 400 })
        }

        const plan = TIER_PRICES[tier]

        if (plan.price === 0) {
            return NextResponse.json({ error: "Free tier does not require payment" }, { status: 400 })
        }

        // TODO: Uncomment when Stripe is configured
        // const session = await stripe.checkout.sessions.create({
        //     payment_method_types: ["card"],
        //     line_items: [
        //         {
        //             price_data: {
        //                 currency: "usd",
        //                 product_data: { name: `AuditorPro ${plan.name}` },
        //                 unit_amount: plan.price * 100,
        //                 recurring: { interval: "month" },
        //             },
        //             quantity: 1,
        //         },
        //     ],
        //     mode: "subscription",
        //     success_url: successUrl || `${request.nextUrl.origin}/settings?payment=success`,
        //     cancel_url: cancelUrl || `${request.nextUrl.origin}/settings?payment=cancelled`,
        // })
        // return NextResponse.json({ sessionId: session.id, url: session.url })

        // Scaffold response until Stripe is configured
        return NextResponse.json({
            message: "Stripe not yet configured. Set STRIPE_SECRET_KEY in .env.local to activate payments.",
            tier,
            plan,
            configRequired: true,
        })
    } catch (error) {
        console.error("Stripe error:", error)
        return NextResponse.json(
            { error: "Payment processing failed" },
            { status: 500 }
        )
    }
}

// GET /api/stripe — Get available plans
export async function GET() {
    return NextResponse.json({ plans: TIER_PRICES })
}
