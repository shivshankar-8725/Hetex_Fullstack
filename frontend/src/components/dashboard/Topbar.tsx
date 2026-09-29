import { Suspense } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { TopbarSearch } from "./TopbarSearch";

export function Topbar({
  userName,
  walletBalance,
  role,
}: {
  userName: string;
  walletBalance?: number;
  role: "SELLER" | "ADMIN";
}) {
  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-surface px-6">
      <Suspense fallback={
        <div className="flex min-w-0 flex-1 max-w-md items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted">
          <Icon name="search" className="h-4 w-4 shrink-0 text-muted" />
          <span className="text-muted text-xs">Search...</span>
        </div>
      }>
        <TopbarSearch role={role} />
      </Suspense>
      <div className="flex items-center gap-4">
        {typeof walletBalance === "number" && (
          <Link
            href="/wallet"
            className="flex items-center gap-2 rounded-lg border border-border bg-brand-light px-3 py-1.5 text-sm font-medium text-brand transition-colors hover:border-brand/30"
          >
            <Icon name="wallet" className="h-4 w-4" />
            ₹{walletBalance.toFixed(2)}
          </Link>
        )}
        <Link href="/notifications" className="rounded-full p-2 text-muted transition-colors hover:bg-slate-50 hover:text-foreground" aria-label="Notifications" title="Notifications">
          <Icon name="bell" className="h-5 w-5" />
        </Link>
        <Link href="/settings/profile" className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-slate-50" title="Business profile">
          <div className="brand-gradient flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white">
            {userName.slice(0, 1).toUpperCase()}
          </div>
          <div className="hidden text-sm sm:block">
            <p className="font-medium leading-tight text-foreground">{userName}</p>
            <p className="text-xs leading-tight text-muted">{role === "ADMIN" ? "Administrator" : "Seller"}</p>
          </div>
        </Link>
        <Link href="/logout" className="rounded-full p-2 text-muted transition-colors hover:bg-slate-50 hover:text-foreground" aria-label="Log out" title="Log out">
          <Icon name="log-out" className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
