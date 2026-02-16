# Email Report Delivery — SMTP Setup Guide

This guide walks you through configuring email delivery for AuditorPro on your Plesk server.

---

## 1. Choose Your Email Provider

| Provider | Best For | Pricing |
|----------|----------|---------|
| **Your domain SMTP** | Custom domain emails (e.g., `reports@yourdomain.com`) | Free (with hosting) |
| **Gmail SMTP** | Quick testing | Free (500/day limit) |
| **SendGrid** | Production volume | Free tier: 100/day |
| **Amazon SES** | High volume, low cost | $0.10 per 1,000 emails |
| **Resend** | Developer-friendly | Free tier: 3,000/month |

---

## 2. Environment Variables

Add these to your `.env.local` file (development) or your Plesk environment configuration (production):

```env
# SMTP Configuration
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_USER=reports@yourdomain.com
SMTP_PASS=your-email-password
SMTP_FROM=reports@yourdomain.com
```

### Provider-Specific Settings

#### Your Domain (Plesk)
```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_USER=reports@yourdomain.com
SMTP_PASS=your-mailbox-password
SMTP_FROM="AuditorPro Reports <reports@yourdomain.com>"
```

#### Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
```
> **Note:** Use a [Gmail App Password](https://support.google.com/accounts/answer/185833), not your regular password. Enable 2FA first.

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.your-api-key-here
SMTP_FROM=reports@yourdomain.com
```

#### Amazon SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
SMTP_FROM=reports@yourdomain.com
```

---

## 3. Install Nodemailer

If not already installed:

```bash
npm install nodemailer
npm install -D @types/nodemailer
```

---

## 4. Plesk Production Setup

### Setting Environment Variables in Plesk

1. Log in to Plesk → **Websites & Domains** → select your domain
2. Go to **Node.js** settings
3. Find the **Environment Variables** section
4. Add each variable:
   - `SMTP_HOST` = `mail.yourdomain.com`
   - `SMTP_PORT` = `587`
   - `SMTP_USER` = `reports@yourdomain.com`
   - `SMTP_PASS` = `your-password`
   - `SMTP_FROM` = `AuditorPro Reports <reports@yourdomain.com>`
5. Click **Save** and restart the Node.js application

### Creating a Mail Account in Plesk

1. Go to **Mail** → **Create Email Address**
2. Set up `reports@yourdomain.com` with a strong password
3. Use this address as your `SMTP_USER`

---

## 5. Testing

After configuring, test with this curl command:

```bash
curl -X POST http://localhost:3000/api/email-report \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com", "subject": "Test Report"}'
```

A successful response looks like:
```json
{"success": true, "message": "Report sent to test@example.com"}
```

If email is not configured yet, you'll see:
```json
{"error": "Email not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in your environment variables."}
```

---

## 6. API Reference

### `POST /api/email-report`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | ✅ | Recipient email address |
| `subject` | string | ✅ | Email subject line |
| `html` | string | ❌ | Custom HTML body (defaults to "Your SEO audit report is attached.") |
| `pdfBase64` | string | ❌ | Base64-encoded PDF file |
| `filename` | string | ❌ | PDF filename (defaults to "seo-report.pdf") |

### Example: Send audit PDF

```javascript
// Generate PDF, then send
const pdfBlob = pdf.output("arraybuffer")
const pdfBase64 = Buffer.from(pdfBlob).toString("base64")

await fetch("/api/email-report", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    to: "client@example.com",
    subject: "SEO Audit Report — example.com",
    html: `<h2>Your SEO Audit Report</h2><p>Score: 85/100</p><p>See the attached PDF for full details.</p>`,
    pdfBase64,
    filename: "seo-audit-example-com.pdf",
  }),
})
```

---

## 7. Troubleshooting

| Issue | Solution |
|-------|----------|
| "Email not configured" | Set all 3 required env vars: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` |
| Connection timeout | Check your SMTP port (587 for STARTTLS, 465 for SSL) |
| Authentication failed | Verify credentials; use App Password for Gmail |
| Emails going to spam | Set up SPF, DKIM, and DMARC for your domain |
| "Self-signed certificate" | Add `tls: { rejectUnauthorized: false }` to transporter config |

### DNS Records for Deliverability

Add these DNS records in Plesk → **DNS Settings**:

```
# SPF Record
TXT  @  v=spf1 a mx include:_spf.yourdomain.com ~all

# DKIM (generate via Plesk Mail → DKIM)
# DMARC
TXT  _dmarc  v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
```
