// --- SEO Scoring Penalties ---
export const SCORING = {
  MAX_SCORE: 100,
  PENALTY_MISSING_TITLE: 10,
  PENALTY_MISSING_DESCRIPTION: 10,
  PENALTY_MISSING_H1: 10,
  PENALTY_THIN_CONTENT: 10,
  PENALTY_MISSING_CANONICAL: 10,
  PENALTY_MISSING_ALT: 5,
  PENALTY_MISSING_VIEWPORT: 10,
  PENALTY_MISSING_OG_IMAGE: 5,
  PENALTY_MISSING_FAVICON: 2,
  MIN_WORD_COUNT: 300,
} as const;

// --- SERP Simulator Limits ---
export const SERP = {
  TITLE_MAX_LENGTH: 60,
  DESCRIPTION_MAX_LENGTH: 160,
} as const;

// --- API Security ---
export const SECURITY = {
  ALLOWED_ORIGINS: [
    "http://localhost:3000",
    "http://localhost:3005",
    "https://seo-auditor-ibg8.vercel.app",
  ],
  SSRF_FORBIDDEN_PATTERNS: [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "192.168.",
    "10.",
    "172.16.",
    "metadata.google.internal",
  ],
  FETCH_TIMEOUT_MS: 10_000,
  RATE_LIMIT_MAX_REQUESTS: 10,
  RATE_LIMIT_WINDOW_MS: 60_000,
} as const;
