"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const INK_SECONDARY = "#52514e";
const INK_MUTED = "#898781";
const GRIDLINE = "#e1e0d9";
const SERIES_BLUE = "#2a78d6";
const SERIES_ORANGE = "#eb6834";
const CATEGORICAL = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];

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
        <YAxis type="category" dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} width={90} />
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
