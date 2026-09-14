// Plain constants only (no secrets) — safe to import from client code too,
// though in practice only the server-side auth routes/pages use these.

// Only staff with an email on this domain can be added as a user (see
// src/app/api/users/route.ts). Override via env if the store's own email
// domain ever changes; defaults to the domain Brian asked to restrict to.
export const ALLOWED_EMAIL_DOMAIN = (
  process.env.ALLOWED_EMAIL_DOMAIN || "wordonthestreetbooks.com"
).toLowerCase();

export const SESSION_COOKIE_NAME = "wots_session";
export const SESSION_TTL_DAYS = 30;
export const RESET_CODE_TTL_MINUTES = 15;

export function isAllowedEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}
