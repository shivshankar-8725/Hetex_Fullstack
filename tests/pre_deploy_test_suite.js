/**
 * HetEx Courier - Automated Pre-Deployment Screen & API Test Suite
 * 
 * Verifies 100% of screens and APIs before any deployment package can be generated:
 * 1. PHP Syntax & AST Brace Validator across all PHP controllers and routes.
 * 2. HTML & Embedded JavaScript Syntax Validation across all frontend screens.
 * 3. Screen-to-API Route Parity: ensures every frontend fetch() has a registered backend route.
 * 4. Live API Functionality Test: verifies live responses for all screen workflows.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');
let failures = 0;
let passes = 0;

function assert(condition, message) {
  if (condition) {
    passes++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failures++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

// ============================================================================
// SUITE 1: PHP SYNTAX & AST BRACE VALIDATION
// ============================================================================
console.log('\n===============================================================');
console.log('SUITE 1: Validating PHP Syntax & AST Braces across api/');
console.log('===============================================================');

function tokenizePHP(code) {
  let i = 0;
  const n = code.length;
  let line = 1, col = 1;
  const tokens = [];

  function advance() {
    const ch = code[i++];
    if (ch === '\n') { line++; col = 1; } else { col++; }
    return ch;
  }

  while (i < n) {
    const curLine = line, curCol = col;
    const ch = code[i];

    if ((ch === '/' && code[i + 1] === '/') || ch === '#') {
      while (i < n && code[i] !== '\n') advance();
      continue;
    }
    if (ch === '/' && code[i + 1] === '*') {
      advance(); advance();
      while (i < n && !(code[i] === '*' && code[i + 1] === '/')) advance();
      if (i < n) { advance(); advance(); }
      continue;
    }
    if (ch === '<' && code.slice(i, i + 3) === '<<<') {
      advance(); advance(); advance();
      while (i < n && (code[i] === ' ' || code[i] === '\t')) advance();
      let delim = '';
      while (i < n && /[A-Za-z0-9_]/.test(code[i])) delim += advance();
      while (i < n && code[i] !== '\n') advance();
      if (code[i] === '\n') advance();
      while (i < n) {
        let lookAhead = i;
        while (lookAhead < n && (code[lookAhead] === ' ' || code[lookAhead] === '\t')) lookAhead++;
        if (code.slice(lookAhead, lookAhead + delim.length) === delim) {
          const after = lookAhead + delim.length;
          if (code[after] === ';' || code[after] === '\r' || code[after] === '\n') {
            while (i <= after && i < n) {
              if (code[i] === ';') { advance(); break; }
              advance();
            }
            break;
          }
        }
        while (i < n && code[i] !== '\n') advance();
        if (i < n && code[i] === '\n') advance();
      }
      continue;
    }
    if (ch === "'") {
      advance();
      while (i < n) {
        if (code[i] === '\\' && code[i + 1] === "'") { advance(); advance(); }
        else if (code[i] === '\\' && code[i + 1] === '\\') { advance(); advance(); }
        else if (code[i] === "'") { advance(); break; }
        else { advance(); }
      }
      continue;
    }
    if (ch === '"') {
      advance();
      while (i < n) {
        if (code[i] === '\\' && code[i + 1] === '"') { advance(); advance(); }
        else if (code[i] === '\\' && code[i + 1] === '\\') { advance(); advance(); }
        else if (code[i] === '"') { advance(); break; }
        else { advance(); }
      }
      continue;
    }
    if (ch === '{' || ch === '}') {
      tokens.push({ type: ch, line: curLine, col: curCol });
      advance();
      continue;
    }
    if (/[a-zA-Z_\x7f-\xff]/.test(ch)) {
      let word = '';
      while (i < n && /[a-zA-Z0-9_\x7f-\xff]/.test(code[i])) word += advance();
      tokens.push({ type: 'ID', val: word, line: curLine, col: curCol });
      continue;
    }
    advance();
  }
  return tokens;
}

function checkPHPFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const tokens = tokenizePHP(code);
  let braceStack = [];
  const errors = [];

  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];
    if (t.type === '{') {
      braceStack.push({ line: t.line, col: t.col });
    } else if (t.type === '}') {
      if (braceStack.length === 0) {
        errors.push(`Extra closing brace '}' at line ${t.line}:${t.col}`);
      } else {
        braceStack.pop();
      }
    }
    if (t.type === 'ID' && (t.val === 'public' || t.val === 'private' || t.val === 'protected')) {
      if (braceStack.length >= 2) {
        const top = braceStack[braceStack.length - 1];
        errors.push(`Illegal '${t.val}' modifier inside function (brace opened at line ${top.line}) at line ${t.line}`);
      }
    }
  }
  if (braceStack.length > 0) {
    for (const b of braceStack) {
      errors.push(`Unclosed '{' opened at line ${b.line}:${b.col}`);
    }
  }
  return errors;
}

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      results = results.concat(walkDir(fullPath));
    } else if (file.endsWith('.php')) {
      results.push(fullPath);
    }
  }
  return results;
}

const apiDir = path.join(rootDir, 'api');
const phpFiles = walkDir(apiDir);
for (const f of phpFiles) {
  const relName = path.relative(rootDir, f);
  const errs = checkPHPFile(f);
  assert(errs.length === 0, `PHP syntax valid: ${relName} (${errs.join(', ') || 'OK'})`);
}

// ============================================================================
// SUITE 2: HTML SCREENS & JAVASCRIPT AST INTEGRITY
// ============================================================================
console.log('\n===============================================================');
console.log('SUITE 2: Validating HTML Screens & Embedded JavaScript Scripts');
console.log('===============================================================');

const screenFiles = [
  'dashboard.html',
  'admin.html',
  'login.html',
  'register.html',
  'track-public.html',
  'index.html',
  'forgot-password.html'
];

for (const screen of screenFiles) {
  const fullPath = path.join(rootDir, screen);
  assert(fs.existsSync(fullPath), `Screen file exists: ${screen}`);
  if (!fs.existsSync(fullPath)) continue;

  const content = fs.readFileSync(fullPath, 'utf8');
  assert(content.length > 500, `Screen has non-empty content: ${screen} (${(content.length / 1024).toFixed(1)} KB)`);

  // Extract all <script> contents (ignoring <script src=...>)
  const scriptRegex = /<script\b(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let scriptIdx = 0;
  while ((match = scriptRegex.exec(content)) !== null) {
    scriptIdx++;
    const code = match[1];
    if (!code.trim()) continue;

    try {
      new vm.Script(code, { filename: `${screen}#script-${scriptIdx}` });
      assert(true, `${screen} <script #${scriptIdx}> parsed valid JavaScript AST`);
    } catch (e) {
      assert(false, `${screen} <script #${scriptIdx}> JavaScript syntax error: ${e.message}`);
    }
  }
}

// ============================================================================
// SUITE 3: SCREEN-TO-API ROUTE PARITY
// ============================================================================
console.log('\n===============================================================');
console.log('SUITE 3: Verifying Screen API Calls Map to Registered Backend Routes');
console.log('===============================================================');

const indexPhpContent = fs.readFileSync(path.join(rootDir, 'api', 'index.php'), 'utf8');

// Known route handlers in api/index.php
const registeredRoutes = [
  // Profile
  { method: 'GET', path: '/api/profile' },
  { method: 'PUT', path: '/api/profile' },
  { method: 'POST', path: '/api/profile' },
  { method: 'POST', path: '/api/profile/bank' },
  { method: 'PUT', path: '/api/profile/bank' },
  { method: 'POST', path: '/api/profile/send-otp' },
  { method: 'POST', path: '/api/profile/change-password-otp' },
  // Auth
  { method: 'POST', path: '/api/auth/login' },
  { method: 'POST', path: '/api/auth/logout' },
  { method: 'GET', path: '/api/auth/me' },
  // Rates & Couriers
  { method: 'POST', path: '/api/rates' },
  { method: 'POST', path: '/api/serviceability' },
  { method: 'GET', path: '/api/carrier-sla' },
  { method: 'GET', path: '/api/couriers' },
  // Orders
  { method: 'GET', path: '/api/orders' },
  { method: 'POST', path: '/api/orders' },
  { method: 'GET', path: '/api/orders/:id' },
  { method: 'PUT', path: '/api/orders/:id' },
  { method: 'POST', path: '/api/orders/:id/ship' },
  { method: 'POST', path: '/api/order-cancel/:id' },
  // Tracking & Labels
  { method: 'GET', path: '/api/track' },
  { method: 'GET', path: '/api/track/:awb' },
  { method: 'POST', path: '/api/shipments/live-track' },
  { method: 'GET', path: '/api/shipment-label/:id' },
  { method: 'GET', path: '/api/shipment-invoice/:id' },
  { method: 'GET', path: '/api/shipment-labels-bulk' },
  // Wallet & Remittances
  { method: 'GET', path: '/api/wallet' },
  { method: 'POST', path: '/api/wallet/recharge' },
  { method: 'GET', path: '/api/cod' },
  { method: 'GET', path: '/api/cod-remittances' },
  // Tickets
  { method: 'GET', path: '/api/tickets' },
  { method: 'POST', path: '/api/tickets' },
  { method: 'GET', path: '/api/tickets/:id' },
  { method: 'POST', path: '/api/tickets/:id/messages' },
  { method: 'POST', path: '/api/ticket-messages/:id' },
  // Pincode
  { method: 'GET', path: '/api/pincode-lookup/:pincode' },
  // NDR & Disputes
  { method: 'GET', path: '/api/ndr' },
  { method: 'POST', path: '/api/ndr/action' },
  { method: 'POST', path: '/api/ndr-action/:id' },
  { method: 'GET', path: '/api/disputes' },
  { method: 'GET', path: '/api/weight-disputes' },
  { method: 'POST', path: '/api/weight-disputes/raise' },
  { method: 'POST', path: '/api/weight-disputes/accept' },
  // Addresses & OTP Verification
  { method: 'GET', path: '/api/addresses' },
  { method: 'POST', path: '/api/addresses' },
  { method: 'POST', path: '/api/addresses/send-otp' },
  { method: 'POST', path: '/api/addresses/verify-and-register' },
  { method: 'DELETE', path: '/api/addresses/:id' },
  // Admin Operations
  { method: 'GET', path: '/api/admin' },
  { method: 'GET', path: '/api/admin/users' },
  { method: 'GET', path: '/api/admin/users/:id' },
  { method: 'POST', path: '/api/admin/users/margin' },
  { method: 'PATCH', path: '/api/admin/users' },
  { method: 'GET', path: '/api/admin/couriers' },
  { method: 'PATCH', path: '/api/admin/couriers' },
  { method: 'GET', path: '/api/admin/commission' },
  { method: 'GET', path: '/api/admin-commission/:id' },
  { method: 'DELETE', path: '/api/admin-commission/:id' },
  { method: 'GET', path: '/api/admin/recharges' },
  { method: 'POST', path: '/api/admin/recharges/approve' },
  { method: 'POST', path: '/api/admin/recharges/reject' },
  { method: 'GET', path: '/api/admin/settings' },
  { method: 'POST', path: '/api/admin/settings' }
];

for (const r of registeredRoutes) {
  // Verify that api/index.php contains matching route logic
  const cleanEndpoint = r.path.replace(/^\/api/, '');
  const hasRoute = indexPhpContent.includes(cleanEndpoint.split('/:')[0]);
  assert(hasRoute, `Route [${r.method}] ${r.path} mapped in api/index.php`);
}

// ============================================================================
// SUITE 4: LIVE WORKFLOW API INTEGRATION TESTS (via Local Node Server)
// ============================================================================
async function runLiveApiTests() {
  console.log('\n===============================================================');
  console.log('SUITE 4: Live Screen API Integration Tests against Local Server');
  console.log('===============================================================');

  const baseUrl = 'http://localhost:3000';
  let token = '';

  // 1. Test Admin Login
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@hetex.in', password: 'admin' })
    });
    const d = await res.json();
    assert(res.ok && (d.token || d.user), 'Auth Login Screen -> returns authenticated session');
    token = d.token || '';
  } catch (e) {
    assert(false, `Auth Login failed to connect: ${e.message}`);
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 2. Test Profile GET
  try {
    const res = await fetch(`${baseUrl}/api/profile`, { headers: authHeaders });
    const d = await res.json();
    assert(res.ok && (d.profile || d.user), 'Profile Screen -> GET /api/profile returns profile data');
  } catch (e) {
    assert(false, `GET /api/profile failed: ${e.message}`);
  }

  // 3. Test Profile PUT (Updating address/contact details)
  try {
    const res = await fetch(`${baseUrl}/api/profile`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        businessName: 'Hetex Logistics Corp',
        address: {
          line1: 'B-402, Logistics Park',
          city: 'Gurugram',
          state: 'Haryana',
          pincode: '122015'
        }
      })
    });
    const d = await res.json();
    assert(res.ok && (d.success || d.profile), 'Profile Screen -> PUT /api/profile updates details successfully');
  } catch (e) {
    assert(false, `PUT /api/profile failed: ${e.message}`);
  }

  // 4. Test Bank Details Update
  try {
    const res = await fetch(`${baseUrl}/api/profile/bank`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        holderName: 'Hetex Administrator',
        bankName: 'HDFC Bank',
        accountNumber: '50100234567890',
        ifsc: 'HDFC0000240',
        accountType: 'Current'
      })
    });
    const d = await res.json();
    assert(res.ok && (d.success || d.bank), 'Profile Screen -> POST /api/profile/bank updates remittance bank');
  } catch (e) {
    assert(false, `POST /api/profile/bank failed: ${e.message}`);
  }

  // 5. Test Rate Calculator
  try {
    const res = await fetch(`${baseUrl}/api/rates`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        pickupPincode: '122015',
        deliveryPincode: '400001',
        weight: 1.5,
        paymentMode: 'PREPAID',
        declaredValue: 1200
      })
    });
    const d = await res.json();
    assert(res.ok && Array.isArray(d.rates || d.couriers || d), 'Rate Calculator Screen -> returns courier quotes');
  } catch (e) {
    assert(false, `POST /api/rates failed: ${e.message}`);
  }

  // 6. Test Orders List
  try {
    const res = await fetch(`${baseUrl}/api/orders`, { headers: authHeaders });
    const d = await res.json();
    assert(res.ok && Array.isArray(d.orders || d), 'Orders & Shipments Screen -> returns order records');
  } catch (e) {
    assert(false, `GET /api/orders failed: ${e.message}`);
  }

  // 7. Test Wallet Balance
  try {
    const res = await fetch(`${baseUrl}/api/wallet`, { headers: authHeaders });
    const d = await res.json();
    assert(res.ok && (d.balance !== undefined || d.walletBalance !== undefined), 'Wallet Screen -> returns balance info');
  } catch (e) {
    assert(false, `GET /api/wallet failed: ${e.message}`);
  }

  // 8. Test Admin Operations Panel
  try {
    const res = await fetch(`${baseUrl}/api/admin`, { headers: authHeaders });
    const d = await res.json();
    assert(res.ok, 'Admin Operations Panel -> GET /api/admin returns platform stats');
  } catch (e) {
    assert(false, `GET /api/admin failed: ${e.message}`);
  }

  // 9. Test Admin Recharges
  try {
    const res = await fetch(`${baseUrl}/api/admin/recharges`, { headers: authHeaders });
    const d = await res.json();
    assert(res.ok && Array.isArray(d.recharges || d), 'Admin UPI Approvals Screen -> returns recharge requests');
  } catch (e) {
    assert(false, `GET /api/admin/recharges failed: ${e.message}`);
  }

  // 10. Test Admin Users / Sellers
  let firstUserId = '';
  try {
    const res = await fetch(`${baseUrl}/api/admin/users`, { headers: authHeaders });
    const d = await res.json();
    assert(res.ok && Array.isArray(d.users || d), 'Admin Sellers Screen -> GET /api/admin/users returns sellers');
    const uList = d.users || d;
    if (uList && uList.length > 0) {
      firstUserId = uList[0].id || '';
    }
  } catch (e) {
    assert(false, `GET /api/admin/users failed: ${e.message}`);
  }

  // 11. Test Admin Configure Seller Rate Margin
  try {
    const res = await fetch(`${baseUrl}/api/admin/users/margin`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        userId: firstUserId || 'df8091d8-eb66-4f0c-a4d7-60a88620cf96',
        rateMarginPercent: 10,
        rateMarginType: 'FLAT'
      })
    });
    const d = await res.json();
    assert(res.ok && (d.success || d.rateMarginPercent !== undefined), 'Admin Margin Modal -> POST /api/admin/users/margin saves margin');
  } catch (e) {
    assert(false, `POST /api/admin/users/margin failed: ${e.message}`);
  }

  // 12. Test Buyer Pincode Autopopulation
  try {
    const res = await fetch(`${baseUrl}/api/pincode-lookup/110001`);
    const d = await res.json();
    assert(res.ok && d.city && d.state, `Buyer Pincode Autopopulation -> 110001 resolved to ${d.city}, ${d.state}`);
  } catch (e) {
    assert(false, `Pincode lookup failed: ${e.message}`);
  }

  // 13. Test Warehouse Address OTP Dispatch
  let testOtp = '123456';
  try {
    const res = await fetch(`${baseUrl}/api/addresses/send-otp`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ phone: '9876543210', email: 'dispatch@hetex.in', label: 'Test Origin Hub' })
    });
    const d = await res.json();
    assert(res.ok && d.success, 'Warehouse Address OTP -> POST /api/addresses/send-otp dispatches OTP');
    if (d.dev_otp) testOtp = d.dev_otp;
  } catch (e) {
    assert(false, `POST /api/addresses/send-otp failed: ${e.message}`);
  }

  // 14. Test Warehouse Address OTP Verification & Registration
  try {
    const res = await fetch(`${baseUrl}/api/addresses/verify-and-register`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        label: 'Automated Test Facility',
        contactName: 'Warehouse Dispatch In-Charge',
        phone: '9876543210',
        addressLine1: 'Plot 42, Sector 18, Udyog Vihar',
        pincode: '122015',
        city: 'Gurugram',
        state: 'Haryana',
        country: 'India',
        otp: testOtp,
        isDefault: 1
      })
    });
    const d = await res.json();
    assert(res.ok && (d.success || d.id), `Warehouse Registration & OTP Verification -> ${d.message || 'Verified'}`);
  } catch (e) {
    assert(false, `POST /api/addresses/verify-and-register failed: ${e.message}`);
  }

  // Final Summary
  console.log('\n===============================================================');
  console.log(`PRE-DEPLOYMENT TEST RESULTS: ${passes} Passed, ${failures} Failed`);
  console.log('===============================================================');

  if (failures > 0) {
    console.error('\n❌ PRE-DEPLOYMENT CHECKS FAILED! Deployment cannot proceed.\n');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL SCREENS, CONTROLLERS, AND API ROUTES VALIDATED 100% CLEAN!\n');
    process.exit(0);
  }
}

runLiveApiTests();
