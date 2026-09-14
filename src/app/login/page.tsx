"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Couldn't sign in");
      router.push(data.mustChangePassword ? "/change-password" : next);
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
        <h1 className="text-xl font-bold">Word on the Street Books</h1>
        <p className="text-sm text-stone-500">Staff sign in</p>
      </div>
      <Card>
        <CardBody className="space-y-4">
          <form className="space-y-4" onSubmit={submit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Email</label>
              <input
                type="email"
                required
                autoFocus
                className="touch-target w-full rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">Password</label>
              <input
                type="password"
                required
                className="touch-target w-full rounded-lg border border-stone-300 px-3 focus:border-stone-900 focus:outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="text-center text-sm">
            <Link href="/forgot-password" className="text-stone-500 underline underline-offset-2">
              Forgot your password?
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
