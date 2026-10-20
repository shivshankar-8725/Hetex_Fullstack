/**
 * Official Courier Branding System
 * Provides official names, colors, and authentic vector SVG logos
 * for all configured courier partners across Hetex Logistics.
 */
(function(global) {
  const COURIER_BRANDS = {
    delhivery: {
      name: 'Delhivery',
      fullName: 'Delhivery Express',
      color: '#d90429',
      bg: '#fff1f2',
      border: '#fecdd3',
      logoUrl: '/images/couriers/delhivery.svg',
      logoSvg: `<img src="/images/couriers/delhivery.svg" alt="Delhivery" class="courier-brand-logo" style="max-height: 100%; max-width: 100%; width: auto; height: auto; object-fit: contain; vertical-align: middle; display: block;" onerror="this.onerror=null;this.src='images/couriers/delhivery.svg';" />`,
      svg: `<img src="/images/couriers/delhivery.svg" alt="Delhivery" class="courier-brand-logo" style="max-height: 100%; max-width: 100%; width: auto; height: auto; object-fit: contain; vertical-align: middle; display: block;" onerror="this.onerror=null;this.src='images/couriers/delhivery.svg';" />`
    },
    bluedart: {
      name: 'Blue Dart',
      fullName: 'Blue Dart Express',
      color: '#065dac',
      bg: '#eff6ff',
      border: '#bfdbfe',
      logoUrl: '/images/couriers/bluedart.svg',
      logoSvg: `<img src="/images/couriers/bluedart.svg" alt="Blue Dart" class="courier-brand-logo" style="max-height: 100%; max-width: 100%; width: auto; height: auto; object-fit: contain; vertical-align: middle; display: block;" onerror="this.onerror=null;this.src='images/couriers/bluedart.svg';" />`,
      svg: `<img src="/images/couriers/bluedart.svg" alt="Blue Dart" class="courier-brand-logo" style="max-height: 100%; max-width: 100%; width: auto; height: auto; object-fit: contain; vertical-align: middle; display: block;" onerror="this.onerror=null;this.src='images/couriers/bluedart.svg';" />`
    },
    dtdc: {
      name: 'DTDC',
      fullName: 'DTDC Express',
      color: '#0f2d59',
      bg: '#f0f9ff',
      border: '#bae6fd',
      logoUrl: '/images/couriers/dtdc.png',
      logoSvg: `<img src="/images/couriers/dtdc.png" alt="DTDC" class="courier-brand-logo" style="max-height: 100%; max-width: 100%; width: auto; height: auto; object-fit: contain; vertical-align: middle; display: block;" onerror="this.onerror=null;this.src='images/couriers/dtdc.png';" />`,
      svg: `<img src="/images/couriers/dtdc.png" alt="DTDC" class="courier-brand-logo" style="max-height: 100%; max-width: 100%; width: auto; height: auto; object-fit: contain; vertical-align: middle; display: block;" onerror="this.onerror=null;this.src='images/couriers/dtdc.png';" />`
    },
    ekart: {
      name: 'Ekart',
      fullName: 'Ekart Logistics',
      color: '#0062a9',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      logoUrl: '/images/couriers/ekart.svg',
      logoSvg: `<img src="/images/couriers/ekart.svg" alt="Ekart" class="courier-brand-logo" style="max-height: 100%; max-width: 100%; width: auto; height: auto; object-fit: contain; vertical-align: middle; display: block;" onerror="this.onerror=null;this.src='images/couriers/ekart.svg';" />`,
      svg: `<img src="/images/couriers/ekart.svg" alt="Ekart" class="courier-brand-logo" style="max-height: 100%; max-width: 100%; width: auto; height: auto; object-fit: contain; vertical-align: middle; display: block;" onerror="this.onerror=null;this.src='images/couriers/ekart.svg';" />`
    },
    shadowfax: {
      name: 'Shadowfax',
      fullName: 'Shadowfax Technologies',
      color: '#008d96',
      bg: '#ecfeff',
      border: '#a5f3fc',
      logoUrl: '/images/couriers/shadowfax.svg',
      logoSvg: `<img src="/images/couriers/shadowfax.svg" alt="Shadowfax" class="courier-brand-logo" style="max-height: 100%; max-width: 100%; width: auto; height: auto; object-fit: contain; vertical-align: middle; display: block;" onerror="this.onerror=null;this.src='images/couriers/shadowfax.svg';" />`,
      svg: `<img src="/images/couriers/shadowfax.svg" alt="Shadowfax" class="courier-brand-logo" style="max-height: 100%; max-width: 100%; width: auto; height: auto; object-fit: contain; vertical-align: middle; display: block;" onerror="this.onerror=null;this.src='images/couriers/shadowfax.svg';" />`
    },
    xpressbees: {
      name: 'Xpressbees',
      fullName: 'Xpressbees Logistics',
      color: '#e65100',
      bg: '#fef2f2',
      border: '#fecaca',
      logoUrl: '/images/couriers/xpressbees.webp',
      logoSvg: `<img src="/images/couriers/xpressbees.webp" alt="Xpressbees" class="courier-brand-logo" style="max-height: 100%; max-width: 100%; width: auto; height: auto; object-fit: contain; vertical-align: middle; display: block;" onerror="this.onerror=null;this.src='images/couriers/xpressbees.webp';" />`,
      svg: `<img src="/images/couriers/xpressbees.webp" alt="Xpressbees" class="courier-brand-logo" style="max-height: 100%; max-width: 100%; width: auto; height: auto; object-fit: contain; vertical-align: middle; display: block;" onerror="this.onerror=null;this.src='images/couriers/xpressbees.webp';" />`
    },
    amazon: {
      name: 'Amazon Shipping',
      fullName: 'Amazon Shipping India',
      color: '#ea580c',
      bg: '#fff7ed',
      border: '#fed7aa',
      logoUrl: '/images/couriers/amazon_shipping.svg',
      logoSvg: `<img src="/images/couriers/amazon_shipping.svg" alt="Amazon Shipping" class="courier-brand-logo" style="max-height: 100%; max-width: 100%; width: auto; height: auto; object-fit: contain; vertical-align: middle; display: block;" onerror="this.onerror=null;this.src='images/couriers/amazon_shipping.svg';" />`,
      svg: `<img src="/images/couriers/amazon_shipping.svg" alt="Amazon Shipping" class="courier-brand-logo" style="max-height: 100%; max-width: 100%; width: auto; height: auto; object-fit: contain; vertical-align: middle; display: block;" onerror="this.onerror=null;this.src='images/couriers/amazon_shipping.svg';" />`
    },
    shipmozo: {
      name: 'Shipmozo',
      fullName: 'Shipmozo Network',
      color: '#6366f1',
      bg: '#eef2ff',
      border: '#c7d2fe',
      logoUrl: '',
      logoSvg: `<span style="font-weight: 850; color: #4f46e5; font-size: 0.9rem; letter-spacing: 0.5px;">SHIPMOZO</span>`,
      svg: `<span style="font-weight: 850; color: #4f46e5; font-size: 0.9rem; letter-spacing: 0.5px;">SHIPMOZO</span>`
    }
  };

  function getCourierBrand(nameOrCode) {
    const str = String(nameOrCode || '').toLowerCase();
    let b = null;
    if (str.includes('delhivery')) b = COURIER_BRANDS.delhivery;
    else if (str.includes('blue') || str.includes('dart') || str.includes('bluedart')) b = COURIER_BRANDS.bluedart;
    else if (str.includes('dtdc')) b = COURIER_BRANDS.dtdc;
    else if (str.includes('ekart')) b = COURIER_BRANDS.ekart;
    else if (str.includes('shadowfax')) b = COURIER_BRANDS.shadowfax;
    else if (str.includes('xpress') || str.includes('bees')) b = COURIER_BRANDS.xpressbees;
    else if (str.includes('amazon')) b = COURIER_BRANDS.amazon;
    else if (str.includes('shipmozo')) b = COURIER_BRANDS.shipmozo;

    if (b) {
      return { ...b, svg: b.logoSvg, displayName: nameOrCode || b.name };
    }

    // Neutral elegant fallback
    return {
      name: nameOrCode || 'Express Courier',
      displayName: nameOrCode || 'Express Courier',
      fullName: nameOrCode || 'Express Courier',
      color: '#2563eb',
      bg: '#eff6ff',
      border: '#bfdbfe',
      logoUrl: '',
      logoSvg: `<span style="font-weight: 700; color: #1e293b; font-size: 0.85rem;">📦 ${nameOrCode || 'Courier'}</span>`,
      svg: `<span style="font-weight: 700; color: #1e293b; font-size: 0.85rem;">📦 ${nameOrCode || 'Courier'}</span>`
    };
  }

  function renderCourierBadge(nameOrCode, withLogo = true) {
    const brand = getCourierBrand(nameOrCode);
    if (!withLogo) {
      return `<span style="font-weight: 700; color: ${brand.color};">${brand.displayName}</span>`;
    }
    return `<div style="display: inline-flex; align-items: center; gap: 0.5rem;">
      ${brand.logoSvg}
      <span style="font-weight: 700; color: #0f172a; font-size: 0.8125rem;">${brand.displayName}</span>
    </div>`;
  }

  const exportObj = {
    COURIER_BRANDS,
    getCourierBrand,
    renderCourierBadge
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportObj;
  }
  if (typeof window !== 'undefined') {
    global.CourierBranding = exportObj;
    global.getCourierBrand = getCourierBrand;
    global.renderCourierBadge = renderCourierBadge;
  }
})(typeof window !== 'undefined' ? window : global);
