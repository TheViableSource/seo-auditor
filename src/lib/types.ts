// ============================================================
// AUDIT CHECK TYPES — used by all analyzer modules
// ============================================================

export type CheckStatus = "pass" | "fail" | "warning" | "info"
export type CheckSeverity = "critical" | "major" | "minor" | "info"
export type AuditCategoryName = "on-page" | "technical" | "accessibility" | "structured-data" | "security" | "robots-sitemap" | "aeo" | "geo" | "performance" | "html-validation" | "safe-browsing"

export interface AuditCheck {
  id: string
  title: string
  description: string
  status: CheckStatus
  severity: CheckSeverity
  value?: string | number | null
  expected?: string | number | null
  details?: string
  recommendation?: string
  codeSnippet?: string
  learnMoreUrl?: string
}

export interface AuditCategory {
  name: AuditCategoryName
  label: string
  score: number
  checks: AuditCheck[]
  passCount: number
  failCount: number
  warningCount: number
}

// ============================================================
// CONTENT ANALYSIS TYPES
// ============================================================

export interface ContentAnalysisData {
  wordCount: number
  readingTimeMinutes: number
  readabilityGrade: string
  readabilityScore: number
  topKeywords: { word: string; count: number; density: string }[]
  sentenceCount: number
  avgWordsPerSentence: number
  paragraphCount: number
}

export interface PageResourcesData {
  scripts: { src: string; async: boolean; defer: boolean }[]
  stylesheets: { href: string }[]
  images: { src: string; alt: string; hasAlt: boolean }[]
  fonts: { href: string }[]
  totalScripts: number
  totalStylesheets: number
  totalImages: number
  totalFonts: number
  htmlSizeKb: number
}

export interface SocialPreviewData {
  og: {
    title: string | null
    description: string | null
    image: string | null
    url: string | null
    siteName: string | null
    type: string | null
  }
  twitter: {
    card: string | null
    title: string | null
    description: string | null
    image: string | null
    site: string | null
  }
}

// ============================================================
// LEGACY DETAIL TYPES (backward compat)
// ============================================================

export interface AuditSocialData {
  ogTitle: string
  ogImage: string | null
  ogDescription: string | null
  twitterCard: string | null
  twitterTitle: string | null
}

export interface AuditMobileData {
  viewport: "Optimized" | "Missing"
  icon: string | null
}

export interface AuditDetails {
  title: string
  description: string
  h1: string
  canonical: string
  wordCount: number
  internalLinks: number
  externalLinks: number
  imageCount: number
  missingAlt: number
  social: AuditSocialData
  mobile: AuditMobileData
  issues: string[]
}

// ============================================================
// FULL AUDIT RESULT
// ============================================================

export interface AuditResult {
  score: number
  categories: AuditCategory[]
  details: AuditDetails
  contentAnalysis: ContentAnalysisData
  pageResources: PageResourcesData
  socialPreview: SocialPreviewData
  meta: {
    url: string
    fetchTimeMs: number
    timestamp: string
    httpStatus: number
  }
}

export interface AuditErrorResponse {
  error: string
}
