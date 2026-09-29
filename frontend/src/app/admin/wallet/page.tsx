import { Suspense } from "react";
import { getSessionToken } from "@/lib/auth";
import { adminClient, callUnary } from "@/lib/grpc/client";
import { StatTile } from "@/components/ui/Card";
import {
  AdminWalletTransactionsTable,
  type AdminWalletTransactionRow,
} from "@/components/admin/AdminWalletTransactionsTable";

interface ListAllWalletTransactionsResponse {
  transactions: AdminWalletTransactionRow[];
}

export default async function AdminWalletPage() {
  const token = await getSessionToken();
  if (!token) return null;

  let transactions: AdminWalletTransactionRow[] = [];
  try {
    const data = await callUnary<object, ListAllWalletTransactionsResponse>(
      adminClient,
      "listAllWalletTransactions",
      {},
      token
    );
    transactions = data.transactions || [];
  } catch (err) {
    console.error("Failed to fetch admin wallet transactions:", err);
  }

  const totalBalance = transactions.reduce(
    (acc, t, idx, arr) => {
      const isFirst = arr.findIndex((x) => x.userId === t.userId) === idx;
      return isFirst ? acc + (t.currentBalance || 0) : acc;
    },
    0
  );

  const successfulCredits = transactions.filter(
    (t) => t.type === "CREDIT" && (t.paymentStatus === "SUCCESS" || !t.paymentStatus)
  );
  const totalRecharged = successfulCredits.reduce((acc, t) => acc + t.amount, 0);
  const pendingPayments = transactions.filter((t) => t.paymentStatus === "PENDING").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Wallet & Payments</h1>
        <p className="text-sm text-muted">
          Manage all seller wallets, Razorpay transactions, recharges, and payment statuses.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Total Wallet Liability" value={`₹${totalBalance.toFixed(2)}`} />
        <StatTile label="Total Recharged" value={`₹${totalRecharged.toFixed(2)}`} tone="success" />
        <StatTile label="Total Transactions" value={String(transactions.length)} />
        <StatTile
          label="Pending Payments"
          value={String(pendingPayments)}
          tone={pendingPayments > 0 ? "warning" : "default"}
        />
      </div>

      <Suspense fallback={<div className="p-8 text-center text-muted">Loading transactions...</div>}>
        <AdminWalletTransactionsTable transactions={transactions} />
      </Suspense>
    </div>
  );
}
