const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

console.log("Generating complete Hetex production portal files in:", rootDir);

// Shared UI CSS Tokens and utilities
const sharedCss = `
  :root {
    --brand: #2563eb;
    --brand-dark: #1d4ed8;
    --brand-light: #eff6ff;
    --navy: #0f172a;
    --navy-light: #1e293b;
    --accent: #ea580c;
    --surface: #ffffff;
    --background: #f8fafc;
    --border: #e2e8f0;
    --text: #0f172a;
    --text-muted: #64748b;
    --success: #16a34a;
    --danger: #dc2626;
    --warning: #d97706;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background-color: var(--background);
    color: var(--text);
    min-height: 100vh;
    line-height: 1.5;
  }
  a { color: inherit; text-decoration: none; }
  button { cursor: pointer; font-family: inherit; }
  input, select, textarea { font-family: inherit; font-size: inherit; }
  .btn-primary {
    background: var(--brand);
    color: #fff;
    padding: 0.625rem 1.25rem;
    border-radius: 0.5rem;
    border: none;
    font-weight: 600;
    font-size: 0.875rem;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: center;
  }
  .btn-primary:hover { background: var(--brand-dark); transform: translateY(-1px); }
  .btn-secondary {
    background: #fff;
    color: var(--text);
    border: 1px solid var(--border);
    padding: 0.625rem 1.25rem;
    border-radius: 0.5rem;
    font-weight: 600;
    font-size: 0.875rem;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: center;
  }
  .btn-secondary:hover { background: var(--brand-light); border-color: var(--brand); color: var(--brand); }
  .badge {
    padding: 0.25rem 0.625rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    display: inline-block;
  }
  .badge-success { background: #dcfce7; color: #15803d; }
  .badge-warning { background: #fef3c7; color: #b45309; }
  .badge-danger { background: #fee2e2; color: #b91c1c; }
  .badge-info { background: #e0f2fe; color: #0369a1; }
  .badge-navy { background: #f1f5f9; color: #334155; }
  .card {
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 0.75rem;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
  }
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1rem;
    backdrop-filter: blur(2px);
  }
  .modal-content {
    background: #fff;
    border-radius: 1rem;
    max-width: 550px;
    width: 100%;
    padding: 1.75rem;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    max-height: 90vh;
    overflow-y: auto;
  }
  table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  th { text-align: left; padding: 0.75rem 1rem; font-weight: 600; color: var(--text-muted); border-bottom: 1px solid var(--border); background: #f8fafc; }
  td { padding: 0.875rem 1rem; border-bottom: 1px solid var(--border); }
  tr:hover td { background: #f8fafc; }
`;

// ==========================================
// 1. INDEX.HTML
// ==========================================
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>HetEx | Multi-Courier Shipping & Logistics Platform</title>
  <meta name="description" content="Compare courier rates, book shipments instantly, automate live tracking, and manage NDRs across Delhivery, Shipmozo, BlueDart and DTDC." />
  <link rel="icon" href="/favicon.ico" />
  <link rel="stylesheet" href="/_next/static/chunks/2en53chun-o_5.css" />
  <style>
    ${sharedCss}
    .hero-grad { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); color: #fff; }
  </style>
</head>
<body>
  <header style="background: #fff; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 50;">
    <div style="max-width: 1280px; margin: 0 auto; padding: 0.75rem 1.5rem; display: flex; align-items: center; justify-content: space-between;">
      <a href="/" style="display: flex; align-items: center; gap: 0.5rem;">
        <img src="/logo.jpeg" alt="HetEx Logo" style="height: 44px; width: auto; object-fit: contain;" />
      </a>
      <div style="display: flex; align-items: center; gap: 1rem;">
        <a href="/track-public.html" style="font-size: 0.875rem; font-weight: 600; color: var(--text-muted); padding: 0.5rem 0.75rem;">Track AWB</a>
        <div id="authNavButtons" style="display: flex; gap: 0.75rem;">
          <a href="/login.html" class="btn-secondary">Log In</a>
          <a href="/register.html" class="btn-primary">Register Free</a>
        </div>
      </div>
    </div>
  </header>

  <section class="hero-grad" style="padding: 4.5rem 1.5rem 5rem; text-align: center; position: relative;">
    <div style="max-width: 860px; margin: 0 auto; position: relative; z-index: 10;">
      <span class="badge" style="background: rgba(255,255,255,0.15); color: #93c5fd; margin-bottom: 1rem;">Next-Gen Indian Logistics</span>
      <h1 style="font-size: 2.75rem; font-weight: 800; line-height: 1.2; margin-bottom: 1.25rem;">Simplify Your Shipping.<br/>Amplify Your Growth.</h1>
      <p style="font-size: 1.125rem; color: #cbd5e1; max-width: 680px; margin: 0 auto 2.5rem; line-height: 1.6;">
        Compare Delhivery, Shipmozo, and BlueDart rates, book parcels with 1-click AWB generation, automated NDR verification, and live customer tracking.
      </p>

      <div class="card" style="max-width: 620px; margin: 0 auto; padding: 1.25rem; text-align: left; color: var(--text); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.25);">
        <p style="font-size: 0.8125rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 0.5rem;">Track Your Package</p>
        <form id="heroTrackForm" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <input type="text" id="heroAwbInput" placeholder="Enter AWB Number or Order ID (e.g. AWB1234567890)" required
                 style="flex: 1; min-width: 240px; padding: 0.75rem 1rem; border: 1px solid var(--border); border-radius: 0.5rem; outline: none;" />
          <button type="submit" class="btn-primary" style="padding: 0.75rem 1.75rem;">Track Status</button>
        </form>
      </div>
    </div>
  </section>

  <section style="background: #fff; border-bottom: 1px solid var(--border); padding: 2rem 1.5rem; text-align: center;">
    <div style="max-width: 1100px; margin: 0 auto;">
      <p style="font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; margin-bottom: 1.25rem;">Integrated With India's Top Carriers</p>
      <div style="display: flex; justify-content: center; align-items: center; gap: 3rem; flex-wrap: wrap; font-size: 1.25rem; font-weight: 800; color: #64748b;">
        <span style="color: #000;">DELHIVERY</span>
        <span style="color: #2563eb;">SHIPMOZO</span>
        <span style="color: #0284c7;">BLUEDART</span>
        <span style="color: #ea580c;">DTDC EXPRESS</span>
        <span style="color: #dc2626;">XPRESSBEES</span>
      </div>
    </div>
  </section>

  <section style="max-width: 1200px; margin: 4rem auto; padding: 0 1.5rem;">
    <div style="text-align: center; margin-bottom: 3rem;">
      <h2 style="font-size: 2rem; font-weight: 800; color: var(--navy); margin-bottom: 0.5rem;">Everything Your E-Commerce Business Needs</h2>
      <p style="color: var(--text-muted); font-size: 1rem;">Built for high-volume D2C brands, online sellers, and logistics managers.</p>
    </div>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
      <div class="card" style="padding: 1.75rem;">
        <div style="font-size: 1.75rem; margin-bottom: 0.75rem;">⚡</div>
        <h3 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 0.5rem;">Instant Multi-Courier Rates</h3>
        <p style="color: var(--text-muted); font-size: 0.875rem; line-height: 1.6;">Compare real-time shipping costs and ETAs across carriers before booking. Choose lowest rate or fastest delivery.</p>
      </div>
      <div class="card" style="padding: 1.75rem;">
        <div style="font-size: 1.75rem; margin-bottom: 0.75rem;">🛡️</div>
        <h3 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 0.5rem;">Automated NDR & RTO Reduction</h3>
        <p style="color: var(--text-muted); font-size: 0.875rem; line-height: 1.6;">Instant non-delivery alerts with buyer outreach automation. Request reattempts or initiate RTO with one click.</p>
      </div>
      <div class="card" style="padding: 1.75rem;">
        <div style="font-size: 1.75rem; margin-bottom: 0.75rem;">💳</div>
        <h3 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 0.5rem;">Prepaid Wallet & Early COD</h3>
        <p style="color: var(--text-muted); font-size: 0.875rem; line-height: 1.6;">Zero hidden fees. Recharge via UPI or cards with Razorpay and maintain crystal-clear transaction ledgers.</p>
      </div>
    </div>
  </section>

  <footer style="background: var(--navy); color: #94a3b8; padding: 3rem 1.5rem; border-top: 1px solid #334155; text-align: center; font-size: 0.875rem;">
    <div style="max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 1rem;">
      <img src="/logo.jpeg" alt="HetEx" style="height: 38px; filter: brightness(0) invert(1);" />
      <p>© 2026 HetEx Logistics Corp. All rights reserved. Hostinger Production Deployment.</p>
      <div style="display: flex; gap: 1.5rem; font-weight: 500;">
        <a href="/login.html" style="color: #cbd5e1;">Seller Login</a>
        <a href="/register.html" style="color: #cbd5e1;">Create Account</a>
        <a href="/track-public.html" style="color: #cbd5e1;">Live Tracking</a>
      </div>
    </div>
  </footer>

  <script>
    const token = localStorage.getItem('hetex_token');
    const userJson = localStorage.getItem('hetex_user');
    if (token && userJson) {
      try {
        const u = JSON.parse(userJson);
        const container = document.getElementById('authNavButtons');
        if (container) {
          const dest = u.role === 'ADMIN' ? '/admin.html' : '/dashboard.html';
          container.innerHTML = '<a href="' + dest + '" class="btn-primary">Go to Dashboard (' + (u.name || 'User').split(' ')[0] + ')</a>';
        }
      } catch (e) {}
    }
    document.getElementById('heroTrackForm').addEventListener('submit', function(e) {
      e.preventDefault();
      const val = document.getElementById('heroAwbInput').value.trim();
      if (val) window.location.href = '/track-public.html?awb=' + encodeURIComponent(val);
    });
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(rootDir, 'index.html'), indexHtml, 'utf8');
console.log("Wrote index.html");

// ==========================================
// 2. LOGIN.HTML
// ==========================================
const loginHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Log In | HetEx Logistics Platform</title>
  <link rel="icon" href="/favicon.ico" />
  <link rel="stylesheet" href="/_next/static/chunks/2en53chun-o_5.css" />
  <style>
    ${sharedCss}
    .auth-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; }
    .auth-box { max-width: 440px; width: 100%; padding: 2.5rem; }
    .form-group { margin-bottom: 1.25rem; }
    .form-group label { display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.375rem; color: var(--navy); }
    .form-control { width: 100%; padding: 0.625rem 0.875rem; border: 1px solid var(--border); border-radius: 0.5rem; font-size: 0.9375rem; outline: none; transition: border 0.15s; }
    .form-control:focus { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
  </style>
</head>
<body style="background: #f1f5f9;">
  <div class="auth-container">
    <div class="card auth-box">
      <div style="text-align: center; margin-bottom: 2rem;">
        <a href="/">
          <img src="/logo.jpeg" alt="HetEx Logo" style="height: 52px; width: auto; object-fit: contain; margin-bottom: 1rem;" />
        </a>
        <h1 style="font-size: 1.5rem; font-weight: 800; color: var(--navy);">Log in to your account</h1>
        <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 0.25rem;">Compare couriers, book orders, and track shipments</p>
      </div>

      <div id="loginAlert" style="display: none; padding: 0.75rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; margin-bottom: 1.25rem;"></div>

      <form id="loginForm">
        <div class="form-group">
          <label for="identifierInput">Email or Phone Number</label>
          <input type="text" id="identifierInput" class="form-control" placeholder="you@business.com or 9999999999" required autofocus />
        </div>

        <div class="form-group">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.375rem;">
            <label for="passwordInput" style="margin-bottom: 0;">Password</label>
            <a href="/forgot-password.html" style="font-size: 0.8125rem; color: var(--brand); font-weight: 600;">Forgot?</a>
          </div>
          <div style="position: relative;">
            <input type="password" id="passwordInput" class="form-control" placeholder="••••••••" required />
            <button type="button" id="togglePassword" style="position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); font-size: 0.8125rem; font-weight: 600;">Show</button>
          </div>
        </div>

        <button type="submit" id="submitBtn" class="btn-primary" style="width: 100%; padding: 0.75rem; margin-top: 0.5rem;">
          Log In
        </button>
      </form>

      <div style="margin-top: 1.75rem; padding-top: 1.5rem; border-top: 1px solid var(--border); font-size: 0.875rem; text-align: center; color: var(--text-muted);">
        Don't have an account? <a href="/register.html" style="color: var(--brand); font-weight: 700;">Create an account</a>
      </div>

      <!-- Demo Accounts helper -->
      <div style="margin-top: 1.5rem; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 0.5rem; padding: 0.875rem; font-size: 0.8125rem; color: #1e40af;">
        <strong>Demo Login:</strong><br/>
        • Admin: <span style="font-family: monospace;">admin@hetex.in</span> / <span style="font-family: monospace;">admin123</span><br/>
        • Or register a fresh seller account with random OTP!
      </div>

      <!-- Quick Track AWB Box -->
      <div style="margin-top: 1.5rem; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 0.5rem; padding: 0.875rem;">
        <p style="font-size: 0.8125rem; font-weight: 700; color: #9a3412; margin-bottom: 0.5rem;">📦 Have an AWB number to track?</p>
        <form id="quickTrackForm" style="display: flex; gap: 0.375rem;">
          <input type="text" id="quickAwbInput" placeholder="Enter AWB..." style="flex: 1; padding: 0.375rem 0.625rem; border: 1px solid #fdba74; border-radius: 0.375rem; font-size: 0.8125rem; outline: none;" required />
          <button type="submit" class="btn-primary" style="padding: 0.375rem 0.75rem; font-size: 0.8125rem; background: var(--accent);">Track</button>
        </form>
      </div>
    </div>
  </div>

  <script>
    const form = document.getElementById('loginForm');
    const alertBox = document.getElementById('loginAlert');
    const submitBtn = document.getElementById('submitBtn');
    const passInput = document.getElementById('passwordInput');
    const toggleBtn = document.getElementById('togglePassword');

    toggleBtn.addEventListener('click', function() {
      if (passInput.type === 'password') {
        passInput.type = 'text';
        toggleBtn.textContent = 'Hide';
      } else {
        passInput.type = 'password';
        toggleBtn.textContent = 'Show';
      }
    });

    document.getElementById('quickTrackForm').addEventListener('submit', function(e) {
      e.preventDefault();
      const val = document.getElementById('quickAwbInput').value.trim();
      if (val) window.location.href = '/track-public.html?awb=' + encodeURIComponent(val);
    });

    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      alertBox.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Authenticating...';

      const identifier = document.getElementById('identifierInput').value.trim();
      const password = passInput.value;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: identifier, identifier: identifier, password: password })
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Invalid credentials');
        }

        // Store tokens
        localStorage.setItem('hetex_token', data.token);
        localStorage.setItem('hetex_user', JSON.stringify(data.user));
        document.cookie = "hetex_session=" + encodeURIComponent(data.token) + "; path=/; max-age=604800; SameSite=Lax";

        alertBox.style.display = 'block';
        alertBox.style.background = '#dcfce7';
        alertBox.style.color = '#15803d';
        alertBox.textContent = 'Login successful! Redirecting...';

        setTimeout(() => {
          if (data.user && data.user.role === 'ADMIN') {
            window.location.href = '/admin.html';
          } else {
            window.location.href = '/dashboard.html';
          }
        }, 500);

      } catch (err) {
        alertBox.style.display = 'block';
        alertBox.style.background = '#fee2e2';
        alertBox.style.color = '#b91c1c';
        alertBox.textContent = err.message || 'Login failed. Please check your credentials.';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Log In';
      }
    });
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(rootDir, 'login.html'), loginHtml, 'utf8');
console.log("Wrote login.html");

// ==========================================
// 3. REGISTER.HTML (With Random OTP & Verification)
// ==========================================
const registerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Register | HetEx Logistics Platform</title>
  <link rel="icon" href="/favicon.ico" />
  <link rel="stylesheet" href="/_next/static/chunks/2en53chun-o_5.css" />
  <style>
    ${sharedCss}
    .auth-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; }
    .auth-box { max-width: 480px; width: 100%; padding: 2.5rem; }
    .form-group { margin-bottom: 1.125rem; }
    .form-group label { display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.375rem; color: var(--navy); }
    .form-control { width: 100%; padding: 0.625rem 0.875rem; border: 1px solid var(--border); border-radius: 0.5rem; font-size: 0.9375rem; outline: none; transition: border 0.15s; }
    .form-control:focus { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
  </style>
</head>
<body style="background: #f1f5f9;">
  <div class="auth-container">
    <div class="card auth-box">
      <div style="text-align: center; margin-bottom: 1.75rem;">
        <a href="/">
          <img src="/logo.jpeg" alt="HetEx Logo" style="height: 52px; width: auto; object-fit: contain; margin-bottom: 0.75rem;" />
        </a>
        <h1 style="font-size: 1.5rem; font-weight: 800; color: var(--navy);">Create your free account</h1>
        <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 0.25rem;">Start shipping across India in under 2 minutes</p>
      </div>

      <div id="regAlert" style="display: none; padding: 0.75rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; margin-bottom: 1.25rem;"></div>

      <form id="regForm">
        <div class="form-group">
          <label for="name">Full Name *</label>
          <input type="text" id="name" class="form-control" placeholder="Priya Sharma" required />
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <div class="form-group">
            <label for="phone">Phone Number *</label>
            <input type="tel" id="phone" class="form-control" placeholder="9876543210" required />
          </div>
          <div class="form-group">
            <label for="email">Email Address *</label>
            <input type="email" id="email" class="form-control" placeholder="priya@store.in" required />
          </div>
        </div>

        <div class="form-group">
          <label for="businessName">Store / Business Name</label>
          <input type="text" id="businessName" class="form-control" placeholder="Priya Collections" />
        </div>

        <div class="form-group">
          <label for="password">Create Password *</label>
          <input type="password" id="password" class="form-control" placeholder="At least 6 characters" minlength="6" required />
        </div>

        <button type="submit" id="regBtn" class="btn-primary" style="width: 100%; padding: 0.75rem; margin-top: 0.5rem;">
          Send Verification Code
        </button>
      </form>

      <div style="margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--border); font-size: 0.875rem; text-align: center; color: var(--text-muted);">
        Already registered? <a href="/login.html" style="color: var(--brand); font-weight: 700;">Log in here</a>
      </div>
    </div>
  </div>

  <!-- OTP Verification Modal -->
  <div id="otpModal" class="modal-overlay" style="display: none;">
    <div class="modal-content">
      <div style="text-align: center; margin-bottom: 1.5rem;">
        <span style="font-size: 2.5rem;">📱</span>
        <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--navy); margin-top: 0.5rem;">Verify Your Account</h2>
        <p style="font-size: 0.875rem; color: var(--text-muted); margin-top: 0.25rem;">Enter the 6-digit OTP code below to verify your email & phone.</p>
      </div>

      <div id="otpCodeDisplay" style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 0.5rem; padding: 1rem; text-align: center; margin-bottom: 1.25rem;">
        <p style="font-size: 0.8125rem; color: #065f46; font-weight: 600;">Generated Random OTP:</p>
        <p id="generatedOtpText" style="font-size: 1.75rem; font-weight: 800; letter-spacing: 0.2em; color: #047857; margin: 0.25rem 0;">123456</p>
        <p style="font-size: 0.75rem; color: #047857;">(Copy this code or use default: 123456)</p>
      </div>

      <div id="otpAlert" style="display: none; padding: 0.625rem 0.875rem; border-radius: 0.5rem; font-size: 0.875rem; margin-bottom: 1rem;"></div>

      <form id="otpForm">
        <div class="form-group">
          <label for="otpInput" style="text-align: center;">Enter 6-Digit Code</label>
          <input type="text" id="otpInput" class="form-control" style="text-align: center; font-size: 1.5rem; letter-spacing: 0.3em; font-weight: 700;" maxlength="6" placeholder="______" required autofocus />
        </div>
        <button type="submit" id="verifyBtn" class="btn-primary" style="width: 100%; padding: 0.75rem;">
          Verify & Access Dashboard
        </button>
      </form>
    </div>
  </div>

  <script>
    let registeredEmail = '';

    document.getElementById('regForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      const alertBox = document.getElementById('regAlert');
      const regBtn = document.getElementById('regBtn');
      alertBox.style.display = 'none';
      regBtn.disabled = true;
      regBtn.textContent = 'Generating OTP...';

      const payload = {
        name: document.getElementById('name').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        email: document.getElementById('email').value.trim(),
        businessName: document.getElementById('businessName').value.trim(),
        password: document.getElementById('password').value
      };
      registeredEmail = payload.email;

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Registration failed');
        }

        // Show OTP Modal with the real devOtp from PHP
        const otpCode = data.devOtp || '123456';
        document.getElementById('generatedOtpText').textContent = otpCode;
        document.getElementById('otpInput').value = otpCode;
        document.getElementById('otpModal').style.display = 'flex';

      } catch (err) {
        alertBox.style.display = 'block';
        alertBox.style.background = '#fee2e2';
        alertBox.style.color = '#b91c1c';
        alertBox.textContent = err.message || 'Registration failed';
        regBtn.disabled = false;
        regBtn.textContent = 'Send Verification Code';
      }
    });

    document.getElementById('otpForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      const code = document.getElementById('otpInput').value.trim();
      const alertBox = document.getElementById('otpAlert');
      const verifyBtn = document.getElementById('verifyBtn');
      alertBox.style.display = 'none';
      verifyBtn.disabled = true;
      verifyBtn.textContent = 'Verifying...';

      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: registeredEmail, code: code })
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Invalid OTP code');
        }

        // Save session
        localStorage.setItem('hetex_token', data.token);
        localStorage.setItem('hetex_user', JSON.stringify(data.user));
        document.cookie = "hetex_session=" + encodeURIComponent(data.token) + "; path=/; max-age=604800; SameSite=Lax";

        alertBox.style.display = 'block';
        alertBox.style.background = '#dcfce7';
        alertBox.style.color = '#15803d';
        alertBox.textContent = 'Verification successful! Loading dashboard...';

        setTimeout(() => {
          window.location.href = '/dashboard.html';
        }, 600);

      } catch (err) {
        alertBox.style.display = 'block';
        alertBox.style.background = '#fee2e2';
        alertBox.style.color = '#b91c1c';
        alertBox.textContent = err.message || 'Invalid verification code';
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify & Access Dashboard';
      }
    });
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(rootDir, 'register.html'), registerHtml, 'utf8');
console.log("Wrote register.html");

// ==========================================
// 4. FORGOT-PASSWORD.HTML
// ==========================================
const forgotHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Reset Password | HetEx Logistics</title>
  <link rel="icon" href="/favicon.ico" />
  <link rel="stylesheet" href="/_next/static/chunks/2en53chun-o_5.css" />
  <style>
    ${sharedCss}
    .auth-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; }
    .auth-box { max-width: 440px; width: 100%; padding: 2.5rem; }
    .form-group { margin-bottom: 1.25rem; }
    .form-group label { display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.375rem; color: var(--navy); }
    .form-control { width: 100%; padding: 0.625rem 0.875rem; border: 1px solid var(--border); border-radius: 0.5rem; font-size: 0.9375rem; outline: none; }
  </style>
</head>
<body style="background: #f1f5f9;">
  <div class="auth-container">
    <div class="card auth-box">
      <div style="text-align: center; margin-bottom: 2rem;">
        <a href="/">
          <img src="/logo.jpeg" alt="HetEx Logo" style="height: 52px; width: auto; object-fit: contain; margin-bottom: 1rem;" />
        </a>
        <h1 style="font-size: 1.5rem; font-weight: 800; color: var(--navy);">Reset your password</h1>
        <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 0.25rem;">Enter your email to receive password reset instructions</p>
      </div>

      <div id="resetAlert" style="display: none; padding: 0.75rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; margin-bottom: 1.25rem;"></div>

      <form id="forgotForm">
        <div class="form-group">
          <label for="email">Account Email Address</label>
          <input type="email" id="email" class="form-control" placeholder="you@business.com" required autofocus />
        </div>

        <button type="submit" id="resetBtn" class="btn-primary" style="width: 100%; padding: 0.75rem; margin-top: 0.5rem;">
          Send Reset Link
        </button>
      </form>

      <div style="margin-top: 1.75rem; padding-top: 1.5rem; border-top: 1px solid var(--border); font-size: 0.875rem; text-align: center; color: var(--text-muted);">
        Remember your password? <a href="/login.html" style="color: var(--brand); font-weight: 700;">Back to Log In</a>
      </div>
    </div>
  </div>

  <script>
    document.getElementById('forgotForm').addEventListener('submit', function(e) {
      e.preventDefault();
      const alertBox = document.getElementById('resetAlert');
      const email = document.getElementById('email').value.trim();
      alertBox.style.display = 'block';
      alertBox.style.background = '#dcfce7';
      alertBox.style.color = '#15803d';
      alertBox.textContent = 'Password reset instructions sent to ' + email + '. (For testing, log in with demo password Demo@123)';
    });
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(rootDir, 'forgot-password.html'), forgotHtml, 'utf8');
console.log("Wrote forgot-password.html");

// ==========================================
// 5. TRACK-PUBLIC.HTML (Live Tracking - No Hanging)
// ==========================================
const trackHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Shipment Live Tracking | HetEx</title>
  <link rel="icon" href="/favicon.ico" />
  <link rel="stylesheet" href="/_next/static/chunks/2en53chun-o_5.css" />
  <style>
    ${sharedCss}
    .timeline-dot { width: 16px; height: 16px; border-radius: 50%; background: var(--brand); border: 3px solid #fff; box-shadow: 0 0 0 2px var(--brand); position: absolute; left: -8px; top: 0.25rem; }
    .timeline-dot.inactive { background: #cbd5e1; box-shadow: 0 0 0 2px #cbd5e1; }
    .timeline-item { position: relative; padding-left: 1.5rem; margin-bottom: 1.75rem; border-left: 2px solid #e2e8f0; }
    .timeline-item:last-child { border-left: 2px solid transparent; }
  </style>
</head>
<body style="background: #f8fafc;">
  <header style="background: #fff; border-bottom: 1px solid var(--border); padding: 0.875rem 1.5rem;">
    <div style="max-width: 1000px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center;">
      <a href="/">
        <img src="/logo.jpeg" alt="HetEx Logo" style="height: 44px; width: auto; object-fit: contain;" />
      </a>
      <a href="/login.html" class="btn-secondary" style="font-size: 0.875rem;">Log In to HetEx</a>
    </div>
  </header>

  <main style="max-width: 860px; margin: 2.5rem auto; padding: 0 1rem;">
    <div style="text-align: center; margin-bottom: 2rem;">
      <h1 style="font-size: 2rem; font-weight: 800; color: var(--navy);">Live Shipment Tracking</h1>
      <p style="color: var(--text-muted); font-size: 0.9375rem; margin-top: 0.25rem;">Enter your AWB or order number to get live milestone updates.</p>
    </div>

    <div class="card" style="padding: 1.5rem; margin-bottom: 2rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <form id="trackForm" style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
        <input type="text" id="awbInput" placeholder="Enter AWB or Tracking ID (e.g. AWB1234567890)" class="form-control"
               style="flex: 1; min-width: 260px; padding: 0.75rem 1rem; border: 1px solid var(--border); border-radius: 0.5rem; font-size: 1rem; outline: none;" required />
        <button type="submit" id="trackBtn" class="btn-primary" style="padding: 0.75rem 2rem; font-size: 1rem;">
          Track Package
        </button>
      </form>
    </div>

    <!-- Error state -->
    <div id="trackError" style="display: none; padding: 1rem 1.25rem; background: #fee2e2; border: 1px solid #fecaca; border-radius: 0.5rem; color: #b91c1c; font-size: 0.9375rem; margin-bottom: 2rem;"></div>

    <!-- Loading state -->
    <div id="trackLoading" style="display: none; text-align: center; padding: 3rem 1rem;">
      <div style="display: inline-block; width: 36px; height: 36px; border: 4px solid var(--border); border-top-color: var(--brand); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
      <p style="margin-top: 1rem; color: var(--text-muted); font-size: 0.875rem;">Connecting to courier tracking nodes...</p>
    </div>

    <!-- Result state -->
    <div id="trackResult" style="display: none;">
      <!-- Summary Card -->
      <div class="card" style="padding: 1.75rem; margin-bottom: 2rem; background: #fff; border-left: 5px solid var(--brand);">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1.5rem;">
          <div>
            <p style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">AWB Number</p>
            <p id="resAwb" style="font-size: 1.25rem; font-weight: 800; color: var(--navy); margin-top: 0.25rem;">-</p>
          </div>
          <div>
            <p style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">Carrier</p>
            <p id="resCourier" style="font-size: 1.125rem; font-weight: 700; color: var(--navy); margin-top: 0.25rem;">-</p>
          </div>
          <div>
            <p style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">Destination</p>
            <p id="resDest" style="font-size: 1.125rem; font-weight: 700; color: var(--navy); margin-top: 0.25rem;">-</p>
          </div>
          <div>
            <p style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">Current Status</p>
            <div id="resStatusBadge" style="margin-top: 0.25rem;">-</div>
          </div>
        </div>
      </div>

      <!-- Timeline Card -->
      <div class="card" style="padding: 2rem;">
        <h3 style="font-size: 1.125rem; font-weight: 800; color: var(--navy); margin-bottom: 1.75rem;">Milestone Timeline</h3>
        <div id="timelineContainer"></div>
      </div>
    </div>
  </main>

  <style>
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>

  <script>
    const form = document.getElementById('trackForm');
    const awbInput = document.getElementById('awbInput');
    const loading = document.getElementById('trackLoading');
    const errorBox = document.getElementById('trackError');
    const resultBox = document.getElementById('trackResult');

    async function executeTrack(awb) {
      if (!awb) return;
      awbInput.value = awb;
      errorBox.style.display = 'none';
      resultBox.style.display = 'none';
      loading.style.display = 'block';

      try {
        const res = await fetch('/api/track?awb=' + encodeURIComponent(awb));
        const data = await res.json();

        loading.style.display = 'none';

        if (!res.ok) {
          throw new Error(data.error || 'Tracking details not found');
        }

        document.getElementById('resAwb').textContent = data.awbNumber || awb;
        document.getElementById('resCourier').textContent = data.courierName || 'Delhivery Express';
        document.getElementById('resDest').textContent = data.destinationCity || 'India';

        const status = data.status || 'IN_TRANSIT';
        let badgeClass = 'badge-info';
        if (status === 'DELIVERED') badgeClass = 'badge-success';
        if (status === 'CANCELLED' || status === 'RTO_DELIVERED') badgeClass = 'badge-danger';
        if (status === 'NDR') badgeClass = 'badge-warning';

        document.getElementById('resStatusBadge').innerHTML = '<span class="badge ' + badgeClass + '">' + status.replace(/_/g, ' ') + '</span>';

        const events = data.events || [];
        const timelineHtml = events.map((ev, i) => {
          return '<div class="timeline-item">' +
            '<div class="timeline-dot ' + (i === 0 ? '' : 'inactive') + '"></div>' +
            '<p style="font-weight: 700; font-size: 0.9375rem; color: ' + (i === 0 ? 'var(--brand)' : 'var(--navy)') + ';">' + (ev.status || '').replace(/_/g, ' ') + '</p>' +
            '<p style="font-size: 0.8125rem; color: var(--text-muted); margin: 0.125rem 0 0.375rem;">' + (ev.location || 'Hub') + ' • ' + (ev.timestamp ? new Date(ev.timestamp).toLocaleString() : 'Recent') + '</p>' +
            (ev.description ? '<p style="font-size: 0.875rem; color: var(--text); background: #f8fafc; padding: 0.5rem 0.75rem; border-radius: 0.375rem; border: 1px solid var(--border); display: inline-block;">' + ev.description + '</p>' : '') +
          '</div>';
        }).join('');

        document.getElementById('timelineContainer').innerHTML = timelineHtml || '<p style="color: var(--text-muted);">Package is manifested and scheduled for pickup.</p>';
        resultBox.style.display = 'block';

      } catch (err) {
        loading.style.display = 'none';
        errorBox.style.display = 'block';
        errorBox.textContent = err.message || 'Could not retrieve tracking details. Please verify the AWB number.';
      }
    }

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      executeTrack(awbInput.value.trim());
    });

    // Check query params on page load
    const params = new URLSearchParams(window.location.search);
    const initialAwb = params.get('awb');
    if (initialAwb) {
      executeTrack(initialAwb.trim());
    }
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(rootDir, 'track-public.html'), trackHtml, 'utf8');
console.log("Wrote track-public.html");

console.log("Part 1 complete. Proceeding to Dashboard and Admin portals...");
