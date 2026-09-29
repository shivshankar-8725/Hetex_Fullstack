"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";

export function TopbarSearch({ role }: { role: "SELLER" | "ADMIN" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(currentQ);

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  const updateSearch = (val: string) => {
    setQuery(val);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (val.trim()) {
        params.set("q", val.trim());
      } else {
        params.delete("q");
      }

      const isSearchablePage =
        pathname === "/orders" ||
        pathname === "/admin/shipments" ||
        pathname === "/admin/users" ||
        pathname === "/dashboard";

      if (isSearchablePage) {
        router.replace(`${pathname}?${params.toString()}`);
      } else {
        const target = role === "ADMIN" ? "/admin/shipments" : "/orders";
        router.push(`${target}?${params.toString()}`);
      }
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        updateSearch(query);
      }}
      className="flex min-w-0 flex-1 max-w-md items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted transition-colors focus-within:border-brand/50 focus-within:bg-surface focus-within:ring-2 focus-within:ring-brand/10"
    >
      <Icon name="search" className="h-4 w-4 shrink-0 text-muted" />
      <input
        type="search"
        value={query}
        onChange={(e) => updateSearch(e.target.value)}
        placeholder={
          role === "ADMIN"
            ? "Search AWB, order ID, seller name, phone..."
            : "Search AWB, order ID, or buyer name..."
        }
        className="w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
      />
      {query && (
        <button
          type="button"
          onClick={() => updateSearch("")}
          className="text-muted hover:text-foreground text-xs font-semibold px-1"
        >
          ✕
        </button>
      )}
    </form>
  );
}
