import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth";

const SESSION_COOKIE = "hetex_session";
const ADMIN_PREFIX = "/admin";
const PROTECTED_PREFIXES = ["/dashboard", "/orders", "/addresses", "/wallet", "/ndr", "/cod", "/analytics", "/settings", ADMIN_PREFIX];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!needsAuth) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith(ADMIN_PREFIX) && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/orders/:path*", "/addresses/:path*", "/wallet/:path*", "/ndr/:path*", "/cod/:path*", "/analytics/:path*", "/settings/:path*", "/admin/:path*"],
};
