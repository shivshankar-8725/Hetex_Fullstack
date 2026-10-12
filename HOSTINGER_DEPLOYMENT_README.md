# Hetex Courier — Hostinger Premium Web Hosting Deployment Guide

This guide describes how to deploy the newly migrated application directly to **Hostinger Premium Web Hosting**.

---

## Step 1: Create the MySQL Database on Hostinger

1. Log in to **Hostinger hPanel**.
2. Navigate to **Databases** → **Management**.
3. Create a new MySQL Database:
   - **Database Name**: e.g., `u123456789_hetex`
   - **Username**: e.g., `u123456789_hetexuser`
   - **Password**: choose a strong password
4. Click **Enter phpMyAdmin** next to your newly created database.
5. In phpMyAdmin, go to the **Import** tab, click **Choose File**, select `api/schema/hetex_mysql_schema.sql`, and click **Go**.
   - *This creates all tables, foreign keys, default couriers, and the administrator account instantly.*

---

## Step 2: Configure Database Credentials

Open `api/config/db.php` (or edit via Hostinger File Manager):
```php
$host = 'localhost';
$port = '3306';
$db   = 'u123456789_hetex';     // your Hostinger DB name
$user = 'u123456789_hetexuser'; // your Hostinger DB user
$pass = 'your_actual_password'; // your Hostinger DB password
```

---

## Step 3: Build & Export Frontend

From the `frontend` folder, build the static export:
```bash
cd frontend
npm install
npm run build
```

This compiles your dashboard and pages into the `frontend/out` folder.

---

## Step 4: Upload to `public_html`

Using Hostinger's **File Manager** (or FTP):
1. Navigate into `public_html/`.
2. Upload the contents of `frontend/out/` directly into `public_html/` (so `index.html` is in `public_html`).
3. Upload the `api/` folder into `public_html/api/`.
4. Upload the `.htaccess` file directly into `public_html/.htaccess`.

---

## Step 5: Verification

Visit your domain in any browser:
- **Frontend App**: `https://yourdomain.com/` (loads dashboard smoothly without 403 errors)
- **API Health Check**: `https://yourdomain.com/api/health`
  ```json
  {"status":"online","service":"Hetex Courier API","version":"2.0-PHP-MySQL"}
  ```
- **Admin Login**:
  - Email: `admin@hetex.in`
  - Password: `admin123`
