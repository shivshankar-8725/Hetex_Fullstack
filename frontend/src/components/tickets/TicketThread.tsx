"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";

interface TicketMessage {
  id: string;
  senderRole: string;
  message: string;
  createdAt: string;
}

interface TicketDetail {
  id: string;
  orderNumber: string;
  courierName: string;
  subject: string;
  status: string;
  createdAt: string;
  messages: TicketMessage[];
}

export function TicketThread({ initial }: { initial: TicketDetail }) {
  const router = useRouter();
  const [ticket, setTicket] = useState(initial);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendReply() {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/ticket-messages/${ticket.id}`, { method: "POST", body: JSON.stringify({ message: reply }) });
      const data = await res.json();
      if (res.ok) {
        setTicket(data.ticket);
        setReply("");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function simulateReply() {
    setBusy(true);
    try {
      const res = await fetch(`/api/ticket-simulate-reply/${ticket.id}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setTicket(data.ticket);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{ticket.subject}</h1>
          <p className="text-sm text-muted">{ticket.orderNumber} · {ticket.courierName}</p>
        </div>
        <StatusBadge status={ticket.status} />
      </div>

      <Card>
        <CardHeader title="Conversation" />
        <div className="space-y-4 p-5">
          {ticket.messages.map((m) => (
            <div key={m.id} className={clsx("flex", m.senderRole === "SELLER" ? "justify-end" : "justify-start")}>
              <div
                className={clsx(
                  "max-w-md rounded-2xl px-4 py-3 text-sm",
                  m.senderRole === "SELLER" ? "bg-brand text-white" : "bg-slate-100 text-foreground"
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{m.senderRole === "SELLER" ? "You" : ticket.courierName}</p>
                <p className="mt-1 whitespace-pre-wrap">{m.message}</p>
                <p className="mt-1.5 text-[11px] opacity-60">{new Date(m.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3 border-t border-border p-5">
          <textarea
            className="min-h-20 w-full resize-y rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none"
            placeholder="Write a reply…"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
          <div className="flex justify-between">
            <Button variant="secondary" disabled={busy} onClick={simulateReply} title="Demo: simulate the courier's support desk replying">
              Simulate Vendor Reply
            </Button>
            <Button disabled={busy || !reply.trim()} onClick={sendReply}>Send Reply</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
