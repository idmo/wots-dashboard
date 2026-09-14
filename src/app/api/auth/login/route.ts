import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your email and password" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });

  // Same generic error whether the email doesn't exist or the password is
  // wrong, so a login attempt can't be used to check which staff emails
  // have accounts.
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });
  }

  await createSession(user.id);

  return NextResponse.json({ mustChangePassword: user.mustChangePassword });
}
