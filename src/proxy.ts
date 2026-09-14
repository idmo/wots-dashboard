// Route protection. This file is what would be `middleware.ts` in older
// Next.js versions — Next.js 16 renamed the "Middleware" convention to
// "Proxy" (see AGENTS.md: this app's Next.js has breaking changes from
// what you may already know). All functionality is the same, just the
// file/export names changed.
//
// This is the SINGLE authoritative gate for both the dashboard/register
// pages and the JSON APIs behind them — none of the pre-existing
// order/book/customer/etc. route handlers re-check the session
// individually. That's a deliberate departure from Next's own docs, which
// recommend keeping Proxy to a fast "optimistic" cookie-presence check
// (reading the database on every request, including prefetches, doesn't
// scale) and doing the real check close to the data. For a small internal
// tool with a handful of staff on a handful of devices, that scaling
// concern doesn't apply, and having one well-tested gate beats adding a
// session check to ~15 existing route handlers piecemeal. Anything new
// that's especially sensitive (the Users admin API) still re-checks
// itself too, as defense in depth — see src/app/api/users/route.ts.
//
// Proxy defaults to the Node.js runtime in this Next.js version (unlike
// old Middleware, which was Edge-only), so it's safe to import the
// Postgres-backed session lookup here.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySessionToken } from "@/lib/auth/session";

// Reachable without a session — the auth flows themselves.
const PUBLIC_API_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/logout",
]);

// Reachable only by a superadmin, once signed in.
const SUPERADMIN_ONLY_PREFIXES = ["/dashboard/users", "/api/users"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  if (PUBLIC_API_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = token ? await verifySessionToken(token) : null;

  if (!user) {
    if (isApi) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isSuperadminOnly = SUPERADMIN_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (isSuperadminOnly && user.role !== "superadmin") {
    if (isApi) {
      return NextResponse.json({ error: "Superadmin access required" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Force a fresh password before anything else is reachable. Only for
  // page navigations — an authenticated fetch() call (e.g. the register
  // page's background ISBN lookup) shouldn't start failing mid-flow just
  // because the signed-in user hasn't picked a new password yet; in
  // practice they can't reach any page that would make those calls until
  // they do, since every other page redirects here first.
  if (!isApi && user.mustChangePassword && pathname !== "/change-password") {
    return NextResponse.redirect(new URL("/change-password", request.url));
  }

  // Hand the resolved identity to Server Components and Route Handlers via
  // request headers, so they don't have to hit the database again — see
  // getCurrentUser() in src/lib/auth/session.ts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-wots-user-id", String(user.id));
  requestHeaders.set("x-wots-user-email", user.email);
  requestHeaders.set("x-wots-user-role", user.role);
  requestHeaders.set("x-wots-user-must-change-password", String(user.mustChangePassword));

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // A positive list of protected prefixes, not "everything except X" — so
  // there's no need to carve out _next/static, images, etc.
  matcher: ["/register", "/change-password", "/dashboard/:path*", "/pickup-slip/:path*", "/api/:path*"],
};
