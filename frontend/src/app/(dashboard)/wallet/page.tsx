import { getCurrentUser, getSessionToken } from "@/lib/auth";
import { walletClient, callUnary } from "@/lib/grpc/client";
import { Card, CardHeader, StatTile } from "@/components/ui/Card";
import { RechargeForm } from "@/components/wallet/RechargeForm";

interface WalletTransactionMsg {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  reason: string;
  createdAt: string;
}

export default async function WalletPage() {
  const user = await getCurrentUser();
  const token = await getSessionToken();
  if (!user || !token) return null;

  interface WalletResponse { balance: number; transactions: WalletTransactionMsg[] }
  const wallet = await callUnary<object, WalletResponse>(walletClient, "getWallet", {}, token);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-xl font-semibold text-foreground">Wallet</h1>

      <div className="grid grid-cols-2 gap-4">
        <StatTile label="Current Balance" value={`₹${wallet.balance.toFixed(2)}`} />
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Add Funds</p>
          <RechargeForm />
        </Card>
      </div>

      <Card>
        <CardHeader title="Transaction History" />
        <div className="divide-y divide-border">
          {wallet.transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <p className="font-medium text-foreground">{t.reason}</p>
                <p className="text-xs text-muted">{new Date(t.createdAt).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${t.type === "CREDIT" ? "text-success" : "text-danger"}`}>
                  {t.type === "CREDIT" ? "+" : "-"}₹{t.amount.toFixed(2)}
                </p>
                <p className="text-xs text-muted">Bal: ₹{t.balanceAfter.toFixed(2)}</p>
              </div>
            </div>
          ))}
          {wallet.transactions.length === 0 && <p className="px-5 py-6 text-center text-sm text-muted">No transactions yet.</p>}
        </div>
      </Card>
    </div>
  );
}
