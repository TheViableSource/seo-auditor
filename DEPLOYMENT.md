# Plesk Deployment Guide for SEO Auditor

This guide will help you deploy the SEO Auditor Next.js application to your Plesk Node.js hosting.

---

## Prerequisites

Before deploying, ensure you have:

- [ ] Plesk server with Node.js support enabled
- [ ] PostgreSQL and Redis installed on Plesk server (see [PLESK_SETUP.md](./PLESK_SETUP.md))
- [ ] Domain configured: `seo.theviablesource.com`
- [ ] GitHub repository access
- [ ] SSH access to the Plesk server

---

## Step 1: Database Setup

Follow the comprehensive guide in `PLESK_SETUP.md` to:

1. Install PostgreSQL on your Plesk server
2. Create database `seo_auditor` and user `seo_user`
3. Install Redis
4. Configure security and passwords

**Generate NextAuth Secret:**
```bash
openssl rand -base64 32
```
Save this value - you'll need it for environment variables.

---

## Step 2: Configure Plesk Node.js Application

### 2.1 Access Node.js Settings

1. Log into Plesk
2. Go to your domain: `seo.theviablesource.com`
3. Click **Node.js** in the sidebar

### 2.2 Configure Application Settings

Set the following values:

| Setting | Value |
|---------|-------|
| **Node.js version** | 25.6.1 |
| **Package manager** | npm |
| **Application mode** | production |
| **Document root** | `/seo.theviablesource.com` |
| **Application root** | `/seo.theviablesource.com` |
| **Application startup file** | `app.js` |
| **Application URL** | `http://seo.theviablesource.com` |

### 2.3 Set Environment Variables

Click **"Custom environment variables"** and add:

```bash
DATABASE_URL=postgresql://seo_user:YOUR_DB_PASSWORD@localhost:5432/seo_auditor
REDIS_URL=redis://:YOUR_REDIS_PASSWORD@localhost:6379
NEXTAUTH_SECRET=YOUR_GENERATED_SECRET_FROM_STEP_1
NEXTAUTH_URL=https://seo.theviablesource.com
NODE_ENV=production
```

**Important:**
- Replace `YOUR_DB_PASSWORD` with your actual PostgreSQL password
- Replace `YOUR_REDIS_PASSWORD` with your actual Redis password
- Replace `YOUR_GENERATED_SECRET_FROM_STEP_1` with the secret you generated
- DO NOT set `PORT` - Plesk assigns this automatically

---

## Step 3: Connect GitHub Repository

### 3.1 In Plesk Git Panel

1. In Plesk, go to **Git** under your domain
2. Click **"Add Repository"**
3. Configure:
   - **Repository URL**: `https://github.com/TheViableSource/seo-auditor.git`
   - **Repository path**: `/` (root)
   - **Branch**: `claude/hybrid-seo-tool-FvY0B` (or `main` after merging)
4. Add authentication:
   - **GitHub Personal Access Token** OR
   - **SSH Key** (copy from Plesk and add to GitHub)
5. Click **OK** to clone the repository

---

## Step 4: Initial Build and Deployment

### 4.1 SSH into Server

```bash
ssh your-username@your-server-ip
cd /var/www/vhosts/seo.theviablesource.com/httpdocs
```

### 4.2 Install Dependencies

```bash
npm install
```

This will:
- Install all dependencies from `package.json`
- Automatically run `prisma generate` (via postinstall script)

### 4.3 Build Next.js Application

```bash
npm run build
```

Wait for the build to complete (may take 1-2 minutes).

### 4.4 Run Database Migrations

```bash
npx prisma migrate deploy
```

This creates all database tables defined in the Prisma schema.

### 4.5 Verify Files

Ensure `app.js` exists:
```bash
ls -la app.js
```

You should see the custom server entry point file.

---

## Step 5: Start the Application

### 5.1 In Plesk Node.js Panel

1. Go back to Plesk → **Node.js**
2. Click **"Restart App"** or **"Enable Node.js"**

The application should start on the PORT assigned by Plesk.

### 5.2 Check Application Status

In the Plesk Node.js panel, you should see:
- **Status**: Running (green)
- **Application Startup File**: app.js (found)

---

## Step 6: Configure SSL (HTTPS)

### 6.1 Install Let's Encrypt Certificate

1. In Plesk, go to **SSL/TLS Certificates**
2. Click **"Install"** next to "Let's Encrypt"
3. Select:
   - [x] Secure the domain
   - [x] Include www subdomain
4. Click **"Get it free"**

Wait for certificate issuance (usually < 1 minute).

### 6.2 Force HTTPS

1. Go to **Hosting Settings**
2. Enable **"Permanent SEO-safe 301 redirect from HTTP to HTTPS"**
3. Click **OK**

---

## Step 7: Verification & Testing

### 7.1 Health Check

Test the health endpoint:
```bash
curl https://seo.theviablesource.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-16T...",
  "uptime": 123.45,
  "environment": "production",
  "checks": {
    "database": "connected",
    "redis": "not_configured"
  },
  "responseTime": "50ms"
}
```

### 7.2 Main Application

Visit: `https://seo.theviablesource.com`

You should see the SEO Auditor homepage.

### 7.3 Authentication Test

1. Visit: `https://seo.theviablesource.com/auth/signup`
2. Create a new account
3. Verify you can log in
4. Check that you're redirected to the dashboard

### 7.4 Check Logs

In Plesk Node.js panel, click **"View Logs"** to check for errors.

---

## Step 8: Ongoing Deployments

### When You Update Code

**Option A: Via Plesk UI**

1. In Plesk → **Git**, click **"Pull Updates"**
2. SSH into server:
   ```bash
   cd /var/www/vhosts/seo.theviablesource.com/httpdocs
   npm install
   npm run build
   ```
3. If database schema changed:
   ```bash
   npx prisma migrate deploy
   ```
4. In Plesk → **Node.js**, click **"Restart App"**

**Option B: Full Deployment Script**

```bash
cd /var/www/vhosts/seo.theviablesource.com/httpdocs
git pull origin claude/hybrid-seo-tool-FvY0B
npm install
npm run build
npx prisma migrate deploy
# Then restart via Plesk UI
```

---

## Troubleshooting

### Application Won't Start

**Error**: "Application Startup File /seo.theviablesource.com/app.js is not found"

**Solution**:
1. Ensure `app.js` is committed to Git
2. Pull latest code from GitHub
3. Verify file exists: `ls -la /var/www/vhosts/seo.theviablesource.com/httpdocs/app.js`

---

### Database Connection Error

**Error**: Health check shows `"database": "disconnected"`

**Solutions**:
1. Verify PostgreSQL is running:
   ```bash
   systemctl status postgresql
   ```

2. Test connection manually:
   ```bash
   psql -U seo_user -d seo_auditor -h localhost
   ```

3. Check `DATABASE_URL` in Plesk environment variables
   - Format: `postgresql://seo_user:PASSWORD@localhost:5432/seo_auditor`

4. Check PostgreSQL logs:
   ```bash
   sudo tail -f /var/log/postgresql/postgresql-*.log
   ```

---

### Build Fails

**Error**: `npm run build` fails with errors

**Solutions**:
1. Delete and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

2. Check Node.js version matches:
   ```bash
   node --version  # Should be v25.6.1
   ```

3. Check for TypeScript errors in the build output

---

### Port Already in Use

**Error**: `EADDRINUSE` in logs

**Solution**:
- Plesk assigns PORT automatically
- Verify `app.js` uses `process.env.PORT`
- Restart app via Plesk UI (don't start manually with `npm start`)

---

### NextAuth Redirect Loop

**Error**: Login page redirects endlessly

**Solutions**:
1. Verify `NEXTAUTH_URL` matches your domain:
   ```bash
   NEXTAUTH_URL=https://seo.theviablesource.com
   ```

2. Ensure SSL is properly configured

3. Check browser console for errors

---

## Performance Monitoring

### Check Application Status

```bash
# View running Node.js processes
ps aux | grep node

# Check memory usage
free -h

# Check disk space
df -h
```

### View Application Logs

In Plesk:
1. Go to **Node.js**
2. Click **"View Logs"**
3. Monitor for errors

---

## Security Checklist

After deployment, verify:

- [ ] SSL certificate is active (green padlock in browser)
- [ ] HTTPS redirect is enabled
- [ ] `.env` file is NOT committed to Git
- [ ] Database password is strong (20+ characters)
- [ ] Redis password is set
- [ ] `NEXTAUTH_SECRET` is random and secure
- [ ] Firewall allows only necessary ports
- [ ] PostgreSQL only accepts localhost connections

---

## Quick Reference

### Common Commands

```bash
# SSH into server
ssh user@your-server-ip
cd /var/www/vhosts/seo.theviablesource.com/httpdocs

# Pull latest code
git pull origin claude/hybrid-seo-tool-FvY0B

# Install dependencies
npm install

# Build application
npm run build

# Run migrations
npx prisma migrate deploy

# View Prisma Studio (database GUI)
npx prisma studio

# Test health endpoint
curl https://seo.theviablesource.com/api/health
```

### Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@localhost:5432/db` |
| `REDIS_URL` | Redis connection | `redis://:pass@localhost:6379` |
| `NEXTAUTH_SECRET` | Auth encryption key | `<random-32-byte-string>` |
| `NEXTAUTH_URL` | Production domain | `https://seo.theviablesource.com` |
| `NODE_ENV` | Environment mode | `production` |

---

## Next Steps After Deployment

1. ✅ **Test all features**: Signup, login, run audits
2. ✅ **Set up backups**: Configure PostgreSQL backups (see PLESK_SETUP.md)
3. ✅ **Monitor performance**: Check Plesk resource usage regularly
4. ⏭️ **Continue Phase 1**: Build workspace and site management features
5. ⏭️ **Enable Redis**: Implement caching and rate limiting
6. ⏭️ **Add monitoring**: Consider uptime monitoring service (UptimeRobot, Pingdom)

---

## Support

- **Documentation**: See PLESK_SETUP.md for database configuration
- **Logs**: Check Plesk Node.js logs for errors
- **Health Check**: Monitor `/api/health` endpoint
- **GitHub**: Repository at `https://github.com/TheViableSource/seo-auditor`

---

**Congratulations!** Your SEO Auditor should now be live at `https://seo.theviablesource.com` 🎉
