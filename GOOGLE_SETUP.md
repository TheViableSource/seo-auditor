# Google API Setup Guide

Step-by-step instructions to connect Google Search Console, Analytics, My Business, and Ads to your AuditorPro instance.

---

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top → **New Project**
3. Name it something like `AuditorPro` → **Create**
4. Make sure the new project is selected in the dropdown

---

## Step 2: Enable the Required APIs

From your project dashboard, go to **APIs & Services → Library** and enable each:

| API | Search for | Required for |
|-----|-----------|-------------|
| **Google Search Console API** | "Search Console API" | Keyword rankings, search queries, impressions |
| **Google Analytics Data API** | "Google Analytics Data API" | Traffic, sessions, conversions (Phase 2) |
| **My Business Business Information API** | "My Business" | GMB profiles, reviews, insights (Phase 2) |
| **Google Ads API** | "Google Ads API" | Campaign performance, spend (Phase 2) |

> **For Phase 1, only the Search Console API is required.** The others can be enabled later.

Click each API → **Enable**.

---

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. Choose **External** (or Internal if using Google Workspace) → **Create**
3. Fill in:
   - **App name**: `AuditorPro`
   - **User support email**: your email
   - **Developer contact email**: your email
4. Click **Save and Continue**
5. On the **Scopes** screen, click **Add or Remove Scopes** and add:
   ```
   https://www.googleapis.com/auth/webmasters.readonly
   https://www.googleapis.com/auth/userinfo.email
   https://www.googleapis.com/auth/userinfo.profile
   ```
6. Click **Save and Continue**
7. On **Test Users**, click **Add Users** and add your Google email
8. Click **Save and Continue** → **Back to Dashboard**

> ⚠️ While in "Testing" mode, only the test users you add can authorize. To allow any user, you'll need to **Publish** the app (which requires Google's review for sensitive scopes).

---

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services → Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `AuditorPro Web`
5. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:3000/api/auth/google/callback
   ```
   If you have a production domain, also add:
   ```
   https://your-domain.com/api/auth/google/callback
   ```
6. Click **Create**
7. A dialog shows your **Client ID** and **Client Secret** — copy both

---

## Step 5: Configure Environment Variables

Create a `.env.local` file in your project root (if it doesn't exist):

```bash
# In your project root directory
cp .env.example .env.local
```

Edit `.env.local` and set the Google credentials:

```env
GOOGLE_CLIENT_ID="123456789-xxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxxx"
```

> **Never commit `.env.local`** — it's already in `.gitignore`.

---

## Step 6: Add Your Site to Google Search Console

If your site isn't already verified in Search Console:

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Click **Add property**
3. Choose **URL prefix** and enter your site URL (e.g., `https://theviablesource.com`)
4. Verify ownership using one of the methods (HTML file, DNS record, etc.)
5. Wait 24-48 hours for data to begin populating

---

## Step 7: Connect in AuditorPro

1. Start the dev server: `npm run dev`
2. Go to `http://localhost:3000/settings`
3. Scroll to the **Google Integrations** card
4. Click **Connect Google Account**
5. Sign in with the Google account that has access to your Search Console properties
6. Grant the requested permissions
7. You'll be redirected back to Settings with a success message

Once connected, you'll see:
- ✅ Your email address
- ✅ Service status grid (Search Console: Active)
- ✅ List of verified Search Console properties

---

## Step 8: Use Real Search Data

### Keyword Rankings
Go to **Rankings → Keyword Rankings** and click **Check All Rankings**. With GSC connected, positions come from real Search Console data instead of estimates.

### Keyword Discovery
Click **Discover Keywords** — this uses content analysis to suggest keywords. When GSC is connected, the rank-check data for tracked keywords will use real position data.

---

## Troubleshooting

### "Google OAuth credentials are not configured"
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env.local`
- Restart the dev server after adding env vars

### "Error 400: redirect_uri_mismatch"
- The redirect URI in Google Cloud must **exactly** match: `http://localhost:3000/api/auth/google/callback`
- Check for trailing slashes or `https` vs `http`

### "Access blocked: This app's request is invalid"
- Make sure the OAuth consent screen is configured (Step 3)
- Add your email as a test user if the app is in "Testing" mode

### "Google authorization expired"
- Go to Settings → click **Disconnect**, then **Connect Google Account** again
- This refreshes the OAuth tokens

### No Search Console data showing
- Data takes 24-48 hours to appear for newly verified sites
- Search Console data has a ~3 day delay (this is normal)
- Make sure the site URL in AuditorPro matches the verified property URL

### "Forbidden" or "Permission denied"
- Verify your Google account has access to the Search Console property
- Check the permission level in Search Console → Settings → Users and Permissions

---

## Production Deployment

When deploying to production:

1. Add your production redirect URI in Google Cloud Console:
   ```
   https://your-domain.com/api/auth/google/callback
   ```

2. Set environment variables on your hosting platform:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/google/callback
   ```

3. If the app is still in "Testing" mode in Google Cloud, publish it for production use (may require Google review)

---

## Phase 2: Additional Services

When we add Analytics, GMB, and Ads, the process is similar:
- Enable the relevant API in Google Cloud Console
- Add the required scopes to the OAuth consent screen
- The OAuth connection is shared — users only need to re-authorize to grant the new scopes

| Service | Additional Scope | What It Provides |
|---------|-----------------|------------------|
| Analytics (GA4) | `analytics.readonly` | Traffic, sessions, bounce rate, conversions |
| My Business | `business.manage` | Reviews, listings, insights, Q&A |
| Ads | `adwords` | Campaign performance, spend, ROI |
