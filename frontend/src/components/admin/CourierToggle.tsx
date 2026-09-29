"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CourierToggle({ courierId, active }: { courierId: string; active: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      await fetch("/api/admin/couriers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: courierId, active: !active }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        disabled={loading}
        onClick={toggle}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          active ? "bg-emerald-600" : "bg-slate-300"
        } ${loading ? "opacity-50" : ""}`}
        role="switch"
        aria-checked={active}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            active ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"
      }`}>
        <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
        {active ? "ENABLED" : "DISABLED"}
      </span>
    </div>
  );
}
