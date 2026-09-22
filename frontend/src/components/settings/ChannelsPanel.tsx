"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const PLATFORMS = [
  { key: "SHOPIFY", label: "Shopify", color: "#95bf47" },
  { key: "WOOCOMMERCE", label: "WooCommerce", color: "#7f54b3" },
  { key: "AMAZON", label: "Amazon", color: "#ff9900" },
  { key: "FLIPKART", label: "Flipkart", color: "#2874f0" },
] as const;

interface Connection {
  id: string;
  platform: string;
  storeName: string;
  connected: boolean;
}

export function ChannelsPanel({ initialConnections }: { initialConnections: Connection[] }) {
  const [connections, setConnections] = useState(initialConnections);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function connect(platform: string) {
    setBusy(platform);
    try {
      const res = await fetch("/api/channels", { method: "POST", body: JSON.stringify({ platform, storeName: `my-${platform.toLowerCase()}-store` }) });
      const data = await res.json();
      if (res.ok) setConnections((c) => [data.connection, ...c]);
    } finally {
      setBusy(null);
    }
  }

  async function disconnect(id: string) {
    await fetch(`/api/channels/${id}`, { method: "DELETE" });
    setConnections((c) => c.filter((x) => x.id !== id));
  }

  async function sync(id: string) {
    setBusy(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/channel-sync/${id}`, { method: "POST" });
      const data = await res.json();
      setMessage(res.ok ? `Imported ${data.imported} sample orders as drafts. Check Orders → Draft.` : data.error);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {message && <div className="rounded-lg bg-brand-light px-4 py-3 text-sm text-brand">{message}</div>}
      <div className="grid grid-cols-2 gap-3">
        {PLATFORMS.map((p) => {
          const connection = connections.find((c) => c.platform === p.key);
          return (
            <Card key={p.key} className="p-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg" style={{ backgroundColor: p.color }} />
                <div>
                  <p className="font-medium text-foreground">{p.label}</p>
                  <p className="text-xs text-muted">{connection ? connection.storeName : "Not connected"}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {connection ? (
                  <>
                    <Button variant="secondary" disabled={busy === connection.id} onClick={() => sync(connection.id)}>
                      {busy === connection.id ? "Syncing…" : "Sync Orders"}
                    </Button>
                    <Button variant="danger" onClick={() => disconnect(connection.id)}>Disconnect</Button>
                  </>
                ) : (
                  <Button disabled={busy === p.key} onClick={() => connect(p.key)}>{busy === p.key ? "Connecting…" : "Connect"}</Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
