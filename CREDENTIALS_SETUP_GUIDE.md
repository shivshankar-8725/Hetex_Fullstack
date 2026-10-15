# HetEx Courier — Third-Party API Credentials & Integration Guide

This guide explains how to connect **Real Production APIs** (Delhivery, Shipmozo, Razorpay, SMS OTP, and Email) to your HetEx application.

---

## 🎯 The Only File You Need to Edit

All third-party credentials and production keys are **centralized in a single file**:

📁 **[`api/config/credentials.php`](file:///c:/Users/hp/Desktop/Hetex_Courier/api/config/credentials.php)**

> [!NOTE]
> You do **not** need to search or edit multiple files. Whenever you want to switch from testing/sandbox to live production, just update [`api/config/credentials.php`](file:///c:/Users/hp/Desktop/Hetex_Courier/api/config/credentials.php).

---

## 1. 🗄️ Hostinger MySQL Database

In [`api/config/credentials.php`](file:///c:/Users/hp/Desktop/Hetex_Courier/api/config/credentials.php#L19-L23):
```php
public const DB_HOST = 'localhost';             // In Hostinger, always 'localhost'
public const DB_PORT = '3306';                  // Default MySQL port
public const DB_NAME = 'u969244453_hetex';      // Your Hostinger Database Name
public const DB_USER = 'u969244453_hetexuser';  // Your Hostinger Database Username
public const DB_PASS = 'YourDatabasePassword';  // Your Database Password
```
- **Where to find**: Hostinger hPanel ➔ **Databases** ➔ **MySQL Databases**.
- **Schema**: Import [`api/schema/hetex_mysql_schema.sql`](file:///c:/Users/hp/Desktop/Hetex_Courier/api/schema/hetex_mysql_schema.sql) in phpMyAdmin.

---

## 2. 🚚 Delhivery Logistics API

In [`api/config/credentials.php`](file:///c:/Users/hp/Desktop/Hetex_Courier/api/config/credentials.php#L29-L33):
```php
public const DELHIVERY_ENV = 'production';      // 'sandbox' or 'production'
public const DELHIVERY_API_KEY = 'YOUR_DELHIVERY_TOKEN_HERE';
public const DELHIVERY_CLIENT_NAME = 'HETEX_LOGISTICS';
public const DELHIVERY_BASE_URL = 'https://track.delhivery.com';
```
- **Where to find**:
  1. Log into your **Delhivery One** portal: [https://one.delhivery.com/](https://one.delhivery.com/)
  2. Navigate to **Settings** ➔ **API Credentials** (or B2B API Token).
  3. Copy your **API Token** and paste into `DELHIVERY_API_KEY`.
- **Sandbox URL**: `https://staging-express.delhivery.com`
- **Production URL**: `https://track.delhivery.com`

---

## 3. 📦 Shipmozo Shipping API

In [`api/config/credentials.php`](file:///c:/Users/hp/Desktop/Hetex_Courier/api/config/credentials.php#L39-L42):
```php
public const SHIPMOZO_BASE_URL = 'https://shipping-api.com/app/api/v1';
public const SHIPMOZO_PUBLIC_KEY = 'YOUR_SHIPMOZO_PUBLIC_KEY_HERE';
public const SHIPMOZO_PRIVATE_KEY = 'YOUR_SHIPMOZO_PRIVATE_KEY_HERE';
```
- **Where to find**:
  1. Log into your **Shipmozo Panel**: [https://app.shipmozo.com/](https://app.shipmozo.com/)
  2. Navigate to **API Settings** / **Developer Keys**.
  3. Copy **Public Key** & **Private Key** and paste into the constants above.

---

## 4. 💳 Razorpay Payment Gateway & Webhook

In [`api/config/credentials.php`](file:///c:/Users/hp/Desktop/Hetex_Courier/api/config/credentials.php#L48-L51):
```php
public const RAZORPAY_KEY_ID = 'rzp_live_xxxxxxxxxxxxxx';
public const RAZORPAY_KEY_SECRET = 'your_live_secret_here';
public const RAZORPAY_WEBHOOK_SECRET = 'your_webhook_secret_here';
```
- **Where to find**:
  1. Log into your **Razorpay Dashboard**: [https://dashboard.razorpay.com/](https://dashboard.razorpay.com/)
  2. Go to **Settings** ➔ **API Keys** ➔ **Generate Live Key**.
  3. Copy `Key Id` and `Key Secret`.
  4. (Optional Webhook): Go to **Settings** ➔ **Webhooks** ➔ Add Webhook URL: `https://yourdomain.com/api/webhooks/razorpay`, choose event `order.paid`, and set a secret.

---

## 5. 📱 SMS / WhatsApp OTP Gateway

In [`api/config/credentials.php`](file:///c:/Users/hp/Desktop/Hetex_Courier/api/config/credentials.php#L57-L61):
```php
public const SMS_PROVIDER = 'FAST2SMS';         // 'FAST2SMS', 'MSG91', or 'TWILIO'
public const SMS_API_KEY = 'YOUR_FAST2SMS_API_KEY_HERE';
public const SMS_SENDER_ID = 'HETEXX';          // 6-digit DLT Sender Header
public const SMS_DLT_TE_ID = '120716xxxxxxxx';  // DLT Template ID
```
- **Recommended Provider**: **Fast2SMS** ([https://www.fast2sms.com/](https://www.fast2sms.com/)) or **MSG91** ([https://msg91.com/](https://msg91.com/)).
- For India, telecom regulations require DLT registration for SMS headers and templates.
- **Testing mode**: If left with placeholder text, the platform automatically logs the OTP and returns `devOtp` so you can test registration and logins immediately without incurring SMS costs.

---

## 6. ✉️ SMTP Email Service

In [`api/config/credentials.php`](file:///c:/Users/hp/Desktop/Hetex_Courier/api/config/credentials.php#L67-L73):
```php
public const SMTP_HOST = 'smtp.hostinger.com';  // Hostinger SMTP host
public const SMTP_PORT = 465;                   // 465 (SSL)
public const SMTP_USER = 'support@hetex.in';     // Your Hostinger email account
public const SMTP_PASS = 'YourEmailPassword';   // Hostinger email password
public const SMTP_FROM_EMAIL = 'support@hetex.in';
public const SMTP_FROM_NAME = 'HetEx Express Support';
```
- **Where to find on Hostinger**:
  1. Open **Hostinger hPanel** ➔ **Emails** ➔ select your domain.
  2. Click **Manage** ➔ **Email Accounts** ➔ create `support@hetex.in`.
  3. View **Configuration Settings**:
     - SMTP Host: `smtp.hostinger.com`
     - SMTP Port: `465` (SSL)

---

## 7. 📞 Admin Dynamic Helpline & UPI QR (No Code Change Needed!)

The **Helpline Number**, **Operating Hours**, **Support Email**, and **Merchant UPI ID** can be changed directly from your browser anytime:
1. Log into the **Admin Panel**: `https://yourdomain.com/admin` (Email: `admin@hetex.in`).
2. Go to the **Helpline & UPI Settings** tab.
3. Edit the numbers/email and click **💾 Save Configuration**.
4. Both the **Landing Page** (`/`) and **Seller Dashboard** (`/dashboard`) update immediately.
