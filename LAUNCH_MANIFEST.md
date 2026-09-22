# Hetex — Production Launch Manifest

_Manifest No. HTX-LAUNCH-01 · Issued 2026-09-21_

Everything currently running locally — the Next.js frontend (`frontend/`), the Spring Boot / gRPC backend (`backend/`, gRPC on port 9090), and PostgreSQL — works today on **mock** providers standing in for real vendors. This manifest lists exactly which accounts to open, in what order, with a recommended vendor and expected cost for each, to swap those mocks for the real thing.

> **Verify before purchase.** Prices below are 2026 estimates from public vendor pages, in India context. Courier-aggregator deposits, GST-linked fees, and promo pricing change often — confirm current terms directly with each vendor before signing anything.

---

## 01 — Domain & DNS

For `hetex.com`.

- **Recommended: Cloudflare Registrar** — sells at cost, no renewal markup, bundles free DNS/SSL/CDN proxying you'll want anyway.
- Alt: Namecheap (renews ≈ ₹1,250/yr), GoDaddy (cheap first year, renews sharply higher — avoid for a domain you intend to keep).

**Cost:** ≈ ₹820/year (Cloudflare, flat) · Namecheap ≈ ₹1,250/yr · GoDaddy ≈ ₹1,700–1,850/yr

Check `hetex.in` as a backup at the same registrars (≈ ₹500–800/yr) if `.com` is taken.

## 02 — Hosting & Database

Runs `frontend/` (Next.js), `backend/` (Spring Boot gRPC), and PostgreSQL.

- **Recommended: Render or Railway** — lowest fixed cost for early, low-traffic use.
- Alt: DigitalOcean (flat-billed droplets, good once traffic is steady), AWS EC2 + RDS (matches the original ShipSmart proposal's stack; worth it once you also want S3 for label PDFs and CloudFront in front of the app).

**gRPC needs an always-on server** — rule out pure-serverless functions (e.g. Vercel alone) for the backend.

**Cost:** ₹2,500–5,000/mo (Render/Railway) · ₹5,400–6,700/mo (DigitalOcean) · ₹4,600–5,800/mo (AWS, before data transfer)

## 03 — Payment Gateway

Replaces `frontend/src/lib/providers/payments/mock-razorpay.ts`.

- **Recommended: Razorpay**
- Alt: Cashfree, PayU

Needs PAN, GST certificate, business proof, and a current account for KYC. Express Activation can approve a merchant in about an hour; standard review takes 3–4 business days. A mid-2026 new-merchant promo waives the platform fee on domestic payments up to ₹5 lakh GMV or 90 days — ask for it at signup.

**Cost:** ≈ 2% + GST per card/netbanking/wallet transaction · UPI has no RBI-mandated fee (confirm platform fee)

## 04 — Courier / Logistics API

Replaces `backend/src/main/java/com/hetex/service/courier/MockCourierAdapter.java` and `CourierRegistry.java`.

- **Recommended: Shiprocket** (publishes a developer API and per-shipment pricing)
- Alt: iThink Logistics, ClickPost (both quote-based)

**Don't approach Delhivery, Ekart, Xpressbees, BlueDart, or DTDC one by one** — each demands its own partnership, volume commitment, and deposit. Go through a multi-courier aggregator API instead: one contract, one integration, resold access to all of them — the same aggregation model Hetex itself offers its sellers. None of these publish deposit terms; get 2–3 quotes before committing.

**Cost:** ₹20–26 per 500g shipment (Shiprocket, before COD/zone surcharges) · others quote-based

## 05 — WhatsApp Business API

Replaces the `WHATSAPP` channel in `frontend/src/lib/providers/notify/index.ts`.

- **Recommended: Interakt** (cheapest entry plan)
- Alt: WATI, Gupshup (usage-based, better for high volume)

Requires going through an official Meta Business Solution Provider — you can't call WhatsApp's API directly. Meta charges per message on top of the BSP's own plan: roughly ₹0.88 for a marketing template, ₹0.125 for a utility one (order updates and OTPs fall here).

**Cost:** ₹999–2,499/mo plan (Interakt) + ₹0.13–0.90 per message · WATI ₹2,499–6,999+/mo · Gupshup ₹10,000–50,000+/mo

Basic Meta verification for API access: days to ~2 weeks. The separate green-badge "verified" status can take longer and isn't guaranteed — don't block launch on it.

## 06 — SMS OTP

Replaces `frontend/src/lib/providers/auth/otp.mock.ts`.

- **Recommended: MSG91** (routes directly through Indian telcos — faster, cheaper than a global provider)
- Alt: Twilio (reach for this only if you need international numbers later)

**Cost:** ₹0.15–0.20 per SMS (MSG91) · ≈ ₹0.45 per SMS (Twilio, incl. forex surcharge)

## 07 — Transactional Email

Replaces the `EMAIL` channel in `frontend/src/lib/providers/notify/index.ts`.

- **Recommended: AWS SES** (cheapest at real scale)
- Alt: Postmark (better deliverability tooling), SendGrid (no permanent free tier anymore — 60-day trial only)

**Cost:** $0.10 per 1,000 emails (SES) · Postmark ≈ $1/1,000 at volume · SendGrid $19.95/mo for 50k (trial only)

---

## Cost Ledger

Same three-part shape as the original ShipSmart proposal — fixed monthly cost, then everything that scales with orders.

### Monthly recurring (fixed)

| Item | Vendor | Cost |
|---|---|---|
| Domain | Cloudflare Registrar | ≈ ₹65/mo |
| Hosting + database | Render / Railway (starter) | ₹2,500–5,000/mo |
| WhatsApp BSP plan | Interakt (entry plan) | ₹999–2,499/mo |
| **Total fixed** | | **≈ ₹3,500–7,500/mo** |

### Pay-per-use (scales with orders)

| Item | Rate | Basis |
|---|---|---|
| Payment processing | ≈ 2% + GST | per transaction |
| Courier shipping | ₹20–26+ | per 500g, passed to seller margin |
| WhatsApp messages | ₹0.13–0.90 | per message |
| SMS OTP | ₹0.15–0.20 | per SMS |
| Email | ≈ ₹0.008 | per email |

---

_Estimates only — confirm with vendor sales before signing anything._
