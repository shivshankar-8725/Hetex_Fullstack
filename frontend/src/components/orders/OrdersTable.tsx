"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";

const TABS = ["ALL", "READY_TO_SHIP", "MANIFESTED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "NDR", "RTO_INITIATED", "CANCELLED"] as const;

interface OrderRow {
  id: string;
  orderNumber: string;
  paymentMode: string;
  billableWeight: number;
  createdAt: string;
  status: string;
  buyerAddress: { contactName: string; city: string };
  shipment: { status: string; awbNumber: string; courier: { name: string; logoColor: string } } | null;
}

export function OrdersTable() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("ALL");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const urlQuery = searchParams.get("q") ?? "";
  const [searchQuery, setSearchQuery] = useState(urlQuery);

  useEffect(() => {
    setSearchQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/orders?status=${tab}`)
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .finally(() => setLoading(false));
  }, [tab]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    const params = new URLSearchParams(searchParams.toString());
    if (val.trim()) {
      params.set("q", val.trim());
    } else {
      params.delete("q");
    }
    router.replace(`/orders?${params.toString()}`);
  };

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase().trim();
    return orders.filter((o) => {
      const orderNum = o.orderNumber?.toLowerCase() ?? "";
      const awb = o.shipment?.awbNumber?.toLowerCase() ?? "";
      const buyerName = o.buyerAddress?.contactName?.toLowerCase() ?? "";
      const city = o.buyerAddress?.city?.toLowerCase() ?? "";
      const courier = o.shipment?.courier?.name?.toLowerCase() ?? "";
      const payment = o.paymentMode?.toLowerCase() ?? "";
      const st = (o.shipment?.status ?? o.status ?? "").toLowerCase();

      return (
        orderNum.includes(q) ||
        awb.includes(q) ||
        buyerName.includes(q) ||
        city.includes(q) ||
        courier.includes(q) ||
        payment.includes(q) ||
        st.includes(q)
      );
    });
  }, [orders, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Search & Tabs Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2 border-b border-border pb-2 md:border-b-0 md:pb-0">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === t ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t.replaceAll("_", " ")}
            </button>
          ))}
        </div>

        {/* Filter Input */}
        <div className="relative w-full max-w-xs">
          <Icon name="search" className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Filter orders, AWB, buyer..."
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

      {searchQuery && (
        <p className="text-xs text-muted">
          Showing {filteredOrders.length} result(s) for &quot;<span className="font-semibold text-foreground">{searchQuery}</span>&quot;
        </p>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-3">Order</th>
              <th className="px-5 py-3">Buyer</th>
              <th className="px-5 py-3">Courier / AWB</th>
              <th className="px-5 py-3">Payment</th>
              <th className="px-5 py-3">Weight</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0 hover:bg-slate-50">
                <td className="px-5 py-3">
                  <Link href={`/orders/${o.id}`} className="font-medium text-brand hover:underline">
                    {o.orderNumber}
                  </Link>
                  <p className="text-xs text-muted">{new Date(o.createdAt).toLocaleDateString()}</p>
                </td>
                <td className="px-5 py-3">
                  {o.buyerAddress.contactName}
                  <p className="text-xs text-muted">{o.buyerAddress.city}</p>
                </td>
                <td className="px-5 py-3">
                  {o.shipment ? (
                    <>
                      {o.shipment.courier.name}
                      <p className="font-mono text-xs text-muted">{o.shipment.awbNumber}</p>
                    </>
                  ) : (
                    <span className="text-muted">Not booked</span>
                  )}
                </td>
                <td className="px-5 py-3">{o.paymentMode}</td>
                <td className="px-5 py-3">{o.billableWeight.toFixed(2)} kg</td>
                <td className="px-5 py-3">
                  <StatusBadge status={o.shipment?.status ?? o.status} />
                </td>
              </tr>
            ))}
            {!loading && filteredOrders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-muted">
                  {searchQuery ? `No orders matching "${searchQuery}"` : "No orders in this status."}
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-muted">
                  Loading orders...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
