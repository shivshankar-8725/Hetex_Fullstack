"use client";

import { useState, useEffect } from "react";
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
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Open the section that contains the active route by default
    const initialOpen: Record<string, boolean> = {};
    nav.forEach(group => {
      const hasActive = group.items.some(item => pathname === item.href || (item.href !== "/dashboard" && item.href !== "/admin" && pathname.startsWith(item.href)));
      if (hasActive) {
        initialOpen[group.section] = true;
      }
    });
    setOpenSections(prev => ({ ...prev, ...initialOpen }));
  }, [pathname, nav]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <aside className="hidden w-[260px] shrink-0 flex-col border-r border-border bg-white md:flex shadow-sm">
      <Link href={brandHref} className="flex items-center justify-start border-b border-border px-5 py-5 h-16">
        <Logo />
      </Link>
      <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-5 pb-24 relative">
        {nav.map((group) => {
          const isSectionOpen = openSections[group.section] !== false;
          const hasActiveItem = group.items.some(item => pathname === item.href || (item.href !== "/dashboard" && item.href !== "/admin" && pathname.startsWith(item.href)));
          
          return (
            <div key={group.section} className="mb-2">
              {group.section !== "Overview" ? (
                <button
                  onClick={() => toggleSection(group.section)}
                  className={clsx(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    hasActiveItem ? "bg-brand text-white" : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon name={group.items[0]?.icon || "layout-dashboard"} className="h-4 w-4" />
                    <span>{group.section}</span>
                  </div>
                  <Icon name={isSectionOpen ? "chevron-up" : "chevron-down"} className="h-4 w-4" />
                </button>
              ) : null}

              {isSectionOpen && (
                <div className={clsx("space-y-1", group.section !== "Overview" ? "mt-1 pl-4" : "")}>
                  {group.items.map((item) => {
                    const active = pathname === item.href || (item.href !== "/dashboard" && item.href !== "/admin" && pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={clsx(
                          "relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150",
                          active ? "text-brand" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                        )}
                      >
                        {group.section !== "Overview" ? (
                          <div className={clsx("h-1.5 w-1.5 rounded-full ring-2", active ? "bg-brand ring-brand-light" : "bg-transparent ring-slate-300")} />
                        ) : (
                          <Icon name={item.icon} className="h-4 w-4 shrink-0" />
                        )}
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-border bg-slate-50 p-4 text-center shrink-0">
        <p className="text-xs font-semibold text-slate-500 mb-1">Seller Support</p>
        <a href="tel:+917375000072" className="text-lg font-bold text-blue-700 hover:underline block mb-1">
          +917375000072
        </a>
        <p className="text-[10px] text-slate-400">Business Hours</p>
        <p className="text-[10px] text-slate-400">09:00 AM to 06:30 PM (Mon to Sat)</p>
      </div>
    </aside>
  );
}
