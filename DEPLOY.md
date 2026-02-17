# Deploying SEO Auditor to Plesk

**Target:** `seo.theviablesource.com`  
**Stack:** Next.js 16 · PostgreSQL · Node.js  
**Repo:** `https://github.com/TheViableSource/seo-auditor.git`

---

## Phase 1 — Server Prerequisites

### 1.1 SSH into your server

```bash
ssh root@YOUR_SERVER_IP
```

### 1.2 Verify Node.js is installed

```bash
node -v    # Should be 18+ (20+ recommended)
npm -v
```

If outdated:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 1.3 Verify PostgreSQL is running

```bash
sudo systemctl status postgresql
```

If not running:
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

---

## Phase 2 — PostgreSQL Database

### 2.1 Create database and user

```bash
sudo -u postgres psql
```

Inside the PostgreSQL console:

```sql
-- Create the database
CREATE DATABASE seo_auditor;

-- Create the user (CHANGE THE PASSWORD!)
CREATE USER seo_user WITH ENCRYPTED PASSWORD 'CHANGE_THIS_TO_A_STRONG_PASSWORD';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE seo_auditor TO seo_user;

-- Connect to the database to grant schema permissions
\c seo_auditor

-- Required for PostgreSQL 15+
GRANT ALL ON SCHEMA public TO seo_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO seo_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO seo_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO seo_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO seo_user;

-- Exit
\q
```

### 2.2 Test the connection

```bash
psql -U seo_user -d seo_auditor -h localhost -W
# Enter your password when prompted
# You should get a psql prompt. Type \q to exit.
```

**Your connection string is:**
```
postgresql://seo_user:YOUR_PASSWORD@localhost:5432/seo_auditor
```

> **Troubleshooting:** If you get "peer authentication failed", edit `pg_hba.conf`:
> ```bash
> sudo nano /etc/postgresql/*/main/pg_hba.conf
> ```
> Change `local all all peer` to `local all all md5`, then restart:
> ```bash
> sudo systemctl restart postgresql
> ```

---

## Phase 3 — Plesk Domain Setup

### 3.1 Add subdomain in Plesk

1. Log into Plesk admin panel
2. Go to **Websites & Domains**
3. Click **Add Subdomain**
4. Enter: `seo.theviablesource.com`
5. Document root: `/httpdocs` (default)
6. Click **OK**

### 3.2 Enable SSL (Let's Encrypt)

1. Click on `seo.theviablesource.com` in Plesk
2. Go to **SSL/TLS Certificates**
3. Click **Install** under "Let's Encrypt"
4. Check **Include www** and **Secure the mail**
5. Click **Get it Free**
6. After issuing, go to **Hosting & DNS** → **Hosting Settings**
7. Enable **Permanent SEO-safe 301 redirect from HTTP to HTTPS**

### 3.3 Enable Node.js

1. Click on `seo.theviablesource.com`
2. Go to **Node.js**
3. Click **Enable Node.js**
4. Set:
   - **Node.js version:** 20.x (or latest LTS)
   - **Application mode:** Production
   - **Application root:** `/httpdocs`
   - **Application startup file:** `server.js` _(we'll create this)_
5. Click **OK** — but don't start it yet

---

## Phase 4 — Deploy the Code

### 4.1 Navigate to document root

```bash
cd /var/www/vhosts/seo.theviablesource.com/httpdocs
```

> If there's a default `index.html`, remove it:
> ```bash
> rm -f index.html
> ```

### 4.2 Clone the repository

```bash
git clone https://github.com/TheViableSource/seo-auditor.git .
```

> **Note:** The `.` at the end clones into the current directory, not a subfolder.

### 4.3 Create the `.env` file

```bash
nano .env
```

Paste the following (edit the values marked with `CHANGE`):

```bash
# Database
DATABASE_URL="postgresql://seo_user:CHANGE_YOUR_DB_PASSWORD@localhost:5432/seo_auditor"

# Auth — generate secret with: openssl rand -base64 32
NEXTAUTH_SECRET="CHANGE_PASTE_GENERATED_SECRET_HERE"
NEXTAUTH_URL="https://seo.theviablesource.com"

# Production
NODE_ENV="production"

# Google OAuth (optional — add later for GSC/GA/GMB integrations)
# GOOGLE_CLIENT_ID=""
# GOOGLE_CLIENT_SECRET=""
```

Save and exit (`Ctrl+X`, `Y`, `Enter`).

**Generate the NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```
Copy the output back into `.env` for `NEXTAUTH_SECRET`.

### 4.4 Install dependencies

```bash
npm ci
```

### 4.5 Push the schema to the database

```bash
npx prisma db push
```

You should see output like:
```
🚀 Your database is now in sync with your Prisma schema.
```

### 4.6 Create the admin account

```bash
ADMIN_PASSWORD='YourChosenPassword123!' npx prisma db seed
```

You should see:
```
✅  Admin created:
    Email:     jeremy@theviablesource.com
    Workspace: The Viable Source (AGENCY)
```

> **Custom email/name:** You can override with:
> ```bash
> ADMIN_EMAIL='you@example.com' ADMIN_NAME='Your Name' ADMIN_PASSWORD='Pass123!' npx prisma db seed
> ```

### 4.7 Build the production app

```bash
npm run build
```

This takes 30–60 seconds. You should see `✓ Compiled successfully` and a list of routes.

### 4.8 Create the startup file

```bash
nano server.js
```

Paste:

```javascript
const { execSync } = require("child_process");

// Start Next.js in production mode
// Plesk manages the PORT via its Node.js handler
const port = process.env.PORT || 3000;

process.env.NODE_ENV = "production";
process.env.HOSTNAME = "0.0.0.0";
process.env.PORT = String(port);

require("./.next/standalone/server.js");
```

Save and exit.

> **Important:** The above approach uses Next.js standalone output. If your `next.config.ts` doesn't have `output: "standalone"`, use this alternative startup file instead:
>
> ```javascript
> const { createServer } = require("http");
> const { parse } = require("url");
> const next = require("next");
>
> const port = parseInt(process.env.PORT || "3000", 10);
> const app = next({ dev: false });
> const handle = app.getRequestHandler();
>
> app.prepare().then(() => {
>   createServer((req, res) => {
>     handle(req, res, parse(req.url, true));
>   }).listen(port, "0.0.0.0", () => {
>     console.log(`> Ready on http://0.0.0.0:${port}`);
>   });
> });
> ```

### 4.9 Test locally on the server

```bash
PORT=3000 node server.js
```

Open `http://YOUR_SERVER_IP:3000` — you should see the login page. Press `Ctrl+C` to stop.

---

## Phase 5 — Plesk Node.js Configuration

### 5.1 Configure in Plesk

1. Go to `seo.theviablesource.com` → **Node.js**
2. Set **Application startup file:** `server.js`
3. Click **NPM Install** (or skip if you already ran `npm ci`)
4. Click **Enable**
5. Click **Restart App**

### 5.2 Set environment variables in Plesk

In the Node.js panel, scroll to **Environment Variables** and add each one:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `postgresql://seo_user:PASSWORD@localhost:5432/seo_auditor` |
| `NEXTAUTH_SECRET` | _(your generated secret)_ |
| `NEXTAUTH_URL` | `https://seo.theviablesource.com` |
| `NODE_ENV` | `production` |

> **Note:** Plesk environment variables override the `.env` file. You can use either method — defining them in Plesk is cleaner for production.

### 5.3 Proxy configuration

Plesk handles the nginx/Apache reverse proxy automatically when Node.js is enabled. Incoming HTTPS traffic on port 443 is forwarded to your Node.js app's port.

If you need a custom nginx directive, go to **Apache & nginx Settings** and add:

```nginx
location / {
    proxy_pass http://127.0.0.1:PORT;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

_(Replace `PORT` with the port Plesk assigned — visible in the Node.js panel.)_

---

## Phase 6 — Verify Deployment

### 6.1 Check the site

1. Open `https://seo.theviablesource.com`
2. You should see the **login page**
3. Sign in with:
   - **Email:** `jeremy@theviablesource.com`
   - **Password:** _(the one you set in step 4.6)_
4. You should land on the **Dashboard**

### 6.2 Quick smoke tests

| Test | How |
|---|---|
| **Login works** | Sign in with admin credentials |
| **Quick Audit** | Go to `/` and run an audit on any URL |
| **Rankings** | Go to `/rankings` and check a keyword |
| **Integrations** | Go to `/integrations` — should show "Connect Google" |
| **Action Items** | Go to `/tasks` — should show "Run an audit" prompt |
| **Signup** | Go to `/auth/signup` — create a second test account |

### 6.3 Check logs if something is wrong

```bash
# Plesk Node.js logs
tail -f /var/www/vhosts/seo.theviablesource.com/logs/nodejs.log

# Or check the stderr log
tail -f /var/www/vhosts/seo.theviablesource.com/logs/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

---

## Phase 7 — Updating the App

When you push new code to GitHub:

```bash
cd /var/www/vhosts/seo.theviablesource.com/httpdocs

# Pull latest code
git pull origin main

# Install any new dependencies
npm ci

# Push any schema changes to database
npx prisma db push

# Rebuild
npm run build

# Restart in Plesk
# Go to Node.js panel → click "Restart App"
# OR via SSH:
touch tmp/restart.txt
```

> **Tip:** You can create a `deploy.sh` script:
> ```bash
> #!/bin/bash
> cd /var/www/vhosts/seo.theviablesource.com/httpdocs
> git pull origin main
> npm ci
> npx prisma db push
> npm run build
> touch tmp/restart.txt
> echo "✅ Deployed!"
> ```
> Then just run `bash deploy.sh` each time.

---

## Checklist

- [ ] PostgreSQL running with `seo_auditor` database
- [ ] `.env` file created with all required variables
- [ ] `npx prisma db push` — tables created
- [ ] `npx prisma db seed` — admin account created
- [ ] `npm run build` — production build succeeded
- [ ] `server.js` created
- [ ] Plesk Node.js enabled and restarted
- [ ] SSL certificate installed
- [ ] Login works at `https://seo.theviablesource.com`
- [ ] Quick audit works
