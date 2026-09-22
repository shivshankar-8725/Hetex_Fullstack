"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { Icon } from "@/components/ui/Icon";

export default function LogoutConfirmPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function confirmLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center shadow-card">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-light text-accent-dark">
          <Icon name="log-out" className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">Sign out of HetEx?</h1>
        <p className="mt-1 text-sm text-muted">You&apos;ll need to verify your phone number again to log back in.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" onClick={() => router.back()} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmLogout} disabled={loading}>
            {loading ? "Signing out…" : "Sign Out"}
          </Button>
        </div>
      </div>
    </div>
  );
}
