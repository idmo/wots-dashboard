import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { generateDefaultPassword, hashPassword } from "@/lib/auth/password";
import { ALLOWED_EMAIL_DOMAIN, isAllowedEmail } from "@/lib/auth/constants";
import { isEmailMockEnabled, sendNewAccountEmail } from "@/lib/services/email";
import { getCurrentUser } from "@/lib/auth/session";

const createUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(["staff", "superadmin"]).default("staff"),
});

// GET /api/users — list staff accounts. Superadmin only. Also enforced by
// src/proxy.ts (which gates the whole /api/users prefix) — re-checked here
// too since staff account management is the most sensitive part of the app.
export async function GET() {
  const me = await getCurrentUser();
  if (!me || me.role !== "superadmin") {
    return NextResponse.json({ error: "Superadmin access required" }, { status: 403 });
  }

  const users = await db.query.users.findMany({
    columns: { id: true, email: true, role: true, mustChangePassword: true, createdAt: true },
    orderBy: [desc(schema.users.createdAt)],
  });

  return NextResponse.json({ users });
}

// POST /api/users — add a new staff account. Generates a temporary
// password and emails it (see src/lib/services/email.ts); the new user
// picks their own password on first login (users.mustChangePassword).
export async function POST(request: NextRequest) {
  const me = await getCurrentUser();
  if (!me || me.role !== "superadmin") {
    return NextResponse.json({ error: "Superadmin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  if (!isAllowedEmail(email)) {
    return NextResponse.json(
      { error: `Only @${ALLOWED_EMAIL_DOMAIN} email addresses can be added` },
      { status: 400 }
    );
  }

  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  if (existing) {
    return NextResponse.json({ error: "That email already has an account" }, { status: 409 });
  }

  const temporaryPassword = generateDefaultPassword();
  const [user] = await db
    .insert(schema.users)
    .values({
      email,
      passwordHash: await hashPassword(temporaryPassword),
      role: parsed.data.role,
      mustChangePassword: true,
    })
    .returning({
      id: schema.users.id,
      email: schema.users.email,
      role: schema.users.role,
      mustChangePassword: schema.users.mustChangePassword,
      createdAt: schema.users.createdAt,
    });

  await sendNewAccountEmail(email, temporaryPassword);

  return NextResponse.json(
    {
      user,
      // Only included when email sending is mocked (EMAIL_MOCK=true) — the
      // password was genuinely emailed otherwise, and the admin UI has no
      // legitimate reason to also display it once that's true.
      temporaryPassword: isEmailMockEnabled() ? temporaryPassword : undefined,
    },
    { status: 201 }
  );
}
