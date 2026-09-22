"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/Badge";

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
  const [tab, setTab] = useState<(typeof TABS)[number]>("ALL");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/orders?status=${tab}`)
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2 border-b border-border pb-3">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${tab === t ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {t.replaceAll("_", " ")}
          </button>
        ))}
      </div>

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
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0 hover:bg-slate-50">
                <td className="px-5 py-3">
                  <Link href={`/orders/${o.id}`} className="font-medium text-brand">{o.orderNumber}</Link>
                  <p className="text-xs text-muted">{new Date(o.createdAt).toLocaleDateString()}</p>
                </td>
                <td className="px-5 py-3">{o.buyerAddress.contactName}<p className="text-xs text-muted">{o.buyerAddress.city}</p></td>
                <td className="px-5 py-3">{o.shipment ? <>{o.shipment.courier.name}<p className="font-mono text-xs text-muted">{o.shipment.awbNumber}</p></> : <span className="text-muted">Not booked</span>}</td>
                <td className="px-5 py-3">{o.paymentMode}</td>
                <td className="px-5 py-3">{o.billableWeight.toFixed(2)} kg</td>
                <td className="px-5 py-3"><StatusBadge status={o.shipment?.status ?? o.status} /></td>
              </tr>
            ))}
            {!loading && orders.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-muted">No orders in this status.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
