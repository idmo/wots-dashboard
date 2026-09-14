import "server-only";
import { cookies, headers } from "next/headers";
import { randomBytes } from "crypto";
import { and, eq, gt } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { hashToken } from "./password";
import { SESSION_COOKIE_NAME, SESSION_TTL_DAYS } from "./constants";

export type SessionUser = {
  id: number;
  email: string;
  role: "staff" | "superadmin";
  mustChangePassword: boolean;
};

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    // See .env.example: keep COOKIE_SECURE=false until this is served over
    // HTTPS — a Secure cookie is silently dropped by the browser over
    // plain http:// (e.g. a bare VPS IP), which would make login look
    // broken rather than actually erroring.
    secure: process.env.COOKIE_SECURE === "true",
    expires,
    sameSite: "lax" as const,
    path: "/",
  };
}

// Called by the login and reset-password Route Handlers after verifying
// credentials. Issues a random opaque token, stores only its hash (see
// hashToken) alongside an expiry in the sessions table, and sets the raw
// token as an HttpOnly cookie.
export async function createSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(schema.sessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, cookieOptions(expiresAt));
}

// Used by /api/auth/logout, and by a superadmin resetting someone's
// password (see /api/users/[id]/reset-password) to sign that user out
// everywhere at once.
export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, hashToken(token)));
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// Looks a raw cookie token up against the sessions table, joined to its
// user. This is the actual authority on whether a request is signed in —
// see src/proxy.ts, the only caller.
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  const rows = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      role: schema.users.role,
      mustChangePassword: schema.users.mustChangePassword,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(and(eq(schema.sessions.tokenHash, hashToken(token)), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);

  return rows[0] ?? null;
}

// Reads the identity src/proxy.ts already resolved and attached as request
// headers (x-wots-user-*) — cheap (no second database round trip) for use
// in Server Components, Route Handlers, and the superadmin-only admin
// pages/routes. Returns null both when there's no session AND when the
// current route isn't behind the Proxy's matcher, so callers on a
// protected route can treat null as simply "not signed in".
export async function getCurrentUser(): Promise<SessionUser | null> {
  const h = await headers();
  const id = h.get("x-wots-user-id");
  const email = h.get("x-wots-user-email");
  const role = h.get("x-wots-user-role");
  if (!id || !email || !role) return null;

  return {
    id: Number(id),
    email,
    role: role as SessionUser["role"],
    mustChangePassword: h.get("x-wots-user-must-change-password") === "true",
  };
}
