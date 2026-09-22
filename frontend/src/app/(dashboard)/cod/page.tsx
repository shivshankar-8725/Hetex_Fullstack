import { getCurrentUser, getSessionToken } from "@/lib/auth";
import { codClient, callUnary } from "@/lib/grpc/client";
import { Card, CardHeader, StatTile } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";

interface RemittanceRow {
  id: string;
  orderNumber: string;
  courierName: string;
  amount: number;
  status: string;
  settledAt: string;
}

export default async function CodPage() {
  const user = await getCurrentUser();
  const token = await getSessionToken();
  if (!user || !token) return null;

  interface ListRemittancesResponse {
    remittances: RemittanceRow[];
    summary: { total: number; pending: number; processing: number; settled: number };
  }
  const data = await callUnary<object, ListRemittancesResponse>(codClient, "listRemittances", {}, token);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">COD Remittance</h1>
        <p className="text-sm text-muted">Cash collected on delivery is remitted D+2 after the courier confirms delivery.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Total COD" value={`₹${data.summary.total.toFixed(2)}`} />
        <StatTile label="Pending Delivery" value={`₹${data.summary.pending.toFixed(2)}`} tone="warning" />
        <StatTile label="Processing" value={`₹${data.summary.processing.toFixed(2)}`} />
        <StatTile label="Settled" value={`₹${data.summary.settled.toFixed(2)}`} tone="success" />
      </div>

      <Card>
        <CardHeader title="Remittance Details" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3">Order</th>
                <th className="px-5 py-3">Courier</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Settlement Date</th>
              </tr>
            </thead>
            <tbody>
              {data.remittances.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-medium">{r.orderNumber}</td>
                  <td className="px-5 py-3 text-muted">{r.courierName}</td>
                  <td className="px-5 py-3">₹{r.amount.toFixed(2)}</td>
                  <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-5 py-3 text-muted">{r.settledAt ? new Date(r.settledAt).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
              {data.remittances.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-muted">No COD shipments yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
