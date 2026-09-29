import { getCurrentUser, getSessionToken } from "@/lib/auth";
import { walletClient, callUnary } from "@/lib/grpc/client";
import { Card, CardHeader, StatTile } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { RechargeForm } from "@/components/wallet/RechargeForm";

interface WalletTransactionMsg {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  createdAt: string;
  paymentProvider?: string;
  paymentReference?: string;
  paymentStatus?: string;
}

export default async function WalletPage() {
  const user = await getCurrentUser();
  const token = await getSessionToken();
  if (!user || !token) return null;

  interface WalletResponse {
    balance: number;
    transactions: WalletTransactionMsg[];
  }
  const wallet = await callUnary<object, WalletResponse>(walletClient, "getWallet", {}, token);

  const transactions = wallet.transactions || [];
  const totalRecharged = transactions
    .filter((t) => t.type === "CREDIT" && (t.paymentStatus === "SUCCESS" || !t.paymentStatus))
    .reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Wallet</h1>
        <p className="text-sm text-muted">
          Prepaid shipping balance for order fulfillment and labels.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-5">
        <div className="space-y-4 md:col-span-2">
          <StatTile label="Available Balance" value={`₹${wallet.balance.toFixed(2)}`} />
          <StatTile label="Total Recharged" value={`₹${totalRecharged.toFixed(2)}`} tone="success" />
        </div>
        <Card className="p-5 md:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Add Funds</p>
          <RechargeForm />
        </Card>
      </div>

      <Card>
        <CardHeader
          title={`Transaction History (${transactions.length})`}
          subtitle="All credits, debits, adjustments, and Razorpay payment details"
        />
        <div className="divide-y divide-border">
          {transactions.map((t) => (
            <div key={t.id} className="flex flex-col gap-2 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{t.reason || t.type}</p>
                  {t.paymentStatus && <StatusBadge status={t.paymentStatus} />}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span suppressHydrationWarning>{t.createdAt ? new Date(t.createdAt).toLocaleString("en-IN") : ""}</span>
                  {t.paymentProvider && <span>· Provider: {t.paymentProvider}</span>}
                  {t.paymentReference && (
                    <span>
                      · Ref: <span className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">{t.paymentReference}</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${t.type === "CREDIT" ? "text-success" : "text-danger"}`}>
                  {t.type === "CREDIT" ? "+" : "-"}₹{t.amount.toFixed(2)}
                </p>
                <p className="text-xs text-muted">
                  Balance: ₹{t.balanceAfter.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-muted">No transactions recorded yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
