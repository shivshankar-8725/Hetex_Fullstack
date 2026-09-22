import { getSessionToken } from "@/lib/auth";
import { adminClient, callUnary } from "@/lib/grpc/client";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";

interface NdrRtoRow {
  awbNumber: string;
  sellerName: string;
  courierName: string;
  reason: string;
  status: string;
}

export default async function AdminNdrRtoPage() {
  const token = await getSessionToken();
  if (!token) return null;

  interface ListNdrRtoOversightResponse { shipments: NdrRtoRow[] }
  const data = await callUnary<object, ListNdrRtoOversightResponse>(adminClient, "listNdrRtoOversight", {}, token);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">NDR / RTO Oversight</h1>
        <p className="text-sm text-muted">Cross-seller visibility into failed deliveries and returns.</p>
      </div>
      <Card>
        <CardHeader title={`${data.shipments.length} shipments`} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3">AWB</th>
                <th className="px-5 py-3">Seller</th>
                <th className="px-5 py-3">Courier</th>
                <th className="px-5 py-3">Reason</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.shipments.map((s) => (
                <tr key={s.awbNumber} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-mono">{s.awbNumber}</td>
                  <td className="px-5 py-3">{s.sellerName}</td>
                  <td className="px-5 py-3 text-muted">{s.courierName}</td>
                  <td className="px-5 py-3 text-muted">{s.reason || "—"}</td>
                  <td className="px-5 py-3"><StatusBadge status={s.status} /></td>
                </tr>
              ))}
              {data.shipments.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-muted">No open NDR/RTO cases.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
