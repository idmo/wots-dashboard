"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords don't match");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Couldn't change password");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold">Choose a new password</h1>
        <p className="text-sm text-stone-500">
          You&rsquo;re signed in with a temporary password — pick one only you know.
        </p>
      </div>
      <Card>
        <CardBody>
          <form className="space-y-4" onSubmit={submit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                Current password
              </label>
              <input
                type="password"
                required
                autoFocus
                className="touch-target w-full rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                New password
              </label>
              <input
                type="password"
                required
                minLength={8}
                className="touch-target w-full rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <p className="mt-1 text-xs text-stone-400">At least 8 characters.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                Confirm new password
              </label>
              <input
                type="password"
                required
                minLength={8}
                className="touch-target w-full rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Saving…" : "Save new password"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
