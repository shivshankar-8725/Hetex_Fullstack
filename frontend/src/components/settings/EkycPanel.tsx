"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";

interface Props {
  kycStatus: "PENDING" | "VERIFIED" | "REJECTED";
  panNumber: string | null;
  gstNumber: string | null;
}

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function EkycPanel({ kycStatus, panNumber, gstNumber }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [pan, setPan] = useState(panNumber ?? "");
  const [gst, setGst] = useState(gstNumber ?? "");
  const [consent, setConsent] = useState(false);
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendOtp() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-gst-otp", {
        method: "POST",
        body: JSON.stringify({ gstNumber: gst }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDevOtp(data.devOtp ?? null);
      setStep("otp");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/submit-ekyc", {
        method: "POST",
        body: JSON.stringify({ panNumber: pan.toUpperCase(), gstNumber: gst.toUpperCase(), gstOtp: otp, consent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (kycStatus === "VERIFIED") {
    return (
      <Card>
        <CardHeader title="eKYC Verification" action={<StatusBadge status="VERIFIED" />} />
        <div className="flex items-center gap-3 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-success">
            <Icon name="check" className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Your identity is verified</p>
            <p className="text-xs text-muted">PAN on file: {panNumber}{gstNumber ? ` · GSTIN: ${gstNumber}` : ""}</p>
          </div>
        </div>
      </Card>
    );
  }

  const panValid = pan.length === 10;
  const gstValid = GSTIN_PATTERN.test(gst);

  return (
    <Card>
      <CardHeader title="eKYC Verification" action={<StatusBadge status={kycStatus} />} />
      <div className="space-y-3 p-5">
        {kycStatus === "REJECTED" && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">
            Your last submission couldn&apos;t be verified — double-check your PAN and GSTIN and try again.
          </div>
        )}
        {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{error}</div>}

        {step === "form" && (
          <>
            <p className="text-sm text-muted">
              Verify your PAN and GSTIN to unlock full wallet limits and COD remittance. We&apos;ll send an OTP to
              the mobile number registered against your GSTIN.
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">PAN Number</label>
              <input
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase().slice(0, 10))}
                placeholder="ABCDE1234F"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm uppercase tracking-wider focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">GSTIN</label>
              <input
                value={gst}
                onChange={(e) => setGst(e.target.value.toUpperCase().slice(0, 15))}
                placeholder="27ABCDE1234F1Z5"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm uppercase tracking-wider focus:border-brand focus:outline-none"
              />
            </div>
            <label className="flex items-start gap-2 text-xs text-muted">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
              I authorize HetEx to verify this PAN/GSTIN for identity and tax compliance purposes.
            </label>
            <Button disabled={!panValid || !gstValid || !consent || loading} onClick={sendOtp}>
              {loading ? "Sending OTP…" : "Send GST OTP"}
            </Button>
          </>
        )}

        {step === "otp" && (
          <>
            <p className="text-sm text-muted">
              Enter the OTP sent to the mobile number registered against GSTIN <strong>{gst}</strong>.
            </p>
            {devOtp && (
              <div className="rounded-lg bg-accent-light px-4 py-3 text-sm text-accent-dark">
                Demo mode — your OTP is <strong>{devOtp}</strong>
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">OTP</label>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm tracking-widest focus:border-brand focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={loading} onClick={() => setStep("form")}>
                Back
              </Button>
              <Button disabled={otp.length < 4 || loading} onClick={submit}>
                {loading ? "Verifying…" : "Verify Now"}
              </Button>
            </div>
            <button type="button" onClick={sendOtp} disabled={loading} className="text-xs font-medium text-brand hover:underline">
              Resend OTP
            </button>
          </>
        )}
      </div>
    </Card>
  );
}
