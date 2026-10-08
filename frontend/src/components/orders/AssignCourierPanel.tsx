"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface AssignCourierPanelProps {
  orderId: string;
}

export function AssignCourierPanel({ orderId }: AssignCourierPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function autoAssign() {
    setLoading("auto");
    try {
      const res = await fetch(`/api/order-assign/${orderId}/auto`, { method: "POST" });
      if (res.ok) router.refresh();
      else alert("Failed to auto-assign courier. Please ensure Auto-Assign is configured.");
    } finally {
      setLoading(null);
    }
  }

  async function manualAssign() {
    setLoading("manual");
    try {
      // Hardcoded for demo - in reality would come from a dropdown
      const courierId = prompt("Enter Courier ID (e.g. 1):", "1");
      if (!courierId) return;
      
      const res = await fetch(`/api/order-assign/${orderId}/manual`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courierId: parseInt(courierId, 10) })
      });
      if (res.ok) router.refresh();
      else alert("Failed to assign courier.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-3 mt-4">
      <p className="w-full text-sm font-semibold mb-2">Assign Courier (Shipmozo)</p>
      <Button variant="primary" disabled={loading !== null} onClick={autoAssign}>
        {loading === "auto" ? "Assigning..." : "Auto-Assign Courier"}
      </Button>
      <Button variant="secondary" disabled={loading !== null} onClick={manualAssign}>
        {loading === "manual" ? "Assigning..." : "Select Courier Manually"}
      </Button>
    </div>
  );
}
