export interface AuditSocialData {
  ogTitle: string;
  ogImage: string | null;
}

export interface AuditMobileData {
  viewport: "Optimized" | "Missing";
  icon: string | null;
}

export interface AuditDetails {
  title: string;
  description: string;
  h1: string;
  canonical: string;
  wordCount: number;
  internalLinks: number;
  externalLinks: number;
  imageCount: number;
  missingAlt: number;
  social: AuditSocialData;
  mobile: AuditMobileData;
  issues: string[];
}

export interface AuditResult {
  score: number;
  details: AuditDetails;
}

export interface AuditErrorResponse {
  error: string;
}
