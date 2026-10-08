"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  RadialBarChart,
  RadialBar,
} from "recharts";

const INK_SECONDARY = "#52514e";
const INK_MUTED = "#898781";
const GRIDLINE = "#e1e0d9";
const SERIES_BLUE = "#0284c7";
const SERIES_GREEN = "#16a34a";
const SERIES_ORANGE = "#f59e0b";
const SERIES_RED = "#dc2626";
const CATEGORICAL = ["#0284c7", "#f59e0b", "#16a34a", "#6366f1", "#ec4899", "#8b5cf6", "#06b6d4", "#ef4444"];

const axisStyle = { fontSize: 12, fill: INK_MUTED };

export function OrdersPerDayChart({ data }: { data: { date: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRIDLINE} />
        <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={axisStyle} axisLine={{ stroke: GRIDLINE }} tickLine={false} />
        <YAxis allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} labelStyle={{ color: INK_SECONDARY }} />
        <Bar dataKey="count" name="Orders" fill={SERIES_BLUE} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CourierSplitChart({ data }: { data: { name: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke={GRIDLINE} />
        <XAxis type="number" allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} width={100} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
        <Bar dataKey="count" name="Shipments" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={CATEGORICAL[i % CATEGORICAL.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PaymentSplitChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRIDLINE} />
        <XAxis dataKey="name" tick={axisStyle} axisLine={{ stroke: GRIDLINE }} tickLine={false} />
        <YAxis allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="value" name="Orders" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={i === 0 ? SERIES_BLUE : SERIES_ORANGE} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CourierDonutChart({ data }: { data: { name: string; count: number }[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-full w-full items-center justify-center text-sm text-muted">No shipment data available</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={CATEGORICAL[index % CATEGORICAL.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function SlaGaugeCard({ courierName, percentage }: { courierName: string; percentage: number }) {
  const gaugeData = [{ name: courierName, value: percentage, fill: percentage >= 85 ? SERIES_BLUE : percentage >= 70 ? SERIES_ORANGE : SERIES_RED }];
  return (
    <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-surface text-center">
      <div className="h-28 w-28 relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={10} data={gaugeData} startAngle={180} endAngle={0}>
            <RadialBar background dataKey="value" cornerRadius={5} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pt-3">
          <span className="text-base font-bold text-foreground">{percentage}%</span>
        </div>
      </div>
      <p className="mt-1 text-xs font-semibold text-foreground truncate max-w-[120px]">{courierName}</p>
      <p className="text-[11px] text-muted">SLA Compliance</p>
    </div>
  );
}

export function MonthlyExpensesChart({ data }: { data?: { month: string; freightCharges: number; codHandling: number; fuelSurcharge: number; marginEarned: number }[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-[260px] w-full items-center justify-center text-sm text-muted">No expense data available</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRIDLINE} />
        <XAxis dataKey="month" tick={axisStyle} axisLine={{ stroke: GRIDLINE }} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} formatter={(val) => `₹${Number(val ?? 0).toLocaleString()}`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="freightCharges" name="Freight Cost" stackId="a" fill="#0284c7" />
        <Bar dataKey="codHandling" name="COD Fee" stackId="a" fill="#f59e0b" />
        <Bar dataKey="fuelSurcharge" name="Fuel Surcharge" stackId="a" fill="#16a34a" />
        <Bar dataKey="marginEarned" name="Net Margin" stackId="a" fill="#6366f1" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SlaStatusStackedBarChart({ data }: { data?: { courierName: string; meetingSla: number; slaAtRisk: number; missedSla: number }[] }) {
  if (!data || data.length === 0) {
    return <div className="flex h-[260px] w-full items-center justify-center text-sm text-muted">No SLA data available</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRIDLINE} />
        <XAxis dataKey="courierName" tick={axisStyle} axisLine={{ stroke: GRIDLINE }} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} unit="%" />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="meetingSla" name="Meeting SLA" stackId="sla" fill={SERIES_BLUE} radius={[0, 0, 0, 0]} />
        <Bar dataKey="slaAtRisk" name="SLA at Risk" stackId="sla" fill={SERIES_ORANGE} radius={[0, 0, 0, 0]} />
        <Bar dataKey="missedSla" name="Missed SLA" stackId="sla" fill={SERIES_RED} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
