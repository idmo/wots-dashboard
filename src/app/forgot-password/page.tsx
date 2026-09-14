"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // Always show the same result whether or not the email had an
      // account — see the Route Handler's comment for why.
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold">Forgot your password?</h1>
        <p className="text-sm text-stone-500">We&rsquo;ll email you a reset code.</p>
      </div>
      <Card>
        <CardBody className="space-y-4">
          {sent ? (
            <>
              <p className="text-sm text-stone-600">
                If <span className="font-medium">{email}</span> has an account, a reset code is
                on its way. Codes expire after 15 minutes.
              </p>
              <Button
                className="w-full"
                onClick={() => router.push(`/reset-password?email=${encodeURIComponent(email)}`)}
              >
                I have a code
              </Button>
            </>
          ) : (
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
              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? "Sending…" : "Send reset code"}
              </Button>
            </form>
          )}
          <p className="text-center text-sm">
            <Link href="/login" className="text-stone-500 underline underline-offset-2">
              Back to sign in
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
