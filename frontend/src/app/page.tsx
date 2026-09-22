import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

const FEATURES = [
  { title: "Compare 7+ Couriers Instantly", desc: "Real-time rate comparison with volumetric weight logic — always ship with the cheapest or fastest option." },
  { title: "Book in 2 Clicks", desc: "AWB generation, shipping labels, and pickup requests are fully automated the moment you book." },
  { title: "Live Tracking Everywhere", desc: "Buyers get a branded tracking page and WhatsApp/SMS/Email updates at every status change." },
  { title: "NDR & RTO Management", desc: "A dedicated panel to reattempt or return failed deliveries before they cost you money." },
  { title: "COD Reconciliation", desc: "Transparent COD remittance dashboard with D+2 settlement tracking." },
  { title: "Wallet-based Billing", desc: "Prepay into your wallet — every shipment auto-deducts the courier charge plus your margin." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <Logo />
        <Link href="/login"><Button>Log in</Button></Link>
      </header>

      <section className="brand-gradient relative overflow-hidden px-6 py-20 text-center text-white">
        <h1 className="relative mx-auto max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl">
          One dashboard. Every courier. <span className="text-accent">Best rate, every time.</span>
        </h1>
        <p className="relative mx-auto mt-5 max-w-2xl text-lg text-white/80">
          HetEx compares Delhivery, Ekart, Xpressbees, BlueDart, DTDC and more in real time, so you always book the cheapest or fastest shipment — then tracks it end-to-end.
        </p>
        <div className="relative mt-8 flex justify-center gap-3">
          <Link href="/login"><Button className="!bg-accent px-6 py-3 text-base !text-white hover:!bg-accent-dark">Get Started Free</Button></Link>
        </div>
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/5" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 left-10 h-56 w-56 rounded-full bg-white/5" />
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 py-24 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-border bg-surface p-6 shadow-card transition-shadow hover:shadow-elevated">
            <h3 className="font-semibold text-foreground">{f.title}</h3>
            <p className="mt-2 text-sm text-muted">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border px-6 py-8 text-center text-xs text-muted">© {new Date().getFullYear()} HetEx. All rights reserved.</footer>
    </div>
  );
}
