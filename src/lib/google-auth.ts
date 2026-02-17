/**
 * Google OAuth2 & API clients for Search Console, Analytics, GMB, and Ads.
 *
 * Phase 1: Search Console only. Additional scopes/clients will be added in Phase 2.
 *
 * Tokens are stored server-side in a JSON file (for single-user / demo usage).
 * In production, swap to a database-backed store.
 */

import { google } from "googleapis"
import fs from "fs"
import path from "path"

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? ""
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ""
const REDIRECT_URI =
    process.env.GOOGLE_REDIRECT_URI ??
    (process.env.NEXTAUTH_URL
        ? `${process.env.NEXTAUTH_URL}/api/auth/google/callback`
        : "http://localhost:3000/api/auth/google/callback")

// Scopes — Search Console, Analytics, and Google Business Profile
const SCOPES = [
    "https://www.googleapis.com/auth/webmasters.readonly",       // Search Console
    "https://www.googleapis.com/auth/analytics.readonly",        // Google Analytics (GA4)
    "https://www.googleapis.com/auth/business.manage",           // Google Business Profile
    "https://www.googleapis.com/auth/userinfo.email",            // User email
    "https://www.googleapis.com/auth/userinfo.profile",          // User profile
]

// ---------------------------------------------------------------------------
// Token persistence (file-based for demo; swap to DB in production)
// ---------------------------------------------------------------------------

const TOKEN_PATH = path.join(process.cwd(), ".gsc-tokens.json")

export interface GoogleTokens {
    access_token: string
    refresh_token?: string
    expiry_date?: number
    token_type?: string
    scope?: string
    email?: string
}

export function getStoredTokens(): GoogleTokens | null {
    try {
        if (fs.existsSync(TOKEN_PATH)) {
            const data = fs.readFileSync(TOKEN_PATH, "utf-8")
            return JSON.parse(data) as GoogleTokens
        }
    } catch {
        // ignore read errors
    }
    return null
}

function saveTokens(tokens: GoogleTokens) {
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2), "utf-8")
}

export function clearTokens() {
    try {
        if (fs.existsSync(TOKEN_PATH)) fs.unlinkSync(TOKEN_PATH)
    } catch {
        // ignore
    }
}

// ---------------------------------------------------------------------------
// OAuth2 client
// ---------------------------------------------------------------------------

export function createOAuth2Client() {
    return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
}

/** Get the auth URL the user should be redirected to. */
export function getAuthUrl(): string {
    const client = createOAuth2Client()
    return client.generateAuthUrl({
        access_type: "offline",     // get refresh_token
        prompt: "consent",          // always show consent so we get refresh_token
        scope: SCOPES,
    })
}

/** Exchange the authorization code for tokens & persist them. */
export async function exchangeCode(code: string): Promise<GoogleTokens> {
    const client = createOAuth2Client()
    const { tokens } = await client.getToken(code)
    client.setCredentials(tokens)

    // Fetch user email
    const oauth2 = google.oauth2({ version: "v2", auth: client })
    const { data } = await oauth2.userinfo.get()

    const stored: GoogleTokens = {
        access_token: tokens.access_token ?? "",
        refresh_token: tokens.refresh_token ?? undefined,
        expiry_date: tokens.expiry_date ?? undefined,
        token_type: tokens.token_type ?? undefined,
        scope: tokens.scope ?? undefined,
        email: data.email ?? undefined,
    }

    saveTokens(stored)
    return stored
}

/** Get an authenticated OAuth2 client (refreshes token if needed). */
export async function getAuthenticatedClient() {
    const tokens = getStoredTokens()
    if (!tokens) return null

    const client = createOAuth2Client()
    client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
    })

    // Handle token refresh
    client.on("tokens", (newTokens) => {
        const updated: GoogleTokens = {
            ...tokens,
            access_token: newTokens.access_token ?? tokens.access_token,
            expiry_date: newTokens.expiry_date ?? tokens.expiry_date,
        }
        if (newTokens.refresh_token) updated.refresh_token = newTokens.refresh_token
        saveTokens(updated)
    })

    return client
}

// ---------------------------------------------------------------------------
// Check if credentials are configured
// ---------------------------------------------------------------------------

export function isGoogleConfigured(): boolean {
    return Boolean(CLIENT_ID && CLIENT_SECRET)
}

export function isGoogleConnected(): boolean {
    return getStoredTokens() !== null
}
