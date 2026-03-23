import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getLocaleFromPathname(pathname: string) {
  const [, maybeLocale] = pathname.split("/");
  return maybeLocale || "en";
}

function isWorkspacePath(pathname: string) {
  return /^\/(en|th)\/(dashboard|sales|stock|customers|documents|admin\/plans)(\/.*)?$/.test(pathname);
}

function isAuthPath(pathname: string) {
  return /^\/(en|th)\/(login|register|subscription|setup\/store)$/.test(pathname);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const locale = getLocaleFromPathname(pathname);
  const accessToken = request.cookies.get("pos-access-token")?.value;
  const storeId = request.cookies.get("pos-store-id")?.value;

  if (isWorkspacePath(pathname) && !accessToken) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  if (isWorkspacePath(pathname) && !storeId) {
    return NextResponse.redirect(new URL(`/${locale}/setup/store`, request.url));
  }

  if (isAuthPath(pathname) && accessToken && storeId && /\/(login|register|subscription|setup\/store)$/.test(pathname)) {
    return NextResponse.redirect(new URL(`/${locale}/stock`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/en/:path*",
    "/th/:path*",
  ],
};
