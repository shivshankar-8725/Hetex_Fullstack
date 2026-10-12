# Hetex Courier — Hostinger Premium Migration Tracker

This document tracks the execution progress of migrating Hetex Courier from Java Spring Boot 3 + PostgreSQL + gRPC to a **Native PHP 8.x + MySQL + Next.js Static Export** stack suitable for **Hostinger Premium Web Hosting**.

**Active Repository**: [https://github.com/shivshankar-8725/Hetex_Fullstack.git](https://github.com/shivshankar-8725/Hetex_Fullstack.git)  
**Branch**: `hostinger-php-migration`

---

## Overall Progress Summary

| Workstream | Status | Completed Steps | Total Steps | Progress |
| :--- | :---: | :---: | :---: | :---: |
| **0. Setup & Repository** | ✅ Completed | 2 | 2 | 100% |
| **1. Database (MySQL Schema & Seeds)** | ✅ Completed | 3 | 3 | 100% |
| **2. Core PHP Engine & Auth Middleware** | ✅ Completed | 4 | 4 | 100% |
| **3. Auth & User Services (OTP, KYC)** | ✅ Completed | 5 | 5 | 100% |
| **4. Courier Engine (Delhivery & Shipmozo)** | ✅ Completed | 4 | 4 | 100% |
| **5. Wallet & Razorpay Webhook** | ✅ Completed | 4 | 4 | 100% |
| **6. Business APIs (Orders, Addresses, Admin)**| ✅ Completed | 5 | 5 | 100% |
| **7. Hostinger Routing & Web Server (.htaccess)**| ✅ Completed | 4 | 4 | 100% |
| **8. Hostinger Package & Deployment Docs** | ✅ Completed | 3 | 3 | 100% |

---

## Detailed Step-by-Step Task Checklist

### Workstream 0: Setup & Repository
- [x] **Task 0.1**: Create/Link new repository (`Hetex_Fullstack.git`) and branch (`hostinger-php-migration`).
- [x] **Task 0.2**: Create migration blueprint ([HOSTINGER_MIGRATION_PLAN.md](file:///c:/Users/hp/Desktop/Hetex_Courier/HOSTINGER_MIGRATION_PLAN.md)) and migration tracker ([MIGRATION_TRACKER.md](file:///c:/Users/hp/Desktop/Hetex_Courier/MIGRATION_TRACKER.md)).

### Workstream 1: Database Migration (PostgreSQL -> MySQL)
- [x] **Task 1.1**: Map all entity schemas from Spring Boot JPA to MySQL 8 / MariaDB syntax.
- [x] **Task 1.2**: Generate `api/schema/hetex_mysql_schema.sql` (Tables, Indexes, Foreign Keys, JSON columns).
- [x] **Task 1.3**: Add seed data (System Admin account, Courier providers, default Commission Markup rules).

### Workstream 2: Core PHP REST Engine & Middleware
- [x] **Task 2.1**: Implement front controller and route dispatcher (`api/index.php`).
- [x] **Task 2.2**: Implement PDO Database connector with retry and prepared statements (`api/config/db.php`).
- [x] **Task 2.3**: Implement zero-dependency Pure PHP JWT encoder/decoder/validator (`api/utils/jwt.php`).
- [x] **Task 2.4**: Implement request/response helper (CORS, JSON formatting, HTTP status codes, error handling in `api/utils/response.php`).

### Workstream 3: Authentication, OTP & User Onboarding
- [x] **Task 3.1**: Implement `AuthController.php` (Registration with password hash `password_hash`, Login).
- [x] **Task 3.2**: Implement Phone OTP dispatch and validation (`/api/auth/send-phone-otp`, `/api/auth/verify-phone-otp`).
- [x] **Task 3.3**: Implement User profile endpoint (`/api/auth/me`).
- [x] **Task 3.4**: Implement KYC submission endpoint (`/api/auth/kyc/submit`).

### Workstream 4: Logistics & Courier Integrations
- [x] **Task 4.1**: Implement volumetric weight calculation in `RateController.php`.
- [x] **Task 4.2**: Implement dynamic platform markup and commission calculation.
- [x] **Task 4.3**: Implement active courier rates listing (Delhivery Surface/Express, Shipmozo, BlueDart).
- [x] **Task 4.4**: Implement public tracking endpoint (`/api/track?awb=...`).

### Workstream 5: Wallet & Razorpay Webhooks
- [x] **Task 5.1**: Implement wallet balance & transaction ledger logic with ACID transactions (`api/controllers/WalletController.php`).
- [x] **Task 5.2**: Implement Razorpay Order creation API (`/api/wallet/recharge/create-order`).
- [x] **Task 5.3**: Implement Razorpay Webhook controller with HMAC-SHA256 signature verification (`/api/webhooks/razorpay`).

### Workstream 6: Business Operations APIs
- [x] **Task 6.1**: Address book management (`/api/addresses` - Pickup & Delivery addresses).
- [x] **Task 6.2**: Order booking and lifecycle (`/api/orders` - Atomic wallet deduction, AWB generation).
- [x] **Task 6.3**: Support ticket creation and message replies (`/api/tickets`).
- [x] **Task 6.4**: Admin management endpoints (`/api/admin/stats`, `/api/admin/users`, `/api/admin/commission`).

### Workstream 7: Hostinger Routing & Web Server Configuration
- [x] **Task 7.1**: Configure `.htaccess` for Apache/LiteSpeed with clean URL rewriting.
- [x] **Task 7.2**: Protect database and sensitive configuration files from direct HTTP access.
- [x] **Task 7.3**: Configure client-side SPA routing fallback to `index.html`.

### Workstream 8: Hostinger Deployment Package & Verification
- [x] **Task 8.1**: Create Hostinger deployment instructions ([HOSTINGER_DEPLOYMENT_README.md](file:///c:/Users/hp/Desktop/Hetex_Courier/HOSTINGER_DEPLOYMENT_README.md)).
- [x] **Task 8.2**: Commit and push all changes to GitHub `Hetex_Fullstack` repository.

---

*Last Updated: 2026-10-12 | Branch: `hostinger-php-migration`*
