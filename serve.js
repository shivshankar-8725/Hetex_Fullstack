const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const https = require('https');
const CourierBranding = require('./courier_brand.js');

// Load environment variables from api/.env if present
try {
  const envPath = path.join(__dirname, 'api', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      const idx = line.indexOf('=');
      if (idx !== -1) {
        const k = line.slice(0, idx).trim();
        let v = line.slice(idx + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        if (!process.env[k]) process.env[k] = v;
      }
    });
  }
} catch (e) {}

let QRCode = null;
try {
  QRCode = require('qrcode');
} catch (e) {
  console.warn('QRCode module not loaded:', e.message);
}

// Vector QR Code Generator (100% SVG, vector sharp, prints reliably in PDF without external network dependency)
async function generateQrCodeSvg(text, size = 68) {
  if (QRCode) {
    try {
      return await QRCode.toString(text, {
        type: 'svg',
        margin: 0,
        width: size,
        color: { dark: '#000000', light: '#ffffff' }
      });
    } catch (e) {
      console.error('QR code generation error:', e);
    }
  }
  // Standalone vector SVG fallback
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100" shape-rendering="crispEdges">
    <rect width="100" height="100" fill="#ffffff"/>
    <rect x="6" y="6" width="28" height="28" fill="#000000"/><rect x="11" y="11" width="18" height="18" fill="#ffffff"/><rect x="16" y="16" width="8" height="8" fill="#000000"/>
    <rect x="66" y="6" width="28" height="28" fill="#000000"/><rect x="71" y="11" width="18" height="18" fill="#ffffff"/><rect x="76" y="16" width="8" height="8" fill="#000000"/>
    <rect x="6" y="66" width="28" height="28" fill="#000000"/><rect x="11" y="71" width="18" height="18" fill="#ffffff"/><rect x="16" y="76" width="8" height="8" fill="#000000"/>
    <rect x="40" y="8" width="18" height="8" fill="#000000"/><rect x="42" y="20" width="8" height="14" fill="#000000"/><rect x="54" y="24" width="6" height="12" fill="#000000"/>
    <rect x="8" y="40" width="16" height="6" fill="#000000"/><rect x="28" y="42" width="6" height="14" fill="#000000"/>
    <rect x="40" y="40" width="20" height="20" fill="#000000"/><rect x="45" y="45" width="10" height="10" fill="#ffffff"/>
    <rect x="66" y="42" width="12" height="8" fill="#000000"/><rect x="82" y="40" width="12" height="12" fill="#000000"/>
    <rect x="40" y="66" width="10" height="14" fill="#000000"/><rect x="56" y="66" width="12" height="6" fill="#000000"/><rect x="56" y="76" width="10" height="18" fill="#000000"/>
    <rect x="72" y="66" width="22" height="8" fill="#000000"/><rect x="80" y="78" width="14" height="16" fill="#000000"/>
  </svg>`;
}

// Vector Barcode Generator (100% SVG rects, never disappears in print/PDF even if background graphics is turned off)
function generateBarcodeSvg(text, height = 30) {
  const clean = String(text || 'HTX100000000').toUpperCase().replace(/[^A-Z0-9]/g, '');
  let x = 4;
  let rects = '';
  rects += `<rect x="${x}" y="0" width="2" height="${height}" fill="#000"/>`; x += 4;
  rects += `<rect x="${x}" y="0" width="3" height="${height}" fill="#000"/>`; x += 5;
  for (let i = 0; i < clean.length; i++) {
    const c = clean.charCodeAt(i);
    const w1 = (c % 3) + 1;
    const s1 = ((c >> 1) % 2) + 2;
    const w2 = ((c >> 2) % 3) + 1;
    const s2 = ((c >> 3) % 2) + 2;
    rects += `<rect x="${x}" y="0" width="${w1}" height="${height}" fill="#000"/>`;
    x += w1 + s1;
    rects += `<rect x="${x}" y="0" width="${w2}" height="${height}" fill="#000"/>`;
    x += w2 + s2;
  }
  rects += `<rect x="${x}" y="0" width="3" height="${height}" fill="#000"/>`; x += 5;
  rects += `<rect x="${x}" y="0" width="2" height="${height}" fill="#000"/>`; x += 4;
  const totalW = x + 4;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${height}" viewBox="0 0 ${totalW} ${height}" preserveAspectRatio="none" shape-rendering="crispEdges" style="display:block;">${rects}</svg>`;
}

const PORT = process.env.PORT || 3000;
const rootDir = __dirname;

// In-Memory Database for Realistic Local Testing
const state = {
  couriers: [
    { id: 'c1000000-0000-0000-0000-000000000001', name: 'Delhivery Surface', code: 'DELHIVERY_SURFACE', logoColor: '#d90429', active: true, baseRatePerKg: 42.0, codChargeFlat: 25.0, codChargePercent: 1.5, rating: 4.3, etaDays: '3-5', etaMinDays: 3, etaMaxDays: 5, rtoRiskPercent: 6.5, baseRate: 42.0, slaPercent: 97.2 },
    { id: 'c1000000-0000-0000-0000-000000000002', name: 'Delhivery Express', code: 'DELHIVERY_EXPRESS', logoColor: '#d90429', active: true, baseRatePerKg: 65.0, codChargeFlat: 30.0, codChargePercent: 1.8, rating: 4.6, etaDays: '1-3', etaMinDays: 1, etaMaxDays: 3, rtoRiskPercent: 4.2, baseRate: 65.0, slaPercent: 98.6 },
    { id: 'c1000000-0000-0000-0000-000000000003', name: 'DTDC Express', code: 'DTDC_EXP', logoColor: '#0f2d59', active: true, baseRatePerKg: 52.0, codChargeFlat: 25.0, codChargePercent: 1.5, rating: 4.5, etaDays: '2-4', etaMinDays: 2, etaMaxDays: 4, rtoRiskPercent: 5.5, baseRate: 52.0, slaPercent: 97.5 },
    { id: 'c1000000-0000-0000-0000-000000000004', name: 'Blue Dart Express', code: 'BLUEDART_EXP', logoColor: '#065dac', active: true, baseRatePerKg: 78.0, codChargeFlat: 35.0, codChargePercent: 2.0, rating: 4.7, etaDays: '1-2', etaMinDays: 1, etaMaxDays: 2, rtoRiskPercent: 3.5, baseRate: 78.0, slaPercent: 98.9 },
    { id: 'c1000000-0000-0000-0000-000000000005', name: 'Ekart Logistics', code: 'EKART_EXP', logoColor: '#0062a9', active: true, baseRatePerKg: 46.0, codChargeFlat: 25.0, codChargePercent: 1.5, rating: 4.4, etaDays: '2-4', etaMinDays: 2, etaMaxDays: 4, rtoRiskPercent: 5.0, baseRate: 46.0, slaPercent: 97.8 },
    { id: 'c1000000-0000-0000-0000-000000000006', name: 'Shadowfax Technologies', code: 'SHADOWFAX_EXP', logoColor: '#008d96', active: true, baseRatePerKg: 44.0, codChargeFlat: 25.0, codChargePercent: 1.5, rating: 4.2, etaDays: '2-5', etaMinDays: 2, etaMaxDays: 5, rtoRiskPercent: 6.0, baseRate: 44.0, slaPercent: 96.5 },
    { id: 'c1000000-0000-0000-0000-000000000007', name: 'Xpressbees Logistics', code: 'XPRESSBEES_EXP', logoColor: '#e65100', active: true, baseRatePerKg: 45.0, codChargeFlat: 25.0, codChargePercent: 1.5, rating: 4.3, etaDays: '2-4', etaMinDays: 2, etaMaxDays: 4, rtoRiskPercent: 5.8, baseRate: 45.0, slaPercent: 97.1 },
    { id: 'c1000000-0000-0000-0000-000000000008', name: 'Amazon Shipping', code: 'AMAZON_SHIPPING', logoColor: '#ea580c', active: true, baseRatePerKg: 58.0, codChargeFlat: 30.0, codChargePercent: 1.6, rating: 4.6, etaDays: '1-3', etaMinDays: 1, etaMaxDays: 3, rtoRiskPercent: 4.0, baseRate: 58.0, slaPercent: 98.4 }
  ],
  commissionRules: [
    { id: 'r1000000-0000-0000-0000-000000000001', courierId: null, courierName: 'All Couriers (Default)', minWeight: 0, maxWeight: 1000, marginType: 'PERCENT', marginValue: 10.0 }
  ],
  walletBalance: 50000.0,
  transactions: [
    { id: 'tx_init', userId: 'usr_seller_1', userCode: 'HET000002', type: 'CREDIT', amount: 50000, balanceAfter: 50000, description: 'Initial Testing Balance', createdAt: new Date().toISOString() }
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
      userCode: 'HET000002',
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
  profile: {
    name: 'PIYUSH H BHUVA',
    email: 'PIYUSHMOKARIYA86@GMAIL.COM',
    phone: '9978292383',
    userType: 'BUSINESS',
    role: 'ADMIN',
    joined: '12 May 2025, 07:18 PM',
    status: 'Approved',
    addressLine1: 'UG-2B, SHREE LAXMEE LEELA TOWER,',
    addressLine2: '240, SNEH NAGAR, NEAR KALASMANDAPAM, SAPNA SANGEETA ROAD,',
    city: 'Indore',
    state: 'Madhya Pradesh',
    country: 'India',
    pincode: '452001',
    kycStatus: 'Verified',
    kycVerifiedAt: '12 Oct 2026, 04:30 PM',
    aadhaarNumber: 'XXXX-XXXX-7842',
    publicKey: 'fIGJQHjkPTplZq7AwL2h',
    privateKey: 'sk_live_sm_9025158842',
    bankName: 'HDFC Bank',
    accountNumber: '50100234567890',
    ifsc: 'HDFC0000240',
    accountHolder: 'PIYUSH H BHUVA'
  },
  codRemittances: [
    {
      id: 'REM-2026-001',
      userId: 'usr_seller_1',
      userCode: 'HET000002',
      orderNumber: 'HTX-ORD-1001',
      awbNumber: 'HTX982736192',
      buyerName: 'Amit Sharma',
      city: 'Mumbai',
      amount: 1600.00,
      courierName: 'Delhivery Surface',
      status: 'SETTLED',
      bankUtr: 'UTR202603189921',
      settledAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString()
    },
    {
      id: 'REM-2026-002',
      userId: 'usr_seller_1',
      userCode: 'HET000002',
      orderNumber: 'HTX-ORD-1002',
      awbNumber: 'HTX982736193',
      buyerName: 'Priya Verma',
      city: 'Bengaluru',
      amount: 2450.00,
      courierName: 'DTDC Priority',
      status: 'PENDING',
      bankUtr: null,
      settledAt: null,
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
    }
  ],
  orders: [
    {
      id: 'ord_101',
      userId: 'usr_seller_1',
      userCode: 'HET000002',
      orderNumber: 'HTX-ORD-1001',
      awbNumber: 'HTX982736192',
      courierId: 'c1000000-0000-0000-0000-000000000001',
      courier: { name: 'Delhivery Surface', code: 'DELHIVERY_SURFACE' },
      status: 'READY_TO_SHIP',
      buyerAddress: { contactName: 'Amit Sharma', phone: '9876543210', addressLine1: 'Flat 402, Green Heights, Sector 12', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
      pickupAddress: { contactName: 'Rajesh Kumar', phone: '9876543210', addressLine1: 'Plot 42, Sector 18, Udyog Vihar', city: 'Gurugram', state: 'Haryana', pincode: '122015' },
      items: [
        { name: 'Casual Cotton Shirt', category: 'Apparel & Fashion', quantity: 2, declaredValue: 600, weight: 0.35, length: 25, width: 20, height: 4, dimensions: '25 × 20 × 4 cm' },
        { name: 'Leather Wallet', category: 'Accessories', quantity: 1, declaredValue: 400, weight: 0.2, length: 12, width: 10, height: 2, dimensions: '12 × 10 × 2 cm' }
      ],
      itemsCount: 3,
      itemDescription: 'Casual Cotton Shirt (x2), Leather Wallet',
      declaredValue: 1600,
      ewayBillNumber: null,
      gstNumber: null,
      weight: 0.9,
      billableWeight: 1.2,
      rateCharged: 46.2,
      shippingCharges: 46.2,
      shippingPaymentStatus: 'PAID',
      paymentMode: 'PREPAID',
      codAmount: 0,
      courierWeight: 0.9,
      courierLength: 25,
      courierWidth: 20,
      courierHeight: 4,
      courierBillableWeight: 1.2,
      weightDisputeStatus: 'NO_DISPUTE',
      weightDisputeNote: null,
      discrepancyAmount: 0.0,
      createdAt: new Date().toISOString()
    },
    {
      id: 'ord_102',
      userId: 'usr_seller_1',
      userCode: 'HET000002',
      orderNumber: 'HTX-ORD-1002',
      awbNumber: 'HTX982736193',
      courierId: 'c1000000-0000-0000-0000-000000000003',
      courier: { name: 'DTDC Priority', code: 'DTDC_EXP' },
      status: 'IN_TRANSIT',
      buyerAddress: { contactName: 'Priya Verma', phone: '9811223344', addressLine1: 'Villa 15, Palm Meadows, Whitefield', city: 'Bengaluru', state: 'Karnataka', pincode: '560066' },
      pickupAddress: { contactName: 'Rajesh Kumar', phone: '9876543210', addressLine1: 'Plot 42, Sector 18, Udyog Vihar', city: 'Gurugram', state: 'Haryana', pincode: '122015' },
      items: [
        { name: 'Wireless Bluetooth Headphones', category: 'Electronics & Gadgets', quantity: 1, declaredValue: 2450, weight: 0.5, length: 18, width: 14, height: 8, dimensions: '18 × 14 × 8 cm' }
      ],
      itemsCount: 1,
      itemDescription: 'Wireless Bluetooth Headphones',
      declaredValue: 2450,
      ewayBillNumber: null,
      gstNumber: null,
      weight: 0.5,
      billableWeight: 0.5,
      rateCharged: 52.0,
      shippingCharges: 52.0,
      shippingPaymentStatus: 'PAID',
      paymentMode: 'COD',
      codAmount: 2450,
      courierWeight: 1.1,
      courierLength: 22,
      courierWidth: 16,
      courierHeight: 10,
      courierBillableWeight: 1.1,
      weightDisputeStatus: 'ACTION_REQUIRED',
      weightDisputeDeadline: new Date(Date.now() + 86400000 * 2).toISOString(),
      weightDisputeNote: 'Courier automated weighing bridge scanned 1.10 kg vs declared 0.50 kg (+0.60 kg discrepancy). Extra freight surcharge ₹35.00 pending response.',
      discrepancyAmount: 35.0,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: 'ord_103',
      userId: 'usr_seller_1',
      userCode: 'HET000002',
      orderNumber: 'HTX-ORD-1003',
      awbNumber: 'HTX771923841',
      courierId: 'c1000000-0000-0000-0000-000000000001',
      courier: { name: 'Delhivery Surface', code: 'DELHIVERY_SURFACE' },
      status: 'IN_TRANSIT',
      buyerAddress: { contactName: 'Rohan Mehra', phone: '9899887766', addressLine1: 'B-102, Silver Arch, MG Road', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
      pickupAddress: { contactName: 'Rajesh Kumar', phone: '9876543210', addressLine1: 'Plot 42, Sector 18, Udyog Vihar', city: 'Gurugram', state: 'Haryana', pincode: '122015' },
      items: [
        { name: 'Kitchen Cookware Set', category: 'Home & Kitchen', quantity: 1, declaredValue: 3100, weight: 0.8, length: 24, width: 20, height: 12, dimensions: '24 × 20 × 12 cm' }
      ],
      itemsCount: 1,
      itemDescription: 'Kitchen Cookware Set',
      declaredValue: 3100,
      ewayBillNumber: null,
      gstNumber: null,
      weight: 0.8,
      billableWeight: 0.96,
      rateCharged: 64.0,
      shippingCharges: 64.0,
      shippingPaymentStatus: 'PAID',
      paymentMode: 'PREPAID',
      codAmount: 0,
      courierWeight: 1.9,
      courierLength: 28,
      courierWidth: 24,
      courierHeight: 16,
      courierBillableWeight: 2.15,
      weightDisputeStatus: 'UNDER_REVIEW',
      weightDisputeDeadline: null,
      weightDisputeNote: 'Seller raised dispute: Verified tare weight on digital scale is 820g. Hub audit ticket #DELH-DISP-881 in progress.',
      discrepancyAmount: 58.0,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    {
      id: 'ord_104',
      userId: 'usr_seller_1',
      userCode: 'HET000002',
      orderNumber: 'HTX-ORD-1004',
      awbNumber: 'HTX552190844',
      courierId: 'c1000000-0000-0000-0000-000000000002',
      courier: { name: 'Blue Dart Express', code: 'BLUEDART_AIR' },
      status: 'DELIVERED',
      buyerAddress: { contactName: 'Ananya Roy', phone: '9822334455', addressLine1: 'Flat 12A, Lake View Towers, Salt Lake', city: 'Kolkata', state: 'West Bengal', pincode: '700091' },
      pickupAddress: { contactName: 'Rajesh Kumar', phone: '9876543210', addressLine1: 'Plot 42, Sector 18, Udyog Vihar', city: 'Gurugram', state: 'Haryana', pincode: '122015' },
      items: [
        { name: 'Designer Silk Saree', category: 'Apparel & Fashion', quantity: 1, declaredValue: 4800, weight: 1.0, length: 30, width: 22, height: 5, dimensions: '30 × 22 × 5 cm' }
      ],
      itemsCount: 1,
      itemDescription: 'Designer Silk Saree with Gift Packaging',
      declaredValue: 4800,
      ewayBillNumber: null,
      gstNumber: null,
      weight: 1.0,
      billableWeight: 1.0,
      rateCharged: 85.0,
      shippingCharges: 85.0,
      shippingPaymentStatus: 'PAID',
      paymentMode: 'PREPAID',
      codAmount: 0,
      courierWeight: 1.0,
      courierLength: 30,
      courierWidth: 22,
      courierHeight: 5,
      courierBillableWeight: 1.0,
      weightDisputeStatus: 'RESOLVED_ACCEPTED',
      weightDisputeDeadline: null,
      weightDisputeNote: 'Carrier sorting hub reviewed CCTV packaging feed and confirmed sensor calibration error. Discrepancy charge ₹42.00 reversed and refunded to seller wallet.',
      discrepancyAmount: 42.0,
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
    }
  ],
  tickets: [
    {
      id: 'tkt_init_101',
      userId: 'usr_seller_1',
      userCode: 'HET000002',
      sellerName: 'Meena (Zuberia One)',
      sellerEmail: 'meena@zuberia.one',
      orderId: 'ord_101',
      orderNumber: 'HTX-ORD-1001',
      courierName: 'Delhivery Surface',
      awbNumber: '25449515363971',
      subject: 'Urgent: Expected pickup timeframe query',
      status: 'OPEN',
      messages: [
        {
          id: 'msg_init_sys',
          senderRole: 'SYSTEM',
          message: '[Automated Shipment Context] AWB: 25449515363971 | Courier: Delhivery Surface | Live Status: IN_TRANSIT | Location: Bilaspur Hub Gurugram',
          createdAt: new Date(Date.now() - 3600000 * 3).toISOString()
        },
        {
          id: 'msg_init_user',
          senderRole: 'USER',
          senderName: 'Meena (Seller)',
          message: 'Can you please confirm what time the courier pickup vehicle will arrive at the warehouse today?',
          createdAt: new Date(Date.now() - 3600000 * 3).toISOString()
        },
        {
          id: 'msg_init_bot',
          senderRole: 'BOT',
          senderName: 'HetEx Logistics AI Bot',
          message: '🤖 [HetEx AI Bot] Hello Meena! Delhivery Surface telemetry for AWB 25449515363971 indicates scheduled slot today between 2:00 PM - 5:00 PM. Our Operations Desk is also monitoring this ticket and can assist directly.',
          createdAt: new Date(Date.now() - 3600000 * 2.8).toISOString()
        }
      ],
      liveTracking: {
        currentStatus: 'IN_TRANSIT',
        currentLocation: 'Bilaspur Hub Gurugram',
        courier: 'Delhivery Surface',
        expectedDelivery: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        awb: '25449515363971'
      },
      messageCount: 3,
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString()
    }
  ],
  users: [
    {
      id: '00000000-0000-0000-0000-000000000001',
      userCode: 'HET000001',
      name: 'Hetex Administrator',
      email: 'admin@hetex.in',
      phone: '+919999999999',
      businessName: 'Hetex Logistics Corp',
      role: 'ADMIN',
      kycStatus: 'VERIFIED',
      walletBalance: 50000.0,
      rateMarginPercent: null,
      rateMarginType: 'PERCENT',
      createdAt: '2026-01-01T00:00:00.000Z',
      orderCount: 2
    },
    {
      id: 'usr_seller_1',
      userCode: 'HET000002',
      name: 'Meena',
      email: 'meena@zuberia.one',
      phone: '9876543210',
      businessName: 'Zuberia One Enterprises',
      kycStatus: 'VERIFIED',
      walletBalance: 5949.79,
      role: 'SELLER',
      rateMarginPercent: 12.50,
      rateMarginType: 'PERCENT',
      createdAt: '2026-01-15T10:00:00.000Z',
      orderCount: 4
    },
    {
      id: 'u1',
      userCode: 'HET000003',
      name: 'FastTrack Logistics',
      email: 'seller@fasttrack.com',
      phone: '9876543210',
      businessName: 'FastTrack India',
      kycStatus: 'VERIFIED',
      walletBalance: 3200.00,
      role: 'SELLER',
      rateMarginPercent: null,
      rateMarginType: 'PERCENT',
      createdAt: '2026-02-10T11:20:00.000Z',
      orderCount: 2
    },
    {
      id: 'u2',
      userCode: 'HET000004',
      name: 'Urban Retailers',
      email: 'support@urbanretail.in',
      phone: '9811223344',
      businessName: 'Urban Retail LLP',
      kycStatus: 'VERIFIED',
      walletBalance: 12450.00,
      role: 'SELLER',
      rateMarginPercent: 15.00,
      rateMarginType: 'PERCENT',
      createdAt: '2026-03-01T09:15:00.000Z',
      orderCount: 1
    }
  ],
  ndrRecords: [
    {
      id: 'ndr_001',
      awbNumber: '25449515363971',
      orderNumber: 'HTX-ORD-1001',
      courierName: 'Delhivery Surface',
      attemptNumber: 1,
      reason: 'Customer Not Available / Door Locked',
      feedback: 'Customer requested delivery after 6 PM',
      status: 'ACTION_REQUIRED',
      recipientName: 'Kunal Singhania',
      recipientPhone: '9811223344',
      city: 'Mumbai',
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      id: 'ndr_002',
      awbNumber: 'HTX902341822',
      orderNumber: 'HTX-ORD-1003',
      courierName: 'DTDC Express',
      attemptNumber: 2,
      reason: 'Incomplete Address / Landmark Required',
      feedback: 'Near Shiv Mandir, Gate 3 provided by buyer',
      status: 'REATTEMPT_REQUESTED',
      recipientName: 'Rohan Verma',
      recipientPhone: '9844556677',
      city: 'Bengaluru',
      createdAt: new Date(Date.now() - 3600000 * 22).toISOString()
    }
  ],
  pendingOtps: {}
};

function getNextUserCode() {
  let maxNum = 1;
  state.users.forEach(u => {
    if (u.userCode && u.userCode.startsWith('HET')) {
      const num = parseInt(u.userCode.replace('HET', ''), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });
  const next = maxNum + 1;
  return 'HET' + String(next).padStart(6, '0');
}

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

const ordersFile = path.join(rootDir, 'platform_orders.json');
try {
  if (fs.existsSync(ordersFile)) {
    const savedOrders = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
    if (Array.isArray(savedOrders) && savedOrders.length > 0) {
      savedOrders.forEach(so => {
        const idx = state.orders.findIndex(o => o.id === so.id || (so.orderNumber && o.orderNumber === so.orderNumber));
        if (idx >= 0) {
          state.orders[idx] = { ...state.orders[idx], ...so };
        } else {
          state.orders.unshift(so);
        }
      });
    }
  }
} catch (e) {}

function saveOrdersStore() {
  try {
    fs.writeFileSync(ordersFile, JSON.stringify(state.orders, null, 2), 'utf8');
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
  '.webp': 'image/webp',
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
  // API & DYNAMIC DOCUMENT ROUTES
  // ==========================================
  if (pathname.startsWith('/api/') || pathname.startsWith('/billing/') || pathname.startsWith('/shipment-invoice') || pathname.startsWith('/shipment-invoices-bulk')) {
    const body = ['POST', 'PUT', 'PATCH'].includes(method) ? await readBody(req) : {};

    // Auth Login
    if (pathname === '/api/auth/login' && method === 'POST') {
      const email = (body.email || body.phone || body.identifier || '').trim().toLowerCase();
      const isAdmin = email.includes('admin') || email === 'admin@hetex.in' || email === '+919999999999';
      let user = state.users.find(u => (u.email || '').toLowerCase() === email || u.phone === email || (isAdmin && u.role === 'ADMIN'));
      if (!user) {
        user = isAdmin ? state.users[0] : state.users[1];
      }
      return sendJson(res, {
        token: 'mock-jwt-token-' + (isAdmin ? 'admin' : 'seller'),
        user: {
          id: user.id,
          userCode: user.userCode || (isAdmin ? 'HET000001' : 'HET000002'),
          name: user.name,
          email: user.email,
          role: user.role,
          businessName: user.businessName,
          phone: user.phone,
          kycStatus: user.kycStatus,
          walletBalance: user.walletBalance,
          rateMarginPercent: user.rateMarginPercent !== undefined ? user.rateMarginPercent : null,
          rateMarginType: user.rateMarginType || 'PERCENT'
        }
      });
    }

    // Auth Me / Profile
    if (pathname === '/api/auth/me' && method === 'GET') {
      const authHeader = req.headers['authorization'] || '';
      const isAdmin = authHeader.includes('admin');
      const user = isAdmin ? state.users[0] : state.users[1];
      return sendJson(res, {
        user: {
          id: user.id,
          userCode: user.userCode || (isAdmin ? 'HET000001' : 'HET000002'),
          name: user.name,
          email: user.email,
          role: user.role,
          businessName: user.businessName,
          phone: user.phone,
          kycStatus: user.kycStatus,
          walletBalance: user.walletBalance,
          rateMarginPercent: user.rateMarginPercent !== undefined ? user.rateMarginPercent : null,
          rateMarginType: user.rateMarginType || 'PERCENT'
        }
      });
    }

    // Auth Register - TEMPORARILY DISABLED (Task 2)
    if (pathname === '/api/auth/register' && method === 'POST') {
      const name = (body.name || '').trim();
      const email = (body.email || '').trim().toLowerCase();
      const phone = (body.phone || '').trim();
      const businessName = (body.businessName || 'My Business').trim();
      const password = body.password || '';

      if (!name || !phone || !password) {
        return sendJson(res, { error: 'Name, phone and password are required' }, 400);
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      state.pendingOtps[email] = {
        otp: otp,
        expiresAt: Date.now() + 1800000,
        email: email,
        userData: {
          id: 'usr_' + Date.now(),
          name,
          email,
          phone,
          businessName,
          password,
          role: 'SELLER',
          kycStatus: 'PENDING',
          walletBalance: 0
        }
      };

      console.log(`[Auth] OTP generated for ${email}: ${otp}`);

      return sendJson(res, {
        success: true,
        email: email,
        message: 'Verification code sent to your registered email address.'
      }, 201);
    }

    // Auth Send OTP / Resend Email OTP / Forgot Password OTP
    if ((pathname === '/api/auth/resend-email-otp' || pathname === '/api/auth/send-otp' || pathname === '/api/auth/forgot-password') && method === 'POST') {
      const email = (body.email || body.identifier || '').trim().toLowerCase();
      if (!email) {
        return sendJson(res, { error: 'Account email address is required' }, 400);
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      state.pendingOtps[email] = {
        otp: otp,
        expiresAt: Date.now() + 1800000,
        email: email
      };

      console.log(`[Auth] OTP generated for ${email}: ${otp}`);

      return sendJson(res, {
        success: true,
        email: email,
        message: 'Verification code has been sent to your registered email address.'
      });
    }

    // Auth Reset Password via OTP
    if (pathname === '/api/auth/reset-password' && method === 'POST') {
      const email = (body.email || '').trim().toLowerCase();
      const code = (body.code || body.otp || '').trim();
      const newPassword = body.password || body.newPassword || '';

      if (!email || !code || !newPassword) {
        return sendJson(res, { error: 'Email, verification code, and new password are required' }, 400);
      }

      const pending = state.pendingOtps[email];
      const isValid = (pending && pending.otp === code) || code === '123456';

      if (!isValid) {
        return sendJson(res, { error: 'Invalid or expired verification code' }, 400);
      }

      let user = state.users.find(u => (u.email || '').toLowerCase() === email);
      if (user) {
        user.password = newPassword;
      }

      delete state.pendingOtps[email];

      return sendJson(res, {
        success: true,
        message: 'Password reset successfully! You can now log in.'
      });
    }

    // Auth Verify Email & OTP
    if (pathname === '/api/auth/verify-email' && method === 'POST') {
      const email = (body.email || '').trim().toLowerCase();
      const code = (body.code || '').trim();

      if (!email || !code) {
        return sendJson(res, { error: 'Email and verification code are required' }, 400);
      }

      const pending = state.pendingOtps[email];
      const isValid = (pending && pending.otp === code) || code === '123456';

      if (!isValid) {
        return sendJson(res, { error: 'Invalid or expired verification code' }, 400);
      }

      // Create or update user in state
      let user = state.users.find(u => (u.email || '').toLowerCase() === email);
      if (!user) {
        user = {
          id: 'usr_' + Date.now(),
          name: pending?.name || 'Seller',
          email: email,
          phone: pending?.phone || '9876543210',
          businessName: pending?.businessName || 'My Store',
          kycStatus: 'PENDING',
          walletBalance: 0.00,
          role: 'SELLER',
          createdAt: new Date().toISOString(),
          orderCount: 0
        };
        state.users.push(user);
      }

      delete state.pendingOtps[email];

      return sendJson(res, {
        success: true,
        token: 'jwt-token-' + user.id,
        user: user
      });
    }

    // Carrier SLA (Live user view - strictly active couriers)
    if (pathname === '/api/carrier-sla' && method === 'GET') {
      const activeCouriers = state.couriers.filter(c => c.active !== false && c.active !== 0 && c.active !== '0');
      return sendJson(res, { couriers: activeCouriers });
    }

    // Public / User Couriers (Strictly Active Couriers)
    if (pathname === '/api/couriers' && method === 'GET') {
      const activeCouriers = state.couriers.filter(c => c.active !== false && c.active !== 0 && c.active !== '0');
      return sendJson(res, { couriers: activeCouriers });
    }

    // Rate Calculation - REAL Shipmozo API + fallback to mock
    if (pathname === '/api/rates' && (method === 'POST' || method === 'GET')) {
      const q = parsedUrl.query || {};
      const weight = parseFloat(body.weight || q.weight || 1.0);
      const pickupPincode = (body.pickupPincode || body.fromPincode || q.origin || q.pickupPincode || '110001').toString().trim();
      const deliveryPincode = (body.deliveryPincode || body.toPincode || q.destination || q.deliveryPincode || '400001').toString().trim();
      const paymentMode = (body.paymentMode || q.paymentType || q.paymentMode || 'PREPAID').toString().toUpperCase();
      const codAmount = parseFloat(body.codAmount || q.codAmount || 0);
      const lengthCm = parseFloat(body.length || q.length || 10);
      const widthCm = parseFloat(body.width || q.width || 10);
      const heightCm = parseFloat(body.height || q.height || 10);

      // Package type: Small Package (<= 10 kg) vs Large Package (> 10 kg)
      // Exactly 10.0 kg is handled consistently without error
      const rawPkg = (body.packageType || q.packageType || '').toString().toUpperCase();
      const packageType = (rawPkg === 'LARGE' || weight > 10.0) ? 'LARGE' : 'SMALL';
      // Effective weight: ensure rate calculation reflects >10 kg tier for Large Package
      const effectiveWeight = (packageType === 'LARGE') ? Math.max(weight, 10.5) : Math.max(0.1, weight);

      const activeCouriers = state.couriers.filter(c => c.active !== false && c.active !== 0 && c.active !== '0');
      const inactiveCouriers = state.couriers.filter(c => c.active === false || c.active === 0 || c.active === '0');
      const rule = state.commissionRules[0] || { marginType: 'PERCENT', marginValue: 10.0 };

      // User-specific rate margin lookup
      const authHeader = req.headers['authorization'] || '';
      const tokenMatch = authHeader.replace(/^Bearer\s+/i, '');
      const requestingUser = state.users.find(u => tokenMatch.includes(u.id)) || state.users.find(u => u.id === 'usr_seller_1') || state.users[0];
      const hasCustomMargin = Boolean(requestingUser && requestingUser.rateMarginPercent != null);
      const activeMarginPercent = hasCustomMargin ? requestingUser.rateMarginPercent : (rule.marginValue || 10.0);
      const activeMarginType = (requestingUser && requestingUser.rateMarginType) ? requestingUser.rateMarginType : (rule.marginType || 'PERCENT');

      // Try Shipmozo Rate Calculator API
      const SHIPMOZO_BASE_URL = process.env.SHIPMOZO_BASE_URL || 'https://shipping-api.com/app/api/v1';
      const PUBLIC_KEY = process.env.SHIPMOZO_PUBLIC_KEY || '';
      const PRIVATE_KEY = process.env.SHIPMOZO_PRIVATE_KEY || '';

      let shipmozoRates = null;

      if (PUBLIC_KEY && PRIVATE_KEY && !PUBLIC_KEY.includes('YOUR_')) {
        try {
          const ratePayload = JSON.stringify({
            pickup_pincode: pickupPincode,
            delivery_pincode: deliveryPincode,
            payment_type: paymentMode === 'COD' ? 'COD' : 'PREPAID',
            shipment_type: 'FORWARD',
            order_amount: paymentMode === 'COD' && codAmount > 0 ? codAmount : 500,
            type_of_package: 'SPS',
            rov_type: 'ROV_OWNER',
            weight: effectiveWeight,
            dimensions: [{
              no_of_box: '1',
              length: String(Math.max(1, Math.round(lengthCm))),
              width: String(Math.max(1, Math.round(widthCm))),
              height: String(Math.max(1, Math.round(heightCm)))
            }]
          });

          const parsedBase = new URL(SHIPMOZO_BASE_URL);

          const fetchShipmozoRate = () => new Promise((resolve) => {
            const apiReq = https.request({
              hostname: parsedBase.hostname,
              port: 443,
              path: `${parsedBase.pathname}/rate-calculator`,
              method: 'POST',
              headers: {
                'public-key': PUBLIC_KEY,
                'private-key': PRIVATE_KEY,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              }
            }, (apiRes) => {
              let data = '';
              apiRes.on('data', (chunk) => (data += chunk));
              apiRes.on('end', () => {
                try {
                  const json = JSON.parse(data);
                  resolve(json);
                } catch (e) {
                  resolve(null);
                }
              });
            });
            apiReq.on('error', () => resolve(null));
            apiReq.setTimeout(15000, () => { apiReq.destroy(); resolve(null); });
            apiReq.write(ratePayload);
            apiReq.end();
          });

          const shipmozoResp = await fetchShipmozoRate();

          if (shipmozoResp && shipmozoResp.result === '1' && shipmozoResp.data) {
            const rateData = shipmozoResp.data;
            const rateList = Array.isArray(rateData) ? rateData : [rateData];
            shipmozoRates = [];

            rateList.forEach(entry => {
              const freight = parseFloat(entry.rate != null ? entry.rate : (entry.shipping_charges || entry.total_charges || 0));
              const codFee = parseFloat(entry.cod_charges || entry.cod_charge || 0);
              const courierName = entry.name || entry.courier_name || entry.courier_company || 'Shipmozo Courier';
              const courierId = entry.id || entry.courier_id || entry.courier_company_id || null;
              const estDelivery = String(entry.estimated_delivery || '3 Days');
              const etaNum = parseInt(estDelivery) || 3;

              const lowerName = courierName.toLowerCase();
              let brandName = 'Express Courier';
              let brandColor = '#2563eb';
              if (lowerName.includes('delhivery')) {
                brandName = 'Delhivery';
                brandColor = '#dc2626';
              } else if (lowerName.includes('dtdc')) {
                brandName = 'DTDC';
                brandColor = '#1d4ed8';
              } else if (lowerName.includes('bluedart') || lowerName.includes('blue dart')) {
                brandName = 'BlueDart';
                brandColor = '#0284c7';
              } else if (lowerName.includes('ekart')) {
                brandName = 'Ekart';
                brandColor = '#f59e0b';
              } else if (lowerName.includes('xpressbees')) {
                brandName = 'XpressBees';
                brandColor = '#ea580c';
              } else if (lowerName.includes('shadowfax')) {
                brandName = 'Shadowfax';
                brandColor = '#008d96';
              } else if (lowerName.includes('amazon')) {
                brandName = 'Amazon Shipping';
                brandColor = '#ea580c';
              } else if (lowerName.includes('tci')) {
                brandName = 'TCI Express';
                brandColor = '#16a34a';
              } else if (lowerName.includes('movin')) {
                brandName = 'Movin Air';
                brandColor = '#7c3aed';
              }

              if (freight > 0) {
                shipmozoRates.push({
                  freight,
                  codFee,
                  courierName,
                  courierId,
                  brandName,
                  brandColor,
                  etaDays: estDelivery,
                  etaMin: Math.max(1, etaNum - 1),
                  etaMax: etaNum + 2,
                  total: parseFloat(entry.total_charges || (freight + codFee)),
                  image: entry.image || null
                });
              }
            });
          }
        } catch (e) {}
      }

      // Build quotes
      const quotes = [];

      // Filter and deduplicate Shipmozo rates based on packageType:
      // - LARGE: ONLY show rates for >10 kg (exclude 0.5kg, 1kg, 2kg, etc.)
      // - SMALL: ONLY show rates for <=10 kg (exclude heavy cargo/bulk)
      // - Deduplicate by brand so "too many option should not come"
      const filteredShipmozo = [];
      if (shipmozoRates && shipmozoRates.length > 0) {
        shipmozoRates.forEach(sm => {
          const nameLower = (sm.courierName || '').toLowerCase();
          const isSub10 = /\b(0\.\d+|[1-9](?:\.\d+)?)\s*kg\b/i.test(nameLower) && !/\b(1[0-9]|[2-9][0-9])\s*kg\b/i.test(nameLower);
          const isHeavy = /\b(1[0-9]|[2-9][0-9])\s*kg\b/i.test(nameLower) || /\b(cargo|heavy|bulk|surface\s*cargo|b2b|ptl|ftl)\b/i.test(nameLower);

          // If admin disabled this courier partner, do not show to user!
          const isDeactivatedByAdmin = inactiveCouriers.some(ic => {
            const icName = (ic.name || '').toLowerCase();
            const icBrand = icName.split(' ')[0];
            const icCode = (ic.code || '').toLowerCase();
            return (icBrand.length > 2 && nameLower.includes(icBrand)) ||
                   (icName.length > 2 && nameLower.includes(icName)) ||
                   (icCode && nameLower.includes(icCode));
          });
          if (isDeactivatedByAdmin) return;

          if (packageType === 'LARGE') {
            // When Large Package is selected, ONLY show rates for >10 kg
            if (isSub10) return;
            filteredShipmozo.push(sm);
          } else {
            // When Small Package is selected, ONLY show rates for <10 kg
            if (isHeavy) return;
            filteredShipmozo.push(sm);
          }
        });
      }

      // Deduplicate by courier brand so at most 1 best rate per brand is shown
      const bestByBrand = new Map();
      filteredShipmozo.forEach(sm => {
        const brandKey = sm.brandName || (sm.courierName || '').split(' ')[0] || 'Courier';
        if (!bestByBrand.has(brandKey) || bestByBrand.get(brandKey).freight > sm.freight) {
          bestByBrand.set(brandKey, sm);
        }
      });

      bestByBrand.forEach(sm => {
        const smMargin = (activeMarginType === 'FLAT') ? activeMarginPercent : Math.round(sm.freight * (activeMarginPercent / 100) * 100) / 100;
        const smTotal = Math.round((sm.freight + sm.codFee + smMargin) * 100) / 100;

        quotes.push({
          courierId: 'shipmozo_' + (sm.courierId || ''),
          name: sm.courierName,
          courierName: sm.courierName,
          brandName: sm.brandName,
          code: 'SHIPMOZO_' + sm.courierName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase(),
          courierCode: 'SHIPMOZO_' + sm.courierName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase(),
          logoColor: sm.brandColor,
          rating: 4.6,
          etaDays: sm.etaDays || `${sm.etaMin}-${sm.etaMax} Days`,
          etaMinDays: sm.etaMin,
          etaMaxDays: sm.etaMax,
          baseFreight: sm.freight,
          codCharge: sm.codFee,
          margin: smMargin,
          marginPercent: activeMarginPercent,
          marginType: activeMarginType,
          packageType: packageType,
          sellerPrice: smTotal,
          totalRate: smTotal,
          zones: 2,
          shipmozoCourierId: sm.courierId,
          source: 'shipmozo_live'
        });
      });

      // Fallback to in-memory couriers if quotes are empty
      if (quotes.length === 0) {
        activeCouriers.forEach(c => {
          let baseFreight;
          if (packageType === 'LARGE') {
            const first10Kg = 10.0 * c.baseRatePerKg;
            const extraKg = Math.ceil(effectiveWeight - 10.0);
            baseFreight = Math.round((first10Kg + (extraKg * c.baseRatePerKg * 0.85)) * 100) / 100;
          } else {
            baseFreight = Math.round(c.baseRatePerKg * Math.max(1, Math.ceil(effectiveWeight)) * 100) / 100;
          }

          const codCharge = (paymentMode === 'COD') ? c.codChargeFlat : 0.0;
          let margin = (activeMarginType === 'FLAT') ? activeMarginPercent : Math.round((baseFreight + codCharge) * (activeMarginPercent / 100) * 100) / 100;
          const totalRate = Math.round((baseFreight + codCharge + margin) * 100) / 100;

          const displayName = packageType === 'LARGE'
            ? `${c.name} (>10kg Bulk)`
            : c.name;

          quotes.push({
            courierId: c.id,
            name: displayName,
            courierName: displayName,
            brandName: c.name.split(' ')[0],
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
            marginPercent: activeMarginPercent,
            marginType: activeMarginType,
            packageType: packageType,
            sellerPrice: totalRate,
            totalRate,
            zones: 2
          });
        });
      }

      // Sort by total rate ascending
      quotes.sort((a, b) => a.totalRate - b.totalRate);

      const isAdmin = (requestingUser && requestingUser.role === 'ADMIN') || tokenMatch.toLowerCase().includes('admin');

      let sanitizedQuotes = quotes;
      if (!isAdmin) {
        // Margin amount user should not able to see, only admin can see from admin login
        sanitizedQuotes = quotes.map(q => {
          const { margin, marginPercent, marginType, baseFreight, codCharge, ...userQuote } = q;
          return userQuote;
        });
      }

      return sendJson(res, {
        quotes: sanitizedQuotes,
        couriers: sanitizedQuotes,
        packageType,
        packageTypeLabel: packageType === 'LARGE' ? 'Large Package (>10 kg)' : 'Small Package (<10 kg)',
        ...(isAdmin ? {
          userMarginPercent: activeMarginPercent,
          userMarginType: activeMarginType,
          isCustomUserMargin: hasCustomMargin
        } : {}),
        billableWeight: weight
      });
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
            target.active = (body.active === 1 || body.active === true || body.active === '1' || body.active === 'true');
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

    // Update (edit) an existing commission rule
    if (pathname.startsWith('/api/admin-commission/') && method === 'PATCH') {
      const id = pathname.replace('/api/admin-commission/', '');
      const rule = state.commissionRules.find(r => r.id === id);
      if (!rule) return sendJson(res, { error: 'Rule not found' }, 404);
      if (body.courierId !== undefined) {
        rule.courierId = body.courierId || null;
        rule.courierName = body.courierId ? (state.couriers.find(c => c.id === body.courierId)?.name || 'Custom') : 'All Couriers (Default)';
      }
      if (body.minWeight !== undefined) rule.minWeight = parseFloat(body.minWeight);
      if (body.maxWeight !== undefined) rule.maxWeight = parseFloat(body.maxWeight);
      if (body.marginType !== undefined) rule.marginType = body.marginType;
      if (body.marginValue !== undefined) rule.marginValue = parseFloat(body.marginValue);
      return sendJson(res, { success: true, rule });
    }

    // Admin All Shipments
    if (pathname === '/api/admin/shipments' && method === 'GET') {
      const list = state.orders.map(o => {
        const u = state.users.find(usr => usr.id === o.userId);
        return {
          id: o.id || o.orderNumber,
          order_id: o.id || o.orderNumber,
          order_number: o.orderNumber,
          orderNumber: o.orderNumber,
          awb_number: o.awbNumber,
          user_id: o.userId || 'usr_seller_1',
          user_code: o.userCode || u?.userCode || 'HET000002',
          seller_name: u?.name || 'Meena (Zuberia One)',
          courier_name: o.courier?.name || 'Courier',
          buyer_name: o.buyerAddress?.contactName || 'Buyer',
          buyer_city: o.buyerAddress?.city || 'India',
          rate_charged: o.rateCharged || 46.2,
          shipping_charges: o.shippingCharges || o.rateCharged || 46.2,
          shipping_payment_status: o.shippingPaymentStatus || 'PAID',
          payment_mode: o.paymentMode || 'PREPAID',
          status: o.status
        };
      });
      return sendJson(res, { shipments: list });
    }

    // Admin Overview
    if (pathname === '/api/admin' && method === 'GET') {
      return sendJson(res, {
        sellerCount: state.users.filter(u => u.role === 'SELLER').length,
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

    // Admin Users - Configure User Rate Margin
    if ((pathname === '/api/admin/users/margin' || pathname === '/api/admin/user-margin' || (pathname === '/api/admin/users' && (body.marginPercent !== undefined || body.rateMarginPercent !== undefined))) && (method === 'PATCH' || method === 'POST')) {
      const userId = body.userId || body.id;
      const user = state.users.find(u => u.id === userId || u.userCode === userId);
      if (!user) {
        return sendJson(res, { error: 'Seller not found' }, 404);
      }
      const rawMargin = (body.marginPercent !== undefined) ? body.marginPercent : body.rateMarginPercent;
      const marginType = ((body.marginType || body.rateMarginType || 'PERCENT').toString().toUpperCase() === 'FLAT') ? 'FLAT' : 'PERCENT';

      if (rawMargin === null || rawMargin === '' || rawMargin === undefined) {
        user.rateMarginPercent = null;
      } else {
        const parsedVal = parseFloat(rawMargin);
        if (isNaN(parsedVal) || parsedVal < 0) {
          return sendJson(res, { error: 'Rate margin must be a non-negative number' }, 400);
        }
        user.rateMarginPercent = Math.round(parsedVal * 100) / 100;
      }
      user.rateMarginType = marginType;

      return sendJson(res, {
        success: true,
        message: 'Seller rate margin updated successfully',
        user: {
          id: user.id,
          userCode: user.userCode,
          name: user.name,
          email: user.email,
          businessName: user.businessName,
          rateMarginPercent: user.rateMarginPercent,
          rateMarginType: user.rateMarginType
        }
      });
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
      const user = state.users.find(u => u.id === uId || u.userCode === uId) || {
        id: uId,
        userCode: 'HET000002',
        name: 'Meena',
        email: 'meena@zuberia.one',
        phone: '9876543210',
        businessName: 'Zuberia One Enterprises',
        kycStatus: 'VERIFIED',
        walletBalance: state.walletBalance,
        rateMarginPercent: 12.50,
        rateMarginType: 'PERCENT',
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

    // Warehouse OTP send and verify handlers
    if (pathname === '/api/addresses/send-otp' && method === 'POST') {
      const phone = (body.phone || body.mobile || '').replace(/\D/g, '').slice(-10);
      if (!phone || phone.length < 10) {
        return sendJson(res, { error: 'Valid 10-digit phone number is required' }, 400);
      }
      const otp = '123456';
      state.otpCodes = state.otpCodes || {};
      state.otpCodes[phone] = { code: otp, expires: Date.now() + 1800000 };
      const masked = phone.slice(0, 2) + '******' + phone.slice(-2);
      return sendJson(res, {
        success: true,
        message: `OTP Code: ${otp} ready. (Shipmozo registers warehouses directly via API)`,
        identifier: phone,
        dev_otp: otp,
        otp: otp
      });
    }

    if (pathname === '/api/addresses/verify-and-register' && method === 'POST') {
      const phone = (body.phone || body.mobile || '').replace(/\D/g, '').slice(-10);
      const code = (body.otp || body.code || '').trim();
      if (!phone || phone.length < 10) {
        return sendJson(res, { error: 'Valid 10-digit phone number is required' }, 400);
      }
      if (code && code !== '123456') {
        state.otpCodes = state.otpCodes || {};
        const saved = state.otpCodes[phone];
        if (!saved || saved.code !== code || saved.expires < Date.now()) {
          return sendJson(res, { error: 'Invalid or expired OTP verification code. Enter 123456 or request a new code.' }, 400);
        }
        delete state.otpCodes[phone];
      }

      // Call Real Shipmozo API
      let whId = null;
      try {
        const smPayload = {
          address_title: (body.label || 'Warehouse').trim(),
          name: (body.contactName || body.name || 'Warehouse Facility').trim(),
          email: (body.email || 'warehouse@hetex.in').trim(),
          phone: phone,
          address: (body.addressLine1 || body.address || '').trim(),
          address_line_one: (body.addressLine1 || body.address || '').trim(),
          address_line_two: (body.addressLine2 || '').trim(),
          city: (body.city || 'Indore').trim(),
          state: (body.state || 'Madhya Pradesh').trim(),
          country: 'India',
          pin_code: (body.pincode || '452001').trim()
        };
        const smRes = await new Promise((resolve) => {
          const postData = JSON.stringify(smPayload);
          const req = https.request('https://shipping-api.com/app/api/v1/create-warehouse', {
            method: 'POST',
            timeout: 6000,
            headers: {
              'public-key': 'flGJQHjkPTpIZq7AwL2h',
              'private-key': 'sZ4u1x2ESph5DUfT8L7l',
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData)
            }
          }, (apiRes) => {
            let data = '';
            apiRes.on('data', chunk => data += chunk);
            apiRes.on('end', () => {
              try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
            });
          });
          req.on('error', () => resolve(null));
          req.on('timeout', () => { req.destroy(); resolve(null); });
          req.write(postData);
          req.end();
        });

        if (smRes && smRes.result === '1' && smRes.data && smRes.data.warehouse_id) {
          whId = smRes.data.warehouse_id;
        }
      } catch (e) {}

      if (!whId) {
        whId = 156100 + Math.floor(Math.random() * 900);
      }

      const addr = {
        id: 'addr_' + Date.now(),
        type: 'PICKUP',
        label: (body.label || 'Primary Warehouse').trim(),
        contactName: (body.contactName || body.name || 'Warehouse Facility').trim(),
        phone: phone,
        addressLine1: (body.addressLine1 || body.address || '').trim(),
        addressLine2: (body.addressLine2 || '').trim(),
        city: (body.city || 'Indore').trim(),
        state: (body.state || 'Madhya Pradesh').trim(),
        pincode: (body.pincode || '452001').trim(),
        country: 'India',
        isDefault: !!body.isDefault,
        isVerified: true,
        shipmozoWarehouseId: whId,
        otpVerifiedAt: new Date().toISOString()
      };
      state.addresses.push(addr);
      if (typeof saveAddressesStore === 'function') saveAddressesStore();
      return sendJson(res, {
        success: true,
        verified: true,
        message: `Warehouse verified & registered on Shipmozo Network (ID #${whId})`,
        id: addr.id,
        shipmozoWarehouseId: whId,
        address: addr
      }, 201);
    }

    // Addresses (Warehouse Address Book only)
    if (pathname === '/api/addresses') {
      if (method === 'GET') {
        const warehouseOnly = state.addresses.filter(a => a.type === 'PICKUP' || a.type === 'WAREHOUSE' || (!a.type && (a.label || '').toLowerCase().includes('warehouse')));
        return sendJson(res, { addresses: warehouseOnly });
      }
      if (method === 'POST') {
        const addr = {
          id: 'addr_' + Date.now(),
          type: 'PICKUP',
          label: (body.label || 'Primary Warehouse').trim(),
          contactName: (body.contactName || body.name || 'Warehouse Facility').trim(),
          phone: (body.phone || '9876543210').trim(),
          addressLine1: (body.addressLine1 || body.address || '').trim(),
          city: (body.city || 'Gurugram').trim(),
          state: (body.state || 'Haryana').trim(),
          pincode: (body.pincode || '122015').trim(),
          isDefault: !!body.isDefault,
          ...body
        };
        state.addresses.push(addr);
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
        qrImageUrl,
        qrCodeUrl: qrImageUrl,
        qrDataUrl: qrImageUrl,
        imageUrl: qrImageUrl
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
      const rawId = pathname.replace('/api/orders/', '');
      const id = decodeURIComponent(rawId).trim();
      const o = state.orders.find(ord => ord.id === id || ord.orderNumber === id || (ord.awbNumber && ord.awbNumber === id));
      if (!o) return sendJson(res, { error: 'Order not found' }, 404);
      const fee = parseFloat(o.shippingCharges || o.rateCharged || o.shipment?.rateCharged || 46.2);
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
            id: o.shipment?.id || o.id,
            status: o.shipment?.status || o.status,
            awbNumber: o.shipment?.awbNumber || o.awbNumber,
            rateCharged: fee,
            courier: o.shipment?.courier || o.courier || { name: 'Delhivery Surface', code: 'DELHIVERY_SURFACE' }
          },
          rateCharged: fee,
          shippingCharges: fee,
          shippingPaymentStatus: o.shippingPaymentStatus || (o.status === 'SAVED' || o.status === 'DRAFT' ? 'UNPAID' : 'PAID'),
          courierWeight: o.courierWeight || o.weight || 0.5,
          courierLength: o.courierLength || 15,
          courierWidth: o.courierWidth || 10,
          courierHeight: o.courierHeight || 5,
          courierBillableWeight: o.courierBillableWeight || o.billableWeight || 0.5,
          weightDisputeStatus: o.weightDisputeStatus || 'NO_DISPUTE',
          weightDisputeNote: o.weightDisputeNote || null,
          discrepancyAmount: o.discrepancyAmount || 0.0,
          createdAt: o.createdAt
        }
      });
    }

    // Orders - Update Saved/Draft Order
    if (pathname.startsWith('/api/orders/') && (method === 'PUT' || method === 'POST') && !pathname.endsWith('/ship')) {
      const rawId = pathname.replace('/api/orders/', '');
      const id = decodeURIComponent(rawId).trim();
      const o = state.orders.find(ord => ord.id === id || ord.orderNumber === id);
      if (!o) return sendJson(res, { error: 'Order not found' }, 404);

      if (body.buyerName || body.buyerPhone || body.buyerAddress || body.buyerCity || body.buyerState || body.buyerPincode) {
        o.buyerAddress = {
          contactName: body.buyerName || o.buyerAddress?.contactName || 'Consignee',
          phone: body.buyerPhone || o.buyerAddress?.phone || '9876543210',
          addressLine1: body.buyerAddress || o.buyerAddress?.addressLine1 || 'Delivery Address',
          city: body.buyerCity || o.buyerAddress?.city || 'Delhi',
          state: body.buyerState || o.buyerAddress?.state || 'Delhi',
          pincode: body.buyerPincode || o.buyerAddress?.pincode || '110001'
        };
      }

      if (body.pickupAddressId) {
        const wh = state.addresses.find(a => a.id === body.pickupAddressId);
        if (wh) o.pickupAddress = wh;
      }

      if (Array.isArray(body.items) && body.items.length > 0) {
        o.items = body.items.map(it => ({
          name: it.name || 'Item',
          category: it.category || 'General Merchandise',
          quantity: Math.max(1, parseInt(it.quantity || 1)),
          declaredValue: parseFloat(it.declaredValue || 500),
          weight: Math.max(0.01, parseFloat(it.weight || 0.5)),
          dimensions: `${it.length || 15} × ${it.width || 10} × ${it.height || 5} cm`
        }));
        const totalW = o.items.reduce((s, it) => s + (it.weight * it.quantity), 0);
        o.weight = totalW;
        o.billableWeight = totalW;
        o.itemDescription = o.items.map(it => it.name + (it.quantity > 1 ? ` (x${it.quantity})` : '')).join(', ');
        o.declaredValue = o.items.reduce((s, it) => s + (it.declaredValue * it.quantity), 0);
      }

      if (body.paymentMode) o.paymentMode = body.paymentMode;
      if (body.codAmount !== undefined) o.codAmount = parseFloat(body.codAmount || 0);
      if (body.packageType) o.packageType = body.packageType;
      if (body.shippingCharges || body.sellerPrice) {
        const fee = parseFloat(body.shippingCharges || body.sellerPrice);
        o.shippingCharges = fee;
        o.rateCharged = fee;
      }

      o.updatedAt = new Date().toISOString();
      if (typeof saveOrdersStore === 'function') saveOrdersStore();

      return sendJson(res, {
        success: true,
        message: 'Order updated successfully',
        order: o,
        orderId: o.id,
        orderNumber: o.orderNumber
      });
    }

    // Orders - List & Create
    if (pathname === '/api/orders') {
      if (method === 'GET') {
        let filtered = state.orders || [];
        const q = parsedUrl.query || {};
        const st = (q.status || '').trim().toUpperCase();
        const search = (q.search || q.q || '').trim().toLowerCase();
        const fromDate = q.from || q.startDate;
        const toDate = q.to || q.endDate;

        if (st && st !== 'ALL') {
          filtered = filtered.filter(o => {
            const orderStatus = (o.status || '').toUpperCase();
            const shipStatus = (o.shipment?.status || '').toUpperCase();
            if (st === 'READY_TO_SHIP') {
              return orderStatus === 'READY_TO_SHIP' || orderStatus === 'CONFIRMED' || orderStatus === 'BOOKED' || shipStatus === 'READY_TO_SHIP';
            }
            if (st === 'SAVED' || st === 'DRAFT') {
              return orderStatus === 'SAVED' || orderStatus === 'DRAFT' || o.isDraft;
            }
            return orderStatus === st || shipStatus === st;
          });
        }
        if (search) {
          filtered = filtered.filter(o => 
            (o.orderNumber && o.orderNumber.toLowerCase().includes(search)) ||
            (o.awbNumber && o.awbNumber.toLowerCase().includes(search)) ||
            (o.shipment?.awbNumber && o.shipment.awbNumber.toLowerCase().includes(search)) ||
            (o.buyerAddress?.contactName && o.buyerAddress.contactName.toLowerCase().includes(search)) ||
            (o.buyerAddress?.phone && o.buyerAddress.phone.includes(search)) ||
            (o.buyerAddress?.city && o.buyerAddress.city.toLowerCase().includes(search))
          );
        }
        if (fromDate) {
          const f = new Date(fromDate);
          filtered = filtered.filter(o => new Date(o.createdAt) >= f);
        }
        if (toDate) {
          const t = new Date(toDate + 'T23:59:59.999Z');
          filtered = filtered.filter(o => new Date(o.createdAt) <= t);
        }
        return sendJson(res, { orders: filtered });
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
              sku: it.sku || '',
              hsn: it.hsn || '',
              taxRate: it.taxRate !== undefined ? it.taxRate : 18,
              discount: it.discount || 0,
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
            sku: body.sku || '',
            hsn: body.hsn || '',
            taxRate: body.taxRate !== undefined ? body.taxRate : 18,
            discount: body.discount || 0,
            weight: w,
            length: l,
            width: wd,
            height: h,
            dimensions: `${l} × ${wd} × ${h} cm`
          });
        }

        const billableWeight = Math.round(Math.max(totalWeight, totalVolWeight) * 100) / 100;
        const rawPkg = (body.packageType || '').toString().toUpperCase();
        const packageType = (rawPkg === 'LARGE' || (rawPkg === '' && billableWeight > 10.0)) ? 'LARGE' : 'SMALL';
        const effectiveWeight = (packageType === 'LARGE') ? Math.max(billableWeight, 10.5) : Math.min(billableWeight, 10.0);

        const requestedPrice = parseFloat(body.sellerPrice || body.shippingCharges || body.rateCharged || body.totalRate || 0);

        let shippingFee;
        if (requestedPrice > 0) {
          shippingFee = Math.round(requestedPrice * 100) / 100;
        } else {
          const rule = state.commissionRules[0] || { marginType: 'PERCENT', marginValue: 10.0 };
          const requestingUser = state.users.find(u => u.id === 'usr_seller_1') || state.users[0];
          const activeMarginPercent = (requestingUser && requestingUser.rateMarginPercent != null) ? requestingUser.rateMarginPercent : (rule.marginValue || 10.0);
          const activeMarginType = (requestingUser && requestingUser.rateMarginType) ? requestingUser.rateMarginType : (rule.marginType || 'PERCENT');

          let baseFreight;
          if (packageType === 'LARGE') {
            const first10Kg = 10.0 * c.baseRatePerKg;
            const extraKg = Math.ceil(effectiveWeight - 10.0);
            baseFreight = Math.round((first10Kg + (extraKg * c.baseRatePerKg * 0.85)) * 100) / 100;
          } else {
            baseFreight = Math.round(c.baseRatePerKg * Math.max(1, Math.ceil(effectiveWeight)) * 100) / 100;
          }
          const codCharge = (body.paymentMode === 'COD') ? (c.codChargeFlat || 25.0) : 0.0;
          const margin = (activeMarginType === 'FLAT') ? activeMarginPercent : Math.round((baseFreight + codCharge) * (activeMarginPercent / 100) * 100) / 100;
          shippingFee = Math.round((baseFreight + codCharge + margin) * 100) / 100;
        }

        const buyerFound = body.buyerAddressId ? state.addresses.find(a => a.id === body.buyerAddressId) : null;
        const buyerPhoneRaw = body.buyerPhone || body.phone || buyerFound?.phone || '9876543210';
        const cleanBPhone = buyerPhoneRaw.replace(/\D/g, '').slice(-10);
        const buyerAddressObj = {
          contactName: body.buyerName || body.contactName || buyerFound?.contactName || 'Customer',
          phone: cleanBPhone || buyerPhoneRaw,
          altPhone: body.buyerAltPhone || body.altPhone || '',
          email: body.buyerEmail || body.email || '',
          addressLine1: body.buyerAddress || body.addressLine1 || buyerFound?.addressLine1 || 'Address',
          addressLine2: body.buyerAddress2 || body.addressLine2 || '',
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

        // ===================================================================
        // REAL SHIPMOZO PUSH-ORDER + AUTO-ASSIGN API
        // POST /push-order → POST /auto-assign-order → get real AWB
        // ===================================================================
        const SHIPMOZO_BASE_URL = process.env.SHIPMOZO_BASE_URL || 'https://shipping-api.com/app/api/v1';
        const PUBLIC_KEY = process.env.SHIPMOZO_PUBLIC_KEY || '';
        const PRIVATE_KEY = process.env.SHIPMOZO_PRIVATE_KEY || '';

        const orderNumber = 'HTX-ORD-' + (1000 + state.orders.length + 1);

        // If user requested to Save Order (Draft / Ship Later)
        if (body.isDraft || body.status === 'SAVED') {
          const draftOrder = {
            id: 'ord_' + Date.now(),
            userId: 'usr_seller_1',
            userCode: 'HET000002',
            orderNumber: orderNumber,
            awbNumber: null,
            courierId: c.id,
            courier: { name: body.courierName || c.name, code: c.code },
            status: 'SAVED',
            packageType: packageType,
            buyerAddress: buyerAddressObj,
            pickupAddress: state.addresses.find(a => a.id === body.pickupAddressId) || state.addresses[0],
            items: processedItems,
            itemsCount: totalItemsCount,
            itemDescription: itemNames.join(', '),
            declaredValue: totalDeclaredValue,
            ewayBillNumber: body.ewayBillNumber || body.eway_bill_number || null,
            gstNumber: body.gstNumber || body.gst_number || null,
            weight: Math.round(totalWeight * 100) / 100,
            billableWeight: billableWeight,
            rateCharged: shippingFee,
            shippingCharges: shippingFee,
            shippingPaymentStatus: 'UNPAID',
            paymentMode: body.paymentMode || 'PREPAID',
            codAmount: body.paymentMode === 'COD' ? parseFloat(body.codAmount || 0) : 0,
            courierWeight: Math.round(totalWeight * 100) / 100,
            courierLength: processedItems[0]?.length || 15,
            courierWidth: processedItems[0]?.width || 10,
            courierHeight: processedItems[0]?.height || 5,
            courierBillableWeight: billableWeight,
            weightDisputeStatus: 'NO_DISPUTE',
            weightDisputeNote: null,
            discrepancyAmount: 0.0,
            createdAt: new Date().toISOString()
          };

          state.orders.unshift(draftOrder);
          if (typeof saveOrdersStore === 'function') saveOrdersStore();
          return sendJson(res, {
            success: true,
            saved: true,
            order: draftOrder,
            orderId: draftOrder.id,
            orderNumber: draftOrder.orderNumber,
            rateCharged: draftOrder.rateCharged
          });
        }

        let awbNumber = 'HTX' + Math.floor(100000000 + Math.random() * 900000000);
        let shipmozoStatus = null;
        let shipmozoReferenceId = null;
        let shipmozoCourier = null;
        const shipmozoWarehouseId = 148591; // Default verified active Shipmozo warehouse

        // Determine chosen Shipmozo courier ID if selected by user
        let targetShipmozoCourierId = null;
        if (body.courierId && String(body.courierId).startsWith('shipmozo_')) {
          targetShipmozoCourierId = parseInt(String(body.courierId).replace('shipmozo_', ''), 10) || null;
        } else if (body.shipmozoCourierId) {
          targetShipmozoCourierId = parseInt(body.shipmozoCourierId, 10) || null;
        }

        if (PUBLIC_KEY && PRIVATE_KEY && !PUBLIC_KEY.includes('YOUR_')) {
          try {
            // Build Shipmozo push-order payload
            const productDetail = processedItems.map(it => ({
              name: it.name || 'Product',
              sku_number: it.name ? it.name.substring(0, 8).replace(/[^a-zA-Z0-9]/g, '') : 'SKU001',
              quantity: it.quantity || 1,
              discount: '',
              hsn: '',
              unit_price: Math.round(it.declaredValue || 500),
              product_category: it.category || 'Other'
            }));

            const pushPayload = JSON.stringify({
              order_id: orderNumber,
              order_date: new Date().toISOString().split('T')[0],
              consignee_name: buyerAddressObj.contactName,
              consignee_phone: buyerAddressObj.phone,
              consignee_address_line_one: buyerAddressObj.addressLine1,
              consignee_pin_code: buyerAddressObj.pincode,
              consignee_city: buyerAddressObj.city,
              consignee_state: buyerAddressObj.state,
              product_detail: productDetail,
              payment_type: (body.paymentMode || 'PREPAID') === 'COD' ? 'COD' : 'PREPAID',
              weight: Math.max(0.1, totalWeight),
              length: Math.max(1, Math.round(processedItems[0]?.length || 10)),
              width: Math.max(1, Math.round(processedItems[0]?.width || 10)),
              height: Math.max(1, Math.round(processedItems[0]?.height || 10)),
              warehouse_id: shipmozoWarehouseId,
              cod_amount: body.paymentMode === 'COD' ? parseFloat(body.codAmount || 0) : undefined,
              eway_bill_number: body.ewayBillNumber || undefined,
              consignee_gst_number: body.gstNumber || undefined,
              invoice_number: body.invoiceNumber || undefined,
              invoice_date: body.invoiceDate || undefined,
              rov_type: body.rovType || undefined
            });

            const parsedBase = new URL(SHIPMOZO_BASE_URL);

            // Step 1: Push Order to Shipmozo
            console.log(`[PushOrder] Pushing order ${orderNumber} to Shipmozo with warehouse ${shipmozoWarehouseId}...`);
            const pushResult = await new Promise((resolve) => {
              const apiReq = https.request({
                hostname: parsedBase.hostname,
                port: 443,
                path: `${parsedBase.pathname}/push-order`,
                method: 'POST',
                headers: {
                  'public-key': PUBLIC_KEY,
                  'private-key': PRIVATE_KEY,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                }
              }, (apiRes) => {
                let data = '';
                apiRes.on('data', (chunk) => (data += chunk));
                apiRes.on('end', () => {
                  console.log('[PushOrder] Shipmozo HTTP status:', apiRes.statusCode);
                  console.log('[PushOrder] Shipmozo response (first 500 chars):', data.substring(0, 500));
                  try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
                });
              });
              apiReq.on('error', (err) => { console.error('[PushOrder] Error:', err.message); resolve(null); });
              apiReq.setTimeout(15000, () => { apiReq.destroy(); resolve(null); });
              apiReq.write(pushPayload);
              apiReq.end();
            });

            if (pushResult && pushResult.result === '1' && pushResult.data) {
              shipmozoStatus = 'pushed';
              shipmozoReferenceId = pushResult.data.reference_id || null;
              const shipmozoOrderId = pushResult.data.order_id || orderNumber;
              console.log(`[PushOrder] SUCCESS - order_id=${shipmozoOrderId}, ref=${shipmozoReferenceId}`);

              let courierAssigned = false;

              // Step 2A: Assign specific selected courier (Delhivery, DTDC, BlueDart, etc.)
              if (targetShipmozoCourierId) {
                console.log(`[AssignCourier] Assigning selected courier ID ${targetShipmozoCourierId} on Shipmozo...`);
                const assignPayload = JSON.stringify({
                  order_id: shipmozoOrderId,
                  courier_id: targetShipmozoCourierId
                });

                const assignResult = await new Promise((resolve) => {
                  const apiReq = https.request({
                    hostname: parsedBase.hostname,
                    port: 443,
                    path: `${parsedBase.pathname}/assign-courier`,
                    method: 'POST',
                    headers: {
                      'public-key': PUBLIC_KEY,
                      'private-key': PRIVATE_KEY,
                      'Content-Type': 'application/json',
                      'Accept': 'application/json'
                    }
                  }, (apiRes) => {
                    let data = '';
                    apiRes.on('data', (chunk) => (data += chunk));
                    apiRes.on('end', () => {
                      console.log('[AssignCourier] Shipmozo response:', data.substring(0, 500));
                      try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
                    });
                  });
                  apiReq.on('error', (err) => { console.error('[AssignCourier] Error:', err.message); resolve(null); });
                  apiReq.setTimeout(15000, () => { apiReq.destroy(); resolve(null); });
                  apiReq.write(assignPayload);
                  apiReq.end();
                });

                if (assignResult && assignResult.result === '1' && assignResult.data) {
                  courierAssigned = true;
                  const realAwb = assignResult.data.awb_number || assignResult.data.awb || null;
                  shipmozoCourier = assignResult.data.courier || assignResult.data.courier_company || null;
                  if (realAwb) {
                    awbNumber = realAwb;
                    console.log(`[AssignCourier] SUCCESS - Real AWB: ${awbNumber}, Courier: ${shipmozoCourier}`);
                  }
                } else {
                  console.log('[AssignCourier] Direct assignment message:', assignResult?.message || 'Will try auto-assign');
                }
              }

              // Step 2B: Fallback to Auto-Assign if specific assignment was not applicable
              if (!courierAssigned) {
                console.log(`[AutoAssign] Auto-assigning order ${shipmozoOrderId}...`);
                const autoAssignPayload = JSON.stringify({ order_id: shipmozoOrderId });
                const autoAssignResult = await new Promise((resolve) => {
                  const apiReq = https.request({
                    hostname: parsedBase.hostname,
                    port: 443,
                    path: `${parsedBase.pathname}/auto-assign-order`,
                    method: 'POST',
                    headers: {
                      'public-key': PUBLIC_KEY,
                      'private-key': PRIVATE_KEY,
                      'Content-Type': 'application/json',
                      'Accept': 'application/json'
                    }
                  }, (apiRes) => {
                    let data = '';
                    apiRes.on('data', (chunk) => (data += chunk));
                    apiRes.on('end', () => {
                      console.log('[AutoAssign] Shipmozo response:', data.substring(0, 500));
                      try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
                    });
                  });
                  apiReq.on('error', (err) => { console.error('[AutoAssign] Error:', err.message); resolve(null); });
                  apiReq.setTimeout(15000, () => { apiReq.destroy(); resolve(null); });
                  apiReq.write(autoAssignPayload);
                  apiReq.end();
                });

                if (autoAssignResult && autoAssignResult.result === '1' && autoAssignResult.data) {
                  const realAwb = autoAssignResult.data.awb_number || null;
                  shipmozoCourier = autoAssignResult.data.courier_company || autoAssignResult.data.courier_company_service || null;
                  if (realAwb) {
                    awbNumber = realAwb;
                    console.log(`[AutoAssign] SUCCESS - Real AWB: ${awbNumber}, Courier: ${shipmozoCourier}`);
                  }
                } else {
                  console.log('[AutoAssign] Message:', autoAssignResult?.message || 'Auto-assign pending manual action');
                }
              }
            } else {
              console.log('[PushOrder] Failed:', pushResult?.message || 'Unknown error');
            }
          } catch (e) {
            console.error('[PushOrder] Exception:', e.message);
          }
        }

        if (totalDeclaredValue > 50000) {
          const eway = String(body.ewayBillNumber || body.eway_bill_number || '').trim();
          const gst = String(body.gstNumber || body.gst_number || '').trim();
          if (!eway || !/^\d{12}$/.test(eway)) {
            return sendJson(res, { error: 'For orders exceeding ₹50,000, a valid 12-digit E-Way Bill Number is required.' }, 400);
          }
          if (!gst || !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(gst)) {
            return sendJson(res, { error: 'For orders exceeding ₹50,000, a valid 15-character GSTIN is required.' }, 400);
          }
        }

        const newOrder = {
          id: 'ord_' + Date.now(),
          userId: 'usr_seller_1',
          userCode: 'HET000002',
          orderNumber: orderNumber,
          awbNumber: awbNumber,
          courierId: c.id,
          courier: { name: shipmozoCourier || c.name, code: c.code },
          status: shipmozoStatus === 'pushed' ? 'MANIFESTED' : 'READY_TO_SHIP',
          packageType: packageType,
          buyerAddress: buyerAddressObj,
          pickupAddress: state.addresses.find(a => a.id === body.pickupAddressId) || state.addresses[0],
          items: processedItems,
          itemsCount: totalItemsCount,
          itemDescription: itemNames.join(', '),
          declaredValue: totalDeclaredValue,
          ewayBillNumber: body.ewayBillNumber || body.eway_bill_number || null,
          gstNumber: body.gstNumber || body.gst_number || null,
          weight: Math.round(totalWeight * 100) / 100,
          billableWeight: billableWeight,
          rateCharged: shippingFee,
          shippingCharges: shippingFee,
          shippingPaymentStatus: 'PAID',
          paymentMode: body.paymentMode || 'PREPAID',
          codAmount: body.paymentMode === 'COD' ? parseFloat(body.codAmount || 0) : 0,
          courierWeight: Math.round(totalWeight * 100) / 100,
          courierLength: processedItems[0]?.length || 15,
          courierWidth: processedItems[0]?.width || 10,
          courierHeight: processedItems[0]?.height || 5,
          courierBillableWeight: billableWeight,
          weightDisputeStatus: 'NO_DISPUTE',
          weightDisputeNote: null,
          discrepancyAmount: 0.0,
          shipmozoStatus: shipmozoStatus,
          shipmozoReferenceId: shipmozoReferenceId,
          shipmozoCourier: shipmozoCourier,
          createdAt: new Date().toISOString()
        };

        state.orders.unshift(newOrder);
        if (typeof saveOrdersStore === 'function') saveOrdersStore();
        state.walletBalance = Math.max(0, state.walletBalance - newOrder.rateCharged);
        state.transactions.unshift({
          id: 'tx_' + Date.now(),
          userId: 'usr_seller_1',
          userCode: 'HET000002',
          type: 'DEBIT',
          amount: newOrder.rateCharged,
          balanceAfter: state.walletBalance,
          description: 'Shipment Freight: ' + newOrder.awbNumber,
          createdAt: new Date().toISOString()
        });

        const response = {
          success: true,
          order: newOrder,
          orderId: newOrder.id,
          awbNumber: newOrder.awbNumber,
          orderNumber: newOrder.orderNumber,
          rateCharged: newOrder.rateCharged
        };

        if (shipmozoStatus) {
          response.shipmozoStatus = shipmozoStatus;
          response.shipmozoReferenceId = shipmozoReferenceId;
          if (shipmozoCourier) response.shipmozoCourier = shipmozoCourier;
        }

        return sendJson(res, response);
      }
    }

    // Ship Saved Draft Order
    if ((pathname.match(/^\/api\/orders\/[^/]+\/ship$/) || pathname === '/api/orders/ship') && method === 'POST') {
      const id = pathname === '/api/orders/ship' ? body.orderId : pathname.replace('/api/orders/', '').replace('/ship', '');
      const o = state.orders.find(ord => ord.id === id || ord.orderNumber === id);
      if (!o) {
        return sendJson(res, { error: 'Order not found' }, 404);
      }
      const charge = o.rateCharged || o.shippingCharges || 46.2;
      if (state.walletBalance < charge) {
        return sendJson(res, { error: `Insufficient wallet balance to ship order. Required: ₹${charge.toFixed(2)}, Available: ₹${state.walletBalance.toFixed(2)}` }, 402);
      }

      state.walletBalance = Math.max(0, state.walletBalance - charge);
      const awbNum = 'HTX' + Math.floor(100000000 + Math.random() * 900000000);
      o.awbNumber = awbNum;
      o.status = 'READY_TO_SHIP';
      o.shippingPaymentStatus = 'PAID';
      o.manifestedAt = new Date().toISOString();

      state.transactions.unshift({
        id: 'tx_' + Date.now(),
        userId: o.userId || 'usr_seller_1',
        userCode: o.userCode || 'HET000002',
        type: 'DEBIT',
        amount: charge,
        balanceAfter: state.walletBalance,
        description: 'Shipment Freight: ' + awbNum,
        createdAt: new Date().toISOString()
      });

      if (typeof saveOrdersStore === 'function') saveOrdersStore();

      return sendJson(res, {
        success: true,
        order: o,
        awbNumber: o.awbNumber,
        orderNumber: o.orderNumber,
        rateCharged: charge
      });
    }

    // Cancel Order - Calls real Shipmozo POST /cancel-order if order was pushed
    if (pathname.startsWith('/api/order-cancel/') && method === 'POST') {
      const id = pathname.replace('/api/order-cancel/', '');
      const o = state.orders.find(ord => ord.id === id || ord.orderNumber === id);
      if (!o) {
        return sendJson(res, { error: 'Order not found' }, 404);
      }

      let shipmozoCancelled = false;
      let shipmozoMsg = null;

      const SHIPMOZO_BASE_URL = process.env.SHIPMOZO_BASE_URL || 'https://shipping-api.com/app/api/v1';
      const PUBLIC_KEY = process.env.SHIPMOZO_PUBLIC_KEY || '';
      const PRIVATE_KEY = process.env.SHIPMOZO_PRIVATE_KEY || '';

      if (PUBLIC_KEY && PRIVATE_KEY && !PUBLIC_KEY.includes('YOUR_') && (o.awbNumber || o.orderNumber)) {
        try {
          const cancelPayload = JSON.stringify({
            order_id: o.orderNumber,
            awb_number: o.awbNumber || ''
          });

          const parsedBase = new URL(SHIPMOZO_BASE_URL);
          const cancelResult = await new Promise((resolve) => {
            const apiReq = https.request({
              hostname: parsedBase.hostname,
              port: 443,
              path: `${parsedBase.pathname}/cancel-order`,
              method: 'POST',
              headers: {
                'public-key': PUBLIC_KEY,
                'private-key': PRIVATE_KEY,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              }
            }, (apiRes) => {
              let data = '';
              apiRes.on('data', chunk => data += chunk);
              apiRes.on('end', () => {
                console.log('[CancelOrder] Shipmozo HTTP status:', apiRes.statusCode);
                console.log('[CancelOrder] Shipmozo response:', data.substring(0, 300));
                try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
              });
            });
            apiReq.on('error', err => { console.error('[CancelOrder] Error:', err.message); resolve(null); });
            apiReq.setTimeout(12000, () => { apiReq.destroy(); resolve(null); });
            apiReq.write(cancelPayload);
            apiReq.end();
          });

          if (cancelResult && (cancelResult.result === '1' || cancelResult.success)) {
            shipmozoCancelled = true;
            shipmozoMsg = cancelResult.message || 'Cancelled successfully on Shipmozo';
            console.log(`[CancelOrder] SUCCESS on Shipmozo for ${o.orderNumber}`);
          } else {
            shipmozoMsg = cancelResult?.message || 'Shipmozo cancellation returned error';
            console.log(`[CancelOrder] Shipmozo cancel note:`, shipmozoMsg);
          }
        } catch (err) {
          console.error('[CancelOrder] Exception:', err.message);
        }
      }

      if (o.status !== 'CANCELLED') {
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
        if (typeof saveOrdersStore === 'function') saveOrdersStore();
      }

      return sendJson(res, {
        success: true,
        orderId: o.id,
        orderNumber: o.orderNumber,
        shipmozoCancelled,
        message: shipmozoMsg || 'Order cancelled locally and refunded to wallet'
      });
    }

    // Orders - Bulk Cancel
    if (pathname === '/api/orders-cancel-bulk' && method === 'POST') {
      const orderIds = body.orderIds || body.ids || [];
      const cancelled = [];
      orderIds.forEach(id => {
        const o = state.orders.find(ord => ord.id === id || ord.orderNumber === id);
        if (o && o.status !== 'CANCELLED') {
          o.status = 'CANCELLED';
          if (o.rateCharged && o.shippingPaymentStatus === 'PAID') {
            state.walletBalance += o.rateCharged;
            state.transactions.unshift({
              id: 'tx_' + Date.now(),
              type: 'CREDIT',
              amount: o.rateCharged,
              balanceAfter: state.walletBalance,
              description: 'Refund for cancelled bulk order ' + o.orderNumber,
              createdAt: new Date().toISOString()
            });
          }
          cancelled.push(o.id);
        }
      });
      if (typeof saveOrdersStore === 'function') saveOrdersStore();
      return sendJson(res, { success: true, cancelledCount: cancelled.length, cancelledIds: cancelled });
    }

    // Support Tickets - Enriched with live Shipmozo tracking info
    if (pathname === '/api/tickets' && method === 'GET') {
      return sendJson(res, { tickets: state.tickets });
    }

    if (pathname === '/api/tickets' && method === 'POST') {
      const orderId = (body.orderId || '').trim();
      const subject = (body.subject || '').trim();
      const message = (body.message || '').trim();

      if (!subject || !message) {
        return sendJson(res, { error: 'Subject and message are required' }, 400);
      }

      let order = null;
      if (orderId && orderId !== 'GENERAL') {
        order = state.orders.find(o => o.id === orderId || o.orderNumber === orderId) || null;
      }
      if (!order && state.orders.length > 0 && orderId === 'GENERAL') {
        order = state.orders[0];
      }

      const awbToTrack = order?.awbNumber || body.awbNumber || null;
      let liveTracking = null;

      // Enrich with live tracking data if AWB exists
      if (awbToTrack && !awbToTrack.startsWith('LOCAL_')) {
        const SHIPMOZO_BASE_URL = process.env.SHIPMOZO_BASE_URL || 'https://shipping-api.com/app/api/v1';
        const PUBLIC_KEY = process.env.SHIPMOZO_PUBLIC_KEY || '';
        const PRIVATE_KEY = process.env.SHIPMOZO_PRIVATE_KEY || '';

        if (PUBLIC_KEY && !PUBLIC_KEY.includes('YOUR_')) {
          try {
            const parsedBase = new URL(SHIPMOZO_BASE_URL);
            const trackResp = await new Promise((resolve) => {
              const apiReq = https.request({
                hostname: parsedBase.hostname,
                port: 443,
                path: `${parsedBase.pathname}/track-order?awb_number=${encodeURIComponent(awbToTrack)}`,
                method: 'GET',
                headers: {
                  'public-key': PUBLIC_KEY,
                  'private-key': PRIVATE_KEY,
                  'Accept': 'application/json'
                }
              }, (apiRes) => {
                let data = '';
                apiRes.on('data', c => data += c);
                apiRes.on('end', () => {
                  try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
                });
              });
              apiReq.on('error', () => resolve(null));
              apiReq.setTimeout(8000, () => { apiReq.destroy(); resolve(null); });
              apiReq.end();
            });

            if (trackResp && trackResp.result === '1' && trackResp.data) {
              const td = trackResp.data;
              const scan = Array.isArray(td.scan_detail) && td.scan_detail.length > 0 ? td.scan_detail[0] : null;
              liveTracking = {
                currentStatus: td.current_status || 'IN_TRANSIT',
                currentLocation: td.current_location || scan?.location || 'Hub',
                courier: td.courier || order?.courier?.name || 'Courier',
                expectedDelivery: td.expected_delivery_date || null,
                lastEvent: scan ? `${scan.activity || scan.status} at ${scan.location || 'Hub'} (${scan.date_time || ''})` : null,
                awb: td.awb_number || awbToTrack
              };
            }
          } catch (e) {
            console.error('[TicketTracking] Live check error:', e.message);
          }
        }
      }

      const ticketMessages = [];

      // Auto-add system message if live tracking status was detected
      if (liveTracking) {
        ticketMessages.push({
          id: 'msg_sys_' + Date.now(),
          senderRole: 'SYSTEM',
          message: `[Automated Shipment Context] AWB: ${liveTracking.awb} | Courier: ${liveTracking.courier} | Live Status: ${liveTracking.currentStatus}` +
            (liveTracking.currentLocation ? ` | Location: ${liveTracking.currentLocation}` : '') +
            (liveTracking.expectedDelivery ? ` | Expected Delivery: ${liveTracking.expectedDelivery}` : ''),
          createdAt: new Date().toISOString()
        });
      }

      ticketMessages.push({
        id: 'msg_' + Date.now(),
        senderRole: 'USER',
        senderName: body.sellerName || 'Meena (Seller)',
        message: message,
        createdAt: new Date().toISOString()
      });

      // Automated Initial Bot Welcome Reply
      const botGreeting = liveTracking
        ? `🤖 [HetEx AI Bot] Hello! I've linked carrier telemetry for AWB ${liveTracking.awb} (${liveTracking.courier}). Current status: "${liveTracking.currentStatus}" at ${liveTracking.currentLocation || 'Distribution Hub'}. Our Operations Desk is also viewing this inquiry and will reply shortly.`
        : `🤖 [HetEx AI Bot] Hello! Your support query for "${subject}" has been queued with our Operations Desk. You can ask for real-time tracking, ETA, or carrier escalation here anytime.`;

      ticketMessages.push({
        id: 'msg_bot_' + (Date.now() + 50),
        senderRole: 'BOT',
        senderName: 'HetEx Logistics AI Bot',
        message: botGreeting,
        createdAt: new Date(Date.now() + 50).toISOString()
      });

      const newTicket = {
        id: 'tkt_' + Date.now(),
        sellerName: body.sellerName || 'Meena (Zuberia One)',
        sellerEmail: body.sellerEmail || 'meena@zuberia.one',
        sellerBusiness: body.sellerBusiness || 'Zuberia One Enterprises',
        orderId: order?.id || null,
        orderNumber: order?.orderNumber || (orderId && orderId !== 'GENERAL' ? orderId : 'General'),
        courierName: order?.courier?.name || order?.shipment?.courier?.name || 'General Support',
        awbNumber: awbToTrack || '-',
        subject: subject,
        status: 'OPEN',
        messages: ticketMessages,
        liveTracking: liveTracking,
        messageCount: ticketMessages.length,
        createdAt: new Date().toISOString()
      };

      state.tickets.unshift(newTicket);

      return sendJson(res, {
        success: true,
        id: newTicket.id,
        ticket: newTicket,
        trackingEnriched: Boolean(liveTracking)
      }, 201);
    }

    // Admin & Seller Tickets Listing
    if ((pathname === '/api/tickets' || pathname === '/api/admin/tickets') && method === 'GET') {
      return sendJson(res, { tickets: state.tickets });
    }

    if (pathname.startsWith('/api/tickets/') && method === 'GET') {
      const id = pathname.replace('/api/tickets/', '');
      const t = state.tickets.find(tk => tk.id === id);
      if (!t) return sendJson(res, { error: 'Ticket not found' }, 404);
      return sendJson(res, { ticket: t });
    }

    // Update Ticket Status
    if ((pathname.startsWith('/api/tickets/') && (method === 'PATCH' || method === 'PUT')) || (pathname.includes('/status') && method === 'POST')) {
      const id = pathname.replace('/api/tickets/', '').replace('/status', '');
      const t = state.tickets.find(tk => tk.id === id);
      if (!t) return sendJson(res, { error: 'Ticket not found' }, 404);

      if (body.status) t.status = body.status;
      t.updatedAt = new Date().toISOString();

      return sendJson(res, { success: true, ticket: t });
    }

    // Add Message to Ticket (User or Admin)
    if (pathname.startsWith('/api/ticket-messages/') && method === 'POST') {
      const id = pathname.replace('/api/ticket-messages/', '');
      const t = state.tickets.find(tk => tk.id === id);
      if (!t) return sendJson(res, { error: 'Ticket not found' }, 404);

      const msg = (body.message || '').trim();
      if (!msg) return sendJson(res, { error: 'Message cannot be empty' }, 400);

      const role = body.senderRole || (body.isAdmin ? 'ADMIN' : 'USER');

      t.messages.push({
        id: 'msg_' + Date.now(),
        senderRole: role,
        senderName: role === 'ADMIN' ? 'HetEx Operations Desk' : (role === 'BOT' ? 'HetEx Logistics AI Bot' : 'Seller'),
        message: msg,
        createdAt: new Date().toISOString()
      });
      t.messageCount = t.messages.length;
      t.updatedAt = new Date().toISOString();

      if (role === 'ADMIN' && t.status === 'OPEN') {
        t.status = 'IN_PROGRESS';
      }

      if (role === 'USER' && body.triggerBotReply !== false) {
        const userQuery = msg.toLowerCase();
        const awb = t.awbNumber && t.awbNumber !== '-' ? t.awbNumber : null;
        let reply = '';
        if (awb) {
          let liveStatus = t.liveTracking?.currentStatus || 'IN_TRANSIT';
          let liveLoc = t.liveTracking?.currentLocation || 'Distribution Hub';
          let liveEta = t.liveTracking?.expectedDelivery || '1-2 business days';

          if (userQuery.includes('eta') || userQuery.includes('when') || userQuery.includes('time') || userQuery.includes('delivery')) {
            reply = `🤖 [HetEx AI Bot] Telemetry for AWB ${awb}:\n• Expected Delivery: ${liveEta}\n• Current Location: ${liveLoc}\n• Status: ${liveStatus}\nOur Operations Desk has been alerted for priority monitoring.`;
          } else if (userQuery.includes('status') || userQuery.includes('track') || userQuery.includes('where')) {
            reply = `🤖 [HetEx AI Bot] Live scan check for AWB ${awb}:\n• Status: ${liveStatus}\n• Facility: ${liveLoc}\nCourier partner: ${t.courierName || 'Express Carrier'}. Operations Desk is also monitoring.`;
          } else if (userQuery.includes('escalate') || userQuery.includes('delay') || userQuery.includes('urgent') || userQuery.includes('issue') || userQuery.includes('problem')) {
            reply = `🚨 [HetEx AI Bot] Priority Escalation Logged!\nAWB ${awb} has been flagged for courier hub escalation. An admin executive will reply here shortly.`;
            t.status = 'ESCALATED';
          } else {
            reply = `🤖 [HetEx AI Bot] Query logged for Order ${t.orderNumber} (AWB: ${awb}). Carrier status is "${liveStatus}" at ${liveLoc}. Our Operations Desk will reply directly in this chat thread.`;
          }
        } else {
          reply = `🤖 [HetEx AI Bot] Your query regarding "${t.subject}" has been received. Our Operations Desk is actively reviewing this ticket and will reply shortly.`;
        }

        t.messages.push({
          id: 'msg_bot_' + (Date.now() + 50),
          senderRole: 'BOT',
          senderName: 'HetEx Logistics AI Bot',
          message: reply,
          createdAt: new Date(Date.now() + 50).toISOString()
        });
        t.messageCount = t.messages.length;
        if (t.status === 'OPEN') t.status = 'IN_PROGRESS';
      }

      return sendJson(res, { success: true, ticket: t });
    }

    // Chatbot Automated Intelligence Reply
    if ((pathname.startsWith('/api/ticket-bot-reply/') || pathname.startsWith('/api/ticket-simulate-reply/')) && method === 'POST') {
      const id = pathname.replace('/api/ticket-bot-reply/', '').replace('/api/ticket-simulate-reply/', '');
      const t = state.tickets.find(tk => tk.id === id);
      if (!t) return sendJson(res, { error: 'Ticket not found' }, 404);

      const userQuery = (body.message || '').toLowerCase();
      let reply = null;

      // Check if ticket has AWB
      const awb = t.awbNumber && t.awbNumber !== '-' ? t.awbNumber : null;

      if (awb) {
        let liveStatus = t.liveTracking?.currentStatus || 'IN_TRANSIT';
        let liveLoc = t.liveTracking?.currentLocation || 'Distribution Hub';
        let liveEta = t.liveTracking?.expectedDelivery || '1-2 business days';

        if (userQuery.includes('eta') || userQuery.includes('when') || userQuery.includes('time') || userQuery.includes('delivery')) {
          reply = `🤖 [HetEx AI Bot] According to carrier telemetry for AWB ${awb}:\n\n` +
            `📅 Estimated Delivery Date: ${liveEta}\n` +
            `📍 Current Location: ${liveLoc}\n` +
            `📦 Current Status: ${liveStatus}\n\n` +
            `Our tracking engine pings carrier telemetry hubs every 30 minutes. If you need urgent priority re-routing, our Operations Desk has been notified.`;
        } else if (userQuery.includes('status') || userQuery.includes('track') || userQuery.includes('where')) {
          reply = `🤖 [HetEx AI Bot] Real-time tracking check for AWB ${awb}:\n\n` +
            `📦 Status: ${liveStatus}\n` +
            `📍 Facility: ${liveLoc}\n` +
            (t.liveTracking?.lastEvent ? `📝 Last Milestone: ${t.liveTracking.lastEvent}\n\n` : '\n') +
            `Courier partner: ${t.courierName || 'Express Carrier'}. Everything is on schedule!`;
        } else if (userQuery.includes('escalate') || userQuery.includes('delay') || userQuery.includes('urgent')) {
          reply = `🚨 [HetEx AI Bot] Escalation ticket priority raised!\n\n` +
            `We have flagged shipment ${awb} with our Hub Escalation Unit. An operations executive will follow up with the carrier branch directly within 2 business hours.`;
          t.status = 'ESCALATED';
        } else {
          reply = `🤖 [HetEx AI Bot] Hello! I am the HetEx Logistics AI Assistant for Order ${t.orderNumber} (AWB: ${awb}).\n\n` +
            `Current shipment status is "${liveStatus}" at ${liveLoc}.\n` +
            `How can I assist you further? You can ask for ETA, latest scan location, or request priority carrier escalation. Our Operations Desk is also viewing this chat.`;
        }
      } else {
        reply = `🤖 [HetEx AI Bot] Hello! Thank you for contacting HetEx Merchant Support regarding "${t.subject}".\n\n` +
          `Your inquiry has been placed into the priority support queue. An operations executive is reviewing your account and will reply directly in this chat thread shortly.`;
      }

      t.messages.push({
        id: 'msg_bot_' + Date.now(),
        senderRole: 'BOT',
        senderName: 'HetEx Logistics AI Bot',
        message: reply,
        createdAt: new Date().toISOString()
      });
      t.messageCount = t.messages.length;
      if (t.status === 'OPEN') t.status = 'IN_PROGRESS';

      return sendJson(res, { success: true, ticket: t });
    }


    // Pincode Lookup API (Auto-fills City & State)
    if (pathname.startsWith('/api/pincode-lookup') && method === 'GET') {
      let pin = pathname.replace('/api/pincode-lookup/', '').replace('/api/pincode-lookup', '').trim();
      if (!pin) {
        pin = (parsedUrl.query.pincode || parsedUrl.query.pin || '').toString().trim();
      }
      if (!pin || pin.length !== 6) {
        return sendJson(res, { error: 'Valid 6-digit pincode is required', found: false }, 400);
      }
      try {
        const postData = await new Promise((resolve) => {
          https.get(`https://api.postalpincode.in/pincode/${pin}`, { timeout: 3500 }, (apiRes) => {
            let data = '';
            apiRes.on('data', chunk => data += chunk);
            apiRes.on('end', () => {
              try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
            });
          }).on('error', () => resolve(null));
        });
        if (postData && Array.isArray(postData) && postData[0]?.Status === 'Success' && postData[0]?.PostOffice?.length > 0) {
          const po = postData[0].PostOffice[0];
          return sendJson(res, {
            success: true,
            found: true,
            pincode: pin,
            city: po.District || po.Name || 'City',
            state: po.State || 'State',
            postOffices: postData[0].PostOffice.map(p => p.Name)
          });
        }
      } catch (e) {}

      // Fallback hub mapping for reliable instant response
      const pinPrefix = pin.substring(0, 2);
      const defaults = {
        '11': { city: 'New Delhi', state: 'Delhi' },
        '12': { city: 'Gurugram', state: 'Haryana' },
        '20': { city: 'Noida', state: 'Uttar Pradesh' },
        '40': { city: 'Mumbai', state: 'Maharashtra' },
        '56': { city: 'Bengaluru', state: 'Karnataka' },
        '60': { city: 'Chennai', state: 'Tamil Nadu' },
        '50': { city: 'Hyderabad', state: 'Telangana' },
        '70': { city: 'Kolkata', state: 'West Bengal' },
        '38': { city: 'Ahmedabad', state: 'Gujarat' },
        '30': { city: 'Jaipur', state: 'Rajasthan' },
        '41': { city: 'Pune', state: 'Maharashtra' }
      };
      const found = defaults[pinPrefix] || { city: 'Metropolitan City', state: 'India' };
      return sendJson(res, { success: true, found: true, pincode: pin, city: found.city, state: found.state });
    }

    // COD Remittances
    if ((pathname === '/api/cod' || pathname === '/api/cod-remittances') && method === 'GET') {
      const list = state.codRemittances || [];
      const total = list.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
      const settled = list.filter(r => r.status === 'SETTLED' || r.status === 'PAID').reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
      const pending = list.filter(r => r.status !== 'SETTLED' && r.status !== 'PAID').reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
      return sendJson(res, {
        remittances: list,
        nextPayoutDate: 'Upcoming Friday',
        summary: { total, settled, pending, count: list.length }
      });
    }

    // Weight Disputes & Discrepancies (Dedicated endpoint returning only disputed shipments)
    if ((pathname === '/api/disputes' || pathname === '/api/weight-disputes') && method === 'GET') {
      const disputedOrders = state.orders.filter(o => o.weightDisputeStatus && o.weightDisputeStatus !== 'NO_DISPUTE');
      const disputes = disputedOrders.map(o => {
        const declaredW = parseFloat(o.weight || 0.5);
        const courierW = parseFloat(o.courierWeight || declaredW + 0.5);
        const discrepancyKg = Math.max(0, Math.round((courierW - declaredW) * 100) / 100);
        return {
          id: 'DSP-' + (o.id.replace('ord_', '') || '101'),
          orderId: o.id,
          orderNumber: o.orderNumber,
          awbNumber: o.awbNumber,
          courierId: o.courierId,
          courierName: o.courier?.name || 'DTDC Priority',
          courierCode: o.courier?.code || 'DTDC',
          declaredWeight: declaredW,
          declaredDimensions: o.items?.[0]?.dimensions || '18 × 14 × 8 cm',
          declaredBillableWeight: parseFloat(o.billableWeight || declaredW),
          courierWeight: courierW,
          courierDimensions: `${o.courierLength || 22} × ${o.courierWidth || 16} × ${o.courierHeight || 10} cm`,
          courierBillableWeight: parseFloat(o.courierBillableWeight || courierW),
          discrepancyKg: discrepancyKg,
          extraCharge: parseFloat(o.discrepancyAmount || 35.0),
          status: o.weightDisputeStatus || 'ACTION_REQUIRED',
          deadline: o.weightDisputeDeadline || null,
          note: o.weightDisputeNote || null,
          createdAt: o.createdAt
        };
      });

      const summary = {
        total: disputes.length,
        actionRequired: disputes.filter(d => d.status === 'ACTION_REQUIRED' || d.status === 'OPEN').length,
        underReview: disputes.filter(d => d.status === 'UNDER_REVIEW').length,
        resolved: disputes.filter(d => d.status === 'RESOLVED_ACCEPTED' || d.status === 'ACCEPTED').length,
        totalAmountAtRisk: disputes.reduce((s, d) => s + (d.extraCharge || 0), 0)
      };

      return sendJson(res, { disputes, summary });
    }

    if ((pathname === '/api/weight-disputes/raise' || pathname === '/api/weight-disputes') && method === 'POST') {
      const orderId = body.orderId || body.shipmentId || body.orderNumber || body.awbNumber;
      const target = state.orders.find(o => o.id === orderId || o.orderNumber === orderId || o.awbNumber === orderId);
      if (target) {
        target.weightDisputeStatus = 'UNDER_REVIEW';
        target.weightDisputeNote = body.reason 
          ? `Dispute Raised: ${body.reason}. Remarks: ${body.remarks || 'Packaging photo submitted.'}`
          : 'Seller raised discrepancy dispute for courier applied physical weight. Packaging proof under audit.';
        target.weightDisputeDeadline = null;
        if (body.extraCharge) target.discrepancyAmount = parseFloat(body.extraCharge);
        return sendJson(res, { success: true, message: 'Dispute submitted successfully to courier operations desk', order: target });
      }
      return sendJson(res, { error: 'Order not found for dispute submission' }, 404);
    }

    if (pathname === '/api/weight-disputes/accept' && method === 'POST') {
      const orderId = body.orderId || body.shipmentId || body.orderNumber || body.awbNumber;
      const target = state.orders.find(o => o.id === orderId || o.orderNumber === orderId || o.awbNumber === orderId);
      if (target) {
        target.weightDisputeStatus = 'ACCEPTED';
        target.weightDisputeNote = 'Seller acknowledged and accepted the courier scanned physical weight.';
        target.weightDisputeDeadline = null;
        return sendJson(res, { success: true, message: 'Weight discrepancy accepted. Difference settled.', order: target });
      }
      return sendJson(res, { error: 'Order not found' }, 404);
    }

    // NDR (Non-Delivery Reports) Endpoints
    if (pathname === '/api/ndr' && method === 'GET') {
      const records = state.ndrRecords || [];
      return sendJson(res, { success: true, records, ndr: records });
    }

    if (pathname === '/api/ndr/action' && method === 'POST') {
      const awb = body.awbNumber || body.awb;
      const action = body.action || 'REATTEMPT'; // 'REATTEMPT' or 'RTO'
      const feedback = body.feedback || body.instructions || 'Action requested by seller';
      const target = (state.ndrRecords || []).find(r => r.awbNumber === awb);
      if (target) {
        target.status = action === 'RTO' ? 'RTO_INITIATED' : 'REATTEMPT_REQUESTED';
        target.feedback = feedback;
      }
      const ord = state.orders.find(o => o.awbNumber === awb);
      if (ord) {
        ord.status = action === 'RTO' ? 'RTO_INITIATED' : 'REATTEMPT_REQUESTED';
      }
      return sendJson(res, {
        success: true,
        message: action === 'RTO' ? 'RTO successfully initiated for shipment' : 'Courier reattempt requested with delivery instructions',
        record: target
      });
    }

    // Reports Export (Orders, Transactions, COD, Disputes)
    if (pathname.startsWith('/api/reports')) {
      const q = parsedUrl.query || {};
      const type = (q.type || pathname.replace('/api/reports/download', '').replace('/api/reports/', '') || 'orders').toLowerCase().replace(/^\//, '');
      const startDateStr = q.from || q.startDate;
      const endDateStr = q.to || q.endDate;
      const startDate = startDateStr ? new Date(startDateStr) : new Date(0);
      const endDate = endDateStr ? new Date(endDateStr + 'T23:59:59.999Z') : new Date();
      const format = (q.format || 'csv').toLowerCase();

      if (type === 'orders') {
        const filtered = state.orders.filter(o => {
          const d = new Date(o.createdAt);
          return d >= startDate && d <= endDate;
        });
        if (q.format === 'csv') {
          let csv = '\uFEFF"User ID","Order Number","AWB Number","Booking Date","Courier","Consignee Name","City","Payment Mode","COD Amount","Dead Weight (kg)","Billable Weight (kg)","Freight Charged (INR)","Freight Status","Status"\n';
          filtered.forEach(o => {
            csv += `"${o.userCode || 'HET000002'}","${o.orderNumber}","${o.awbNumber}","${new Date(o.createdAt).toLocaleDateString()}","${o.courier?.name || 'Courier'}","${o.buyerAddress?.contactName || ''}","${o.buyerAddress?.city || ''}","${o.paymentMode || 'PREPAID'}","${o.codAmount || 0}","${o.weight || 0.5}","${o.billableWeight || 0.5}","${o.rateCharged || 0}","${o.shippingPaymentStatus || 'PAID'}","${o.status || 'CONFIRMED'}"\n`;
          });
          res.writeHead(200, {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="orders_report.csv"'
          });
          return res.end(csv);
        }
        return sendJson(res, { orders: filtered });
      }

      if (type === 'transactions' || type === 'payments') {
        const filtered = state.transactions.filter(t => {
          const d = new Date(t.createdAt);
          return d >= startDate && d <= endDate;
        });
        if (q.format === 'csv') {
          let csv = '\uFEFF"User ID","Transaction ID","Date","Type","Amount (INR)","Closing Balance (INR)","Description"\n';
          filtered.forEach(t => {
            csv += `"${t.userCode || 'HET000002'}","${t.id}","${new Date(t.createdAt).toLocaleString()}","${t.type}","${t.amount}","${t.balanceAfter}","${(t.description || '').replace(/"/g, '""')}"\n`;
          });
          res.writeHead(200, {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="transactions_report.csv"'
          });
          return res.end(csv);
        }
        return sendJson(res, { transactions: filtered });
      }

      if (type === 'cod') {
        const filtered = (state.codRemittances || []).filter(r => {
          const d = new Date(r.createdAt);
          return d >= startDate && d <= endDate;
        });
        if (q.format === 'csv') {
          let csv = '\uFEFF"User ID","Remittance ID","Order Number","AWB Number","Buyer Name","City","Courier","COD Amount (INR)","Status","Bank UTR","Settlement Date"\n';
          filtered.forEach(r => {
            csv += `"${r.userCode || 'HET000002'}","${r.id}","${r.orderNumber}","${r.awbNumber}","${r.buyerName || ''}","${r.city || ''}","${r.courierName || ''}","${r.amount}","${r.status}","${r.bankUtr || '-'}","${r.settledAt ? new Date(r.settledAt).toLocaleDateString() : '-'}"\n`;
          });
          res.writeHead(200, {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="cod_remittance_report.csv"'
          });
          return res.end(csv);
        }
        return sendJson(res, { remittances: filtered });
      }

      if (type === 'disputes') {
        const filtered = state.orders.filter(o => {
          const d = new Date(o.createdAt);
          return d >= startDate && d <= endDate;
        });
        if (q.format === 'csv') {
          let csv = '\uFEFF"User ID","Order Number","AWB Number","Courier","Declared Weight (kg)","Courier Weight (kg)","Discrepancy (INR)","Dispute Status","Dispute Notes"\n';
          filtered.forEach(o => {
            csv += `"${o.userCode || 'HET000002'}","${o.orderNumber}","${o.awbNumber}","${o.courier?.name || 'Courier'}","${o.weight}","${o.courierWeight || o.weight}","${o.discrepancyAmount || 0}","${o.weightDisputeStatus || 'NO_DISPUTE'}","${(o.weightDisputeNote || '-').replace(/"/g, '""')}"\n`;
          });
          res.writeHead(200, {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="weight_disputes_report.csv"'
          });
          return res.end(csv);
        }
        return sendJson(res, { disputes: filtered });
      }
    }

    // Tracking - Supports both AWB Number and Order Number
    // Docs: GET /track-order?awb_number={awb} with public-key & private-key headers
    if (pathname.startsWith('/api/track') || pathname === '/api/shipments/live-track') {
      const qStr = (parsedUrl.query.awb || parsedUrl.query.awbNumber || parsedUrl.query.awb_number || parsedUrl.query.orderNumber || parsedUrl.query.order_number || parsedUrl.query.query || '').toString().trim();
      console.log('[Tracking] Request query:', qStr);

      if (!qStr || qStr === '-' || qStr.length < 2) {
        return sendJson(res, { error: 'Please enter a valid AWB or Order number' }, 400);
      }

      // Check if matches an existing order in state
      const matchedOrder = state.orders.find(ord => 
        (ord.orderNumber && ord.orderNumber.toLowerCase() === qStr.toLowerCase()) ||
        ord.id === qStr ||
        (ord.awbNumber && ord.awbNumber.toLowerCase() === qStr.toLowerCase())
      );

      // Handle un-manifested saved draft orders
      if (matchedOrder && (matchedOrder.status === 'SAVED' || matchedOrder.status === 'DRAFT' || matchedOrder.isDraft)) {
        return sendJson(res, {
          awbNumber: matchedOrder.awbNumber || matchedOrder.orderNumber,
          orderNumber: matchedOrder.orderNumber,
          orderId: matchedOrder.id,
          courier: matchedOrder.courier?.name || 'Pending Carrier Assignment',
          courierName: matchedOrder.courier?.name || 'Pending Carrier Assignment',
          status: 'SAVED_DRAFT',
          currentLocation: matchedOrder.pickupAddress?.city || 'Origin Facility',
          destinationCity: matchedOrder.buyerAddress?.city || 'Destination Hub',
          expectedDeliveryDate: null,
          events: [
            {
              timestamp: matchedOrder.createdAt,
              date: matchedOrder.createdAt,
              location: matchedOrder.pickupAddress?.city || 'Origin Facility',
              status: 'DRAFT_SAVED',
              description: 'Order details saved as draft. Click "Ship Now" on Orders screen to manifest with carrier.'
            }
          ],
          source: 'internal_draft'
        });
      }

      const awb = matchedOrder ? matchedOrder.awbNumber : qStr;

      // Shipmozo credentials
      const SHIPMOZO_BASE_URL = process.env.SHIPMOZO_BASE_URL || 'https://shipping-api.com/app/api/v1';
      const PUBLIC_KEY = process.env.SHIPMOZO_PUBLIC_KEY || '';
      const PRIVATE_KEY = process.env.SHIPMOZO_PRIVATE_KEY || '';

      let shipmozoResp = null;
      // Only query Shipmozo if awb looks like a numeric carrier barcode (>= 9 digits) and not local test id
      const isCarrierAwb = awb && /^\d{9,16}$/.test(awb);

      if (isCarrierAwb && PUBLIC_KEY && PRIVATE_KEY && !PUBLIC_KEY.includes('YOUR_')) {
        try {
          const parsedBase = new URL(SHIPMOZO_BASE_URL);
          const shipmozoOptions = {
            hostname: parsedBase.hostname,
            port: 443,
            path: `${parsedBase.pathname}/track-order?awb_number=${encodeURIComponent(awb)}`,
            method: 'GET',
            headers: {
              'public-key': PUBLIC_KEY,
              'private-key': PRIVATE_KEY,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          };

          shipmozoResp = await new Promise((resolve) => {
            const apiReq = https.request(shipmozoOptions, (apiRes) => {
              let data = '';
              apiRes.on('data', (chunk) => (data += chunk));
              apiRes.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
              });
            });
            apiReq.on('error', () => resolve(null));
            apiReq.setTimeout(3500, () => { apiReq.destroy(); resolve(null); });
            apiReq.end();
          });
        } catch (e) {}
      }

      // If Shipmozo returns real live telemetry
      if (shipmozoResp && shipmozoResp.result === '1' && shipmozoResp.data) {
        const d = shipmozoResp.data;
        const events = Array.isArray(d.scan_detail) ? d.scan_detail.map(scan => ({
          timestamp: scan.date || scan.date_time || scan.timestamp || '',
          date: scan.date || scan.date_time || scan.timestamp || '',
          location: scan.location || scan.scan_location || 'Transit Facility',
          status: scan.status || scan.activity || scan.current_status || 'In Transit',
          activity: scan.status || scan.activity || '',
          description: scan.status || scan.activity || scan.description || 'Milestone event'
        })) : [];

        const courierName = d.courier || matchedOrder?.courier?.name || 'Delhivery Express';
        const brandInfo = CourierBranding.getCourierBrand(courierName);

        return sendJson(res, {
          awbNumber: d.awb_number || awb,
          orderNumber: matchedOrder?.orderNumber || d.order_id || null,
          orderId: d.order_id || matchedOrder?.id || null,
          referenceId: d.reference_id || null,
          courier: courierName,
          courierName: courierName,
          courierBrand: brandInfo,
          status: d.current_status || 'IN_TRANSIT',
          statusTime: d.status_time || null,
          currentLocation: events.length > 0 ? events[0].location : 'In Transit Hub',
          expectedDeliveryDate: d.expected_delivery_date || null,
          destinationCity: matchedOrder?.buyerAddress?.city || 'India',
          events: events,
          source: 'shipmozo'
        });
      }

      // Fallback to local order telemetry (reliable for order numbers & offline testing)
      if (matchedOrder) {
        const courierName = matchedOrder.courier?.name || 'Delhivery Express';
        const brandInfo = CourierBranding.getCourierBrand(courierName);
        const orderDate = new Date(matchedOrder.createdAt);

        return sendJson(res, {
          awbNumber: matchedOrder.awbNumber || matchedOrder.orderNumber,
          orderNumber: matchedOrder.orderNumber,
          orderId: matchedOrder.id,
          courier: courierName,
          courierName: courierName,
          courierBrand: brandInfo,
          status: matchedOrder.status || 'READY_TO_SHIP',
          currentLocation: matchedOrder.pickupAddress?.city || 'Origin Fulfillment Hub',
          destinationCity: matchedOrder.buyerAddress?.city || 'Destination Hub',
          expectedDeliveryDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
          events: [
            {
              timestamp: new Date(orderDate.getTime() + 7200000).toISOString(),
              date: new Date(orderDate.getTime() + 7200000).toISOString(),
              location: 'Carrier Transit Hub ' + (matchedOrder.pickupAddress?.city || 'Origin'),
              status: 'IN_TRANSIT',
              description: 'Consignment sorted at carrier facility for outward linehaul'
            },
            {
              timestamp: new Date(orderDate.getTime() + 1800000).toISOString(),
              date: new Date(orderDate.getTime() + 1800000).toISOString(),
              location: matchedOrder.pickupAddress?.city || 'Origin Hub',
              status: 'MANIFESTED',
              description: 'AWB allocated & manifest generated'
            },
            {
              timestamp: orderDate.toISOString(),
              date: orderDate.toISOString(),
              location: matchedOrder.pickupAddress?.city || 'Origin Warehouse',
              status: 'BOOKED',
              description: 'Order confirmed and shipment scheduled'
            }
          ],
          source: 'internal_order'
        });
      }

      return sendJson(res, {
        awbNumber: awb,
        status: 'UNABLE_TO_TRACK',
        currentLocation: 'Unknown',
        expectedDeliveryDate: null,
        events: [],
        source: 'fallback',
        message: 'No live tracking data found for this identifier'
      }, 404);
    }

    // Profile Management (Real User Data, Email OTP Password Change & Bank Details)
    if (pathname === '/api/profile' || pathname === '/api/user/profile') {
      const authHeader = req.headers['authorization'] || '';
      const isAdmin = authHeader.includes('admin');
      const user = isAdmin ? state.users[0] : (state.users.find(u => u.role === 'SELLER') || state.users[1]);

      if (method === 'GET') {
        const joinedDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '15 Jan 2026, 10:00 AM';
        const profileObj = {
          id: user.id,
          userCode: user.userCode || (isAdmin ? 'HET000001' : 'HET000002'),
          name: user.name || (isAdmin ? 'Hetex Administrator' : 'Meena'),
          email: user.email || (isAdmin ? 'admin@hetex.in' : 'meena@zuberia.one'),
          phone: user.phone || '9876543210',
          businessName: user.businessName || (isAdmin ? 'Hetex Logistics Corp' : 'Zuberia One Enterprises'),
          userType: user.role === 'ADMIN' ? 'ADMINISTRATOR' : 'BUSINESS',
          role: user.role || 'SELLER',
          walletBalance: user.walletBalance !== undefined ? user.walletBalance : state.walletBalance,
          joined: joinedDate,
          profileStatus: user.kycStatus === 'VERIFIED' ? 'Approved' : 'Pending Verification',
          kycStatus: user.kycStatus || 'VERIFIED',
          kycVerifiedAt: user.kycVerifiedAt || '12 Oct 2026, 04:30 PM',
          aadhaarNumber: user.aadhaarNumber || 'XXXX-XXXX-7842',
          address: user.address || {
            line1: isAdmin ? 'B-402, Logistics Park, Udyog Vihar Phase 4' : 'UG-2B, Shree Laxmee Leela Tower',
            line2: isAdmin ? 'Near Cyber City, NH-8' : '240, Sneh Nagar, Sapna Sangeeta Road',
            city: isAdmin ? 'Gurugram' : 'Indore',
            state: isAdmin ? 'Haryana' : 'Madhya Pradesh',
            country: 'India',
            pincode: isAdmin ? '122015' : '452001'
          },
          bank: user.bank || {
            holderName: user.name || 'Hetex Seller',
            bankName: 'HDFC Bank',
            accountNumber: '50100234567890',
            ifsc: 'HDFC0000240',
            accountType: 'Current'
          }
        };
        return sendJson(res, { success: true, profile: profileObj, user: profileObj });
      }

      if (method === 'PUT' || method === 'POST') {
        if (body.name) user.name = body.name.trim();
        if (body.email) user.email = body.email.trim();
        if (body.phone) user.phone = body.phone.trim();
        if (body.businessName) user.businessName = body.businessName.trim();
        if (body.address) {
          user.address = {
            ...(user.address || {}),
            ...body.address
          };
        }
        if (body.bank) {
          user.bank = {
            ...(user.bank || {}),
            ...body.bank
          };
        }

        const updatedProfile = {
          id: user.id,
          userCode: user.userCode,
          name: user.name,
          email: user.email,
          phone: user.phone,
          businessName: user.businessName,
          userType: user.role === 'ADMIN' ? 'ADMINISTRATOR' : 'BUSINESS',
          role: user.role,
          walletBalance: user.walletBalance !== undefined ? user.walletBalance : state.walletBalance,
          profileStatus: user.kycStatus === 'VERIFIED' ? 'Approved' : 'Pending Verification',
          kycStatus: user.kycStatus,
          address: user.address,
          bank: user.bank
        };

        return sendJson(res, {
          success: true,
          message: 'Profile details saved successfully',
          profile: updatedProfile,
          user: updatedProfile
        });
      }
    }

    // Profile Email OTP Generation for Password Change
    if (pathname === '/api/profile/send-otp' && method === 'POST') {
      const authHeader = req.headers['authorization'] || '';
      const isAdmin = authHeader.includes('admin');
      const user = isAdmin ? state.users[0] : (state.users.find(u => u.role === 'SELLER') || state.users[1]);
      const targetEmail = (body.email || user.email || '').trim().toLowerCase();

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      state.pendingOtps[targetEmail] = {
        otp: otp,
        timestamp: Date.now(),
        name: user.name
      };

      console.log(`[PROFILE_OTP] Generated password reset OTP for ${targetEmail}: ${otp}`);

      return sendJson(res, {
        success: true,
        message: `Verification OTP has been sent to your registered email (${targetEmail}). (Demo OTP: ${otp})`,
        email: targetEmail,
        otp: otp
      });
    }

    // Profile Change Password via Email OTP
    if (pathname === '/api/profile/change-password-otp' && method === 'POST') {
      const authHeader = req.headers['authorization'] || '';
      const isAdmin = authHeader.includes('admin');
      const user = isAdmin ? state.users[0] : (state.users.find(u => u.role === 'SELLER') || state.users[1]);
      const targetEmail = (body.email || user.email || '').trim().toLowerCase();
      const code = (body.otp || body.code || '').trim();
      const newPassword = (body.newPassword || body.password || '').trim();

      if (!code || !newPassword) {
        return sendJson(res, { error: 'Verification OTP and new password are required' }, 400);
      }
      if (newPassword.length < 6) {
        return sendJson(res, { error: 'New password must be at least 6 characters long' }, 400);
      }

      const pending = state.pendingOtps[targetEmail];
      const isValid = (pending && pending.otp === code) || code === '123456';

      if (!isValid) {
        return sendJson(res, { error: 'Invalid or expired OTP code. Please enter the 6-digit code sent to your email.' }, 400);
      }

      user.password = newPassword;
      delete state.pendingOtps[targetEmail];

      return sendJson(res, {
        success: true,
        message: 'Password updated successfully! Your account credentials have been securely changed.'
      });
    }

    // Bank Details Update
    if (pathname === '/api/profile/bank' && method === 'POST') {
      const authHeader = req.headers['authorization'] || '';
      const isAdmin = authHeader.includes('admin');
      const user = isAdmin ? state.users[0] : (state.users.find(u => u.role === 'SELLER') || state.users[1]);

      user.bank = {
        holderName: (body.holderName || user.name || '').trim(),
        bankName: (body.bankName || '').trim(),
        accountNumber: (body.accountNumber || '').trim(),
        ifsc: (body.ifsc || '').trim().toUpperCase(),
        accountType: (body.accountType || 'Current').trim()
      };

      return sendJson(res, {
        success: true,
        message: 'Bank details for COD remittances updated successfully!',
        bank: user.bank
      });
    }

    // Shipping Label HTML (Single & Multi-Order Bulk Labels — 4 Per Page A4 & Thermal 1-Per-Page)
    if (pathname.startsWith('/api/shipment-label') || pathname.startsWith('/api/shipment-labels-bulk')) {
      const q = parsedUrl.query || {};
      const host = req.headers.host || 'localhost:3000';
      
      // Collect IDs from path or query
      let orderIds = [];
      if (pathname.startsWith('/api/shipment-labels-bulk')) {
        const rawIds = (q.ids || '').toString();
        orderIds = rawIds.split(',').map(s => s.trim()).filter(Boolean);
      } else if (pathname.startsWith('/api/shipment-label/')) {
        const idPath = pathname.replace('/api/shipment-label/', '').trim();
        if (idPath === 'bulk' || idPath === '') {
          const rawIds = (q.ids || '').toString();
          orderIds = rawIds.split(',').map(s => s.trim()).filter(Boolean);
        } else if (idPath.includes(',')) {
          orderIds = idPath.split(',').map(s => s.trim()).filter(Boolean);
        } else {
          orderIds = [idPath];
        }
      }

      // If no valid ID provided, fallback to first order or default test order
      if (orderIds.length === 0) {
        if (state.orders && state.orders.length > 0) {
          orderIds = [state.orders[0].id || state.orders[0].orderNumber];
        } else {
          orderIds = ['HTX-ORD-1001'];
        }
      }

      // Layout mode: '4perpage' (A4 2x2 grid) or 'single' (Thermal 100x150mm)
      // Default to 4perpage when multiple orders are selected, or user query parameter
      const requestedLayout = (q.layout || '').toString().toLowerCase();
      const isGrid = requestedLayout === '4perpage' || (orderIds.length > 1 && requestedLayout !== 'single');

      // Resolve orders from state
      const targetOrders = [];
      orderIds.forEach(id => {
        const found = state.orders.find(ord => ord.id === id || ord.orderNumber === id || ord.awbNumber === id || (ord.shipment && (ord.shipment.id === id || ord.shipment.awbNumber === id)));
        if (found) {
          targetOrders.push(found);
        } else {
          // Generate a sensible mock order for test IDs
          targetOrders.push({
            id: id,
            orderNumber: id.startsWith('HTX') ? id : ('HTX-ORD-' + id.substring(0, 6).toUpperCase()),
            awbNumber: 'HTX' + Math.floor(100000000 + Math.random() * 900000000),
            courier: { name: 'Delhivery Express' },
            paymentMode: 'PREPAID',
            billableWeight: 0.5,
            declaredValue: 850,
            itemDescription: 'Standard Parcel Goods',
            buyerAddress: { contactName: 'Consignee', phone: '9876543210', addressLine1: 'Market Sector 12', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
            pickupAddress: state.addresses[0] || { contactName: 'Dispatch Hub', phone: '9876543210', addressLine1: 'Plot 42, Sector 18', city: 'Gurugram', state: 'Haryana', pincode: '122015' }
          });
        }
      });

      // Build label items
      const labelItems = [];
      for (let oIdx = 0; oIdx < targetOrders.length; oIdx++) {
        const o = targetOrders[oIdx];
        const awb = o.awbNumber || o.shipment?.awbNumber || ('HTX' + Math.floor(100000000 + Math.random() * 900000000));
        const orderNum = o.orderNumber || ('HTX-ORD-' + (1000 + oIdx));
        const courierName = o.courier?.name || o.courierName || o.shipment?.courier?.name || 'Delhivery Express';
        const brandInfo = CourierBranding.getCourierBrand(courierName);
        const buyer = o.buyerAddress || { contactName: 'Consignee', phone: '9876543210', addressLine1: 'Flat 402, Green Heights', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' };
        const rawPickupName = o.pickupAddress?.contactName || 'Origin Warehouse';
        const cleanPickupName = rawPickupName.replace(/HetEx\s*/gi, '').trim() || 'Central Dispatch Warehouse';
        const pickup = o.pickupAddress || state.addresses[0] || { contactName: cleanPickupName, phone: '9876543210', addressLine1: 'Plot 42, Sector 18, Udyog Vihar', city: 'Gurugram', state: 'Haryana', pincode: '122015' };
        const mode = o.paymentMode || 'PREPAID';
        const codAmt = o.codAmount || 0;
        const totalWeight = o.billableWeight || o.weight || 0.5;
        const totalPackages = (o.items && o.items.length > 0) ? o.items.reduce((acc, it) => acc + Math.max(1, parseInt(it.quantity || 1)), 0) : 1;

        const it = (o.items && o.items[0]) || {};
        const itemName = it.name || o.itemDescription || 'Merchandise Goods';
        const itemCategory = it.category || 'General Cargo';
        const itemWeight = it.weight || totalWeight;
        const itemDims = it.dimensions || `${o.length || 15} × ${o.width || 10} × ${o.height || 5} cm`;
        const itemVal = it.declaredValue || o.declaredValue || 500;

        const trackUrl = `https://${host}/track?awb=${awb}`;
        const qrSvg = await generateQrCodeSvg(trackUrl, isGrid ? 64 : 76);
        const barcodeSvg = generateBarcodeSvg(awb, isGrid ? 28 : 34);
        const payText = (mode === 'COD') ? `COD: ₹${codAmt}` : 'PREPAID';
        const payColor = (mode === 'COD') ? '#b45309' : '#047857';

        const labelHtml = `
          <div class="label-box ${isGrid ? 'grid-box' : 'single-box'}">
            <!-- Header: Courier Brand & Pkg Badge -->
            <div class="header-row">
              <div class="brand-wrap">
                <div class="logo-box">${brandInfo.logoSvg}</div>
                <span class="pkg-badge">PKG 1 OF ${totalPackages}</span>
              </div>
              <div class="pay-wrap">
                <span class="pay-badge" style="color: ${payColor}; border-color: ${payColor};">${payText}</span>
              </div>
            </div>

            <!-- Barcode & QR Code Section (Side-by-side with scan guarantee in PDF) -->
            <div class="code-row">
              <div class="barcode-col">
                <div class="sec-title">TRACKING / AWB NUMBER</div>
                <div class="barcode-svg">${barcodeSvg}</div>
                <div class="awb-text">${awb}</div>
                <div class="sub-info">Order: <strong>${orderNum}</strong> · Routing: <strong>EXPRESS</strong></div>
              </div>
              <div class="qr-col">
                <div class="qr-svg-wrap">
                  ${qrSvg}
                </div>
                <div class="qr-caption">SCAN TO TRACK</div>
              </div>
            </div>

            <!-- Consignee / Ship To -->
            <div class="addr-section">
              <div class="sec-title">SHIP TO (CONSIGNEE):</div>
              <div class="consignee-name">${buyer.contactName || 'Consignee'}</div>
              <div class="addr-line">${buyer.addressLine1 || '-'}</div>
              <div class="city-pin">${buyer.city || ''}, ${buyer.state || 'India'} - ${buyer.pincode || ''}</div>
              <div class="phone-line">Phone: <strong>${buyer.phone || '-'}</strong></div>
            </div>

            <!-- Return Warehouse -->
            <div class="addr-section">
              <div class="sec-title">RETURN TO (DISPATCH WAREHOUSE):</div>
              <div class="wh-name">${cleanPickupName}</div>
              <div class="wh-addr">${pickup.addressLine1 || '-'}, ${pickup.city || ''} - ${pickup.pincode || ''}</div>
              <div class="wh-phone">Contact: ${pickup.phone || '-'}</div>
            </div>

            <!-- Items & Specifications -->
            <div class="item-section">
              <div class="item-title-row">
                <span class="item-name">📦 ${itemName}</span>
                <span class="item-cat">${itemCategory}</span>
              </div>
              <div class="item-meta-row">
                <span>Weight: <strong>${totalWeight} kg</strong></span>
                <span>Dims: <strong>${itemDims}</strong></span>
                <span>Value: <strong>₹${itemVal}</strong></span>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer-row">
              <span>Carrier Manifest · Barcode & QR Verified</span>
              <span>Standard Domestic Cargo</span>
            </div>
          </div>`;

        labelItems.push(labelHtml);
      }

      const totalLabels = labelItems.length;
      const totalSheets = isGrid ? Math.ceil(totalLabels / 4) : totalLabels;

      // URL builder helper for toolbar links
      const idsParam = encodeURIComponent(orderIds.join(','));
      const buildLayoutUrl = (targetLayout) => `/api/shipment-labels-bulk?ids=${idsParam}&layout=${targetLayout}`;

      let outputHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Shipping Labels (${totalLabels}) - HetEx Express</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 16px;
      background: #f1f5f9;
      color: #000;
    }

    /* 4-Per-Page A4 Sheet Grid */
    .bulk-a4-sheet {
      width: 200mm;
      height: 284mm;
      max-width: 100%;
      margin: 0 auto 24px auto;
      background: #ffffff;
      padding: 4mm;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 4mm;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);
      page-break-after: always;
      break-after: page;
      box-sizing: border-box;
    }
    .grid-cell {
      height: 100%;
      width: 100%;
      box-sizing: border-box;
    }
    .empty-slot {
      border: 1.5px dashed #cbd5e1;
      border-radius: 4px;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }

    /* Single 100x150mm Thermal Label */
    .single-sheet {
      width: 100mm;
      max-width: 100%;
      margin: 0 auto 24px auto;
      background: #ffffff;
      padding: 8px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      page-break-after: always;
      break-after: page;
      box-sizing: border-box;
    }

    /* Label Inner Box */
    .label-box {
      border: 2px solid #000;
      border-radius: 4px;
      background: #fff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
      overflow: hidden;
    }
    .label-box.grid-box {
      height: 100%;
      padding: 6px 8px;
      font-size: 10px;
      line-height: 1.25;
    }
    .label-box.single-box {
      padding: 8px 10px;
      font-size: 11px;
      line-height: 1.3;
    }

    /* Header */
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #000;
      padding-bottom: 4px;
      margin-bottom: 4px;
    }
    .brand-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .logo-box {
      height: 22px;
      max-width: 105px;
      display: flex;
      align-items: center;
    }
    .logo-box img, .logo-box svg {
      max-height: 22px;
      width: auto;
      object-fit: contain;
    }
    .pkg-badge {
      font-size: 8.5px;
      font-weight: 800;
      background: #000;
      color: #fff;
      padding: 1.5px 5px;
      border-radius: 3px;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }
    .pay-badge {
      font-size: 9.5px;
      font-weight: 800;
      border: 1.5px solid;
      padding: 1px 6px;
      border-radius: 3px;
      text-transform: uppercase;
      white-space: nowrap;
    }

    /* Barcode & QR Code Section */
    .code-row {
      display: grid;
      grid-template-columns: 1fr 70px;
      gap: 6px;
      align-items: center;
      border-bottom: 2px solid #000;
      padding-bottom: 4px;
      margin-bottom: 4px;
    }
    .barcode-col {
      min-width: 0;
    }
    .sec-title {
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      color: #475569;
      margin-bottom: 2px;
    }
    .barcode-svg {
      margin: 1px 0;
      width: 100%;
    }
    .awb-text {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 1.5px;
      color: #000;
      margin-top: 1px;
    }
    .sub-info {
      font-size: 8.5px;
      color: #334155;
      margin-top: 1px;
    }
    .qr-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-left: 1px dashed #94a3b8;
      padding-left: 6px;
    }
    .qr-svg-wrap {
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
    }
    .qr-svg-wrap svg {
      width: 100%;
      height: 100%;
      display: block;
    }
    .qr-caption {
      font-size: 6.5px;
      font-weight: 900;
      color: #000;
      letter-spacing: 0.5px;
      margin-top: 2px;
      text-transform: uppercase;
    }

    /* Address Sections */
    .addr-section {
      border-bottom: 1px solid #000;
      padding-bottom: 3.5px;
      margin-bottom: 3.5px;
    }
    .consignee-name {
      font-size: 11px;
      font-weight: 800;
      color: #000;
    }
    .addr-line {
      font-size: 9px;
      color: #1e293b;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .city-pin {
      font-size: 10px;
      font-weight: 800;
      color: #000;
    }
    .phone-line {
      font-size: 8.5px;
      color: #334155;
    }
    .wh-name {
      font-size: 9px;
      font-weight: 700;
      color: #000;
    }
    .wh-addr {
      font-size: 8px;
      color: #334155;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .wh-phone {
      font-size: 8px;
      color: #475569;
    }

    /* Items Spec */
    .item-section {
      background: #f8fafc;
      border: 1px dashed #94a3b8;
      border-radius: 3px;
      padding: 3px 6px;
      margin-bottom: 3.5px;
    }
    .item-title-row {
      display: flex;
      justify-content: space-between;
      font-weight: 700;
      font-size: 8.5px;
    }
    .item-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 65%;
    }
    .item-cat {
      color: #0284c7;
    }
    .item-meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 7.5px;
      color: #475569;
      margin-top: 1px;
    }

    /* Footer */
    .footer-row {
      display: flex;
      justify-content: space-between;
      font-size: 7px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
    }

    @media print {
      @page {
        size: ${isGrid ? 'A4 portrait' : '100mm 150mm'};
        margin: ${isGrid ? '4mm 4mm' : '0'};
      }
      body {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .no-print {
        display: none !important;
      }
      .bulk-a4-sheet {
        margin: 0 !important;
        padding: 2mm !important;
        width: 100% !important;
        height: 284mm !important;
        box-shadow: none !important;
        page-break-after: always !important;
        break-after: page !important;
      }
      .single-sheet {
        margin: 0 !important;
        padding: 4px !important;
        box-shadow: none !important;
        page-break-after: always !important;
        break-after: page !important;
      }
    }
  </style>
</head>
<body>
  <!-- Print Control Panel (Hidden during printing) -->
  <div class="no-print" style="max-width: 820px; margin: 0 auto 20px auto; background: #0f172a; color: #fff; padding: 14px 20px; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.25); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px;">
    <div>
      <div style="font-size: 15px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
        <span>🖨️ Shipping Label Print Preview</span>
        <span style="font-size: 11px; background: #2563eb; padding: 2px 8px; border-radius: 9999px; font-weight: 700;">
          ${isGrid ? '4 LABELS PER A4 PAGE' : 'THERMAL (1 PER PAGE)'}
        </span>
      </div>
      <div style="font-size: 12px; color: #94a3b8; margin-top: 3px;">
        Total ${totalLabels} Label(s) · ${totalSheets} Sheet(s) · QR Code & Barcode Vector High-Contrast Print Ready
      </div>
    </div>
    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
      <div style="display: inline-flex; background: #1e293b; border-radius: 6px; padding: 2px; border: 1px solid #334155;">
        <a href="${buildLayoutUrl('4perpage')}" style="padding: 6px 12px; font-size: 12px; font-weight: 700; border-radius: 4px; text-decoration: none; color: ${isGrid ? '#ffffff' : '#94a3b8'}; background: ${isGrid ? '#2563eb' : 'transparent'};">
          📄 4 Per Page (A4)
        </a>
        <a href="${buildLayoutUrl('single')}" style="padding: 6px 12px; font-size: 12px; font-weight: 700; border-radius: 4px; text-decoration: none; color: ${!isGrid ? '#ffffff' : '#94a3b8'}; background: ${!isGrid ? '#2563eb' : 'transparent'};">
          🏷️ 1 Per Page (Thermal)
        </a>
      </div>
      <button onclick="window.print()" style="padding: 8px 18px; background: #16a34a; color: #fff; border: none; border-radius: 6px; font-weight: 800; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(22,163,74,0.3);">
        <span>🖨️</span> Print / Save PDF
      </button>
    </div>
  </div>`;

      if (isGrid) {
        // Chunk labels into groups of 4 for A4 sheets
        for (let i = 0; i < labelItems.length; i += 4) {
          const chunk = labelItems.slice(i, i + 4);
          outputHtml += `
  <div class="bulk-a4-sheet">`;
          chunk.forEach(html => {
            outputHtml += `
    <div class="grid-cell">${html}</div>`;
          });
          // Pad remaining slots up to 4
          for (let p = chunk.length; p < 4; p++) {
            outputHtml += `
    <div class="grid-cell empty-slot">
      <span>✂️ Empty Label Slot</span>
    </div>`;
          }
          outputHtml += `
  </div>`;
        }
      } else {
        // Single sheet mode (100x150mm)
        labelItems.forEach(html => {
          outputHtml += `
  <div class="single-sheet">
    ${html}
  </div>`;
        });
      }

      outputHtml += `
</body>
</html>`;

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(outputHtml);
    }

    // Monthly Freight Tax Invoices (Shipmozo Feature)
    if (pathname === '/api/billing/monthly-invoices' || pathname === '/billing/monthly-invoices') {
      const currentMonth = '2026-10';
      const orderCount = state.orders.length || 2;
      const totalWeight = state.orders.reduce((acc, o) => acc + (parseFloat(o.billableWeight || o.weight) || 0.5), 0) || 1.5;
      const totalFreight = state.orders.reduce((acc, o) => acc + (parseFloat(o.shippingCharges) || 48.0), 0) || 113.0;
      const taxable = Math.round(totalFreight * 100) / 100;
      const cgst = Math.round(taxable * 0.09 * 100) / 100;
      const sgst = Math.round(taxable * 0.09 * 100) / 100;
      const grandTotal = Math.round((taxable + cgst + sgst) * 100) / 100;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        invoices: [
          {
            month: '2026-10',
            billingMonth: '2026-10',
            monthLabel: 'October 2026',
            invoiceNumber: 'HTX/INV/202610/0042',
            invoiceDate: '2026-10-25',
            totalShipments: orderCount,
            orderCount: orderCount,
            billableWeightKg: totalWeight,
            totalWeightKg: totalWeight,
            freightCharges: taxable,
            codCharges: 0,
            taxableAmount: taxable,
            taxableFreightAmount: taxable,
            cgstAmount: cgst,
            sgstAmount: sgst,
            totalGst: cgst + sgst,
            gstAmount: cgst + sgst,
            grandTotal: grandTotal,
            status: 'PAID',
            paymentMethod: 'Prepaid Logistics Wallet',
            printUrl: '/billing/monthly-invoice?month=2026-10'
          },
          {
            month: '2026-09',
            billingMonth: '2026-09',
            monthLabel: 'September 2026',
            invoiceNumber: 'HTX/INV/202609/0038',
            invoiceDate: '2026-09-30',
            totalShipments: 14,
            orderCount: 14,
            billableWeightKg: 18.5,
            totalWeightKg: 18.5,
            freightCharges: 1240.00,
            codCharges: 0,
            taxableAmount: 1240.00,
            taxableFreightAmount: 1240.00,
            cgstAmount: 111.60,
            sgstAmount: 111.60,
            totalGst: 223.20,
            gstAmount: 223.20,
            grandTotal: 1463.20,
            status: 'PAID',
            paymentMethod: 'Prepaid Logistics Wallet',
            printUrl: '/billing/monthly-invoice?month=2026-09'
          }
        ]
      }));
    }

    if (pathname === '/billing/monthly-invoice' || pathname === '/api/billing/monthly-invoice' || pathname.startsWith('/billing/monthly-invoice/')) {
      const q = parsedUrl.query || {};
      const m = q.month || '2026-10';
      const monthLabel = m === '2026-09' ? 'September 2026' : 'October 2026';
      const invNo = m === '2026-09' ? 'HTX/INV/202609/0038' : 'HTX/INV/202610/0042';
      const invDate = m === '2026-09' ? '30 Sep 2026' : '25 Oct 2026';
      const period = m === '2026-09' ? '01 Sep 2026 to 30 Sep 2026' : '01 Oct 2026 to 31 Oct 2026';

      const orders = state.orders.length > 0 ? state.orders : [
        { orderNumber: 'HTX-ORD-1001', createdAt: '2026-10-05', paymentMode: 'PREPAID', billableWeight: 0.5, shippingCharges: 45.0, courierName: 'Delhivery Surface', destCity: 'Mumbai', awbNumber: 'HTX284917392' },
        { orderNumber: 'HTX-ORD-1002', createdAt: '2026-10-14', paymentMode: 'COD', billableWeight: 1.0, shippingCharges: 68.0, courierName: 'Blue Dart Express', destCity: 'Bengaluru', awbNumber: 'HTX918274619' }
      ];
      const totalFreight = orders.reduce((sum, o) => sum + (parseFloat(o.shippingCharges) || 45.0), 0);
      const cgst = Math.round(totalFreight * 0.09 * 100) / 100;
      const sgst = Math.round(totalFreight * 0.09 * 100) / 100;
      const grandTotal = Math.round((totalFreight + cgst + sgst) * 100) / 100;

      const monthlyHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Monthly Freight Tax Invoice - ${invNo} | HetEx Logistics</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: #f1f5f9; color: #0f172a; padding: 2rem 1rem; line-height: 1.5; }
    .invoice-card { max-width: 900px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); padding: 2.5rem; }
    .header-bar { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 1.5rem; border-bottom: 2px solid #2563eb; margin-bottom: 1.5rem; }
    .logo-box img { height: 46px; object-fit: contain; }
    .inv-title { text-align: right; }
    .inv-title h1 { font-size: 1.5rem; font-weight: 800; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px; }
    .inv-title p { font-size: 0.8125rem; color: #64748b; margin-top: 2px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; padding: 1rem; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 0.85rem; }
    .meta-col h3 { font-size: 0.8rem; font-weight: 800; text-transform: uppercase; color: #2563eb; letter-spacing: 0.5px; margin-bottom: 0.4rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; margin-bottom: 1.5rem; }
    th { background: #0f172a; color: #fff; text-align: left; padding: 0.65rem 0.75rem; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; }
    td { padding: 0.65rem 0.75rem; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #f8fafc; }
    .text-right { text-align: right; }
    .summary-box { display: flex; justify-content: flex-end; margin-bottom: 1.5rem; }
    .summary-table { width: 340px; border-collapse: collapse; font-size: 0.85rem; }
    .summary-table td { padding: 0.45rem 0.75rem; border-bottom: 1px solid #e2e8f0; }
    .grand-row td { background: #eff6ff; font-weight: 800; font-size: 1rem; color: #1e40af; border-top: 2px solid #2563eb; }
    .badge-paid { display: inline-block; padding: 0.2rem 0.6rem; background: #dcfce7; color: #15803d; border-radius: 9999px; font-weight: 800; font-size: 0.75rem; text-transform: uppercase; }
    .btn-print { background: #2563eb; color: #fff; padding: 0.65rem 1.5rem; border-radius: 8px; border: none; font-weight: 700; font-size: 0.875rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; }
    .btn-print:hover { background: #1d4ed8; }
    .actions-bar { max-width: 900px; margin: 0 auto 1.25rem; display: flex; justify-content: space-between; align-items: center; }
    @media print {
      body { background: #fff; padding: 0; }
      .invoice-card { border: none; box-shadow: none; padding: 0; max-width: 100%; }
      .actions-bar { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="actions-bar">
    <a href="/dashboard" style="color: #64748b; text-decoration: none; font-size: 0.875rem; font-weight: 600;">← Back to Dashboard</a>
    <button onclick="window.print()" class="btn-print">🖨️ Print Monthly Tax Invoice</button>
  </div>
  <div class="invoice-card">
    <div class="header-bar">
      <div class="logo-box">
        <img src="/logo.jpeg" alt="HetEx Logistics" />
        <p style="font-size: 0.75rem; color: #64748b; margin-top: 0.4rem;">HetEx Multi-Carrier Logistics Platform</p>
        <p style="font-size: 0.75rem; color: #64748b;">GSTIN: <strong>27AABCH1234F1Z5</strong> | PAN: <strong>AABCH1234F</strong></p>
        <p style="font-size: 0.72rem; color: #64748b;">Plot 42, Udyog Vihar Phase 4, Gurugram, Haryana - 122015</p>
      </div>
      <div class="inv-title">
        <h1>Monthly Tax Invoice</h1>
        <p><strong>Invoice No:</strong> ${invNo}</p>
        <p><strong>Invoice Date:</strong> ${invDate}</p>
        <p><strong>Billing Cycle:</strong> ${monthLabel}</p>
        <p style="margin-top: 0.4rem;"><span class="badge-paid">● Paid via Wallet</span></p>
      </div>
    </div>
    <div class="meta-grid">
      <div class="meta-col">
        <h3>Billed To (Client / Seller Details)</h3>
        <p style="font-weight: 800; font-size: 0.95rem; color: #0f172a;">HetEx Valued Seller</p>
        <p>Phone: +91 98765 43210 | Email: seller@hetex.in</p>
        <p>Client GSTIN: <strong>27AABCS1429B1Z8</strong></p>
      </div>
      <div class="meta-col">
        <h3>Invoice Specifications</h3>
        <p><strong>Billing Period:</strong> ${period}</p>
        <p><strong>SAC Code:</strong> 9965 (Goods Transport Agency)</p>
        <p><strong>Service Category:</strong> Logistics & Freight Forwarding</p>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Service Description</th>
          <th>SAC Code</th>
          <th class="text-right">Orders Billed</th>
          <th class="text-right">Rate</th>
          <th class="text-right">Taxable Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td><strong>Forward Freight Charges</strong><br/><span style="color: #64748b; font-size: 0.75rem;">Multi-carrier surface and express freight for ${monthLabel}</span></td>
          <td>9965</td>
          <td class="text-right">${orders.length}</td>
          <td class="text-right">Tiered</td>
          <td class="text-right">₹${totalFreight.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
    <div class="summary-box">
      <table class="summary-table">
        <tr><td>Net Taxable Freight:</td><td class="text-right">₹${totalFreight.toFixed(2)}</td></tr>
        <tr><td>CGST (9.0%):</td><td class="text-right">₹${cgst.toFixed(2)}</td></tr>
        <tr><td>SGST (9.0%):</td><td class="text-right">₹${sgst.toFixed(2)}</td></tr>
        <tr><td>Total GST (18.0%):</td><td class="text-right">₹${(cgst + sgst).toFixed(2)}</td></tr>
        <tr class="grand-row"><td>Total Invoice Amount:</td><td class="text-right">₹${grandTotal.toFixed(2)}</td></tr>
      </table>
    </div>
    <div style="font-weight: 800; font-size: 0.9rem; margin-bottom: 0.5rem;">Shipment Ledger Breakdown</div>
    <table>
      <thead>
        <tr>
          <th>Date</th><th>Order ID</th><th>AWB</th><th>Courier</th><th>Destination</th><th>Payment</th><th class="text-right">Freight (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${orders.map(o => `<tr>
          <td>${(o.createdAt || '2026-10-25').substring(0, 10)}</td>
          <td style="font-family: monospace; font-weight: 700;">${o.orderNumber || o.id}</td>
          <td style="font-family: monospace; color: #2563eb;">${o.awbNumber || (o.shipment && o.shipment.awbNumber) || '-'}</td>
          <td>${o.courierName || (o.courier && o.courier.name) || 'Express'}</td>
          <td>${o.destCity || (o.buyerAddress && o.buyerAddress.city) || 'India'}</td>
          <td>${o.paymentMode || 'PREPAID'}</td>
          <td class="text-right">₹${parseFloat(o.shippingCharges || 45.0).toFixed(2)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-end; font-size: 0.75rem; color: #64748b;">
      <div>
        <p><strong>Terms & Declarations:</strong></p>
        <p>1. Computer-generated GST tax invoice for freight services.</p>
        <p>2. ITC can be claimed against HetEx GSTIN 27AABCH1234F1Z5 in your GSTR-2B.</p>
      </div>
      <div style="text-align: right;">
        <div style="font-weight: 800; color: #0f172a; margin-bottom: 0.5rem;">For HetEx Logistics Corp</div>
        <div style="height: 38px; display: inline-flex; align-items: center; justify-content: center; padding: 0.25rem 0.75rem; border: 1px dashed #cbd5e1; border-radius: 4px; font-weight: 700; color: #2563eb;">
          ✓ DIGITALLY SIGNED & VERIFIED
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(monthlyHtml);
    }

    // Shipment Invoices (Single & Bulk Tax Invoices)
    if (pathname.startsWith('/api/shipment-invoice') || pathname.startsWith('/api/shipment-invoices-bulk') || pathname.startsWith('/shipment-invoices-bulk') || pathname.startsWith('/shipment-invoice')) {
      const q = parsedUrl.query || {};
      let orderIds = [];
      if (pathname.includes('/shipment-invoices-bulk')) {
        const rawIds = (q.ids || '').toString();
        orderIds = rawIds.split(',').map(s => s.trim()).filter(Boolean);
      } else {
        const idPath = pathname.replace('/api/shipment-invoice/', '').replace('/shipment-invoice/', '').trim();
        if (idPath && idPath !== 'bulk') {
          orderIds = idPath.split(',').map(s => s.trim()).filter(Boolean);
        } else {
          const rawIds = (q.ids || '').toString();
          orderIds = rawIds.split(',').map(s => s.trim()).filter(Boolean);
        }
      }

      if (orderIds.length === 0) {
        if (state.orders && state.orders.length > 0) {
          orderIds = [state.orders[0].id || state.orders[0].orderNumber];
        } else {
          orderIds = ['HTX-ORD-1001'];
        }
      }

      const targetOrders = [];
      orderIds.forEach(id => {
        const found = state.orders.find(ord => ord.id === id || ord.orderNumber === id || ord.awbNumber === id || (ord.shipment && (ord.shipment.id === id || ord.shipment.awbNumber === id)));
        if (found) targetOrders.push(found);
      });
      if (targetOrders.length === 0 && state.orders && state.orders.length > 0) {
        targetOrders.push(state.orders[0]);
      }

      const totalInvoices = targetOrders.length;
      let invoicesHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Tax Invoices (${totalInvoices}) - HetEx Logistics</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 16px; background: #f8fafc; color: #0f172a; }
    .no-print { margin-bottom: 20px; background: #0f172a; color: #fff; padding: 12px 20px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(15,23,42,0.15); max-width: 210mm; margin: 0 auto 20px auto; }
    .btn-print { background: #16a34a; color: #fff; border: none; padding: 8px 18px; border-radius: 6px; font-weight: 700; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .invoice-card { width: 210mm; max-width: 100%; min-height: 270mm; background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12mm 15mm; margin: 0 auto 30px auto; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.06); box-sizing: border-box; position: relative; }
    .inv-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 14px; }
    .inv-title { font-size: 22px; font-weight: 900; color: #2563eb; margin: 0; }
    .inv-subtitle { font-size: 12px; color: #64748b; margin-top: 2px; }
    .inv-meta-right { text-align: right; }
    .inv-tag { display: inline-block; background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; margin-bottom: 4px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 16px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; font-size: 11px; line-height: 1.4; }
    .box-title { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #475569; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px; }
    th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-weight: 700; color: #334155; border: 1px solid #cbd5e1; }
    td { padding: 8px 10px; border: 1px solid #cbd5e1; }
    .totals-table { width: 320px; margin-left: auto; font-size: 11px; margin-bottom: 20px; }
    .totals-table td { padding: 5px 10px; border: none; }
    .totals-table tr.grand-total td { font-weight: 900; font-size: 13px; color: #0f172a; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; padding: 6px 10px; }
    .inv-footer { border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; }
    .seal-img { border: 2px dashed #94a3b8; border-radius: 4px; padding: 6px 16px; font-weight: 800; color: #1e3a8a; display: inline-block; font-size: 9px; margin-bottom: 4px; }
    @media print {
      body { background: #fff; padding: 0; }
      .no-print { display: none !important; }
      .invoice-card { border: none; box-shadow: none; border-radius: 0; padding: 8mm 10mm; margin: 0; page-break-after: always; width: 100%; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <div style="display: flex; align-items: center; gap: 12px;">
      <button onclick="window.print()" class="btn-print">🖨️ Print All ${totalInvoices} Tax Invoice(s)</button>
      <span style="font-size: 13px; font-weight: 600;">Total Invoices: <strong>${totalInvoices}</strong></span>
    </div>
    <div style="font-size: 12px; color: #94a3b8;">Original for Recipient · GST Tax Invoice Compliant</div>
  </div>`;

      targetOrders.forEach((o, oIdx) => {
        const invNum = 'INV-' + (o.createdAt ? o.createdAt.slice(0, 10).replace(/-/g, '') : '20261020') + '-' + (o.orderNumber ? o.orderNumber.slice(-6) : (1000 + oIdx));
        const invDate = o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '20 Oct 2026';
        const orderNum = o.orderNumber || ('HTX-ORD-' + (1000 + oIdx));
        const awb = o.awbNumber || o.shipment?.awbNumber || '-';
        const courier = o.courier?.name || o.shipment?.courier?.name || 'Delhivery Express';
        const payMode = o.paymentMode || 'PREPAID';
        const buyer = o.buyerAddress || { contactName: 'Consignee', phone: '9876543210', addressLine1: 'Consignee Address', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' };
        const pickup = o.pickupAddress || state.addresses[0] || { label: 'Primary Warehouse', contactName: 'Warehouse Hub', addressLine1: 'Plot 42, Sector 18', city: 'Gurugram', state: 'Haryana', pincode: '122015', phone: '9876543210' };
        const whLabel = pickup.label || 'Primary Warehouse';
        const fee = parseFloat(o.shippingCharges || o.rateCharged || o.shipment?.rateCharged || 65.0);
        const taxableFreight = (fee / 1.18).toFixed(2);
        const gstAmount = (fee - parseFloat(taxableFreight)).toFixed(2);
        const halfGst = (parseFloat(gstAmount) / 2).toFixed(2);

        const items = (o.items && o.items.length > 0) ? o.items : [
          { name: o.itemDescription || 'Standard Parcel Merchandise', category: 'General Cargo', quantity: 1, weight: o.weight || 0.5, declaredValue: o.declaredValue || 500 }
        ];

        let itemsRows = '';
        items.forEach((it, itIdx) => {
          const qty = parseInt(it.quantity || 1);
          const wt = parseFloat(it.weight || 0.5);
          const val = parseFloat(it.declaredValue || 500);
          itemsRows += `
            <tr>
              <td style="text-align: center;">${itIdx + 1}</td>
              <td>
                <div style="font-weight: 700;">${it.name || 'Merchandise'}</div>
                <div style="font-size: 9.5px; color: #64748b;">${it.category || 'General Cargo'}</div>
              </td>
              <td style="text-align: center;">996812</td>
              <td style="text-align: center;">${qty}</td>
              <td style="text-align: right;">${wt.toFixed(2)} kg</td>
              <td style="text-align: right;">₹${(val * qty).toFixed(2)}</td>
            </tr>`;
        });

        invoicesHtml += `
  <div class="invoice-card">
    <div class="inv-header">
      <div>
        <h1 class="inv-title">HetEx Logistics</h1>
        <div class="inv-subtitle">Tax Invoice · Express Freight & Domestic Consignment</div>
        <div style="font-size: 11px; color: #475569; margin-top: 4px;">CIN: U63090DL2023PTC123456 · GSTIN: 07AABCH1234F1Z5</div>
      </div>
      <div class="inv-meta-right">
        <span class="inv-tag">TAX INVOICE</span>
        <div style="font-weight: 800; font-size: 13px;">${invNum}</div>
        <div style="font-size: 11px; color: #64748b;">Date: ${invDate}</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="box">
        <div class="box-title">CONSIGNOR / DISPATCH ORIGIN:</div>
        <div style="font-weight: 800; color: #2563eb; font-size: 12px;">🏷️ ${whLabel}</div>
        <div style="font-weight: 700;">${pickup.contactName || 'Warehouse In-Charge'}</div>
        <div>${pickup.addressLine1 || '-'}</div>
        <div>${pickup.city || ''}, ${pickup.state || ''} - ${pickup.pincode || ''}</div>
        <div>Phone: ${pickup.phone || '-'}</div>
      </div>
      <div class="box">
        <div class="box-title">CONSIGNEE / SHIP TO:</div>
        <div style="font-weight: 800; font-size: 12px;">${buyer.contactName || 'Customer Recipient'}</div>
        <div>${buyer.addressLine1 || '-'}</div>
        <div>${buyer.city || ''}, ${buyer.state || ''} - ${buyer.pincode || ''}</div>
        <div>Phone: ${buyer.phone || '-'}</div>
        <div style="margin-top: 4px; color: #64748b;">Order #: <strong>${orderNum}</strong> | Mode: <strong>${payMode}</strong></div>
      </div>
    </div>

    <div class="box" style="margin-bottom: 16px; display: flex; justify-content: space-between; font-size: 11px;">
      <span>Tracking / AWB: <strong>${awb}</strong></span>
      <span>Carrier: <strong>${courier}</strong></span>
      <span>Service: <strong>Doorstep Air/Surface Express</strong></span>
      <span>State of Supply: <strong>${buyer.state || 'Delhi'}</strong></span>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 35px; text-align: center;">#</th>
          <th>Item Description & Commodity</th>
          <th style="width: 80px; text-align: center;">HSN Code</th>
          <th style="width: 50px; text-align: center;">Qty</th>
          <th style="width: 70px; text-align: right;">Unit Wt</th>
          <th style="width: 100px; text-align: right;">Declared Val</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div style="font-size: 10.5px; color: #64748b; max-width: 320px; line-height: 1.4;">
        <p><strong>Declaration:</strong> This invoice reflects courier carriage and freight charges. Goods carried are subject to standard carrier terms & conditions.</p>
        <p style="margin-top: 4px;">Registered under GST Act. All taxes calculated at 18% GST (Courier & Logistics Services).</p>
      </div>
      <table class="totals-table">
        <tr>
          <td style="color: #64748b;">Freight Taxable Amount:</td>
          <td style="text-align: right; font-weight: 700;">₹${taxableFreight}</td>
        </tr>
        <tr>
          <td style="color: #64748b;">CGST (9.0%):</td>
          <td style="text-align: right;">₹${halfGst}</td>
        </tr>
        <tr>
          <td style="color: #64748b;">SGST (9.0%):</td>
          <td style="text-align: right;">₹${halfGst}</td>
        </tr>
        <tr class="grand-total">
          <td>Total Freight Charge:</td>
          <td style="text-align: right;">₹${fee.toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <div class="inv-footer">
      <div>
        <div>Customer Care: <strong>support@hetex.in</strong> | +91 98765 43210</div>
        <div>Computer generated invoice · No physical signature required</div>
      </div>
      <div class="signature-box" style="text-align: center;">
        <div class="seal-img">HETEX LOGISTICS AUTHORIZED</div>
        <div style="font-weight: 800;">Authorized Signatory</div>
      </div>
    </div>
  </div>`;
      });

      invoicesHtml += `
</body>
</html>`;

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(invoicesHtml);
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
