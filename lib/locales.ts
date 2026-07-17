// Central locale configuration (no "use client" — safe to import in middleware).
export const LOCALES = ["en", "ka"] as const;
export type Locale = (typeof LOCALES)[number];

// Default / x-default locale. Change to "ka" to make Georgian the fallback.
export const DEFAULT_LOCALE: Locale = "ka";

export function isLocale(x: string): x is Locale {
  return (LOCALES as readonly string[]).includes(x);
}

// Absolute site origin — set NEXT_PUBLIC_SITE_URL in .env for production.
// Used for canonical URLs, hreflang alternates, sitemap and JSON-LD.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://ronnys.ge").replace(/\/$/, "");
