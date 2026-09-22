export const SELLER_NAV = [
  { section: "Overview", items: [{ href: "/dashboard", label: "Dashboard", icon: "layout-dashboard" }] },
  {
    section: "Shipping",
    items: [
      { href: "/orders/new", label: "New Order", icon: "plus-circle" },
      { href: "/orders", label: "Orders", icon: "package" },
      { href: "/ndr", label: "NDR", icon: "alert-triangle" },
      { href: "/disputes", label: "Weight Disputes", icon: "scale" },
      { href: "/cod", label: "COD Remittance", icon: "wallet" },
      { href: "/tickets", label: "Support Tickets", icon: "message-circle" },
    ],
  },
  {
    section: "Manage",
    items: [
      { href: "/addresses", label: "Address Book", icon: "map-pin" },
      { href: "/serviceability", label: "Serviceability Check", icon: "search-check" },
      { href: "/wallet", label: "Wallet", icon: "credit-card" },
      { href: "/analytics", label: "Analytics", icon: "bar-chart" },
    ],
  },
  {
    section: "Settings",
    items: [
      { href: "/settings/channels", label: "Channel Integrations", icon: "plug" },
      { href: "/settings/tracking-page", label: "Branded Tracking", icon: "truck" },
      { href: "/settings/profile", label: "Business Profile", icon: "user" },
      { href: "/notifications", label: "Notifications", icon: "bell" },
    ],
  },
] as const;

export const ADMIN_NAV = [
  { section: "Overview", items: [{ href: "/admin", label: "Admin Dashboard", icon: "layout-dashboard" }] },
  {
    section: "Manage",
    items: [
      { href: "/admin/users", label: "Sellers & Wallets", icon: "users" },
      { href: "/admin/shipments", label: "All Shipments & Tracking", icon: "truck" },
      { href: "/admin/couriers", label: "Courier Partners", icon: "truck" },
      { href: "/admin/commission", label: "Commission Rules", icon: "percent" },
      { href: "/admin/ndr-rto", label: "NDR / RTO Oversight", icon: "alert-triangle" },
    ],
  },
] as const;
