"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

type StaffUser = {
  id: number;
  email: string;
  role: "staff" | "superadmin";
  mustChangePassword: boolean;
  createdAt: string | Date;
};

export function UsersPanel({
  initialUsers,
  currentUserId,
}: {
  initialUsers: StaffUser[];
  currentUserId: number | null;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [email, setEmail] = useState("");
  const [makeSuperadmin, setMakeSuperadmin] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<{ email: string; password: string } | null>(null);

  async function addUser(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAdding(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: makeSuperadmin ? "superadmin" : "staff" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.error?.formErrors?.[0] || data?.error?.fieldErrors?.email?.[0] || data?.error || "Couldn't add user"
        );
      }
      setUsers((prev) => [data.user, ...prev]);
      setEmail("");
      setMakeSuperadmin(false);
      if (data.temporaryPassword) {
        setRevealed({ email: data.user.email, password: data.temporaryPassword });
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAdding(false);
    }
  }

  async function resetPassword(userId: number, userEmail: string) {
    if (
      !confirm(
        `Reset ${userEmail}'s password? They'll be signed out everywhere and get a new temporary password.`
      )
    ) {
      return;
    }
    setBusyId(userId);
    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Couldn't reset password");
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, mustChangePassword: true } : u)));
      if (data.temporaryPassword) {
        setRevealed({ email: userEmail, password: data.temporaryPassword });
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  async function removeUser(userId: number, userEmail: string) {
    if (!confirm(`Remove ${userEmail}'s account? They'll lose access immediately.`)) return;
    setBusyId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Couldn't remove user");
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {revealed && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">
            Email sending is mocked (EMAIL_MOCK=true) — here&rsquo;s the temporary password
            instead of an email:
          </p>
          <p className="mt-1">
            <span className="font-medium">{revealed.email}</span> —{" "}
            <code className="rounded bg-amber-100 px-1.5 py-0.5">{revealed.password}</code>
          </p>
          <button className="mt-2 text-xs underline" onClick={() => setRevealed(null)}>
            Dismiss
          </button>
        </div>
      )}

      <Card>
        <CardBody>
          <form onSubmit={addUser} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1">
              <label className="mb-1 block text-sm font-medium text-stone-700">
                Add staff by email
              </label>
              <input
                type="email"
                required
                placeholder="name@wordonthestreetbooks.com"
                className="touch-target w-full rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <label className="mb-2 flex items-center gap-2 text-sm text-stone-600">
              <input
                type="checkbox"
                className="h-4 w-4 accent-stone-900"
                checked={makeSuperadmin}
                onChange={(e) => setMakeSuperadmin(e.target.checked)}
              />
              Superadmin
            </label>
            <Button type="submit" disabled={adding}>
              {adding ? "Adding…" : "+ Add"}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </CardBody>
      </Card>

      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50 text-left text-xs uppercase text-stone-400">
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Added</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-stone-400">
                    No staff accounts yet.
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="border-b border-stone-50">
                  <td className="px-4 py-2 font-medium text-stone-900">{u.email}</td>
                  <td className="px-4 py-2 capitalize text-stone-600">{u.role}</td>
                  <td className="px-4 py-2 text-stone-500">
                    {u.mustChangePassword ? "Awaiting first sign-in" : "Active"}
                  </td>
                  <td className="px-4 py-2 text-stone-500">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="md"
                        variant="ghost"
                        disabled={busyId === u.id}
                        onClick={() => resetPassword(u.id, u.email)}
                      >
                        Reset password
                      </Button>
                      <Button
                        size="md"
                        variant="danger"
                        disabled={busyId === u.id || u.id === currentUserId}
                        onClick={() => removeUser(u.id, u.email)}
                      >
                        Remove
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
