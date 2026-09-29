"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { WalletAdjustButton } from "@/components/admin/WalletAdjustButton";
import { Icon } from "@/components/ui/Icon";

export interface AdminWalletTransactionRow {
  id: string;
  userId: string;
  userName: string;
  businessName: string;
  currentBalance: number;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  paymentProvider: string;
  paymentReference: string;
  paymentStatus: string;
  createdAt: string;
}

export function AdminWalletTransactionsTable({ transactions }: { transactions: AdminWalletTransactionRow[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlQuery = searchParams.get("q") ?? "";
  const [searchQuery, setSearchQuery] = useState(urlQuery);

  useEffect(() => {
    setSearchQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    const params = new URLSearchParams(searchParams.toString());
    if (val.trim()) {
      params.set("q", val.trim());
    } else {
      params.delete("q");
    }
    router.replace(`/admin/wallet?${params.toString()}`);
  };

  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const q = searchQuery.toLowerCase().trim();
    return transactions.filter((t) => {
      const uName = t.userName?.toLowerCase() ?? "";
      const bName = t.businessName?.toLowerCase() ?? "";
      const ref = t.paymentReference?.toLowerCase() ?? "";
      const provider = t.paymentProvider?.toLowerCase() ?? "";
      const id = t.id?.toLowerCase() ?? "";
      const reason = t.reason?.toLowerCase() ?? "";
      const status = t.paymentStatus?.toLowerCase() ?? "";
      const amt = t.amount?.toString() ?? "";

      return (
        uName.includes(q) ||
        bName.includes(q) ||
        ref.includes(q) ||
        provider.includes(q) ||
        id.includes(q) ||
        reason.includes(q) ||
        status.includes(q) ||
        amt.includes(q)
      );
    });
  }, [transactions, searchQuery]);

  return (
    <Card>
      <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between border-b border-border">
        <CardHeader
          title={`Wallet Transactions & Recharges (${filteredTransactions.length} of ${transactions.length})`}
          subtitle="Real-time transaction history with verified Razorpay payment references"
        />
        
        {/* Search Bar */}
        <div className="relative w-full max-w-sm">
          <Icon name="search" className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search seller, Razorpay ref, Txn ID, amount..."
            className="w-full rounded-lg border border-border bg-surface pl-9 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-2.5 top-2 text-xs text-muted hover:text-foreground font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-3">Seller / User</th>
              <th className="px-5 py-3">Current Balance</th>
              <th className="px-5 py-3">Recharge / Amount</th>
              <th className="px-5 py-3">Payment Status</th>
              <th className="px-5 py-3">Provider</th>
              <th className="px-5 py-3">Razorpay Reference</th>
              <th className="px-5 py-3">Transaction ID</th>
              <th className="px-5 py-3">Date / Time</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0 hover:bg-slate-50/50">
                <td className="px-5 py-3 font-medium">
                  <Link href={`/admin/users/${t.userId}`} className="text-brand hover:underline">
                    {t.businessName ? `${t.businessName} (${t.userName})` : t.userName}
                  </Link>
                </td>
                <td className="px-5 py-3 font-medium text-foreground">
                  ₹{t.currentBalance.toFixed(2)}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`font-semibold ${
                      t.type === "CREDIT" ? "text-success" : "text-danger"
                    }`}
                  >
                    {t.type === "CREDIT" ? "+" : "-"}₹{t.amount.toFixed(2)}
                  </span>
                  <span className="ml-1.5 text-xs text-muted">({t.type})</span>
                </td>
                <td className="px-5 py-3">
                  <StatusBadge
                    status={t.paymentStatus || (t.type === "CREDIT" ? "SUCCESS" : "COMPLETED")}
                  />
                </td>
                <td className="px-5 py-3 text-xs text-muted">
                  {t.paymentProvider || "MANUAL/INTERNAL"}
                </td>
                <td className="px-5 py-3 font-mono text-xs text-foreground">
                  {t.paymentReference ? (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
                      {t.paymentReference}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-5 py-3 font-mono text-xs text-muted">
                  {t.id.slice(0, 10)}…
                </td>
                <td className="px-5 py-3 text-xs text-muted" suppressHydrationWarning>
                  {t.createdAt ? new Date(t.createdAt).toLocaleString("en-IN") : "—"}
                </td>
                <td className="px-5 py-3 text-right">
                  <WalletAdjustButton userId={t.userId} />
                </td>
              </tr>
            ))}
            {filteredTransactions.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-8 text-center text-sm text-muted">
                  {searchQuery ? `No transactions matching "${searchQuery}"` : "No wallet transactions recorded yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
