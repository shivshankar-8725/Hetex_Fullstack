"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";

export function Sidebar({
  nav,
  brandHref,
}: {
  nav: readonly { section: string; items: readonly { href: string; label: string; icon: string }[] }[];
  brandHref: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <Link href={brandHref} className="flex items-center border-b border-border px-5 py-5">
        <Logo />
      </Link>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {nav.map((group) => (
          <div key={group.section}>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted/80">{group.section}</p>
            <div className="mt-2 space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/dashboard" && item.href !== "/admin" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                      active ? "bg-brand-light text-brand" : "text-slate-600 hover:bg-slate-50 hover:text-foreground"
                    )}
                  >
                    {active && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent" />}
                    <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
