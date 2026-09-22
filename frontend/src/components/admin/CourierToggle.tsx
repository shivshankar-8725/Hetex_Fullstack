"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CourierToggle({ courierId, active }: { courierId: string; active: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      await fetch("/api/admin/couriers", { method: "PATCH", body: JSON.stringify({ id: courierId, active: !active }) });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      disabled={loading}
      onClick={toggle}
      className={`rounded-full px-3 py-1 text-xs font-medium ${active ? "bg-green-50 text-success" : "bg-slate-100 text-slate-500"}`}
    >
      {active ? "Active" : "Disabled"}
    </button>
  );
}
