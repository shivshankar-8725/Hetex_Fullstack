"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

const inputClass = "w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"details" | "verify">("details");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmitDetails = name.trim() && email.trim() && phone.length === 10 && password.length >= 6;

  async function register() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, phone, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDevOtp(data.devOtp);
      setStep("verify");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email", { method: "POST", body: JSON.stringify({ email, code }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/resend-email-otp", { method: "POST", body: JSON.stringify({ email }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDevOtp(data.devOtp);
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

        {step === "details" && (
          <>
            <h1 className="text-lg font-semibold text-foreground">Create your account</h1>
            <p className="mt-1 text-sm text-muted">We&apos;ll send a verification code to your email before you can log in.</p>

            <div className="mt-6 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Full name</label>
                <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Meena Lodhi" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Email</label>
                <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Mobile number</label>
                <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile number" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Password</label>
                <input type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
              </div>
              <Button className="w-full" disabled={!canSubmitDetails || loading} onClick={register}>
                {loading ? "Sending code…" : "Create Account"}
              </Button>
            </div>
          </>
        )}

        {step === "verify" && (
          <>
            <h1 className="text-lg font-semibold text-foreground">Verify your email</h1>
            <p className="mt-1 text-sm text-muted">Enter the 6-digit code sent to <span className="font-medium text-foreground">{email}</span>.</p>

            <div className="mt-6 space-y-3">
              {devOtp && (
                <p className="rounded-lg bg-brand-light px-3 py-2 text-xs text-brand">
                  Demo mode — your code is <span className="font-mono font-semibold">{devOtp}</span> (would normally be emailed)
                </p>
              )}
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code"
                className={`${inputClass} tracking-widest`}
              />
              <Button className="w-full" disabled={code.length !== 6 || loading} onClick={verify}>
                {loading ? "Verifying…" : "Verify & Continue"}
              </Button>
              <button className="w-full text-center text-xs text-muted hover:underline" onClick={resendCode} disabled={loading}>
                Resend code
              </button>
            </div>
          </>
        )}

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <p className="mt-4 text-center text-xs text-muted">
          Already have an account? <Link href="/login" className="font-medium text-brand hover:underline">Log in</Link>
        </p>
        <div className="mt-8 rounded-xl border border-brand/20 bg-brand-light/30 p-4">
          <Link href="/track" className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-white shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <div>
                <p className="font-semibold text-brand">Track your shipment here</p>
                <p className="text-xs text-muted">No account required</p>
              </div>
            </div>
            <div className="text-brand transition-transform group-hover:translate-x-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
