"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";

export interface AllShipmentRow {
  awbNumber: string;
  orderNumber: string;
  sellerName: string;
  courierName: string;
  status: string;
  currentLocation: string;
  paymentMode: string;
  createdAt: string;
}

export function AdminShipmentsTable({ shipments }: { shipments: AllShipmentRow[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlQuery = searchParams.get("q") ?? "";
  const [searchQuery, setSearchQuery] = useState(urlQuery);

  useEffect(() => {
    setSearchQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    const params = new URLSearchParams(searchParams.toString());
    if (val.trim()) {
      params.set("q", val.trim());
    } else {
      params.delete("q");
    }
    router.replace(`/admin/shipments?${params.toString()}`);
  };

  const filteredShipments = useMemo(() => {
    if (!searchQuery.trim()) return shipments;
    const q = searchQuery.toLowerCase().trim();
    return shipments.filter((s) => {
      const awb = s.awbNumber?.toLowerCase() ?? "";
      const order = s.orderNumber?.toLowerCase() ?? "";
      const seller = s.sellerName?.toLowerCase() ?? "";
      const courier = s.courierName?.toLowerCase() ?? "";
      const status = s.status?.toLowerCase() ?? "";
      const location = s.currentLocation?.toLowerCase() ?? "";
      const payment = s.paymentMode?.toLowerCase() ?? "";

      return (
        awb.includes(q) ||
        order.includes(q) ||
        seller.includes(q) ||
        courier.includes(q) ||
        status.includes(q) ||
        location.includes(q) ||
        payment.includes(q)
      );
    });
  }, [shipments, searchQuery]);

  return (
    <Card>
      <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between border-b border-border">
        <CardHeader title={`${filteredShipments.length} of ${shipments.length} shipments`} />
        
        {/* Search Bar */}
        <div className="relative w-full max-w-sm">
          <Icon name="search" className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Filter AWB, order #, seller, courier, location..."
            className="w-full rounded-lg border border-border bg-surface pl-9 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-2.5 top-2 text-xs text-muted hover:text-foreground font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-3">AWB</th>
              <th className="px-5 py-3">Order</th>
              <th className="px-5 py-3">Seller</th>
              <th className="px-5 py-3">Courier</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Current Location</th>
              <th className="px-5 py-3">Payment</th>
              <th className="px-5 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {filteredShipments.map((s) => (
              <tr key={s.awbNumber || s.orderNumber} className="border-b border-border last:border-0 hover:bg-slate-50">
                <td className="px-5 py-3 font-mono font-medium text-brand">{s.awbNumber || "—"}</td>
                <td className="px-5 py-3 text-muted">{s.orderNumber}</td>
                <td className="px-5 py-3 font-medium">{s.sellerName}</td>
                <td className="px-5 py-3 text-muted">{s.courierName}</td>
                <td className="px-5 py-3"><StatusBadge status={s.status} /></td>
                <td className="px-5 py-3 text-muted">{s.currentLocation || "—"}</td>
                <td className="px-5 py-3 text-muted">{s.paymentMode}</td>
                <td className="px-5 py-3 text-muted">{s.createdAt ? new Date(s.createdAt).toLocaleString() : "—"}</td>
              </tr>
            ))}
            {filteredShipments.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-muted">
                  {searchQuery ? `No shipments matching "${searchQuery}"` : "No shipments booked yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
