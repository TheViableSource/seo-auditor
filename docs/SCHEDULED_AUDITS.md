# Scheduled Recurring Audits — Plesk Setup Guide

Set up automatic recurring SEO audits on your Plesk server using cron jobs.

---

## 1. How It Works

The app provides a cron API endpoint at `/api/cron/audit` that:
1. Accepts a list of site URLs via query parameter
2. Runs a full SEO audit on each site
3. Returns the scores and any errors

You schedule a Plesk cron job to call this endpoint at your desired frequency (weekly, monthly, etc.).

---

## 2. Set Your Cron Secret

### In Plesk:
1. Go to **Websites & Domains** → your domain → **Node.js**
2. Add environment variable:
   - `CRON_SECRET` = `a-secure-random-string-here`
3. Save and restart the app

> **Tip:** Generate a random secret: `openssl rand -hex 32`

---

## 3. Configure the Cron Job in Plesk

1. Go to **Tools & Settings** → **Scheduled Tasks (Cron Jobs)**
   - Or: **Websites & Domains** → **Scheduled Tasks**
2. Click **Add Task** or **Schedule a Task**
3. Set the command:

### Weekly Audit (every Monday at 3 AM):
```
0 3 * * 1 /usr/bin/curl -s "https://yourdomain.com/api/cron/audit?secret=YOUR_CRON_SECRET&sites=https://site1.com,https://site2.com" > /dev/null 2>&1
```

### Monthly Audit (1st of each month at 3 AM):
```
0 3 1 * * /usr/bin/curl -s "https://yourdomain.com/api/cron/audit?secret=YOUR_CRON_SECRET&sites=https://site1.com,https://site2.com" > /dev/null 2>&1
```

### Daily Audit (every day at 2 AM):
```
0 2 * * * /usr/bin/curl -s "https://yourdomain.com/api/cron/audit?secret=YOUR_CRON_SECRET&sites=https://site1.com" > /dev/null 2>&1
```

4. Click **OK** or **Save**

---

## 4. Testing

Test manually by running:

```bash
curl "https://yourdomain.com/api/cron/audit?secret=YOUR_CRON_SECRET&sites=https://example.com"
```

Expected response:
```json
{
  "ok": true,
  "audited": 1,
  "results": [
    { "url": "https://example.com", "score": 72 }
  ],
  "timestamp": "2026-02-16T08:00:00.000Z"
}
```

---

## 5. Adding Email Notifications

Combine with the email API to get results sent to your inbox. Create a small script:

```bash
#!/bin/bash
# /home/user/cron-audit.sh

DOMAIN="https://yourdomain.com"
SECRET="YOUR_CRON_SECRET"
SITES="https://site1.com,https://site2.com"

# Run audit
RESULT=$(curl -s "$DOMAIN/api/cron/audit?secret=$SECRET&sites=$SITES")

# Email the results (after SMTP is configured)
curl -s -X POST "$DOMAIN/api/email-report" \
  -H "Content-Type: application/json" \
  -d "{\"to\": \"your@email.com\", \"subject\": \"Weekly SEO Audit Results\", \"html\": \"<pre>$RESULT</pre>\"}"
```

Then schedule the script:
```
0 3 * * 1 /bin/bash /home/user/cron-audit.sh > /dev/null 2>&1
```

---

## 6. Cron Expression Reference

| Pattern | Schedule |
|---------|----------|
| `0 3 * * 1` | Weekly, Monday 3 AM |
| `0 3 1 * *` | Monthly, 1st at 3 AM |
| `0 2 * * *` | Daily at 2 AM |
| `0 */6 * * *` | Every 6 hours |
| `0 3 1,15 * *` | Bi-monthly (1st & 15th) |

---

## 7. Client-Side Scheduling

The Sites page also has a per-site schedule dropdown (Manual / Weekly / Monthly). This is client-side only and works when the app is open in the browser. For true server-side scheduling, use the Plesk cron approach above.
