"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function BulkUploadButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(file: File) {
    setLoading(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/orders/bulk", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(`Imported ${data.created} orders as drafts.${data.errors.length ? ` ${data.errors.length} rows skipped.` : ""}`);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <Button variant="secondary" disabled={loading} onClick={() => inputRef.current?.click()}>
        {loading ? "Uploading…" : "Bulk Upload (CSV)"}
      </Button>
      {message && <p className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-border bg-surface p-2 text-xs text-foreground shadow-sm">{message}</p>}
    </div>
  );
}
