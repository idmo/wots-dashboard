import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ALLOWED_EMAIL_DOMAIN } from "@/lib/auth/constants";
import { getCurrentUser } from "@/lib/auth/session";
import { UsersPanel } from "@/components/users/UsersPanel";

// Superadmin-only staff account management (src/proxy.ts also enforces
// this — see SUPERADMIN_ONLY_PREFIXES there — this page assumes it can
// only be reached by a superadmin and doesn't re-check).
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const [users, me] = await Promise.all([
    db.query.users.findMany({
      columns: { id: true, email: true, role: true, mustChangePassword: true, createdAt: true },
      orderBy: [desc(schema.users.createdAt)],
    }),
    getCurrentUser(),
  ]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold">Staff accounts</h1>
        <p className="text-sm text-stone-500">
          Add a staff email to create an account — they&rsquo;ll get a temporary password by email
          and pick their own on first sign-in. Only @{ALLOWED_EMAIL_DOMAIN} addresses can be
          added.
        </p>
      </header>
      <UsersPanel initialUsers={users} currentUserId={me?.id ?? null} />
    </div>
  );
}
