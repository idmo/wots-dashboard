import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { generateResetCode, hashToken } from "@/lib/auth/password";
import { RESET_CODE_TTL_MINUTES } from "@/lib/auth/constants";
import { sendPasswordResetCodeEmail } from "@/lib/services/email";

const forgotPasswordSchema = z.object({ email: z.string().email() });

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your email" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });

  // Always respond the same way whether or not the account exists, so this
  // can't be used to check which staff emails have accounts.
  if (user) {
    const code = generateResetCode();
    const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60 * 1000);
    await db.insert(schema.passwordResetCodes).values({
      userId: user.id,
      codeHash: hashToken(code),
      expiresAt,
    });
    await sendPasswordResetCodeEmail(email, code);
  }

  return NextResponse.json({ ok: true });
}
