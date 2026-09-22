"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [loading, setLoading] = useState(false);

  async function login() {
    setError(null);
    setUnverified(false);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) {
        if (typeof data.error === "string" && data.error.toLowerCase().includes("verify")) setUnverified(true);
        throw new Error(data.error);
      }
      router.push(data.user?.role === "ADMIN" ? "/admin" : next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-card">
        <div className="mb-6">
          <Logo />
        </div>
        <h1 className="text-lg font-semibold text-foreground">Log in to your dashboard</h1>
        <p className="mt-1 text-sm text-muted">Compare couriers, book shipments, and track deliveries.</p>

        <div className="mt-6 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@business.com"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <Button className="w-full" disabled={!email || !password || loading} onClick={login}>
            {loading ? "Logging in…" : "Log In"}
          </Button>
        </div>

        {error && (
          <div className="mt-3 text-sm text-danger">
            {error}
            {unverified && (
              <>
                {" "}
                <Link href="/register" className="font-medium underline">Verify it now</Link>
              </>
            )}
          </div>
        )}

        <p className="mt-4 text-center text-xs text-muted">
          New here? <Link href="/register" className="font-medium text-brand hover:underline">Create an account</Link>
        </p>

        <p className="mt-4 text-center text-xs text-muted">
          Demo seller: meena@zubera.one / Demo@123 · Demo admin: admin@hetex.com / Admin@123
        </p>
      </div>
    </div>
  );
}
