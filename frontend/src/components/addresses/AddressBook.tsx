"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export interface AddressRow {
  id: string;
  type: "PICKUP" | "BUYER";
  label: string;
  contactName: string;
  phone: string;
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

const inputClass = "w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none";
const empty: Omit<AddressRow, "id" | "isDefault"> = { type: "PICKUP", label: "", contactName: "", phone: "", addressLine1: "", city: "", state: "", pincode: "" };

export function AddressBook({ initialAddresses }: { initialAddresses: AddressRow[] }) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    try {
      const res = await fetch("/api/addresses", { method: "POST", body: JSON.stringify(form) });
      const data = await res.json();
      if (res.ok) {
        setAddresses((prev) => [data.address, ...prev]);
        setForm(empty);
        setShowForm(false);
      }
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/addresses/${id}`, { method: "DELETE" });
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "+ Add Address"}</Button>
      </div>

      {showForm && (
        <Card className="p-5">
          <div className="grid grid-cols-2 gap-3">
            <select className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "PICKUP" | "BUYER" })}>
              <option value="PICKUP">Pickup / Warehouse</option>
              <option value="BUYER">Buyer</option>
            </select>
            <input className={inputClass} placeholder="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            <input className={inputClass} placeholder="Contact name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            <input className={inputClass} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className={`${inputClass} col-span-2`} placeholder="Address line" value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} />
            <input className={inputClass} placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <input className={inputClass} placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            <input className={inputClass} placeholder="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
          </div>
          <div className="mt-4 flex justify-end">
            <Button disabled={loading} onClick={save}>{loading ? "Saving…" : "Save Address"}</Button>
          </div>
        </Card>
      )}

      {(["PICKUP", "BUYER"] as const).map((type) => (
        <Card key={type}>
          <CardHeader title={type === "PICKUP" ? "Pickup Addresses" : "Buyer Addresses"} />
          <div className="divide-y divide-border">
            {addresses.filter((a) => a.type === type).map((a) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="font-medium">{a.label} {a.isDefault && <span className="ml-2 rounded-full bg-brand-light px-2 py-0.5 text-xs text-brand">Default</span>}</p>
                  <p className="text-muted">{a.contactName} · {a.phone}</p>
                  <p className="text-muted">{a.addressLine1}, {a.city}, {a.state} - {a.pincode}</p>
                </div>
                <button className="text-xs text-danger hover:underline" onClick={() => remove(a.id)}>Remove</button>
              </div>
            ))}
            {addresses.filter((a) => a.type === type).length === 0 && (
              <p className="px-5 py-6 text-center text-sm text-muted">No {type.toLowerCase()} addresses yet.</p>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
