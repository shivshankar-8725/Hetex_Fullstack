const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const rootDir = __dirname;

// In-Memory Database for Realistic Local Testing
const state = {
  couriers: [
    { id: 'c1000000-0000-0000-0000-000000000001', name: 'Delhivery Surface', code: 'DELHIVERY_SURFACE', logoColor: '#000000', active: true, baseRatePerKg: 42.0, codChargeFlat: 25.0, codChargePercent: 1.5, rating: 4.3, etaDays: '3-5', etaMinDays: 3, etaMaxDays: 5, rtoRiskPercent: 6.5, baseRate: 42.0, slaPercent: 97.2 },
    { id: 'c1000000-0000-0000-0000-000000000002', name: 'Delhivery Express', code: 'DELHIVERY_EXPRESS', logoColor: '#e11d48', active: true, baseRatePerKg: 65.0, codChargeFlat: 30.0, codChargePercent: 1.8, rating: 4.6, etaDays: '1-3', etaMinDays: 1, etaMaxDays: 3, rtoRiskPercent: 4.2, baseRate: 65.0, slaPercent: 98.6 },
    { id: 'c1000000-0000-0000-0000-000000000003', name: 'DTDC Priority', code: 'DTDC_EXP', logoColor: '#ea580c', active: true, baseRatePerKg: 52.0, codChargeFlat: 25.0, codChargePercent: 1.5, rating: 4.5, etaDays: '2-4', etaMinDays: 2, etaMaxDays: 4, rtoRiskPercent: 5.5, baseRate: 52.0, slaPercent: 97.5 },
    { id: 'c1000000-0000-0000-0000-000000000004', name: 'BlueDart Express', code: 'BLUEDART_EXP', logoColor: '#0284c7', active: true, baseRatePerKg: 78.0, codChargeFlat: 35.0, codChargePercent: 2.0, rating: 4.7, etaDays: '1-2', etaMinDays: 1, etaMaxDays: 2, rtoRiskPercent: 3.5, baseRate: 78.0, slaPercent: 98.9 }
  ],
  commissionRules: [
    { id: 'r1000000-0000-0000-0000-000000000001', courierId: null, courierName: 'All Couriers (Default)', minWeight: 0, maxWeight: 1000, marginType: 'PERCENT', marginValue: 10.0 }
  ],
  walletBalance: 50000.0,
  transactions: [
    { id: 'tx_init', type: 'CREDIT', amount: 50000, balanceAfter: 50000, description: 'Initial Testing Balance', createdAt: new Date().toISOString() }
  ],
  settings: {
    upiId: 'hetex@icici',
    payeeName: 'HetEx Logistics',
    helplineNumber: '+91 98765 43210',
    helplineHours: 'Mon - Sat: 9:00 AM - 8:00 PM IST',
    supportEmail: 'support@hetex.in'
  },
  addresses: [
    { id: 'addr_wh1', label: 'Primary Warehouse', contactName: 'Rajesh Kumar', phone: '9876543210', addressLine1: 'Plot 42, Sector 18, Udyog Vihar', city: 'Gurugram', state: 'Haryana', pincode: '122015', isDefault: true, type: 'PICKUP' },
    { id: 'addr_cust_samarth', label: 'Samarth Gold', contactName: 'Samarth Gold', phone: '9516474537', addressLine1: 'Shop 102, Gold Palace Market, Zaveri Bazaar', city: 'Mumbai', state: 'Maharashtra', pincode: '400002', isDefault: false, type: 'BUYER' },
    { id: 'addr_cust1', label: 'Customer', contactName: 'Amit Sharma', phone: '9876543210', addressLine1: 'Flat 402, Green Heights, Sector 12', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', isDefault: false, type: 'BUYER' },
    { id: 'addr_cust2', label: 'Customer', contactName: 'Priya Verma', phone: '9811223344', addressLine1: 'Villa 15, Palm Meadows, Whitefield', city: 'Bengaluru', state: 'Karnataka', pincode: '560066', isDefault: false, type: 'BUYER' },
    { id: 'addr_cust3', label: 'Customer', contactName: 'Vikram Singh', phone: '9988776655', addressLine1: 'Shop 12, Connaught Place, Block B', city: 'New Delhi', state: 'Delhi', pincode: '110001', isDefault: false, type: 'BUYER' }
  ],
  recharges: [
    {
      id: 'HTX-UPIR-1001',
      userId: 'usr_seller_1',
      userName: 'FastTrack Logistics',
      businessName: 'FastTrack India',
      userPhone: '9876543210',
      amount: 2500,
      paymentMethod: 'UPI',
      upiId: 'hetex@icici',
      utrNumber: '429182749102',
      status: 'UNDER_REVIEW',
      adminNotes: null,
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      reviewedAt: null
    }
  ],
  orders: [
    {
      id: 'ord_101',
      orderNumber: 'HTX-ORD-1001',
      awbNumber: 'HTX982736192',
      courierId: 'c1000000-0000-0000-0000-000000000001',
      courier: { name: 'Delhivery Surface', code: 'DELHIVERY_SURFACE' },
      status: 'READY_TO_SHIP',
      buyerAddress: { contactName: 'Amit Sharma', phone: '9876543210', addressLine1: 'Flat 402, Green Heights, Sector 12', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
      pickupAddress: { contactName: 'Rajesh Kumar', phone: '9876543210', addressLine1: 'Plot 42, Sector 18, Udyog Vihar', city: 'Gurugram', state: 'Haryana', pincode: '122015' },
      items: [
        { name: 'Casual Cotton Shirt', category: 'Apparel & Fashion', quantity: 2, declaredValue: 600, weight: 0.35, length: 25, width: 20, height: 4 },
        { name: 'Leather Wallet', category: 'Accessories', quantity: 1, declaredValue: 400, weight: 0.2, length: 12, width: 10, height: 2 }
      ],
      itemsCount: 3,
      itemDescription: 'Casual Cotton Shirt (x2), Leather Wallet',
      declaredValue: 1600,
      weight: 0.9,
      billableWeight: 1.2,
      rateCharged: 46.2,
      paymentMode: 'PREPAID',
      createdAt: new Date().toISOString()
    }
  ],
  tickets: [],
  users: [
    {
      id: 'usr_seller_1',
      name: 'Meena',
      email: 'meena@zuberia.one',
      phone: '9876543210',
      businessName: 'Zuberia One Enterprises',
      kycStatus: 'VERIFIED',
      walletBalance: 5949.79,
      role: 'SELLER',
      createdAt: '2026-01-15T10:00:00.000Z',
      orderCount: 4
    },
    {
      id: 'u1',
      name: 'FastTrack Logistics',
      email: 'seller@fasttrack.com',
      phone: '9876543210',
      businessName: 'FastTrack India',
      kycStatus: 'VERIFIED',
      walletBalance: 3200.00,
      role: 'SELLER',
      createdAt: '2026-02-10T11:20:00.000Z',
      orderCount: 2
    },
    {
      id: 'u2',
      name: 'Urban Retailers',
      email: 'support@urbanretail.in',
      phone: '9811223344',
      businessName: 'Urban Retail LLP',
      kycStatus: 'VERIFIED',
      walletBalance: 12450.00,
      role: 'SELLER',
      createdAt: '2026-03-01T09:15:00.000Z',
      orderCount: 1
    }
  ]
};

const settingsFile = path.join(rootDir, 'platform_settings.json');
try {
  if (fs.existsSync(settingsFile)) {
    const saved = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    state.settings = { ...state.settings, ...saved };
  }
} catch (e) {}

const addressesFile = path.join(rootDir, 'platform_addresses.json');
try {
  if (fs.existsSync(addressesFile)) {
    const savedAddrs = JSON.parse(fs.readFileSync(addressesFile, 'utf8'));
    if (Array.isArray(savedAddrs) && savedAddrs.length > 0) {
      savedAddrs.forEach(sa => {
        const cleanP = (sa.phone || '').replace(/\D/g, '').slice(-10);
        const idx = state.addresses.findIndex(a => a.id === sa.id || (cleanP && (a.phone || '').replace(/\D/g, '').endsWith(cleanP)));
        if (idx >= 0) {
          state.addresses[idx] = { ...state.addresses[idx], ...sa };
        } else {
          state.addresses.push(sa);
        }
      });
    }
  }
} catch (e) {}

function saveAddressesStore() {
  try {
    fs.writeFileSync(addressesFile, JSON.stringify(state.addresses, null, 2), 'utf8');
  } catch (e) {}
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // ==========================================
  // API ROUTES
  // ==========================================
  if (pathname.startsWith('/api/')) {
    const body = ['POST', 'PUT', 'PATCH'].includes(method) ? await readBody(req) : {};

    // Auth Login
    if (pathname === '/api/auth/login' && method === 'POST') {
      const email = (body.email || '').trim().toLowerCase();
      const isAdmin = email.includes('admin');
      return sendJson(res, {
        token: 'mock-jwt-token-' + (isAdmin ? 'admin' : 'seller'),
        user: {
          id: isAdmin ? 'usr_admin_1' : 'usr_seller_1',
          name: isAdmin ? 'HetEx Super Admin' : 'FastTrack Logistics',
          email: body.email,
          role: isAdmin ? 'ADMIN' : 'SELLER',
          businessName: isAdmin ? 'HetEx Admin HQ' : 'FastTrack India',
          phone: '9876543210',
          kycStatus: 'VERIFIED'
        }
      });
    }

    // Auth Register
    if (pathname === '/api/auth/register' && method === 'POST') {
      return sendJson(res, {
        token: 'mock-jwt-token-seller',
        user: {
          id: 'usr_new_1',
          name: body.name || 'New Seller',
          email: body.email,
          role: 'SELLER',
          businessName: body.businessName || 'My Business',
          phone: body.phone || '9999999999',
          kycStatus: 'PENDING'
        }
      });
    }

    // Carrier SLA (Live user view - strictly active couriers)
    if (pathname === '/api/carrier-sla' && method === 'GET') {
      const activeCouriers = state.couriers.filter(c => c.active !== false);
      return sendJson(res, { couriers: activeCouriers });
    }

    // Rate Calculation (user view - strictly active couriers with margin rules)
    if (pathname === '/api/rates' && method === 'POST') {
      const weight = parseFloat(body.weight || 1.0);
      const activeCouriers = state.couriers.filter(c => c.active !== false);
      const rule = state.commissionRules[0] || { marginType: 'PERCENT', marginValue: 10.0 };

      const quotes = activeCouriers.map(c => {
        const baseFreight = c.baseRatePerKg * Math.max(1, weight);
        const codCharge = (body.paymentMode === 'COD') ? c.codChargeFlat : 0.0;
        let margin = (rule.marginType === 'PERCENT') ? (baseFreight * (rule.marginValue / 100)) : rule.marginValue;
        margin = Math.round(margin * 100) / 100;
        const totalRate = Math.round((baseFreight + codCharge + margin) * 100) / 100;

        return {
          courierId: c.id,
          name: c.name,
          courierName: c.name,
          code: c.code,
          courierCode: c.code,
          logoColor: c.logoColor,
          rating: c.rating,
          etaDays: c.etaDays,
          etaMinDays: c.etaMinDays,
          etaMaxDays: c.etaMaxDays,
          baseFreight,
          codCharge,
          margin,
          sellerPrice: totalRate,
          totalRate,
          zones: 2
        };
      });

      return sendJson(res, { quotes, couriers: quotes });
    }

    // Admin Couriers List & Toggle
    if (pathname === '/api/admin/couriers') {
      if (method === 'GET') {
        return sendJson(res, { couriers: state.couriers });
      }
      if (method === 'PATCH' || method === 'POST' || method === 'PUT') {
        const id = body.id;
        const target = state.couriers.find(c => c.id === id);
        if (target) {
          if (body.active !== undefined) {
            target.active = Boolean(body.active);
          }
          if (body.baseRatePerKg !== undefined) {
            target.baseRatePerKg = parseFloat(body.baseRatePerKg);
          }
          return sendJson(res, { success: true, courier: target });
        }
        return sendJson(res, { error: 'Courier not found' }, 404);
      }
    }

    // Admin Commission Rules
    if (pathname === '/api/admin/commission') {
      if (method === 'GET') {
        return sendJson(res, { rules: state.commissionRules });
      }
      if (method === 'POST') {
        const newRule = {
          id: 'r_' + Date.now(),
          courierId: body.courierId || null,
          courierName: body.courierId ? (state.couriers.find(c => c.id === body.courierId)?.name || 'Custom') : 'All Couriers (Default)',
          minWeight: parseFloat(body.minWeight || 0),
          maxWeight: parseFloat(body.maxWeight || 1000),
          marginType: body.marginType || 'PERCENT',
          marginValue: parseFloat(body.marginValue || 10)
        };
        state.commissionRules.unshift(newRule);
        return sendJson(res, { success: true, rule: newRule });
      }
    }

    if (pathname.startsWith('/api/admin-commission/') && method === 'DELETE') {
      const id = pathname.replace('/api/admin-commission/', '');
      state.commissionRules = state.commissionRules.filter(r => r.id !== id);
      return sendJson(res, { success: true });
    }

    // Admin All Shipments
    if (pathname === '/api/admin/shipments' && method === 'GET') {
      const list = state.orders.map(o => ({
        order_number: o.orderNumber,
        awb_number: o.awbNumber,
        courier_name: o.courier?.name || 'Courier',
        buyer_name: o.buyerAddress?.contactName || 'Buyer',
        buyer_city: o.buyerAddress?.city || 'India',
        rate_charged: o.rateCharged || 46.2,
        status: o.status
      }));
      return sendJson(res, { shipments: list });
    }

    // Admin Overview
    if (pathname === '/api/admin' && method === 'GET') {
      return sendJson(res, {
        sellerCount: 4,
        totalOrders: state.orders.length,
        totalMarginEarned: state.orders.length * 4.62,
        totalWalletBalance: state.walletBalance,
        recentOrders: state.orders
      });
    }

    // Admin Users - List
    if (pathname === '/api/admin/users' && method === 'GET') {
      return sendJson(res, { users: state.users });
    }

    // Admin Users - Wallet Adjustment
    if (pathname === '/api/admin/users' && (method === 'PATCH' || method === 'POST')) {
      const userId = body.userId;
      const amount = parseFloat(body.amount || 0);
      const reason = body.reason || 'Admin Adjustment';
      const user = state.users.find(u => u.id === userId) || state.users[0];
      if (user) {
        user.walletBalance = Math.max(0, (user.walletBalance || 0) + amount);
        if (user.id === 'usr_seller_1') {
          state.walletBalance = user.walletBalance;
        }
        state.transactions.unshift({
          id: 'tx_' + Date.now(),
          type: amount >= 0 ? 'CREDIT' : 'DEBIT',
          amount: Math.abs(amount),
          balanceAfter: user.walletBalance,
          description: reason + ` (${user.name})`,
          createdAt: new Date().toISOString()
        });
        return sendJson(res, { success: true, balance: user.walletBalance, user });
      }
      return sendJson(res, { error: 'User not found' }, 404);
    }

    // Admin Users - Single Seller Detail with Orders (Image 1 Screen)
    if (pathname.startsWith('/api/admin/users/')) {
      const uId = pathname.replace('/api/admin/users/', '');
      const user = state.users.find(u => u.id === uId) || {
        id: uId,
        name: 'Meena',
        email: 'meena@zuberia.one',
        phone: '9876543210',
        businessName: 'Zuberia One Enterprises',
        kycStatus: 'VERIFIED',
        walletBalance: state.walletBalance,
        role: 'SELLER',
        createdAt: '2026-01-15T10:00:00.000Z',
        orderCount: state.orders.length
      };
      return sendJson(res, {
        user,
        orders: state.orders
      });
    }

    // Addresses Lookup (Smart Autofill)
    if (pathname === '/api/addresses/lookup' && method === 'GET') {
      const phone = ((parsedUrl.query.phone || '').toString()).replace(/\D/g, '');
      const cleanPhone = phone.length > 10 ? phone.slice(-10) : phone;
      if (!cleanPhone || cleanPhone.length < 10) {
        return sendJson(res, { found: false });
      }
      const match = state.addresses.find(a => (a.phone || '').replace(/\D/g, '').endsWith(cleanPhone) && a.type === 'BUYER') ||
                    state.orders.map(o => o.buyerAddress).find(b => b && (b.phone || '').replace(/\D/g, '').endsWith(cleanPhone)) ||
                    state.addresses.find(a => (a.phone || '').replace(/\D/g, '').endsWith(cleanPhone));
      if (match) {
        return sendJson(res, {
          found: true,
          address: {
            contactName: match.contactName || '',
            phone: match.phone || cleanPhone,
            addressLine1: match.addressLine1 || '',
            city: match.city || '',
            state: match.state || '',
            pincode: match.pincode || ''
          }
        });
      }
      return sendJson(res, { found: false });
    }

    // Addresses
    if (pathname === '/api/addresses') {
      if (method === 'GET') {
        return sendJson(res, { addresses: state.addresses });
      }
      if (method === 'POST') {
        const addr = { id: 'addr_' + Date.now(), ...body };
        const cleanP = (addr.phone || '').replace(/\D/g, '').slice(-10);
        const existingIdx = cleanP.length === 10 ? state.addresses.findIndex(a => (a.phone || '').replace(/\D/g, '').endsWith(cleanP) && (a.type === 'BUYER' || a.type === 'DELIVERY')) : -1;
        if (existingIdx >= 0) {
          state.addresses[existingIdx] = { ...state.addresses[existingIdx], ...addr };
        } else {
          state.addresses.push(addr);
        }
        if (typeof saveAddressesStore === 'function') saveAddressesStore();
        return sendJson(res, { success: true, id: addr.id, address: addr });
      }
    }
    if (pathname.startsWith('/api/addresses/') && method === 'DELETE') {
      const id = pathname.replace('/api/addresses/', '');
      state.addresses = state.addresses.filter(a => a.id !== id);
      if (typeof saveAddressesStore === 'function') saveAddressesStore();
      return sendJson(res, { success: true });
    }

    // Wallet
    if (pathname === '/api/wallet') {
      if (method === 'GET') {
        return sendJson(res, { balance: state.walletBalance, transactions: state.transactions });
      }
    }

    // Platform Settings (UPI & Helpline Configuration)
    if ((pathname === '/api/settings' || pathname === '/api/admin/settings') && method === 'GET') {
      return sendJson(res, { settings: state.settings });
    }

    if (pathname === '/api/admin/settings' && method === 'POST') {
      if (body.upiId) state.settings.upiId = body.upiId.trim();
      if (body.payeeName) state.settings.payeeName = body.payeeName.trim();
      if (body.helplineNumber) state.settings.helplineNumber = body.helplineNumber.trim();
      if (body.helplineHours) state.settings.helplineHours = body.helplineHours.trim();
      if (body.supportEmail) state.settings.supportEmail = body.supportEmail.trim();

      try {
        fs.writeFileSync(settingsFile, JSON.stringify(state.settings, null, 2), 'utf8');
      } catch (e) {}

      return sendJson(res, { success: true, settings: state.settings, message: 'Platform settings updated successfully!' });
    }

    // Dynamic UPI Recharge QR Creation
    if (pathname === '/api/wallet/upi-create' && method === 'POST') {
      const amt = parseFloat(body.amount || 1000);
      const requestId = 'HTX-UPIR-' + Date.now();
      const upiId = state.settings?.upiId || 'hetex@icici';
      const payeeName = state.settings?.payeeName || 'HetEx Logistics';
      const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amt.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Recharge ' + requestId)}`;
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;
      return sendJson(res, {
        success: true,
        requestId,
        amount: amt,
        upiId,
        payeeName,
        upiUrl,
        qrImageUrl
      });
    }

    // User submits UPI Payment -> Status UNDER_REVIEW (NEVER credits wallet before admin approval!)
    if (pathname === '/api/wallet/upi-paid' && method === 'POST') {
      const amt = parseFloat(body.amount || 0);
      const requestId = body.requestId || ('HTX-UPIR-' + Date.now());
      const utrNumber = body.utrNumber || '';
      const upiId = state.settings?.upiId || 'hetex@icici';
      const newRecharge = {
        id: requestId,
        userId: 'usr_seller_1',
        userName: 'FastTrack Logistics',
        businessName: 'FastTrack India',
        userPhone: '9876543210',
        amount: amt,
        paymentMethod: 'UPI',
        upiId: upiId,
        utrNumber: utrNumber,
        status: 'UNDER_REVIEW',
        adminNotes: null,
        createdAt: new Date().toISOString(),
        reviewedAt: null
      };
      state.recharges.unshift(newRecharge);
      return sendJson(res, {
        success: true,
        status: 'UNDER_REVIEW',
        requestId,
        amount: amt,
        message: 'Recharge request submitted and marked UNDER REVIEW. Admin will verify and approve before wallet is credited.'
      });
    }

    if (pathname === '/api/wallet/recharges' && method === 'GET') {
      return sendJson(res, { recharges: state.recharges });
    }

    // Admin Recharges List & Approval
    if (pathname === '/api/admin/recharges' && method === 'GET') {
      return sendJson(res, { recharges: state.recharges });
    }

    if (pathname === '/api/admin/recharges/approve' && method === 'POST') {
      const req = state.recharges.find(r => r.id === body.requestId);
      if (req) {
        if (req.status !== 'APPROVED') {
          req.status = 'APPROVED';
          req.reviewedAt = new Date().toISOString();
          const oldBal = state.walletBalance;
          state.walletBalance += req.amount;
          state.transactions.unshift({
            id: 'tx_' + Date.now(),
            type: 'CREDIT',
            amount: req.amount,
            balanceBefore: oldBal,
            balanceAfter: state.walletBalance,
            description: 'UPI Recharge Approved (' + req.id + (req.utrNumber ? ' · UTR: ' + req.utrNumber : '') + ')',
            createdAt: new Date().toISOString()
          });
        }
        return sendJson(res, { success: true, status: 'APPROVED', recharge: req, balance: state.walletBalance });
      }
      return sendJson(res, { error: 'Recharge request not found' }, 404);
    }

    if (pathname === '/api/admin/recharges/reject' && method === 'POST') {
      const req = state.recharges.find(r => r.id === body.requestId);
      if (req) {
        req.status = 'REJECTED';
        req.adminNotes = body.reason || body.notes || 'Rejected by Admin';
        req.reviewedAt = new Date().toISOString();
        return sendJson(res, { success: true, status: 'REJECTED', recharge: req });
      }
      return sendJson(res, { error: 'Recharge request not found' }, 404);
    }

    // Legacy Wallet recharge fallback (kept for compatibility)
    if (pathname === '/api/wallet/recharge' && method === 'POST') {
      const amt = parseFloat(body.amount || 0);
      const reqId = 'HTX-UPIR-' + Date.now();
      state.recharges.unshift({
        id: reqId,
        userId: 'usr_seller_1',
        userName: 'FastTrack Logistics',
        businessName: 'FastTrack India',
        userPhone: '9876543210',
        amount: amt,
        paymentMethod: 'UPI',
        upiId: 'hetex@icici',
        utrNumber: '',
        status: 'UNDER_REVIEW',
        adminNotes: null,
        createdAt: new Date().toISOString(),
        reviewedAt: null
      });
      return sendJson(res, { success: true, status: 'UNDER_REVIEW', requestId: reqId, balance: state.walletBalance });
    }

    // Orders - Specific Order Detail
    if (pathname.startsWith('/api/orders/') && method === 'GET') {
      const id = pathname.replace('/api/orders/', '');
      const o = state.orders.find(ord => ord.id === id || ord.orderNumber === id);
      if (!o) return sendJson(res, { error: 'Order not found' }, 404);
      return sendJson(res, {
        order: {
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          paymentMode: o.paymentMode || 'PREPAID',
          codAmount: o.codAmount || 0,
          declaredValue: o.declaredValue || 1200,
          weight: o.weight || 0.9,
          billableWeight: o.billableWeight || o.weight || 1.2,
          itemDescription: o.itemDescription || 'Merchandise Goods',
          items: o.items || [
            { name: o.itemDescription || 'Package Item', category: 'General Merchandise', quantity: 1, declaredValue: o.declaredValue || 500, weight: o.weight || 0.5, dimensions: '15 × 10 × 5 cm' }
          ],
          buyerAddress: o.buyerAddress || { contactName: 'Buyer', city: 'India', phone: '9876543210', pincode: '400001' },
          pickupAddress: o.pickupAddress || state.addresses[0],
          shipment: {
            id: o.id,
            status: o.status,
            awbNumber: o.awbNumber,
            rateCharged: o.rateCharged || 46.2,
            courier: o.courier || { name: 'Delhivery Surface', code: 'DELHIVERY_SURFACE' }
          },
          createdAt: o.createdAt
        }
      });
    }

    // Orders - List & Create
    if (pathname === '/api/orders') {
      if (method === 'GET') {
        return sendJson(res, { orders: state.orders });
      }
      if (method === 'POST') {
        const c = state.couriers.find(cr => cr.id === body.courierId) || state.couriers[0];
        const rawItems = Array.isArray(body.items) && body.items.length > 0 ? body.items : null;
        
        let processedItems = [];
        let totalWeight = 0;
        let totalVolWeight = 0;
        let totalDeclaredValue = 0;
        let totalItemsCount = 0;
        let itemNames = [];

        if (rawItems) {
          rawItems.forEach(it => {
            const qty = Math.max(1, parseInt(it.quantity || 1));
            const w = Math.max(0.01, parseFloat(it.weight || 0.5));
            const l = Math.max(1, parseFloat(it.length || 10));
            const wd = Math.max(1, parseFloat(it.width || 10));
            const h = Math.max(1, parseFloat(it.height || 10));
            const val = parseFloat(it.declaredValue || 500);
            const cat = it.category || 'General Merchandise';
            const name = it.name || it.itemDescription || 'Item';

            totalItemsCount += qty;
            totalWeight += w * qty;
            totalVolWeight += ((l * wd * h) / 5000) * qty;
            totalDeclaredValue += val * qty;
            itemNames.push(name + (qty > 1 ? ` (x${qty})` : ''));

            processedItems.push({
              name,
              category: cat,
              quantity: qty,
              declaredValue: val,
              weight: w,
              length: l,
              width: wd,
              height: h,
              dimensions: `${l} × ${wd} × ${h} cm`
            });
          });
        } else {
          const w = parseFloat(body.weight || 0.5);
          const l = parseFloat(body.length || 15);
          const wd = parseFloat(body.width || 10);
          const h = parseFloat(body.height || 5);
          const val = parseFloat(body.declaredValue || 500);
          const name = body.itemDescription || 'Apparel Merchandise';
          totalItemsCount = 1;
          totalWeight = w;
          totalVolWeight = (l * wd * h) / 5000;
          totalDeclaredValue = val;
          itemNames.push(name);
          processedItems.push({
            name,
            category: body.itemCategory || 'General Merchandise',
            quantity: 1,
            declaredValue: val,
            weight: w,
            length: l,
            width: wd,
            height: h,
            dimensions: `${l} × ${wd} × ${h} cm`
          });
        }

        const billableWeight = Math.round(Math.max(totalWeight, totalVolWeight) * 100) / 100;
        const shippingFee = parseFloat(body.sellerPrice || (c.baseRatePerKg * Math.max(1, billableWeight)));

        const buyerFound = body.buyerAddressId ? state.addresses.find(a => a.id === body.buyerAddressId) : null;
        const buyerPhoneRaw = body.buyerPhone || body.phone || buyerFound?.phone || '9876543210';
        const cleanBPhone = buyerPhoneRaw.replace(/\D/g, '').slice(-10);
        const buyerAddressObj = {
          contactName: body.buyerName || body.contactName || buyerFound?.contactName || 'Customer',
          phone: cleanBPhone || buyerPhoneRaw,
          addressLine1: body.buyerAddress || body.addressLine1 || buyerFound?.addressLine1 || 'Address',
          city: body.buyerCity || body.city || buyerFound?.city || 'Mumbai',
          state: body.buyerState || body.state || buyerFound?.state || 'Maharashtra',
          pincode: body.buyerPincode || body.deliveryPincode || buyerFound?.pincode || '400001'
        };

        // Auto-save this buyer into state.addresses so subsequent shipments autofill instantly!
        if (cleanBPhone && cleanBPhone.length === 10) {
          const exIdx = state.addresses.findIndex(a => (a.phone || '').replace(/\D/g, '').endsWith(cleanBPhone));
          if (exIdx >= 0) {
            state.addresses[exIdx] = { ...state.addresses[exIdx], ...buyerAddressObj, type: 'BUYER' };
          } else {
            state.addresses.push({ id: 'addr_' + Date.now(), label: buyerAddressObj.contactName, ...buyerAddressObj, type: 'BUYER' });
          }
          if (typeof saveAddressesStore === 'function') saveAddressesStore();
        }

        const newOrder = {
          id: 'ord_' + Date.now(),
          orderNumber: 'HTX-ORD-' + (1000 + state.orders.length + 1),
          awbNumber: 'HTX' + Math.floor(100000000 + Math.random() * 900000000),
          courierId: c.id,
          courier: { name: c.name, code: c.code },
          status: 'READY_TO_SHIP',
          buyerAddress: buyerAddressObj,
          pickupAddress: state.addresses.find(a => a.id === body.pickupAddressId) || state.addresses[0],
          items: processedItems,
          itemsCount: totalItemsCount,
          itemDescription: itemNames.join(', '),
          declaredValue: totalDeclaredValue,
          weight: Math.round(totalWeight * 100) / 100,
          billableWeight: billableWeight,
          rateCharged: shippingFee,
          paymentMode: body.paymentMode || 'PREPAID',
          codAmount: body.paymentMode === 'COD' ? parseFloat(body.codAmount || 0) : 0,
          createdAt: new Date().toISOString()
        };

        state.orders.unshift(newOrder);
        state.walletBalance = Math.max(0, state.walletBalance - newOrder.rateCharged);
        state.transactions.unshift({
          id: 'tx_' + Date.now(),
          type: 'DEBIT',
          amount: newOrder.rateCharged,
          balanceAfter: state.walletBalance,
          description: 'Shipment Freight: ' + newOrder.awbNumber,
          createdAt: new Date().toISOString()
        });

        return sendJson(res, {
          success: true,
          order: newOrder,
          orderId: newOrder.id,
          awbNumber: newOrder.awbNumber,
          orderNumber: newOrder.orderNumber,
          rateCharged: newOrder.rateCharged
        });
      }
    }

    // Cancel Order
    if (pathname.startsWith('/api/order-cancel/') && method === 'POST') {
      const id = pathname.replace('/api/order-cancel/', '');
      const o = state.orders.find(ord => ord.id === id || ord.orderNumber === id);
      if (o) {
        o.status = 'CANCELLED';
        state.walletBalance += o.rateCharged;
        state.transactions.unshift({
          id: 'tx_' + Date.now(),
          type: 'CREDIT',
          amount: o.rateCharged,
          balanceAfter: state.walletBalance,
          description: 'Refund for cancelled order ' + o.orderNumber,
          createdAt: new Date().toISOString()
        });
      }
      return sendJson(res, { success: true });
    }

    // Tracking
    if (pathname.startsWith('/api/track') || pathname === '/api/shipments/live-track') {
      return sendJson(res, {
        awbNumber: parsedUrl.query.awb || 'HTX982736192',
        status: 'IN_TRANSIT',
        currentLocation: 'Delhi National Sort Facility',
        expectedDeliveryDate: '2 Days from now',
        events: [
          { timestamp: new Date(Date.now() - 3600000 * 24).toISOString(), location: 'Gurugram Hub', description: 'Package picked up by courier partner' },
          { timestamp: new Date(Date.now() - 3600000 * 12).toISOString(), location: 'Delhi Sorting Center', description: 'Arrived at distribution sort center' },
          { timestamp: new Date().toISOString(), location: 'Delhi Air Hub', description: 'In transit to destination city' }
        ]
      });
    }

    // Shipping Label HTML (Multi-item accurate labels)
    if (pathname.startsWith('/api/shipment-label/')) {
      const id = pathname.replace('/api/shipment-label/', '');
      const o = state.orders.find(ord => ord.id === id || ord.orderNumber === id || ord.awbNumber === id || (ord.shipment && ord.shipment.id === id)) || state.orders[0];
      const awb = o?.awbNumber || 'HTX' + Math.floor(100000000 + Math.random() * 900000000);
      const orderNum = o?.orderNumber || 'HTX-ORD-1001';
      const courierName = o?.courier?.name || 'Delhivery Express';
      const buyer = o?.buyerAddress || { contactName: 'Amit Sharma', phone: '9876543210', addressLine1: 'Flat 402, Green Heights, Sector 12', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' };
      const pickup = o?.pickupAddress || state.addresses[0] || { contactName: 'HetEx Logistics Hub', phone: '9876543210', addressLine1: 'Plot 42, Sector 18, Udyog Vihar', city: 'Gurugram', state: 'Haryana', pincode: '122015' };
      const mode = o?.paymentMode || 'PREPAID';
      const codAmt = o?.codAmount || 0;
      const totalWeight = o?.billableWeight || o?.weight || 0.9;

      let labelsList = [];
      if (o?.items && o.items.length > 0) {
        o.items.forEach(it => {
          const qty = Math.max(1, parseInt(it.quantity || 1));
          for (let q = 1; q <= qty; q++) {
            labelsList.push({
              name: it.name,
              category: it.category || 'General Merchandise',
              weight: it.weight || 0.5,
              dimensions: it.dimensions || `${it.length || 15} × ${it.width || 10} × ${it.height || 5} cm`,
              declaredValue: it.declaredValue || 500,
              unitIndex: q,
              totalInLine: qty
            });
          }
        });
      } else {
        labelsList.push({
          name: o?.itemDescription || 'Merchandise Goods',
          category: 'General Merchandise',
          weight: totalWeight,
          dimensions: '15 × 10 × 5 cm',
          declaredValue: o?.declaredValue || 1200,
          unitIndex: 1,
          totalInLine: 1
        });
      }

      const totalLabels = labelsList.length;

      let labelsHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Shipping Labels (${totalLabels}) - ${awb}</title>
  <style>
    @page { size: 100mm 150mm; margin: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 12px; background: #f1f5f9; color: #000; }
    .label-page { width: 100mm; max-width: 100%; margin: 0 auto 24px auto; background: #fff; padding: 12px; box-sizing: border-box; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border-radius: 4px; }
    .label-box { border: 2px solid #000; padding: 8px; font-size: 11px; line-height: 1.3; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 6px; }
    .brand { font-size: 18px; font-weight: 900; letter-spacing: 1px; color: #000; }
    .courier { font-size: 13px; font-weight: 800; text-align: right; }
    .pkg-badge { display: inline-block; background: #000; color: #fff; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 3px; margin-top: 2px; }
    .awb-sec { text-align: center; border-bottom: 2px solid #000; padding: 6px 0; }
    .awb-num { font-size: 17px; font-weight: 900; letter-spacing: 2px; font-family: monospace; }
    .barcode { height: 38px; display: flex; justify-content: center; align-items: flex-end; gap: 2px; margin: 4px 0; }
    .bar { background: #000; width: 2px; height: 34px; }
    .bar.w { width: 4px; }
    .bar.s { width: 1px; }
    .bar.g { width: 3px; }
    .routing { display: flex; justify-content: space-between; font-weight: 700; border-bottom: 1px solid #000; padding: 4px 0; font-size: 11px; }
    .section { border-bottom: 1px solid #000; padding: 5px 0; }
    .sec-title { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #444; }
    .bold { font-weight: 700; }
    .item-box { background: #f8fafc; border: 1px dashed #64748b; border-radius: 3px; padding: 4px 6px; margin-top: 4px; font-size: 10px; }
    .footer { font-size: 9px; margin-top: 6px; display: flex; justify-content: space-between; color: #555; }
    @media print {
      body { background: #fff; padding: 0; }
      .no-print { display: none !important; }
      .label-page { box-shadow: none; border-radius: 0; padding: 6px; margin: 0; page-break-after: always; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 16px; text-align: center;">
    <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-weight: 700; font-size: 14px; cursor: pointer; box-shadow: 0 4px 6px rgba(37,99,235,0.2);">
      🖨️ Print All ${totalLabels} Thermal Shipping Labels
    </button>
    <p style="font-size: 12px; color: #64748b; margin-top: 6px;">Total ${totalLabels} label(s) generated for this shipment.</p>
  </div>`;

      labelsList.forEach((lbl, idx) => {
        const labelNum = idx + 1;
        const payText = (mode === 'COD') ? `COD — Collect ₹${codAmt}` : 'PREPAID';
        labelsHtml += `
  <div class="label-page">
    <div class="label-box">
      <div class="header">
        <div>
          <div class="brand">HetEx Logistics</div>
          <span class="pkg-badge">PACKAGE ${labelNum} OF ${totalLabels}</span>
        </div>
        <div class="courier">
          <div>${courierName}</div>
          <div style="font-size: 10px; color: #555;">Standard Surface/Air</div>
        </div>
      </div>
      <div class="awb-sec">
        <div style="font-size: 9px; font-weight: 700; text-transform: uppercase;">TRACKING / AWB NUMBER</div>
        <div class="barcode">
          <div class="bar w"></div><div class="bar s"></div><div class="bar g"></div><div class="bar w"></div>
          <div class="bar"></div><div class="bar w"></div><div class="bar s"></div><div class="bar g"></div>
          <div class="bar w"></div><div class="bar"></div><div class="bar w"></div><div class="bar s"></div>
          <div class="bar g"></div><div class="bar w"></div><div class="bar"></div><div class="bar w"></div>
          <div class="bar s"></div><div class="bar g"></div><div class="bar w"></div><div class="bar"></div>
          <div class="bar w"></div><div class="bar s"></div><div class="bar g"></div><div class="bar w"></div>
        </div>
        <div class="awb-num">${awb}</div>
      </div>
      <div class="routing">
        <div>Order: <strong>${orderNum}</strong></div>
        <div>${payText}</div>
      </div>
      <div class="section">
        <div class="sec-title">SHIP TO (CONSIGNEE):</div>
        <div class="bold" style="font-size: 12px;">${buyer.contactName || 'Consignee'}</div>
        <div>${buyer.addressLine1 || ''}</div>
        <div class="bold">${buyer.city || ''}, ${buyer.state || 'India'} - ${buyer.pincode || ''}</div>
        <div>Phone: ${buyer.phone || ''}</div>
      </div>
      <div class="section">
        <div class="sec-title">RETURN TO (ORIGIN WAREHOUSE):</div>
        <div class="bold">${pickup.contactName || 'HetEx Warehouse'}</div>
        <div>${pickup.addressLine1 || ''}</div>
        <div>${pickup.city || ''}, ${pickup.state || 'India'} - ${pickup.pincode || ''}</div>
        <div>Phone: ${pickup.phone || ''}</div>
      </div>
      <div class="section" style="border-bottom: none;">
        <div class="sec-title">ITEM & PACKAGE SPECIFICATION:</div>
        <div class="item-box">
          <div style="display: flex; justify-content: space-between; font-weight: 700;">
            <span>📦 ${lbl.name}</span>
            <span style="color: #2563eb;">${lbl.category}</span>
          </div>
          <div style="margin-top: 3px; display: flex; justify-content: space-between; color: #475569;">
            <span>Unit Weight: ${lbl.weight} kg</span>
            <span>Dimensions: ${lbl.dimensions}</span>
            <span>Value: ₹${lbl.declaredValue}</span>
          </div>
        </div>
        <div style="margin-top: 4px; font-size: 9px; color: #64748b;">
          Total Consignment Weight: ${totalWeight} kg | Package: ${labelNum} of ${totalLabels}
        </div>
      </div>
      <div class="footer">
        <div>hetex.in · Tracking: track.hetex.in</div>
        <div>HetEx Logistics Cloud</div>
      </div>
    </div>
  </div>`;
      });

      labelsHtml += `</body></html>`;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(labelsHtml);
    }

    // Default fallback for any other API endpoint
    return sendJson(res, { success: true });
  }

  // ==========================================
  // ==========================================
  // STATIC FILE ROUTING
  // ==========================================
  // Enforce Clean URLs: redirect any *.html to clean path
  if (pathname.endsWith('.html')) {
    let clean = pathname.slice(0, -5);
    if (clean === '/index') clean = '/';
    if (clean === '/track-public') clean = '/track';
    const qs = parsedUrl.search || '';
    res.writeHead(301, { 'Location': clean + qs });
    return res.end();
  }

  let filePath = path.join(rootDir, pathname === '/' ? 'index.html' : pathname);

  // Clean URL mapping
  if (pathname === '/login') filePath = path.join(rootDir, 'login.html');
  if (pathname === '/register') filePath = path.join(rootDir, 'register.html');
  if (pathname === '/forgot-password') filePath = path.join(rootDir, 'forgot-password.html');
  if (pathname === '/admin') filePath = path.join(rootDir, 'admin.html');
  if (pathname === '/dashboard') filePath = path.join(rootDir, 'dashboard.html');
  if (pathname === '/track' || pathname === '/track-public') filePath = path.join(rootDir, 'track-public.html');
  if (['/orders', '/wallet', '/addresses', '/rates', '/serviceability', '/ndr', '/cod', '/tickets', '/settings'].some(p => pathname.startsWith(p))) {
    filePath = path.join(rootDir, 'dashboard.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html
      const fallbackPath = path.join(rootDir, 'index.html');
      fs.readFile(fallbackPath, (fallbackErr, content) => {
        if (fallbackErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
        }
      });
      return;
    }

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  });
});

let currentPort = PORT;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${currentPort} is busy, trying port ${++currentPort}...`);
    server.listen(currentPort);
  } else {
    console.error('Server error:', err);
  }
});

server.listen(currentPort, () => {
  console.log(`\n======================================================`);
  console.log(`  HetEx Courier - Local Live Testing Server Running!`);
  console.log(`======================================================`);
  console.log(`  Access the app in your browser at:`);
  console.log(`  >>> http://localhost:${currentPort}`);
  console.log(``);
  console.log(`  Pages (Clean URLs):`);
  console.log(`  - Landing Page:      http://localhost:${PORT}/`);
  console.log(`  - Login:             http://localhost:${PORT}/login`);
  console.log(`  - Seller Dashboard:  http://localhost:${PORT}/dashboard`);
  console.log(`  - Admin Panel:       http://localhost:${PORT}/admin`);
  console.log(`  - Tracking:          http://localhost:${PORT}/track`);
  console.log(``);
  console.log(`  Login Credentials for Testing:`);
  console.log(`  - Admin Login:  admin@hetex.in  /  Admin@123`);
  console.log(`  - Seller Login: seller@hetex.in /  Seller@123 (or any email)`);
  console.log(`======================================================\n`);
});
