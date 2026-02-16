# Plesk Server Setup Guide

This guide will help you set up PostgreSQL and Redis on your Plesk server for the SEO Auditor application.

## Prerequisites

- Plesk server with root/admin access
- SSH access to the server
- Plesk Onyx 17.8+ or Plesk Obsidian 18.0+

---

## 1. PostgreSQL Setup

### Step 1: Install PostgreSQL via Plesk

1. **Log into Plesk** as administrator
2. Go to **Tools & Settings** → **Updates and Upgrades**
3. Click on **Add/Remove Components**
4. Find and select **PostgreSQL Server** (recommend version 14 or higher)
5. Click **Continue** to install

### Step 2: Install PostgreSQL via SSH (Alternative)

If PostgreSQL is not available in Plesk components, install via SSH:

```bash
# For Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# For CentOS/RHEL
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Step 3: Create Database and User

SSH into your server and run:

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL console, run:
CREATE DATABASE seo_auditor;
CREATE USER seo_user WITH ENCRYPTED PASSWORD 'YOUR_SECURE_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE seo_auditor TO seo_user;

# Grant schema permissions (PostgreSQL 15+)
\c seo_auditor
GRANT ALL ON SCHEMA public TO seo_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO seo_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO seo_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO seo_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO seo_user;

# Exit
\q
```

### Step 4: Configure Remote Access (if needed)

If your Next.js app is NOT on the same server, you need to allow remote connections:

**Edit PostgreSQL config:**

```bash
# Find your PostgreSQL version
sudo -u postgres psql -c "SHOW config_file;"

# Edit postgresql.conf
sudo nano /var/lib/pgsql/data/postgresql.conf
# OR (Ubuntu/Debian)
sudo nano /etc/postgresql/14/main/postgresql.conf

# Find and modify:
listen_addresses = '*'
```

**Edit pg_hba.conf to allow connections:**

```bash
sudo nano /var/lib/pgsql/data/pg_hba.conf
# OR (Ubuntu/Debian)
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Add this line (replace YOUR_SERVER_IP with your app server IP):
host    seo_auditor    seo_user    YOUR_SERVER_IP/32    md5
# For development, you can use (less secure):
host    all            all         0.0.0.0/0            md5
```

**Restart PostgreSQL:**

```bash
sudo systemctl restart postgresql
```

### Step 5: Test Connection

```bash
# From the same server
psql -U seo_user -d seo_auditor -h localhost

# From remote server
psql -U seo_user -d seo_auditor -h YOUR_PLESK_SERVER_IP
```

### Step 6: Get Connection String

Your PostgreSQL connection string will be:

```
postgresql://seo_user:YOUR_SECURE_PASSWORD_HERE@localhost:5432/seo_auditor
```

Or if remote:

```
postgresql://seo_user:YOUR_SECURE_PASSWORD_HERE@YOUR_PLESK_SERVER_IP:5432/seo_auditor
```

**Add this to your `.env` file as `DATABASE_URL`**

---

## 2. Redis Setup

### Step 1: Install Redis via SSH

```bash
# For Ubuntu/Debian
sudo apt update
sudo apt install redis-server

# For CentOS/RHEL
sudo yum install epel-release
sudo yum install redis
```

### Step 2: Configure Redis

```bash
# Edit Redis configuration
sudo nano /etc/redis/redis.conf

# Recommended settings:
# 1. Set a password
requirepass YOUR_REDIS_PASSWORD_HERE

# 2. Set max memory (e.g., 256MB)
maxmemory 256mb
maxmemory-policy allkeys-lru

# 3. For remote access (if needed)
bind 0.0.0.0
protected-mode yes

# 4. Enable persistence (optional)
appendonly yes
appendfsync everysec
```

### Step 3: Start Redis

```bash
# Start and enable Redis
sudo systemctl start redis
sudo systemctl enable redis

# Check status
sudo systemctl status redis
```

### Step 4: Test Redis

```bash
# Local test
redis-cli
> AUTH YOUR_REDIS_PASSWORD_HERE
> PING
# Should return: PONG
> SET test "Hello"
> GET test
# Should return: "Hello"
> exit

# Remote test (if configured)
redis-cli -h YOUR_PLESK_SERVER_IP -a YOUR_REDIS_PASSWORD_HERE PING
```

### Step 5: Get Redis Connection String

Your Redis connection string will be:

```
redis://:YOUR_REDIS_PASSWORD_HERE@localhost:6379
```

Or if remote:

```
redis://:YOUR_REDIS_PASSWORD_HERE@YOUR_PLESK_SERVER_IP:6379
```

**Add this to your `.env` file as `REDIS_URL`**

---

## 3. Firewall Configuration

If you're connecting remotely, ensure ports are open:

```bash
# PostgreSQL (port 5432)
sudo firewall-cmd --permanent --add-port=5432/tcp
# OR for UFW (Ubuntu)
sudo ufw allow 5432/tcp

# Redis (port 6379)
sudo firewall-cmd --permanent --add-port=6379/tcp
# OR for UFW
sudo ufw allow 6379/tcp

# Reload firewall
sudo firewall-cmd --reload
# OR
sudo ufw reload
```

**Security Note:** For production, it's better to:
- Use a VPN or SSH tunnel instead of opening ports publicly
- Whitelist specific IPs only
- Use SSL/TLS for PostgreSQL connections

---

## 4. Plesk-Specific Configuration

### Add Database to Plesk Panel

1. Go to **Databases** in Plesk
2. Click **Add Database**
3. Select **PostgreSQL** as the database type
4. Enter database name: `seo_auditor`
5. Create database user: `seo_user`
6. Set password
7. Click **OK**

This creates the database and makes it manageable through Plesk's UI.

---

## 5. Environment Variables

Once PostgreSQL and Redis are set up, create/update your `.env` file:

```bash
# Database
DATABASE_URL="postgresql://seo_user:YOUR_PASSWORD@localhost:5432/seo_auditor"

# Redis
REDIS_URL="redis://:YOUR_REDIS_PASSWORD@localhost:6379"

# NextAuth (generate a random secret)
NEXTAUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"  # Update for production

# Email (for authentication emails - we'll set this up later)
EMAIL_SERVER="smtp://user:pass@smtp.example.com:587"
EMAIL_FROM="noreply@yourdomain.com"
```

### Generate NextAuth Secret

```bash
# Run this command to generate a secure secret:
openssl rand -base64 32
```

Copy the output and use it as `NEXTAUTH_SECRET`.

---

## 6. Backup Configuration

### PostgreSQL Backup

```bash
# Manual backup
pg_dump -U seo_user -h localhost seo_auditor > backup_$(date +%Y%m%d).sql

# Restore from backup
psql -U seo_user -h localhost seo_auditor < backup_20260216.sql
```

### Redis Backup

Redis automatically creates dumps if persistence is enabled:

```bash
# Find Redis dump file
/var/lib/redis/dump.rdb
```

### Automated Backups via Plesk

1. Go to **Tools & Settings** → **Backup Manager**
2. Enable **Scheduled Backup**
3. Include databases in backup

---

## 7. Monitoring & Maintenance

### Monitor PostgreSQL

```bash
# Check running queries
sudo -u postgres psql -c "SELECT pid, usename, state, query FROM pg_stat_activity;"

# Check database size
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('seo_auditor'));"

# Check connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"
```

### Monitor Redis

```bash
# Check memory usage
redis-cli -a YOUR_PASSWORD INFO memory

# Monitor commands in real-time
redis-cli -a YOUR_PASSWORD MONITOR

# Check connected clients
redis-cli -a YOUR_PASSWORD CLIENT LIST
```

---

## 8. Security Checklist

- [ ] PostgreSQL password is strong (20+ characters, mixed case, numbers, symbols)
- [ ] Redis password is set
- [ ] Firewall rules limit access to specific IPs (if remote access needed)
- [ ] SSL/TLS enabled for PostgreSQL (production)
- [ ] Regular backups configured
- [ ] Plesk security updates enabled
- [ ] fail2ban installed and configured
- [ ] Database connections use environment variables (never commit passwords)

---

## Troubleshooting

### PostgreSQL Connection Issues

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Test connection
psql -U seo_user -d seo_auditor -h localhost -W
```

### Redis Connection Issues

```bash
# Check if Redis is running
sudo systemctl status redis

# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log

# Test connection
redis-cli -h localhost -a YOUR_PASSWORD PING
```

### Common Errors

**Error: `FATAL: Peer authentication failed`**
- Solution: Change `peer` to `md5` in `pg_hba.conf` for local connections

**Error: `FATAL: no pg_hba.conf entry`**
- Solution: Add appropriate entry in `pg_hba.conf` and restart PostgreSQL

**Error: `Could not connect to Redis`**
- Solution: Check if Redis is running, verify password, check firewall

---

## Next Steps

Once PostgreSQL and Redis are set up:

1. ✅ Save connection strings to `.env`
2. ✅ Test connections from your development environment
3. ✅ Proceed with Prisma setup and database migrations
4. ✅ Continue with Phase 1 implementation

---

## Quick Reference

```bash
# PostgreSQL
Service: sudo systemctl {start|stop|restart|status} postgresql
Connect: psql -U seo_user -d seo_auditor -h localhost
Logs: /var/log/postgresql/

# Redis
Service: sudo systemctl {start|stop|restart|status} redis
Connect: redis-cli -a YOUR_PASSWORD
Logs: /var/log/redis/

# Environment Variables
DATABASE_URL="postgresql://seo_user:PASSWORD@HOST:5432/seo_auditor"
REDIS_URL="redis://:PASSWORD@HOST:6379"
```
