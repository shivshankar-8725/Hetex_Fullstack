"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

export function RechargeForm() {
  const router = useRouter();
  const [amount, setAmount] = useState("1000");
  const [loading, setLoading] = useState(false);

  async function recharge() {
    setLoading(true);
    try {
      await fetch("/api/wallet/recharge", { method: "POST", body: JSON.stringify({ amount: Number(amount) }) });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2 space-y-3">
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none"
      />
      <div className="flex gap-2">
        {QUICK_AMOUNTS.map((a) => (
          <button key={a} onClick={() => setAmount(String(a))} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200">
            ₹{a}
          </button>
        ))}
      </div>
      <Button className="w-full" disabled={loading} onClick={recharge}>
        {loading ? "Processing…" : "Recharge via Razorpay"}
      </Button>
      <p className="text-center text-xs text-muted">Demo mode: payment always succeeds instantly.</p>
    </div>
  );
}
