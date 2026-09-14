import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

// DELETE /api/users/[id] — remove a staff account. Superadmin only, and
// guarded against locking the store out of admin access: you can't delete
// your own account, and you can't delete the last remaining superadmin.
export async function DELETE(request: Request, { params }: RouteContext<"/api/users/[id]">) {
  const me = await getCurrentUser();
  if (!me || me.role !== "superadmin") {
    return NextResponse.json({ error: "Superadmin access required" }, { status: 403 });
  }

  const { id } = await params;
  const userId = Number(id);

  if (userId === me.id) {
    return NextResponse.json({ error: "You can't remove your own account" }, { status: 400 });
  }

  const target = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (target.role === "superadmin") {
    const otherSuperadmins = await db.query.users.findMany({
      where: eq(schema.users.role, "superadmin"),
      columns: { id: true },
    });
    if (otherSuperadmins.filter((u) => u.id !== userId).length === 0) {
      return NextResponse.json(
        { error: "Can't remove the last superadmin account" },
        { status: 400 }
      );
    }
  }

  await db.delete(schema.users).where(eq(schema.users.id, userId));

  return NextResponse.json({ ok: true });
}
