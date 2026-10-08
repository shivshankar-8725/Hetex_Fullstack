"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ReturnModal } from "./ReturnModal";

const FINAL_STATUSES = ["DELIVERED", "RTO_DELIVERED", "CANCELLED"];
const CANCELLABLE_STATUSES = ["READY_TO_SHIP", "MANIFESTED", "PICKUP_SCHEDULED"];

export function OrderActions({ orderId, shipmentId, status }: { orderId: string; shipmentId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [activeLink, setActiveLink] = useState<"label" | "invoice" | null>(null);

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

  async function schedulePickup() {
    setLoading("pickup");
    try {
      const res = await fetch(`/api/order-pickup/${orderId}`, { method: "POST" });
      if (res.ok) {
        alert("Pickup scheduled successfully");
        router.refresh();
      } else {
        alert("Failed to schedule pickup");
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-3">
        <a href={`/api/shipment-label/${shipmentId}`} target="_blank" rel="noreferrer" onClick={() => setActiveLink("label")}>
          <Button variant={activeLink === "label" ? "primary" : "secondary"}>Download Label</Button>
        </a>
        <a href={`/api/shipment-invoice/${shipmentId}`} target="_blank" rel="noreferrer" onClick={() => setActiveLink("invoice")}>
          <Button variant={activeLink === "invoice" ? "primary" : "secondary"}>Download Invoice</Button>
        </a>
        {status === "READY_TO_SHIP" && (
          <Button variant="primary" disabled={loading !== null} onClick={schedulePickup}>
            {loading === "pickup" ? "Scheduling…" : "Schedule Pickup"}
          </Button>
        )}
        {!FINAL_STATUSES.includes(status) && status !== "NDR" && (
          <Button variant="secondary" disabled={loading !== null} onClick={simulate}>
            {loading === "simulate" ? "Advancing…" : "Simulate Next Tracking Update"}
          </Button>
        )}
        {status !== "CANCELLED" && (
          <Button variant="secondary" disabled={loading !== null} onClick={raiseDispute} title="Demo: simulate a courier flagging a weight mismatch">
            {loading === "dispute" ? "Flagging…" : "Simulate Weight Dispute"}
          </Button>
        )}
        {status === "DELIVERED" && (
          <Button variant="primary" onClick={() => setShowReturnModal(true)}>
            Initiate Return
          </Button>
        )}
        <Button variant="secondary" onClick={() => router.push(`/tickets/new?orderId=${orderId}`)}>
          Raise Support Ticket
        </Button>
        {CANCELLABLE_STATUSES.includes(status) && (
          <Button variant="secondary" disabled={loading !== null} onClick={cancel}>
            {loading === "cancel" ? "Cancelling…" : "Cancel Shipment"}
          </Button>
        )}
      </div>
      
      {showReturnModal && (
        <ReturnModal orderId={orderId} onClose={() => setShowReturnModal(false)} />
      )}
    </>
  );
}
