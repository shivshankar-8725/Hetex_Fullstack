"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { RateQuote } from "@/lib/grpc/mappers";

interface PickupAddress {
  id: string;
  label: string;
  contactName: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

const inputClass = "w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none";
const labelClass = "block text-xs font-medium text-muted mb-1";

export function NewOrderForm({ pickupAddresses }: { pickupAddresses: PickupAddress[] }) {
  const router = useRouter();
  const [stage, setStage] = useState<"pincodes" | "rates" | "details" | "success">("pincodes");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceableMessage, setServiceableMessage] = useState<string | null>(null);

  const [pickupAddressId, setPickupAddressId] = useState(pickupAddresses[0]?.id ?? "");
  const [showAddPickup, setShowAddPickup] = useState(pickupAddresses.length === 0);
  const [newPickup, setNewPickup] = useState({ label: "Warehouse", contactName: "", phone: "", addressLine1: "", city: "", state: "", pincode: "" });

  const [buyer, setBuyer] = useState({ contactName: "", phone: "", addressLine1: "", city: "", state: "", pincode: "" });
  const [pkg, setPkg] = useState({ packageType: "Box", itemDescription: "", declaredValue: "", weight: "", length: "", width: "", height: "" });
  const [paymentMode, setPaymentMode] = useState<"PREPAID" | "COD">("PREPAID");
  const [codAmount, setCodAmount] = useState("");

  const [billableWeight, setBillableWeight] = useState(0);
  const [quotes, setQuotes] = useState<RateQuote[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<{ orderNumber: string; awbNumber: string; orderId: string } | null>(null);

  async function saveNewPickup() {
    const res = await fetch("/api/addresses", {
      method: "POST",
      body: JSON.stringify({ ...newPickup, type: "PICKUP", isDefault: pickupAddresses.length === 0 }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.address.id as string;
  }

  async function checkServiceability(fromPincode: string, toPincode: string) {
    if (fromPincode.length === 6 && toPincode.length === 6) {
      try {
        const res = await fetch("/api/serviceability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromPincode, toPincode }),
        });
        const data = await res.json();
        if (data.serviceable) {
          setServiceableMessage("Pincodes are serviceable");
        } else {
          setServiceableMessage("Warning: Shipmozo may not service these pincodes");
        }
      } catch {
        setServiceableMessage(null);
      }
    }
  }

  async function handleGetRates() {
    setError(null);
    setLoading(true);
    try {
      const fromPincode = showAddPickup ? newPickup.pincode : pickupAddresses.find((a) => a.id === pickupAddressId)?.pincode;
      if (!fromPincode || fromPincode.length !== 6) throw new Error("Please enter a valid 6-digit pickup pincode");
      if (!buyer.pincode || buyer.pincode.length !== 6) throw new Error("Please enter a valid 6-digit delivery pincode");

      const res = await fetch("/api/rates", {
        method: "POST",
        body: JSON.stringify({
          fromPincode,
          toPincode: buyer.pincode,
          weight: Number(pkg.weight),
          length: Number(pkg.length),
          width: Number(pkg.width),
          height: Number(pkg.height),
          paymentMode,
          codAmount: paymentMode === "COD" ? Number(codAmount) || 0 : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBillableWeight(data.billableWeight);
      setQuotes(data.quotes);
      setSelectedCourierId(data.quotes[0]?.courierId ?? null);
      if (data.quotes.length === 0) setError("No courier is serviceable for this route with the selected options.");
      else setStage("rates");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleBook() {
    if (!selectedCourierId) return;
    setError(null);
    setLoading(true);
    try {
      let effectivePickupId = pickupAddressId;
      if (showAddPickup) {
        effectivePickupId = await saveNewPickup();
      }

      const quote = quotes.find((q) => q.courierId === selectedCourierId)!;
      const buyerAddressRes = await fetch("/api/addresses", {
        method: "POST",
        body: JSON.stringify({ ...buyer, type: "BUYER", label: "Order buyer" }),
      });
      const buyerAddressData = await buyerAddressRes.json();
      if (!buyerAddressRes.ok) throw new Error(buyerAddressData.error);

      const res = await fetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          pickupAddressId: effectivePickupId,
          buyerAddressId: buyerAddressData.address.id,
          courierId: quote.courierId,
          sellerPrice: quote.sellerPrice,
          margin: quote.margin,
          itemDescription: `${pkg.packageType} - ${pkg.itemDescription}`,
          declaredValue: Number(pkg.declaredValue),
          weight: Number(pkg.weight),
          length: Number(pkg.length),
          width: Number(pkg.width),
          height: Number(pkg.height),
          paymentMode,
          codAmount: paymentMode === "COD" ? Number(codAmount) || 0 : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBookingResult(data);
      setStage("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (stage === "success" && bookingResult) {
    return (
      <Card className="p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-success">✓</div>
        <h2 className="text-lg font-semibold text-foreground">Order booked successfully</h2>
        <p className="mt-1 text-sm text-muted">
          Order <span className="font-medium text-foreground">{bookingResult.orderNumber}</span> · AWB{" "}
          <span className="font-mono font-medium text-foreground">{bookingResult.awbNumber}</span>
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" onClick={() => router.push(`/orders/${bookingResult.orderId}`)}>View Order</Button>
          <Button onClick={() => router.push("/orders/new")}>Book Another</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-danger">{error}</div>}

      {stage === "pincodes" && (
        <>
          <Card>
            <CardHeader title="Route Details" subtitle="Enter pickup and delivery pincodes" />
            <div className="grid grid-cols-2 gap-5 p-5">
              <div>
                <label className={labelClass}>Pickup Pincode</label>
                {!showAddPickup ? (
                  <div className="space-y-2">
                    <select className={inputClass} value={pickupAddressId} onChange={(e) => setPickupAddressId(e.target.value)}>
                      {pickupAddresses.map((a) => (
                        <option key={a.id} value={a.id}>{a.label} — {a.city}, {a.pincode}{a.isDefault ? " (default)" : ""}</option>
                      ))}
                    </select>
                    <button type="button" className="text-xs font-medium text-brand" onClick={() => setShowAddPickup(true)}>+ Add new pickup location</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input className={inputClass} placeholder="6-digit Pincode" value={newPickup.pincode} onChange={(e) => setNewPickup({ ...newPickup, pincode: e.target.value })} />
                    {pickupAddresses.length > 0 && (
                      <button type="button" className="text-xs text-muted hover:underline" onClick={() => setShowAddPickup(false)}>
                        Use a saved address instead
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className={labelClass}>Delivery Pincode</label>
                <input className={inputClass} placeholder="6-digit Pincode" value={buyer.pincode} onChange={(e) => {
                  const newPincode = e.target.value;
                  setBuyer({ ...buyer, pincode: newPincode });
                  const fromPincode = showAddPickup ? newPickup.pincode : pickupAddresses.find((a) => a.id === pickupAddressId)?.pincode;
                  if (fromPincode && newPincode.length === 6) {
                    checkServiceability(fromPincode, newPincode);
                  }
                }} />
                {serviceableMessage && (
                  <div className={`mt-1 text-xs font-medium ${serviceableMessage.includes('Warning') ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {serviceableMessage}
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Package Details" />
            <div className="grid grid-cols-3 gap-3 p-5">
              <div>
                <label className={labelClass}>Package Type</label>
                <select className={inputClass} value={pkg.packageType} onChange={(e) => setPkg({ ...pkg, packageType: e.target.value })}>
                  <option value="Document">Document</option>
                  <option value="Box">Box</option>
                  <option value="Apparel">Apparel</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Cosmetics">Cosmetics</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="col-span-2"><label className={labelClass}>Item description</label><input className={inputClass} value={pkg.itemDescription} onChange={(e) => setPkg({ ...pkg, itemDescription: e.target.value })} /></div>
              <div><label className={labelClass}>Declared value (₹)</label><input type="number" className={inputClass} value={pkg.declaredValue} onChange={(e) => setPkg({ ...pkg, declaredValue: e.target.value })} /></div>
              <div><label className={labelClass}>Weight (kg)</label><input type="number" step="0.01" className={inputClass} value={pkg.weight} onChange={(e) => setPkg({ ...pkg, weight: e.target.value })} /></div>
              <div />
              <div><label className={labelClass}>Length (cm)</label><input type="number" className={inputClass} value={pkg.length} onChange={(e) => setPkg({ ...pkg, length: e.target.value })} /></div>
              <div><label className={labelClass}>Width (cm)</label><input type="number" className={inputClass} value={pkg.width} onChange={(e) => setPkg({ ...pkg, width: e.target.value })} /></div>
              <div><label className={labelClass}>Height (cm)</label><input type="number" className={inputClass} value={pkg.height} onChange={(e) => setPkg({ ...pkg, height: e.target.value })} /></div>
              <div className="col-span-3 flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-sm"><input type="radio" checked={paymentMode === "PREPAID"} onChange={() => setPaymentMode("PREPAID")} /> Prepaid</label>
                <label className="flex items-center gap-2 text-sm"><input type="radio" checked={paymentMode === "COD"} onChange={() => setPaymentMode("COD")} /> COD</label>
                {paymentMode === "COD" && (
                  <input type="number" placeholder="COD amount to collect (₹)" className={`${inputClass} max-w-xs`} value={codAmount} onChange={(e) => setCodAmount(e.target.value)} />
                )}
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button disabled={loading} onClick={handleGetRates}>{loading ? "Checking rates…" : "Check Courier Rates →"}</Button>
          </div>
        </>
      )}

      {stage === "rates" && (
        <Card>
          <CardHeader title="Compare Couriers" subtitle={`Billable weight: ${billableWeight.toFixed(2)} kg (higher of actual vs volumetric)`} />
          <div className="divide-y divide-border">
            {quotes.map((q) => (
              <label key={q.courierId} className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <input type="radio" checked={selectedCourierId === q.courierId} onChange={() => setSelectedCourierId(q.courierId)} />
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ backgroundColor: q.logoColor }}>
                    {q.courierCode.slice(0, 3)}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{q.courierName}</p>
                    <p className="text-xs text-muted">★ {q.rating.toFixed(1)} · {q.etaMinDays}-{q.etaMaxDays} days · RTO risk {q.rtoRiskPercent}%</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-foreground">₹{q.sellerPrice.toFixed(2)}</p>
                  <p className="text-xs text-muted">incl. ₹{q.margin.toFixed(2)} margin</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-between border-t border-border px-5 py-4">
            <Button variant="secondary" onClick={() => setStage("pincodes")}>← Back to Details</Button>
            <Button disabled={!selectedCourierId} onClick={() => setStage("details")}>Continue to Address Details →</Button>
          </div>
        </Card>
      )}

      {stage === "details" && (
        <>
          {showAddPickup && (
            <Card>
              <CardHeader title="Complete Pickup Address" subtitle="Fill out the remaining pickup address details" />
              <div className="grid grid-cols-2 gap-3 p-5">
                <input className={inputClass} placeholder="Warehouse label" value={newPickup.label} onChange={(e) => setNewPickup({ ...newPickup, label: e.target.value })} />
                <input className={inputClass} placeholder="Contact name" value={newPickup.contactName} onChange={(e) => setNewPickup({ ...newPickup, contactName: e.target.value })} />
                <input className={inputClass} placeholder="Phone" value={newPickup.phone} onChange={(e) => setNewPickup({ ...newPickup, phone: e.target.value })} />
                <input className={`${inputClass} bg-slate-50 text-muted-foreground`} placeholder="Pincode" value={newPickup.pincode} readOnly />
                <input className={`${inputClass} col-span-2`} placeholder="Address line" value={newPickup.addressLine1} onChange={(e) => setNewPickup({ ...newPickup, addressLine1: e.target.value })} />
                <input className={inputClass} placeholder="City" value={newPickup.city} onChange={(e) => setNewPickup({ ...newPickup, city: e.target.value })} />
                <input className={inputClass} placeholder="State" value={newPickup.state} onChange={(e) => setNewPickup({ ...newPickup, state: e.target.value })} />
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="Complete Consignee (Buyer) Address" />
            <div className="grid grid-cols-2 gap-3 p-5">
              <div><label className={labelClass}>Full name</label><input className={inputClass} value={buyer.contactName} onChange={(e) => setBuyer({ ...buyer, contactName: e.target.value })} /></div>
              <div><label className={labelClass}>Phone</label><input className={inputClass} value={buyer.phone} onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })} /></div>
              <div className="col-span-2"><label className={labelClass}>Address</label><input className={inputClass} value={buyer.addressLine1} onChange={(e) => setBuyer({ ...buyer, addressLine1: e.target.value })} /></div>
              <div><label className={labelClass}>City</label><input className={inputClass} value={buyer.city} onChange={(e) => setBuyer({ ...buyer, city: e.target.value })} /></div>
              <div><label className={labelClass}>State</label><input className={inputClass} value={buyer.state} onChange={(e) => setBuyer({ ...buyer, state: e.target.value })} /></div>
              <div className="col-span-2"><label className={labelClass}>Pincode</label><input className={`${inputClass} bg-slate-50 text-muted-foreground`} value={buyer.pincode} readOnly /></div>
            </div>
          </Card>

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStage("rates")}>← Back to Rates</Button>
            <Button disabled={loading} onClick={handleBook}>{loading ? "Booking…" : "Book Shipment"}</Button>
          </div>
        </>
      )}
    </div>
  );
}
