import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitize an image URL from an audited page.
 * Returns a safe absolute HTTP(S) URL, or null if the URL is invalid/unsafe.
 */
export function sanitizeImageUrl(rawUrl: string, baseUrl: string): string | null {
  try {
    const resolved = rawUrl.startsWith("http")
      ? new URL(rawUrl)
      : new URL(rawUrl, baseUrl);

    if (resolved.protocol === "http:" || resolved.protocol === "https:") {
      return resolved.href;
    }
    return null;
  } catch {
    return null;
  }
}
