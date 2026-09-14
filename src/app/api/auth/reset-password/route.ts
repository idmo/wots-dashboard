import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { hashPassword, hashToken } from "@/lib/auth/password";

const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(8, "Use at least 8 characters"),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
  // Generic error either way — don't confirm/deny whether the email has an
  // account, or whether the code was merely wrong vs. the email unknown.
  if (!user) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  const codeHash = hashToken(parsed.data.code);
  const candidate = await db.query.passwordResetCodes.findFirst({
    where: and(
      eq(schema.passwordResetCodes.userId, user.id),
      eq(schema.passwordResetCodes.codeHash, codeHash),
      isNull(schema.passwordResetCodes.usedAt)
    ),
    orderBy: [desc(schema.passwordResetCodes.createdAt)],
  });

  if (!candidate || candidate.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  await db
    .update(schema.users)
    .set({ passwordHash: await hashPassword(parsed.data.newPassword), mustChangePassword: false })
    .where(eq(schema.users.id, user.id));

  await db
    .update(schema.passwordResetCodes)
    .set({ usedAt: new Date() })
    .where(eq(schema.passwordResetCodes.id, candidate.id));

  return NextResponse.json({ ok: true });
}
