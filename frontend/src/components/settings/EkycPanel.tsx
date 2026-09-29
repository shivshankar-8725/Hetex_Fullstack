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
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const AADHAAR_PATTERN = /^[0-9]{12}$/;

export function EkycPanel({ kycStatus, panNumber, gstNumber }: Props) {
  const router = useRouter();
  const [docType, setDocType] = useState<"PAN" | "AADHAAR" | "GST">("GST");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [docNumber, setDocNumber] = useState(gstNumber || panNumber || "");
  const [pan, setPan] = useState(panNumber ?? "");
  const [consent, setConsent] = useState(false);
  const [otp, setOtp] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendKycOtp() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-kyc-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType: docType, documentNumber: docNumber.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      setReferenceId(data.referenceId || "");
      setDevOtp(data.devOtp || null);
      setStep("otp");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function verifyKycOtp() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-kyc-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: docType,
          documentNumber: docNumber.trim().toUpperCase(),
          referenceId,
          otp,
          consent: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "OTP Verification failed");
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
            <p className="text-xs text-muted">PAN on file: {panNumber || "VERIFIED"}{gstNumber ? ` · GSTIN: ${gstNumber}` : ""}</p>
          </div>
        </div>
      </Card>
    );
  }

  const isDocValid =
    docType === "PAN"
      ? PAN_PATTERN.test(docNumber.trim().toUpperCase())
      : docType === "GST"
      ? GSTIN_PATTERN.test(docNumber.trim().toUpperCase())
      : AADHAAR_PATTERN.test(docNumber.trim());

  return (
    <Card>
      <CardHeader title="eKYC Verification" action={<StatusBadge status={kycStatus} />} />
      <div className="space-y-4 p-5">
        {kycStatus === "REJECTED" && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">
            Your last submission couldn&apos;t be verified — double-check your document number and try again.
          </div>
        )}
        {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{error}</div>}

        {step === "form" && (
          <>
            <p className="text-sm text-muted">
              Verify your identity using <strong>Aadhaar OTP</strong>, <strong>GSTIN OTP</strong>, or <strong>PAN</strong> to unlock wallet limits and instant COD payouts.
            </p>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Verification Document Type</label>
              <div className="flex gap-2">
                {(["GST", "AADHAAR", "PAN"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setDocType(t);
                      setDocNumber("");
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors ${
                      docType === t
                        ? "border-brand bg-brand-light text-brand"
                        : "border-border bg-surface text-muted hover:bg-slate-50"
                    }`}
                  >
                    {t === "GST" ? "GSTIN OTP" : t === "AADHAAR" ? "Aadhaar OTP" : "PAN Card"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                {docType === "GST" ? "GSTIN Number" : docType === "AADHAAR" ? "12-Digit Aadhaar Number" : "10-Character PAN Number"}
              </label>
              <input
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value.toUpperCase())}
                placeholder={
                  docType === "GST"
                    ? "27ABCDE1234F1Z5"
                    : docType === "AADHAAR"
                    ? "987654321098"
                    : "ABCDE1234F"
                }
                className="w-full rounded-lg border border-border px-3 py-2 text-sm uppercase tracking-wider focus:border-brand focus:outline-none"
              />
            </div>

            <label className="flex items-start gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5"
              />
              I authorize HetEx to perform eKYC verification against government and tax records for compliance.
            </label>

            <Button disabled={!isDocValid || !consent || loading} onClick={sendKycOtp}>
              {loading ? "Requesting OTP…" : `Request ${docType} OTP`}
            </Button>
          </>
        )}

        {step === "otp" && (
          <>
            <p className="text-sm text-muted">
              Enter the OTP sent to the mobile number registered against <strong>{docNumber}</strong>.
            </p>
            {devOtp && (
              <div className="rounded-lg bg-accent-light px-4 py-3 text-sm text-accent-dark font-medium">
                Verification OTP: <strong className="text-brand font-bold text-base ml-1">{devOtp}</strong>
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">OTP Code</label>
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
              <Button disabled={otp.length < 4 || loading} onClick={verifyKycOtp}>
                {loading ? "Verifying eKYC…" : "Verify eKYC Now"}
              </Button>
            </div>
            <button
              type="button"
              onClick={sendKycOtp}
              disabled={loading}
              className="text-xs font-medium text-brand hover:underline"
            >
              Resend OTP
            </button>
          </>
        )}
      </div>
    </Card>
  );
}
