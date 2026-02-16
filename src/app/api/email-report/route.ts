import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

export async function POST(request: Request) {
    try {
        const { to, subject, html, pdfBase64, filename } = await request.json()

        if (!to || !subject) {
            return NextResponse.json({ error: "Missing 'to' or 'subject'" }, { status: 400 })
        }

        // Check SMTP config
        const host = process.env.SMTP_HOST
        const port = parseInt(process.env.SMTP_PORT || "587", 10)
        const user = process.env.SMTP_USER
        const pass = process.env.SMTP_PASS
        const fromAddr = process.env.SMTP_FROM || user

        if (!host || !user || !pass) {
            return NextResponse.json(
                { error: "Email not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in your environment variables. See docs/EMAIL_SETUP.md for instructions." },
                { status: 503 }
            )
        }

        const transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
        })

        const mailOptions: nodemailer.SendMailOptions = {
            from: fromAddr,
            to,
            subject,
            html: html || `<p>Your SEO audit report is attached.</p>`,
        }

        // Attach PDF if provided
        if (pdfBase64 && filename) {
            mailOptions.attachments = [
                {
                    filename: filename || "seo-report.pdf",
                    content: Buffer.from(pdfBase64, "base64"),
                    contentType: "application/pdf",
                },
            ]
        }

        await transporter.sendMail(mailOptions)

        return NextResponse.json({ success: true, message: `Report sent to ${to}` })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to send email"
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
