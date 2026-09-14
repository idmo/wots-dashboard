// Runs once when a new Next.js server process starts (standard `register()`
// hook — see Next's instrumentation.js file convention). Used here to
// bootstrap the very first superadmin account: there's no other way to
// create one, since adding a user normally requires already being signed
// in as a superadmin.
//
// Set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD in .env and they're picked
// up on next boot. Safe to leave set permanently afterward — this is a
// no-op once an account with that email already exists.
export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD;
  if (!email || !password) return;

  try {
    const { db, schema } = await import("@/lib/db");
    const { eq } = await import("drizzle-orm");
    const { hashPassword } = await import("@/lib/auth/password");
    const { isAllowedEmail } = await import("@/lib/auth/constants");

    const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
    if (existing) return;

    if (!isAllowedEmail(email)) {
      console.warn(
        `[bootstrap] SUPERADMIN_EMAIL (${email}) is outside ALLOWED_EMAIL_DOMAIN — creating it ` +
          "anyway since it's admin-configured in .env, but double check that's intentional."
      );
    }

    await db.insert(schema.users).values({
      email,
      passwordHash: await hashPassword(password),
      role: "superadmin",
      mustChangePassword: true,
    });
    console.log(`[bootstrap] Created initial superadmin account: ${email}`);
  } catch (err) {
    // Most likely cause: the users table doesn't exist yet because
    // `docker compose run --rm migrate` (or `npm run db:push` locally)
    // hasn't been run yet. Don't crash server boot over this — just warn
    // so it's visible in the logs, and it'll succeed on the next restart.
    console.warn("[bootstrap] Could not bootstrap superadmin account:", err);
  }
}
