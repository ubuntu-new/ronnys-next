import { NextResponse, type NextRequest } from "next/server";
import { LOCALES, DEFAULT_LOCALE } from "./lib/locales";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const hasLocale = LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) return NextResponse.next();

  // Detect from Accept-Language, otherwise fall back to the default locale.
  const accept = (req.headers.get("accept-language") || "").toLowerCase();
  const detected = accept.includes("ka") || accept.includes("ge") ? "ka" : accept.includes("en") ? "en" : DEFAULT_LOCALE;

  const url = req.nextUrl.clone();
  url.pathname = `/${detected}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

// Skip Next internals, API routes, and anything with a file extension.
export const config = {
  matcher: ["/((?!_next|api|.*\\.).*)"],
};
