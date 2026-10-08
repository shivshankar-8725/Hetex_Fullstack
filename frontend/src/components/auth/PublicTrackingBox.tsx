"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PublicTrackingBox() {
  const [expanded, setExpanded] = useState(false);
  const [awb, setAwb] = useState("");
  const router = useRouter();

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (awb.trim()) {
      router.push(`/track-public?awb=${encodeURIComponent(awb.trim())}`);
    }
  };

  return (
    <div className="mt-8 rounded-xl border border-[#fbd4cd] bg-[#fdf5f3] overflow-hidden transition-all duration-300">
      <button 
        type="button"
        onClick={() => setExpanded(!expanded)} 
        className="flex w-full items-center justify-between p-4 focus:outline-none hover:bg-[#faeae7]"
      >
        <div className="flex items-center gap-3">
          <div className="text-orange-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="m9 15 6-6"/></svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Track your shipment here</p>
          </div>
        </div>
        <div className={`text-gray-500 transition-transform ${expanded ? "rotate-90" : ""}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 animate-in slide-in-from-top-2">
          <form onSubmit={handleTrack} className="flex gap-2">
            <input
              type="text"
              placeholder="Enter AWB or Order ID"
              value={awb}
              onChange={(e) => setAwb(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
              required
            />
            <button type="submit" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors">
              Track
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
