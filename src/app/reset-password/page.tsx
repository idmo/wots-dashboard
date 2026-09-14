"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords don't match");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Couldn't reset password");
      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold">Reset your password</h1>
        <p className="text-sm text-stone-500">Enter the code we emailed you.</p>
      </div>
      <Card>
        <CardBody>
          {done ? (
            <p className="text-sm text-emerald-700">Password updated — taking you to sign in…</p>
          ) : (
            <form className="space-y-4" onSubmit={submit}>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">Email</label>
                <input
                  type="email"
                  required
                  className="touch-target w-full rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">
                  6-digit code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={6}
                  autoFocus
                  className="touch-target w-full rounded-lg border border-stone-300 px-3 tracking-widest focus:border-stone-900 focus:outline-none"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
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
                {submitting ? "Resetting…" : "Reset password"}
              </Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm">
            <Link href="/login" className="text-stone-500 underline underline-offset-2">
              Back to sign in
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
