"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PublicTrackingBox } from "@/components/auth/PublicTrackingBox";

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
  const [showPassword, setShowPassword] = useState(false);
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
      const targetUrl = data.user?.role === "ADMIN" ? "/admin" : next;
      window.location.href = targetUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full rounded-2xl border border-border bg-surface p-8 shadow-elevated">
      <h1 className="text-xl font-bold text-foreground">Log in to your dashboard</h1>
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
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-foreground">Password</label>
              <Link href="/forgot-password" className="text-xs font-medium text-brand hover:underline">Forgot password?</Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-border px-3 py-2 pr-10 text-sm focus:border-brand focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
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
          New here? <Link href="/register" className="font-medium text-blue-600 hover:underline">Create an account</Link>
        </p>

        <p className="mt-4 text-center text-xs text-muted">
          Demo seller: meena@zubera.one / Demo@123 · Demo admin: admin@hetex.com / Admin@123
        </p>
        <PublicTrackingBox />
      </div>
  );
}
