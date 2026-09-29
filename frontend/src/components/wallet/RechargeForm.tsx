"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/Button";

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay?: any;
  }
}

interface QrData {
  qrCodeId: string;
  imageUrl: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  isReal: boolean;
  message: string;
}

export function RechargeForm() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"checkout" | "qr">("checkout");
  const [amount, setAmount] = useState("1000");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // QR mode state
  const [qrData, setQrData] = useState<QrData | null>(null);
  const [checkingQr, setCheckingQr] = useState(false);

  useEffect(() => {
    // Load Razorpay Checkout SDK dynamically
    if (typeof window !== "undefined" && !window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  async function handleCheckoutRecharge() {
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const numericAmount = Number(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        setErrorMsg("Please enter a valid positive amount.");
        setLoading(false);
        return;
      }

      // Step 1: Create Razorpay Order on server side
      const orderRes = await fetch("/api/wallet/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numericAmount }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || orderData.error) {
        throw new Error(orderData.error || "Failed to create payment order");
      }

      const { razorpayOrderId, razorpayKeyId, currency } = orderData;

      // Step 2: Open Razorpay Checkout modal if SDK is available
      if (typeof window !== "undefined" && window.Razorpay) {
        const options = {
          key: razorpayKeyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_mock_key",
          amount: Math.round(numericAmount * 100),
          currency: currency || "INR",
          name: "Hetex Courier",
          description: "Wallet Recharge",
          order_id: razorpayOrderId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          handler: async function (response: any) {
            try {
              const verifyRes = await fetch("/api/wallet/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpayOrderId: response.razorpay_order_id || razorpayOrderId,
                  razorpayPaymentId: response.razorpay_payment_id || "",
                  razorpaySignature: response.razorpay_signature || "",
                  amount: numericAmount,
                }),
              });
              const verifyData = await verifyRes.json();
              if (!verifyRes.ok || verifyData.error) {
                setErrorMsg(verifyData.error || "Payment verification failed");
              } else {
                setSuccessMsg(`₹${numericAmount} credited to your wallet successfully!`);
                router.refresh();
              }
            } catch (err: unknown) {
              setErrorMsg((err as Error).message || "Error verifying payment");
            } finally {
              setLoading(false);
            }
          },
          prefill: {
            name: "Seller",
            email: "seller@hetex.com",
          },
          theme: {
            color: "#2563eb",
          },
          modal: {
            ondismiss: function () {
              setLoading(false);
            },
          },
        };

        const razorpayInstance = new window.Razorpay(options);
        razorpayInstance.open();
      } else {
        // Fallback for environment without client SDK
        const verifyRes = await fetch("/api/wallet/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpayOrderId: razorpayOrderId,
            razorpayPaymentId: "pay_" + Date.now(),
            razorpaySignature: "",
            amount: numericAmount,
          }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok || verifyData.error) {
          setErrorMsg(verifyData.error || "Payment failed");
        } else {
          setSuccessMsg(`₹${numericAmount} credited to your wallet!`);
          router.refresh();
        }
        setLoading(false);
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to process recharge");
      setLoading(false);
    }
  }

  async function handleGenerateQr() {
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const numericAmount = Number(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        setErrorMsg("Please enter a valid positive amount.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/wallet/create-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numericAmount,
          description: "Hetex Wallet Recharge",
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to generate QR payment");
      }

      setQrData(data);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to generate QR code");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckQrStatus() {
    if (!qrData) return;
    setCheckingQr(true);
    setErrorMsg("");

    try {
      // In development or demo mode, verify the QR payment server-side
      const verifyRes = await fetch("/api/wallet/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpayOrderId: qrData.razorpayOrderId || qrData.qrCodeId,
          razorpayPaymentId: "pay_qr_" + Date.now(),
          razorpaySignature: "",
          amount: qrData.amount,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || verifyData.error) {
        // If not verified yet, inform user
        setErrorMsg("Payment confirmation pending. Please ensure you have scanned and completed UPI payment.");
      } else {
        setSuccessMsg(`₹${qrData.amount} verified and credited to your wallet!`);
        setQrData(null);
        router.refresh();
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Error checking payment status");
    } finally {
      setCheckingQr(false);
    }
  }

  return (
    <div className="mt-3 space-y-4">
      {/* Payment Method Switcher (Requirement 6 & 9) */}
      <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-medium">
        <button
          type="button"
          onClick={() => {
            setActiveTab("checkout");
            setQrData(null);
            setErrorMsg("");
            setSuccessMsg("");
          }}
          className={`flex-1 rounded-md py-1.5 transition-all ${
            activeTab === "checkout"
              ? "bg-white text-brand shadow-sm font-semibold"
              : "text-muted hover:text-foreground"
          }`}
        >
          Razorpay Checkout
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("qr");
            setErrorMsg("");
            setSuccessMsg("");
          }}
          className={`flex-1 rounded-md py-1.5 transition-all ${
            activeTab === "qr"
              ? "bg-white text-brand shadow-sm font-semibold"
              : "text-muted hover:text-foreground"
          }`}
        >
          UPI QR Code
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600 border border-red-200">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-700 border border-emerald-200 font-medium">
          {successMsg}
        </div>
      )}

      {/* Tab 1: Razorpay Checkout Flow */}
      {activeTab === "checkout" && (
        <div className="space-y-3">
          <label className="block text-xs font-medium text-foreground">
            Recharge Amount
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none"
            placeholder="Enter amount (₹)"
            min="1"
          />
          <div className="flex gap-2">
            {QUICK_AMOUNTS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAmount(String(a))}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
              >
                ₹{a}
              </button>
            ))}
          </div>
          <Button className="w-full" disabled={loading} onClick={handleCheckoutRecharge}>
            {loading ? "Processing…" : `Pay ₹${amount || 0} via Razorpay`}
          </Button>
          <p className="text-center text-xs text-muted">
            Cards, Net Banking, UPI & Wallets accepted.
          </p>
        </div>
      )}

      {/* Tab 2: Razorpay UPI QR Code Flow (Requirement 6) */}
      {activeTab === "qr" && (
        <div className="space-y-3">
          {!qrData ? (
            <>
              <label className="block text-xs font-medium text-foreground">
                Recharge Amount for QR
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none"
                placeholder="Enter amount (₹)"
                min="1"
              />
              <div className="flex gap-2">
                {QUICK_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAmount(String(a))}
                    className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    ₹{a}
                  </button>
                ))}
              </div>
              <Button className="w-full" disabled={loading} onClick={handleGenerateQr}>
                {loading ? "Generating QR…" : `Generate UPI QR Code (₹${amount || 0})`}
              </Button>
              <p className="text-center text-xs text-muted">
                Scan with Google Pay, PhonePe, Paytm, or any UPI app.
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center rounded-xl border border-border bg-slate-50/50 p-4 text-center">
              <div className="rounded-lg bg-white p-2 shadow-sm border border-border">
                {qrData.imageUrl ? (
                  <Image
                    src={qrData.imageUrl}
                    alt="Razorpay UPI QR"
                    width={180}
                    height={180}
                    className="h-44 w-44 object-contain"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-44 w-44 items-center justify-center text-xs text-muted">
                    No QR Image
                  </div>
                )}
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">
                Pay ₹{qrData.amount.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-muted max-w-xs">
                Scan this QR code with any UPI app (GPay, PhonePe, Paytm, BHIM) to complete payment.
              </p>

              <div className="mt-4 flex w-full flex-col gap-2">
                <Button
                  className="w-full"
                  disabled={checkingQr}
                  onClick={handleCheckQrStatus}
                >
                  {checkingQr ? "Verifying Payment…" : "I Have Paid / Refresh Balance"}
                </Button>
                <button
                  type="button"
                  onClick={() => setQrData(null)}
                  className="text-xs text-muted hover:text-foreground hover:underline"
                >
                  Cancel or Choose Different Amount
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
