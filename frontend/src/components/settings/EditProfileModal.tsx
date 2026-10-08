"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface Props {
  initialName: string;
  initialBusinessName: string | null;
}

export function EditProfileModal({ initialName, initialBusinessName }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [businessName, setBusinessName] = useState(initialBusinessName || "");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, businessName }),
      });
      if (res.ok) {
        setIsOpen(false);
        router.refresh();
      } else {
        alert("Failed to update profile");
      }
    } catch (e) {
      alert("Error updating profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setIsOpen(true)}>Edit Profile</Button>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Edit Business Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-muted">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 focus:border-brand focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-muted">Business Name</label>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full rounded-lg border border-border px-3 py-2 focus:border-brand focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
