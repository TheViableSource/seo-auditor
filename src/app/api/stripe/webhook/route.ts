import { NextRequest, NextResponse } from "next/server"

// ============================================================
// STRIPE WEBHOOK HANDLER
// ============================================================
// Handles Stripe webhook events for payment completion.
// To activate:
// 1. Set STRIPE_WEBHOOK_SECRET in .env.local
// 2. Configure webhook endpoint in Stripe Dashboard
// ============================================================

// import Stripe from "stripe"
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" })

export async function POST(request: NextRequest) {
    try {
        const body = await request.text()
        const sig = request.headers.get("stripe-signature")

        if (!sig) {
            return NextResponse.json({ error: "Missing signature" }, { status: 400 })
        }

        // TODO: Uncomment when Stripe is configured
        // const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
        // const event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
        //
        // switch (event.type) {
        //     case "checkout.session.completed": {
        //         const session = event.data.object
        //         // Update user's tier in database
        //         console.log("Payment completed:", session.id)
        //         break
        //     }
        //     case "customer.subscription.deleted": {
        //         const subscription = event.data.object
        //         // Downgrade user to free tier
        //         console.log("Subscription cancelled:", subscription.id)
        //         break
        //     }
        //     case "invoice.payment_failed": {
        //         const invoice = event.data.object
        //         // Notify user of failed payment
        //         console.log("Payment failed:", invoice.id)
        //         break
        //     }
        // }

        // Scaffold response
        return NextResponse.json({
            received: true,
            message: "Webhook scaffold — configure STRIPE_WEBHOOK_SECRET to process events",
        })
    } catch (error) {
        console.error("Webhook error:", error)
        return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
    }
}
