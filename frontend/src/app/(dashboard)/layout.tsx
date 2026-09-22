import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { SELLER_NAV } from "@/components/dashboard/nav-items";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar nav={SELLER_NAV} brandHref="/dashboard" />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar userName={user.name} walletBalance={user.wallet?.balance ?? 0} role={user.role} />
        <main className="flex-1 overflow-y-auto bg-background p-6">{children}</main>
      </div>
    </div>
  );
}
