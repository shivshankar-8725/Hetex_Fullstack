"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { WalletAdjustButton } from "@/components/admin/WalletAdjustButton";
import { Icon } from "@/components/ui/Icon";

export interface SellerRow {
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

export function AdminUsersTable({ sellers }: { sellers: SellerRow[] }) {
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
    router.replace(`/admin/users?${params.toString()}`);
  };

  const filteredSellers = useMemo(() => {
    if (!searchQuery.trim()) return sellers;
    const q = searchQuery.toLowerCase().trim();
    return sellers.filter((u) => {
      const bName = u.businessName?.toLowerCase() ?? "";
      const name = u.name?.toLowerCase() ?? "";
      const phone = u.phone?.toLowerCase() ?? "";
      const email = u.email?.toLowerCase() ?? "";
      const pan = u.panNumber?.toLowerCase() ?? "";
      const gst = u.gstNumber?.toLowerCase() ?? "";
      const kyc = u.kycStatus?.toLowerCase() ?? "";

      return (
        bName.includes(q) ||
        name.includes(q) ||
        phone.includes(q) ||
        email.includes(q) ||
        pan.includes(q) ||
        gst.includes(q) ||
        kyc.includes(q)
      );
    });
  }, [sellers, searchQuery]);

  return (
    <Card>
      <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between border-b border-border">
        <CardHeader title={`${filteredSellers.length} of ${sellers.length} Sellers`} />
        
        {/* Search Bar */}
        <div className="relative w-full max-w-sm">
          <Icon name="search" className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Filter business name, contact, phone, email, PAN, GST..."
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
            {filteredSellers.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0 hover:bg-slate-50">
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
                <td className="px-5 py-3"><StatusBadge status={(u.kycStatus || "").replace("KYC_", "")} /></td>
                <td className="px-5 py-3">
                  {u.emailVerified ? (
                    <span className="text-xs font-medium text-success">Verified</span>
                  ) : (
                    <span className="text-xs font-medium text-danger">Unverified</span>
                  )}
                </td>
                <td className="px-5 py-3">{u.orderCount}</td>
                <td className="px-5 py-3 font-medium">₹{u.walletBalance.toFixed(2)}</td>
                <td className="px-5 py-3"><WalletAdjustButton userId={u.id} /></td>
              </tr>
            ))}
            {filteredSellers.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-8 text-center text-muted">
                  {searchQuery ? `No sellers matching "${searchQuery}"` : "No sellers registered yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
