# Hetex Courier — Complete Production Deployment Guide 🚀

This document is an end-to-end, step-by-step blueprint for deploying **Hetex Courier** to production from scratch. It covers what services/infrastructure to procure, how to set up server environments, how to configure real APIs, and how to deploy both the Spring Boot backend and Next.js frontend with SSL certificates and auto-restart services.

---

## Table of Contents
1. [Prerequisites & What to Buy](#1-prerequisites--what-to-buy)
2. [Production Architecture](#2-production-architecture)
3. [Step 1: Domain & DNS Configuration](#step-1-domain--dns-configuration)
4. [Step 2: Server Provisioning & Prerequisites](#step-2-server-provisioning--prerequisites)
5. [Step 3: PostgreSQL Production Database Setup](#step-3-postgresql-production-database-setup)
6. [Step 4: Code Deployment & Environment Configuration](#step-4-code-deployment--environment-configuration)
7. [Step 5: Spring Boot Backend Deployment (Systemd)](#step-5-spring-boot-backend-deployment-systemd)
8. [Step 6: Next.js Frontend Deployment (PM2)](#step-6-nextjs-frontend-deployment-pm2)
9. [Step 7: Nginx Reverse Proxy & Free Let's Encrypt SSL](#step-7-nginx-reverse-proxy--free-lets-encrypt-ssl)
10. [Step 8: Razorpay & Delhivery Webhook Configuration](#step-8-razorpay--delhivery-webhook-configuration)
11. [Step 9: Post-Deployment Verification Checklist](#step-9-post-deployment-verification-checklist)

---

## 1. Prerequisites & What to Buy

### A. Domain Name
- **Where to buy**: Namecheap, GoDaddy, Hostinger, or AWS Route53.
- **Example**: `hetex.in`
- **Subdomains**:
  - `app.hetex.in` → Frontend Web Application
  - `api.hetex.in` → Spring Boot Backend API & gRPC Gateway

### B. Cloud Server (VPS / Dedicated Server)
- **Recommended Provider**: AWS (EC2 t3.medium), DigitalOcean (4GB RAM Droplet), Hetzner (CX22/CX32), or Hostinger VPS.
- **Recommended OS**: Ubuntu 22.04 LTS (64-bit).
- **Hardware Specifications**:
  - **RAM**: Minimum 4 GB (8 GB recommended for concurrent Java JVM + Node.js + PostgreSQL).
  - **CPU**: 2 vCPUs.
  - **Storage**: 50 GB SSD / NVMe.

### C. External Third-Party Accounts & API Credentials

| Service | Provider / Website | What You Get / Credentials Required | Purpose |
|---|---|---|---|
| **Payment Gateway** | [Razorpay Dashboard](https://dashboard.razorpay.com) | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Wallet Recharge & UPI QR Payments |
| **Courier Integration** | [Delhivery B2C Portal](https://ucp.delhivery.com) | `DELHIVERY_API_KEY`, `DELHIVERY_CLIENT_NAME` | Real Logistics Booking, AWB Generation, Tracking |
| **SMS Gateway** | [MSG91](https://msg91.com) / [Fast2SMS](https://www.fast2sms.com) | `SMS_API_KEY`, `SMS_SENDER_ID`, DLT Entity ID | Real Phone OTP Delivery during Registration & Login |
| **Email Gateway** | [Resend](https://resend.com) / [SendGrid](https://sendgrid.com) | `EMAIL_API_KEY`, `FROM_ADDRESS` (`noreply@hetex.in`) | Email OTP Verification & Account Notifications |
| **eKYC Provider** | [Sandbox.co.in](https://sandbox.co.in) / [Digio](https://www.digio.in) | `KYC_API_KEY`, `KYC_API_SECRET` | Aadhaar OTP, PAN Card & GSTIN Verification |

---

## 2. Production Architecture

```
                                +---------------------------+
                                |  End Users / Sellers /    |
                                |       Administrators      |
                                +-------------+-------------+
                                              |
                                              | HTTPS 443
                                              v
                                +-------------+-------------+
                                | Nginx Reverse Proxy & SSL |
                                +------+--------------+------+
                                       |              |
                http://localhost:3000  |              |  http://localhost:8080
            +--------------------------+              +--------------------------+
            |                                                                    |
            v                                                                    v
+-----------+---------------------+                                +-------------+---------------------+
| Next.js Frontend App (PM2)     |                                | Spring Boot Backend API (Systemd)   |
+-----------+---------------------+                                +-------------+---------------------+
            |                                                                    |
            +----------------------> gRPC Target: localhost:9090 <---------------+
                                                                                 | JDBC 5432
                                                                                 v
                                                                   +-------------+---------------------+
                                                                   | PostgreSQL 16 Production DB       |
                                                                   +-----------------------------------+
```

---

## Step 1: Domain & DNS Configuration

In your domain registrar (GoDaddy / Namecheap / Route53), add the following **A Records** pointing to your server's Public IP Address (`192.0.2.1` in this example):

| Type | Name / Host | Value / Points To | TTL |
|---|---|---|---|
| A | `app` | `192.0.2.1` | Automatic / 300s |
| A | `api` | `192.0.2.1` | Automatic / 300s |

---

## Step 2: Server Provisioning & Prerequisites

Connect to your Ubuntu server via SSH:
```bash
ssh root@192.0.2.1
```

### 1. Update Packages & Firewall Setup
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip build-essential ufw certbot python3-certbot-nginx

# Configure UFW Firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### 2. Install OpenJDK 17 & Maven
```bash
sudo apt install -y openjdk-17-jdk maven
java -version  # Confirm OpenJDK 17
```

### 3. Install Node.js 20 & PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
node -v # Confirm v20.x
```

---

## Step 3: PostgreSQL Production Database Setup

### 1. Install & Start PostgreSQL 16
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### 2. Create Database & Credentials
```bash
sudo -u postgres psql
```
In the PostgreSQL prompt, execute:
```sql
CREATE DATABASE hetex;
CREATE USER hetex_prod WITH PASSWORD 'SecureProdPassword2026!';
GRANT ALL PRIVILEGES ON DATABASE hetex TO hetex_prod;
ALTER DATABASE hetex OWNER TO hetex_prod;
\q
```

---

## Step 4: Code Deployment & Environment Configuration

### 1. Clone Code Base
```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/shivshankar-8725/hetex-courier.git
cd hetex-courier
git checkout dev  # or main
```

### 2. Configure Backend Production Environment (`backend/src/main/resources/application-prod.yml`)
Create or edit `/var/www/hetex-courier/backend/src/main/resources/application-prod.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/hetex
    username: hetex_prod
    password: SecureProdPassword2026!

hetex:
  jwt:
    secret: REPLACE_WITH_LONG_64_CHARACTER_RANDOM_SECRET_KEY
    expiry-days: 30

  delhivery:
    token: YOUR_REAL_DELHIVERY_PRODUCTION_TOKEN
    base-url: https://track.delhivery.com
    client-name: HETEX

  razorpay:
    key-id: rzp_live_YOUR_PRODUCTION_KEY_ID
    key-secret: YOUR_PRODUCTION_KEY_SECRET
    webhook-secret: YOUR_PRODUCTION_WEBHOOK_SECRET

  sms:
    provider: MSG91 # or FAST2SMS
    api-key: YOUR_PRODUCTION_SMS_API_KEY
    sender-id: HETEX
    template-id: YOUR_DLT_APPROVED_TEMPLATE_ID

  email:
    provider: RESEND # or SENDGRID
    api-key: re_YOUR_RESEND_API_KEY
    from-address: noreply@hetex.in

  kyc:
    provider: SANDBOX
    api-key: key_live_YOUR_SANDBOX_KEY
    api-secret: secret_live_YOUR_SANDBOX_SECRET
    base-url: https://api.sandbox.co.in
```

### 3. Configure Frontend Environment (`frontend/.env.production`)
Create `/var/www/hetex-courier/frontend/.env.production`:

```env
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_YOUR_PRODUCTION_KEY_ID
HETEX_GRPC_TARGET=localhost:9090
JWT_SECRET=REPLACE_WITH_LONG_64_CHARACTER_RANDOM_SECRET_KEY
NODE_ENV=production
```

---

## Step 5: Spring Boot Backend Deployment (Systemd)

### 1. Build Backend Executable JAR
```bash
cd /var/www/hetex-courier/backend
mvn clean package -DskipTests
```
The compiled JAR will be located at:
`/var/www/hetex-courier/backend/target/hetex-backend-0.1.0.jar`

### 2. Create Systemd Service File
Create `/etc/systemd/system/hetex-backend.service`:

```ini
[Unit]
Description=Hetex Courier Spring Boot Backend
After=network.target postgresql.service

[Service]
User=root
WorkingDirectory=/var/www/hetex-courier/backend
ExecStart=/usr/bin/java -jar -Dspring.profiles.active=prod target/hetex-backend-0.1.0.jar
SuccessExitStatus=143
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=hetex-backend

[Install]
WantedBy=multi-user.target
```

### 3. Start & Enable Backend Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable hetex-backend
sudo systemctl start hetex-backend
sudo systemctl status hetex-backend
```

---

## Step 6: Next.js Frontend Deployment (PM2)

### 1. Build Production Next.js Application
```bash
cd /var/www/hetex-courier/frontend
npm install --production=false
npm run build
```

### 2. Start Frontend Process with PM2
```bash
pm2 start npm --name "hetex-frontend" -- run start -- -p 3000
pm2 save
pm2 startup
```

---

## Step 7: Nginx Reverse Proxy & Free Let's Encrypt SSL

### 1. Install & Configure Nginx
Create `/etc/nginx/sites-available/hetex`:

```nginx
# Frontend App (app.hetex.in)
server {
    server_name app.hetex.in;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Backend API & Webhooks (api.hetex.in)
server {
    server_name api.hetex.in;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site link and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/hetex /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 2. Obtain Free SSL Certificates (Certbot)
```bash
sudo certbot --nginx -d app.hetex.in -d api.hetex.in
```
Certbot automatically updates the Nginx config to enforce **HTTPS 443** with auto-renewing SSL certificates!

---

## Step 8: Razorpay & Delhivery Webhook Configuration

### 1. Razorpay Production Webhook
1. Log into [Razorpay Dashboard](https://dashboard.razorpay.com) → Settings → Webhooks.
2. Click **Add New Webhook**.
3. **Webhook URL**: `https://app.hetex.in/api/webhooks/razorpay` (or `https://api.hetex.in/api/webhooks/razorpay`).
4. **Secret**: Enter your `RAZORPAY_WEBHOOK_SECRET`.
5. **Active Events**:
   - `payment.captured`
   - `payment_link.paid`
   - `qr_code.credited`
   - `payment.failed`

### 2. Delhivery Tracking Push Webhook
In the Delhivery Client Portal, configure status update webhook:
- **Push URL**: `https://api.hetex.in/api/courier/delhivery/tracking-webhook`

---

## Step 9: Post-Deployment Verification Checklist

- [ ] **SSL Check**: Access `https://app.hetex.in` and verify SSL padlock is active.
- [ ] **Auth Check**: Register a new seller account, verify Email OTP & Phone OTP delivery.
- [ ] **Wallet Top-Up Check**: Add ₹100 via Razorpay Checkout / UPI QR and verify wallet balance increases only after server verification.
- [ ] **Logistics Booking Check**: Book an order using Delhivery, confirm AWB generation and label download.
- [ ] **eKYC Check**: Verify Aadhaar / GSTIN OTP verification in profile settings.
- [ ] **Admin Dashboard Check**: Log into `/admin` and verify master tracking, SLA gauges, and wallet liability reports.

---
*Hetex Courier — Production Deployment Manual 2026*
