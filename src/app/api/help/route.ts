import { NextRequest, NextResponse } from "next/server"

// ============================================================
// HELP DESK API
// ============================================================
// Sends support ticket emails to the team.
// Configure SMTP_* env vars to enable real email delivery.
// For now, logs tickets and returns success.
// ============================================================

export async function POST(request: NextRequest) {
    try {
        const { name, email, subject, message, category } = await request.json()

        if (!email || !subject || !message) {
            return NextResponse.json(
                { error: "Email, subject, and message are required" },
                { status: 400 }
            )
        }

        // TODO: Replace with actual email sending
        // const nodemailer = require("nodemailer")
        // const transporter = nodemailer.createTransport({
        //     host: process.env.SMTP_HOST,
        //     port: Number(process.env.SMTP_PORT || 587),
        //     auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        // })
        //
        // await transporter.sendMail({
        //     from: process.env.SMTP_FROM || "noreply@auditorpro.app",
        //     to: process.env.SUPPORT_EMAIL || "support@auditorpro.app",
        //     subject: `[Help Desk] ${category ? `[${category}] ` : ""}${subject}`,
        //     html: `
        //         <h3>New Support Ticket</h3>
        //         <p><strong>From:</strong> ${name || "Unknown"} (${email})</p>
        //         <p><strong>Category:</strong> ${category || "General"}</p>
        //         <p><strong>Subject:</strong> ${subject}</p>
        //         <hr/>
        //         <p>${message.replace(/\n/g, "<br/>")}</p>
        //     `,
        // })

        console.log("📧 Help desk ticket:", { name, email, subject, category, message: message.slice(0, 100) })

        return NextResponse.json({
            success: true,
            ticketId: `TKT-${Date.now().toString(36).toUpperCase()}`,
            message: "Your support ticket has been submitted. We'll get back to you shortly.",
        })
    } catch (error) {
        console.error("Help desk error:", error)
        return NextResponse.json(
            { error: "Failed to submit ticket" },
            { status: 500 }
        )
    }
}
