"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, StatTile } from "@/components/ui/Card";
import { OrdersPerDayChart, CourierSplitChart, PaymentSplitChart } from "@/components/charts/AnalyticsCharts";

interface AnalyticsData {
  ordersPerDay: { date: string; count: number }[];
  courierSplit: { name: string; count: number }[];
  paymentSplit: { name: string; value: number }[];
  totals: { orders: number; delivered: number; rto: number; rtoPercent: number };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetch("/api/analytics").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <p className="text-sm text-muted">Loading analytics…</p>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
        <p className="text-sm text-muted">Last 14 days of shipping activity.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Orders (14d)" value={String(data.totals.orders)} />
        <StatTile label="Delivered" value={String(data.totals.delivered)} tone="success" />
        <StatTile label="RTO" value={String(data.totals.rto)} tone={data.totals.rto > 0 ? "danger" : "default"} />
        <StatTile label="RTO Rate" value={`${data.totals.rtoPercent}%`} tone={data.totals.rtoPercent > 10 ? "danger" : "default"} />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader title="Orders per Day" />
          <div className="p-4"><OrdersPerDayChart data={data.ordersPerDay} /></div>
        </Card>
        <Card>
          <CardHeader title="Courier-wise Volume" />
          <div className="p-4">
            {data.courierSplit.length > 0 ? <CourierSplitChart data={data.courierSplit} /> : <p className="py-16 text-center text-sm text-muted">No shipments yet.</p>}
          </div>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader title="COD vs Prepaid" />
          <div className="p-4"><PaymentSplitChart data={data.paymentSplit} /></div>
        </Card>
      </div>
    </div>
  );
}
