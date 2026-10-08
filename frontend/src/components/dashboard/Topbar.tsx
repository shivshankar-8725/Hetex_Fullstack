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
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600 hidden lg:block">Notification Credits: 0</span>
            <div className="flex items-center rounded-lg border border-brand overflow-hidden text-sm">
              <span className="bg-white px-3 py-1.5 font-medium text-brand flex items-center gap-1">
                <Icon name="wallet" className="h-4 w-4" /> ₹{walletBalance.toFixed(2)}
              </span>
              <Link href="/wallet" className="bg-brand px-3 py-1.5 font-medium text-white hover:bg-brand/90 transition-colors">
                Recharge
              </Link>
            </div>
          </div>
        )}

        <div className="hidden md:flex items-center gap-2">
          <Link href="/track" className="relative flex items-center rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors">
            Track Order
          </Link>
          <Link href="/tickets" className="relative flex items-center rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors">
            Tickets
          </Link>
        </div>

        <div className="flex items-center gap-2 ml-2 pl-4 border-l border-border">
          <Link href="/notifications" className="relative rounded-full p-2 text-muted transition-colors hover:bg-slate-50 hover:text-foreground" aria-label="Notifications" title="Notifications">
            <Icon name="bell" className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-orange-500 ring-2 ring-white"></span>
          </Link>
          <Link href="/settings/profile" className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-slate-50" title="Business profile">
            <div className="bg-brand flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white">
              {userName.slice(0, 1).toUpperCase()}
            </div>
          </Link>
          <Link href="/logout" className="hidden sm:flex rounded-full p-2 text-muted transition-colors hover:bg-slate-50 hover:text-foreground" aria-label="Log out" title="Log out">
            <Icon name="log-out" className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
