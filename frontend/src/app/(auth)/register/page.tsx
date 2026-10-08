"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PublicTrackingBox } from "@/components/auth/PublicTrackingBox";

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
    <div className="w-full rounded-2xl border border-border bg-surface p-8 shadow-elevated">

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
          Already have an account? <Link href="/login" className="font-medium text-blue-600 hover:underline">Log in</Link>
        </p>
        <PublicTrackingBox />
      </div>
  );
}
