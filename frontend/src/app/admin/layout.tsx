import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { ADMIN_NAV } from "@/components/dashboard/nav-items";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="flex min-h-screen">
      <Sidebar nav={ADMIN_NAV} brandHref="/admin" />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar userName={user.name} role={user.role} />
        <main className="flex-1 overflow-y-auto bg-background p-6">{children}</main>
      </div>
    </div>
  );
}
