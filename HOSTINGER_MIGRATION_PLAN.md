# Hetex Courier — Hostinger Premium Web Hosting Migration Blueprint

This plan outlines the end-to-end migration from **Java Spring Boot 3 + PostgreSQL + gRPC** to a **Native PHP + MySQL + Next.js Static Export** stack, designed to run 100% on **Hostinger Premium Shared Hosting**.

---

## 1. Target Architecture on Hostinger Premium

```
Hostinger Premium Shared Hosting (public_html)
│
├── index.html, _next/, favicon.ico ...  <-- Next.js Static Export (Single Page / Dashboard UI)
├── .htaccess                            <-- Apache URL Rewrite (Routes /api/* -> /api/index.php, and SPA fallback)
│
└── api/                                 <-- PHP Backend (Pure PHP 8.x + MySQL PDO, no complex daemons)
    ├── index.php                        <-- Front Controller / Router (Dispatches API requests)
    ├── config/
    │   ├── db.php                       <-- Hostinger MySQL PDO Connection
    │   └── jwt.php                      <-- JWT Auth Configuration
    ├── middleware/
    │   └── auth.php                     <-- JWT Token Verification Header Middleware
    ├── controllers/
    │   ├── AuthController.php           <-- Login, Register, Phone/Email OTP, KYC
    │   ├── OrderController.php          <-- Create B2C Order, Rate Calculator, Cancel
    │   ├── ShipmentController.php       <-- Manifest, Label PDF, Tracking, Shipmozo/Delhivery
    │   ├── WalletController.php         <-- Balance, Transactions, Razorpay Order & Webhook
    │   ├── RateController.php           <-- Courier Rate & Serviceability Calculation
    │   ├── CodController.php            <-- COD Remittance Ledger
    │   ├── NdrController.php            <-- Non-Delivery Report actions
    │   ├── TicketController.php         <-- Support tickets & messaging
    │   └── AdminController.php          <-- User management, commission markup rules
    ├── services/
    │   ├── DelhiveryService.php         <-- Delhivery B2C REST API integration
    │   ├── ShipmozoService.php          <-- Shipmozo Logistics REST API integration
    │   ├── RazorpayService.php          <-- Razorpay Order generation & Webhook signature validation
    │   ├── SmsService.php               <-- Fast2SMS / MSG91 OTP delivery
    │   └── EmailService.php             <-- Resend / SendGrid / Hostinger SMTP
    └── schema/
        └── hetex_mysql_schema.sql       <-- MySQL Database Schema (Importable into phpMyAdmin)
```

---

## 2. Phased Migration Workstreams

### Phase 1: Database Migration (PostgreSQL -> MySQL)
- Create `api/schema/hetex_mysql_schema.sql` converting all entities from PostgreSQL (UUIDs, TIMESTAMPTZ, JSONB, ENUMs) to MySQL 8 / MariaDB syntax (`VARCHAR(36)` / `CHAR(36)`, `DATETIME`, `JSON`, `DECIMAL(12,2)`).
- Provide initial seeds (Admin user, Default courier services: Delhivery & Shipmozo, Commission rules).

### Phase 2: Core PHP Backend Framework & Utilities
- Implement lightweight routing without requiring external server daemons or composer dependencies on shared hosting.
- Pure PHP JWT generator & validator (`api/utils/jwt.php`).
- MySQL PDO database wrapper (`api/config/db.php`) supporting Hostinger's standard DB credentials.
- Standard JSON response format and CORS headers.

### Phase 3: Authentication, Users & KYC Services
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/send-phone-otp` & `POST /api/auth/verify-phone-otp`
- `POST /api/auth/send-email-otp` & `POST /api/auth/verify-email-otp`
- `POST /api/auth/kyc/submit`

### Phase 4: Courier Integrations & Rate Engine
- Implement `RateController.php` (Zone lookup, volumetric weight calculation, commission margin markup).
- Implement `DelhiveryService.php` and `ShipmozoService.php` using standard PHP `curl`.
- Implement `ShipmentController.php` (Shipment booking, AWB tracking, label generation).

### Phase 5: Wallet & Razorpay Webhook
- `GET /api/wallet/balance`
- `GET /api/wallet/transactions`
- `POST /api/wallet/recharge/create-order` (Razorpay API)
- `POST /api/webhooks/razorpay` (HMAC SHA256 signature verification and atomic wallet top-up).

### Phase 6: Orders, Addresses, NDR & Tickets
- Address management (`GET/POST /api/addresses`).
- Order lifecycle (`GET/POST /api/orders`, `/api/orders/cancel`).
- NDR actions (`GET/POST /api/ndr`).
- Support tickets & chat (`GET/POST /api/tickets`).

### Phase 7: Next.js Frontend Adaptation for Hostinger
- Change API client in frontend to point to `/api/*` REST endpoints instead of gRPC.
- Configure `next.config.ts` for export compatibility.
- Build production assets (`npm run build`).
- Create `.htaccess` routing rules to seamlessly serve frontend routes and PHP backend endpoints under the same domain.

---

## 3. Hostinger Deployment Delivery
- Package a ready-to-upload ZIP:
  - Import `hetex_mysql_schema.sql` into Hostinger phpMyAdmin in 1 click.
  - Set DB credentials in `api/config/db.php`.
  - Extract files directly into `public_html`.
- Result: **Instant 200 OK without 403 Forbidden and zero external server dependencies.**
