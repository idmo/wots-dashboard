import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getCurrentUser } from "@/lib/auth/session";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Use at least 8 characters"),
});

// Used both for a forced first-login password change (users.mustChangePassword)
// and a voluntary one later — either way the current password is required.
export async function POST(request: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const user = await db.query.users.findFirst({ where: eq(schema.users.id, me.id) });
  if (!user || !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  await db
    .update(schema.users)
    .set({ passwordHash: await hashPassword(parsed.data.newPassword), mustChangePassword: false })
    .where(eq(schema.users.id, user.id));

  return NextResponse.json({ ok: true });
}
