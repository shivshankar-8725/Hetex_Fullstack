"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const inputClass = "w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "reset">("request");
  
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestReset() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-password-reset", { method: "POST", body: JSON.stringify({ email }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDevOtp(data.devOtp);
      setStep("reset");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ email, code, newPassword }) });
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

  return (
    <div className="w-full rounded-2xl border border-border bg-surface p-8 shadow-elevated">
      
      {step === "request" && (
        <>
          <h1 className="text-xl font-bold text-foreground">Reset Password</h1>
          <p className="mt-1 text-sm text-muted">Enter your email and we'll send you a code to reset your password.</p>

          <div className="mt-6 space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com"
                className={inputClass}
              />
            </div>
            
            <Button className="w-full mt-2" disabled={!email || loading} onClick={requestReset}>
              {loading ? "Sending code…" : "Send Reset Code"}
            </Button>
          </div>
        </>
      )}

      {step === "reset" && (
        <>
          <h1 className="text-xl font-bold text-foreground">Create New Password</h1>
          <p className="mt-1 text-sm text-muted">Enter the 6-digit code sent to <span className="font-medium text-foreground">{email}</span>.</p>

          <div className="mt-6 space-y-3">
            {devOtp && (
              <p className="rounded-lg bg-brand-light px-3 py-2 text-xs text-brand">
                Demo mode — your code is <span className="font-mono font-semibold">{devOtp}</span> (would normally be emailed)
              </p>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Verification Code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code"
                className={`${inputClass} tracking-widest`}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className={`${inputClass} pr-10`}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
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

            <Button className="w-full mt-2" disabled={code.length !== 6 || newPassword.length < 6 || loading} onClick={resetPassword}>
              {loading ? "Resetting…" : "Reset & Log In"}
            </Button>
          </div>
        </>
      )}

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <p className="mt-4 text-center text-xs text-muted">
        Remembered your password? <Link href="/login" className="font-medium text-blue-600 hover:underline">Log in</Link>
      </p>
    </div>
  );
}
