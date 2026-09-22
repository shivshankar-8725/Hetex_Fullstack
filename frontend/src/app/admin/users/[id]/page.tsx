import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionToken } from "@/lib/auth";
import { adminClient, callUnary, toHttpError } from "@/lib/grpc/client";
import { toOrderRow, type OrderSummaryMsg } from "@/lib/grpc/mappers";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { WalletAdjustButton } from "@/components/admin/WalletAdjustButton";

interface SellerRow {
  id: string;
  businessName: string;
  name: string;
  phone: string;
  email: string;
  kycStatus: string;
  orderCount: number;
  walletBalance: number;
  createdAt: string;
  panNumber: string;
  gstNumber: string;
  emailVerified: boolean;
}

interface SellerDetailResponse {
  seller: SellerRow;
  orders: OrderSummaryMsg[];
}

export default async function AdminSellerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getSessionToken();
  if (!token) return null;

  let data: SellerDetailResponse;
  try {
    data = await callUnary<object, SellerDetailResponse>(adminClient, "getSellerDetail", { userId: id }, token);
  } catch (err) {
    if (toHttpError(err).status === 404) notFound();
    throw err;
  }

  const { seller } = data;
  const orders = data.orders.map(toOrderRow);

  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/users" className="text-xs font-medium text-brand hover:underline">
          ← Back to Sellers
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-foreground">{seller.businessName || seller.name}</h1>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Card className="p-5 md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Seller Details</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-muted">Contact Name</p><p className="font-medium">{seller.name}</p></div>
            <div><p className="text-muted">Business Name</p><p className="font-medium">{seller.businessName || "—"}</p></div>
            <div><p className="text-muted">Phone</p><p className="font-medium">{seller.phone}</p></div>
            <div><p className="text-muted">Email</p><p className="font-medium">{seller.email || "—"}</p></div>
            <div><p className="text-muted">Email Verified</p><p className={`font-medium ${seller.emailVerified ? "text-success" : "text-danger"}`}>{seller.emailVerified ? "Verified" : "Unverified"}</p></div>
            <div><p className="text-muted">Joined</p><p className="font-medium">{seller.createdAt ? new Date(seller.createdAt).toLocaleString() : "—"}</p></div>
            <div><p className="text-muted">PAN Number</p><p className="font-medium">{seller.panNumber || "—"}</p></div>
            <div><p className="text-muted">GST Number</p><p className="font-medium">{seller.gstNumber || "—"}</p></div>
            <div><p className="text-muted">KYC Status</p><StatusBadge status={seller.kycStatus.replace("KYC_", "")} /></div>
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Wallet</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">₹{seller.walletBalance.toFixed(2)}</p>
          <p className="text-sm text-muted">{seller.orderCount} total orders</p>
          <div className="mt-3">
            <WalletAdjustButton userId={seller.id} />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title={`Orders (${orders.length})`} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3">Order</th>
                <th className="px-5 py-3">Consignee</th>
                <th className="px-5 py-3">Payment</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">AWB / Courier</th>
                <th className="px-5 py-3">Placed</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-medium">
                    <Link href={`/orders/${o.id}`} className="text-brand hover:underline">{o.orderNumber}</Link>
                  </td>
                  <td className="px-5 py-3 text-muted">{o.buyerAddress.contactName} · {o.buyerAddress.city}</td>
                  <td className="px-5 py-3">{o.paymentMode}</td>
                  <td className="px-5 py-3"><StatusBadge status={o.shipment?.status ?? o.status} /></td>
                  <td className="px-5 py-3 text-muted">{o.shipment ? `${o.shipment.awbNumber} · ${o.shipment.courier.name}` : "—"}</td>
                  <td className="px-5 py-3 text-muted">{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-6 text-center text-muted">No orders placed yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
