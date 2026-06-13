import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const supportedLocales = ["en", "th"];
const defaultLocale = "en";

function getLocale(pathname: string): string {
  const [, maybeLocale] = pathname.split("/");
  return supportedLocales.includes(maybeLocale ?? "") ? maybeLocale! : defaultLocale;
}

// Pages intentionally reachable without authentication: the shop-facing
// customer-display second screen (auth pages are handled by isAuthPath below).
function isPublicLocalePath(pathname: string): boolean {
  return /^\/(en|th)\/customer-display(\/.*)?$/.test(pathname);
}

// Whitelist the public exceptions instead of enumerating protected paths, so
// routes added later are protected by default. Everything under /(en|th)/… needs
// a session unless it is an auth page or an explicitly public page.
function requiresAuth(pathname: string): boolean {
  if (!/^\/(en|th)\/.+/.test(pathname)) return false;
  if (isAuthPath(pathname)) return false;
  if (isPublicLocalePath(pathname)) return false;
  return true;
}

function isAuthPath(pathname: string): boolean {
  return /^\/(en|th)\/(login|register|subscription|setup\/store)$/.test(pathname);
}

function isPublicPath(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/fonts") ||
    pathname === "/"
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const locale = getLocale(pathname);

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("pos-access-token")?.value;
  const storeId = request.cookies.get("pos-store-id")?.value;

  // Protected routes – no token → redirect to login
  if (requiresAuth(pathname) && !accessToken) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("pos-access-token");
    response.cookies.delete("pos-store-id");
    response.headers.set("Cache-Control", "no-store, must-revalidate");
    return response;
  }

  // Protected routes – no store selected → redirect to setup
  if (requiresAuth(pathname) && accessToken && !storeId) {
    const setupUrl = new URL(`/${locale}/setup/store`, request.url);
    const response = NextResponse.redirect(setupUrl);
    response.headers.set("Cache-Control", "no-store, must-revalidate");
    return response;
  }

  // Auth pages – already logged in with store → redirect to stock
  if (isAuthPath(pathname) && accessToken && storeId) {
    const stockUrl = new URL(`/${locale}/stock`, request.url);
    const response = NextResponse.redirect(stockUrl);
    response.headers.set("Cache-Control", "no-store, must-revalidate");
    return response;
  }

  // Unsupported locale → redirect to default
  const [, maybeLocale] = pathname.split("/");
  if (maybeLocale && !supportedLocales.includes(maybeLocale)) {
    const defaultUrl = new URL(`/${defaultLocale}/login`, request.url);
    return NextResponse.redirect(defaultUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
