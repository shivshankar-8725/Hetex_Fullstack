"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const FINAL_STATUSES = ["DELIVERED", "RTO_DELIVERED", "CANCELLED"];
const CANCELLABLE_STATUSES = ["READY_TO_SHIP", "MANIFESTED", "PICKUP_SCHEDULED"];

export function OrderActions({ orderId, shipmentId, status }: { orderId: string; shipmentId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function simulate() {
    setLoading("simulate");
    try {
      await fetch(`/api/shipment-simulate/${shipmentId}`, { method: "POST" });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function cancel() {
    setLoading("cancel");
    try {
      await fetch(`/api/order-cancel/${orderId}`, { method: "POST" });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function raiseDispute() {
    setLoading("dispute");
    try {
      const res = await fetch(`/api/shipment-raise-dispute/${shipmentId}`, { method: "POST" });
      if (res.ok) router.push("/disputes");
      else router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-3">
      <a href={`/api/shipment-label/${shipmentId}`} target="_blank" rel="noreferrer">
        <Button variant="secondary">Download Label</Button>
      </a>
      <a href={`/api/shipment-invoice/${shipmentId}`} target="_blank" rel="noreferrer">
        <Button variant="secondary">Download Invoice</Button>
      </a>
      {!FINAL_STATUSES.includes(status) && status !== "NDR" && (
        <Button variant="secondary" disabled={loading !== null} onClick={simulate}>
          {loading === "simulate" ? "Advancing…" : "Simulate Next Tracking Update"}
        </Button>
      )}
      {CANCELLABLE_STATUSES.includes(status) && (
        <Button variant="danger" disabled={loading !== null} onClick={cancel}>
          {loading === "cancel" ? "Cancelling…" : "Cancel Order"}
        </Button>
      )}
      {status !== "CANCELLED" && (
        <Button variant="secondary" disabled={loading !== null} onClick={raiseDispute} title="Demo: simulate a courier flagging a weight mismatch">
          {loading === "dispute" ? "Flagging…" : "Simulate Weight Dispute"}
        </Button>
      )}
    </div>
  );
}
