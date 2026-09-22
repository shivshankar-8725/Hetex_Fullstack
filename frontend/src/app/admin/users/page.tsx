import Link from "next/link";
import { getSessionToken } from "@/lib/auth";
import { adminClient, callUnary } from "@/lib/grpc/client";
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

export default async function AdminUsersPage() {
  const token = await getSessionToken();
  if (!token) return null;

  interface ListSellersResponse { sellers: SellerRow[] }
  const data = await callUnary<object, ListSellersResponse>(adminClient, "listSellers", {}, token);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-foreground">Sellers & Wallets</h1>
      <Card>
        <CardHeader title={`${data.sellers.length} Sellers`} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3">Seller</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3">PAN / GST</th>
                <th className="px-5 py-3">KYC</th>
                <th className="px-5 py-3">Email Verified</th>
                <th className="px-5 py-3">Orders</th>
                <th className="px-5 py-3">Wallet Balance</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.sellers.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-medium">
                    <Link href={`/admin/users/${u.id}`} className="text-brand hover:underline">
                      {u.businessName || u.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-muted">
                    <div>{u.phone}</div>
                    <div className="text-xs">{u.email || "—"}</div>
                  </td>
                  <td className="px-5 py-3 text-muted">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
                  <td className="px-5 py-3 text-xs text-muted">
                    <div>{u.panNumber || "—"}</div>
                    <div>{u.gstNumber || "—"}</div>
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={u.kycStatus.replace("KYC_", "")} /></td>
                  <td className="px-5 py-3">
                    {u.emailVerified ? (
                      <span className="text-xs font-medium text-success">Verified</span>
                    ) : (
                      <span className="text-xs font-medium text-danger">Unverified</span>
                    )}
                  </td>
                  <td className="px-5 py-3">{u.orderCount}</td>
                  <td className="px-5 py-3">₹{u.walletBalance.toFixed(2)}</td>
                  <td className="px-5 py-3"><WalletAdjustButton userId={u.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
