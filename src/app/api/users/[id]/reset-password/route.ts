import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { generateDefaultPassword, hashPassword } from "@/lib/auth/password";
import { isEmailMockEnabled, sendPasswordResetByAdminEmail } from "@/lib/services/email";
import { getCurrentUser } from "@/lib/auth/session";

// POST /api/users/[id]/reset-password — superadmin generates a fresh
// temporary password for an existing account (e.g. the user forgot their
// old one and can't get the "forgot password" email, or an admin just
// wants to rotate it). Signs the user out everywhere, since their
// password just changed out from under them.
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/users/[id]/reset-password">
) {
  const me = await getCurrentUser();
  if (!me || me.role !== "superadmin") {
    return NextResponse.json({ error: "Superadmin access required" }, { status: 403 });
  }

  const { id } = await params;
  const userId = Number(id);
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const temporaryPassword = generateDefaultPassword();
  await db
    .update(schema.users)
    .set({ passwordHash: await hashPassword(temporaryPassword), mustChangePassword: true })
    .where(eq(schema.users.id, userId));

  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));

  await sendPasswordResetByAdminEmail(user.email, temporaryPassword);

  return NextResponse.json({
    ok: true,
    temporaryPassword: isEmailMockEnabled() ? temporaryPassword : undefined,
  });
}
