"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface OrderOption {
  id: string;
  orderNumber: string;
  courierName: string;
  awbNumber: string;
}

const inputClass = "w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none";

export function NewTicketForm({ orders }: { orders: OrderOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultOrderId = searchParams.get("orderId") || (orders[0]?.id ?? "");
  const [orderId, setOrderId] = useState(defaultOrderId);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tickets", { method: "POST", body: JSON.stringify({ orderId, subject, message }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/tickets/${data.ticket.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (orders.length === 0) {
    return <Card className="p-8 text-center text-sm text-muted">You need at least one booked shipment before you can raise a ticket.</Card>;
  }

  return (
    <Card className="space-y-4 p-5">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{error}</div>}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Order</label>
        <select className={inputClass} value={orderId} onChange={(e) => setOrderId(e.target.value)}>
          {orders.map((o) => (
            <option key={o.id} value={o.id}>{o.orderNumber} · {o.courierName} · AWB {o.awbNumber}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Subject</label>
        <input className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Shipment stuck at hub for 3 days" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted">Message to courier</label>
        <textarea
          className={`${inputClass} min-h-28 resize-y`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe the issue you'd like the courier to look into…"
        />
      </div>
      <div className="flex justify-end">
        <Button disabled={!orderId || !subject || !message || loading} onClick={submit}>
          {loading ? "Submitting…" : "Submit Ticket"}
        </Button>
      </div>
    </Card>
  );
}
