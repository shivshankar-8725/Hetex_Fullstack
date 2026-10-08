"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface ReturnModalProps {
  orderId: string;
  onClose: () => void;
}

interface ReturnReason {
  id: string;
  title: string;
}

export function ReturnModal({ orderId, onClose }: ReturnModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reasons, setReasons] = useState<ReturnReason[]>([]);
  const [selectedReason, setSelectedReason] = useState("");
  const [loadingReasons, setLoadingReasons] = useState(false);
  
  // Dummy fetch since we don't have the real API hooked to Next.js route yet
  const fetchReasons = async () => {
    setLoadingReasons(true);
    try {
      const res = await fetch(`/api/returns/reasons`);
      if (res.ok) {
         const data = await res.json();
         setReasons(data.reasons || [{ id: "9", title: "Item is damaged" }, { id: "14", title: "Other" }]);
      } else {
        setReasons([{ id: "9", title: "Item is damaged" }, { id: "14", title: "Other" }]);
      }
    } catch (err) {
      setReasons([{ id: "9", title: "Item is damaged" }, { id: "14", title: "Other" }]);
    } finally {
      setLoadingReasons(false);
    }
  };

  useState(() => { fetchReasons(); });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason) {
      alert("Please select a reason");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`/api/returns/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, returnReasonId: selectedReason, customerRequest: "REFUND" })
      });
      if (res.ok) {
        alert("Return initiated successfully!");
        onClose();
        router.refresh();
      } else {
        alert("Failed to initiate return.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold">Initiate Return</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Return Reason</label>
            <select 
              className="w-full rounded-lg border border-border p-2" 
              value={selectedReason} 
              onChange={(e) => setSelectedReason(e.target.value)}
              disabled={loadingReasons}
            >
              <option value="">Select a reason...</option>
              {reasons.map(r => (
                <option key={r.id} value={r.id}>{r.title}</option>
              ))}
            </select>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading || !selectedReason}>
              {loading ? "Submitting..." : "Submit Return"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
