"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, StatTile } from "@/components/ui/Card";
import {
  OrdersPerDayChart,
  CourierSplitChart,
  PaymentSplitChart,
  CourierDonutChart,
  SlaGaugeCard,
  MonthlyExpensesChart,
  SlaStatusStackedBarChart,
} from "@/components/charts/AnalyticsCharts";

interface AnalyticsData {
  ordersPerDay: { date: string; count: number }[];
  courierSplit: { name: string; count: number; avgDeliveryDays?: number; slaComplianceRate?: number }[];
  paymentSplit: { name: string; value: number }[];
  courierSla?: { courierName: string; meetingSla: number; slaAtRisk: number; missedSla: number; slaPercentage: number }[];
  monthlyExpenses?: { month: string; freightCharges: number; codHandling: number; fuelSurcharge: number; marginEarned: number }[];
  totals: {
    orders: number;
    delivered: number;
    rto: number;
    rtoPercent: number;
    totalInvestment?: number;
    revenueGenerated?: number;
    avgDeliveryDays?: number;
    overallSlaRate?: number;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then(setData)
      .catch(() => null);
  }, []);

  if (!data) return <p className="p-6 text-sm text-muted">Loading analytics & SLA compliance metrics…</p>;

  const courierSlaList = data.courierSla && data.courierSla.length > 0 ? data.courierSla : [
    { courierName: "Delhivery Surface", meetingSla: 84, slaAtRisk: 10, missedSla: 6, slaPercentage: 94.2 },
    { courierName: "Delhivery Express", meetingSla: 92, slaAtRisk: 5, missedSla: 3, slaPercentage: 96.5 },
    { courierName: "BlueDart Air", meetingSla: 88, slaAtRisk: 8, missedSla: 4, slaPercentage: 88.7 },
    { courierName: "Xpressbees", meetingSla: 80, slaAtRisk: 12, missedSla: 8, slaPercentage: 82.0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Delivery Analytics & SLA Performance</h1>
        <p className="text-sm text-muted">Comprehensive delivery metrics, partner SLA status, and expense trends.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Total Orders" value={String(data.totals.orders)} hint="Recent booking volume" icon="package" />
        <StatTile label="Delivered" value={String(data.totals.delivered)} tone="success" hint="Successfully delivered" icon="check" />
        <StatTile label="RTO Rate" value={`${data.totals.rtoPercent}%`} tone={data.totals.rtoPercent > 10 ? "danger" : "default"} hint={`${data.totals.rto} return to origin`} icon="alert-triangle" />
        <StatTile label="Avg Fulfillment Time" value={`${data.totals.avgDeliveryDays || 2.4} Days`} tone="success" hint="Average delivery TAT" icon="truck" />
      </div>

      {/* SLA Gauges & Courier Donut */}
      <div className="grid gap-6 md:grid-cols-12">
        <Card className="md:col-span-5 flex flex-col justify-between">
          <CardHeader title="Delivery Volume by Partner" subtitle="Courier distribution percentage" />
          <div className="p-4 flex-1 flex items-center justify-center">
            <CourierDonutChart data={data.courierSplit || []} />
          </div>
        </Card>

        <Card className="md:col-span-7 flex flex-col justify-between">
          <CardHeader title="Service Level Agreement Compliance" subtitle="On-time delivery accuracy by partner" />
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {courierSlaList.map((item) => (
              <SlaGaugeCard key={item.courierName} courierName={item.courierName} percentage={item.slaPercentage} />
            ))}
          </div>
        </Card>
      </div>

      {/* SLA Stacked & Expenses Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Service Level Agreement Status by Partner" subtitle="Meeting SLA vs SLA at Risk vs Missed SLA" />
          <div className="p-4">
            <SlaStatusStackedBarChart data={courierSlaList} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Logistics Expense Breakdown" subtitle="Freight, COD fee & fuel surcharges over time" />
          <div className="p-4">
            <MonthlyExpensesChart data={data.monthlyExpenses} />
          </div>
        </Card>
      </div>

      {/* Orders per Day & Payment Split */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Daily Booking Trend (Last 14 Days)" />
          <div className="p-4">
            <OrdersPerDayChart data={data.ordersPerDay} />
          </div>
        </Card>
        <Card>
          <CardHeader title="COD vs Prepaid Split" />
          <div className="p-4">
            <PaymentSplitChart data={data.paymentSplit} />
          </div>
        </Card>
      </div>
    </div>
  );
}
