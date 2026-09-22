"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function WalletAdjustButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      await fetch("/api/admin/users", { method: "PATCH", body: JSON.stringify({ userId, amount: Number(amount), reason }) });
      setOpen(false);
      setAmount("");
      setReason("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) return <button className="text-xs font-medium text-brand" onClick={() => setOpen(true)}>Adjust</button>;

  return (
    <div className="flex items-center gap-1">
      <input placeholder="±amount" className="w-20 rounded border border-border px-2 py-1 text-xs" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <input placeholder="reason" className="w-28 rounded border border-border px-2 py-1 text-xs" value={reason} onChange={(e) => setReason(e.target.value)} />
      <Button className="px-2 py-1 text-xs" disabled={loading || !amount || !reason} onClick={submit}>Go</Button>
    </div>
  );
}
