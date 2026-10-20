-- ============================================================
-- PRODUCTION MIGRATION: Ensure All 8 Courier Partners Exist
-- Run this once on Hostinger MySQL (phpMyAdmin > SQL tab)
-- Safe to run multiple times (uses INSERT IGNORE)
-- ============================================================

-- Ensure all 8 courier partners exist
INSERT IGNORE INTO `couriers` (
  `id`, `name`, `code`, `logo_color`, `active`,
  `base_rate_per_kg`, `cod_charge_flat`, `cod_charge_percent`,
  `rating`, `eta_min_days`, `eta_max_days`, `rto_risk_percent`
) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Delhivery Surface',    'DELHIVERY_SURFACE', '#d90429', 1, 42.00, 25.00, 1.50, 4.30, 3, 5, 6.50),
  ('c1000000-0000-0000-0000-000000000002', 'Delhivery Express',    'DELHIVERY_EXPRESS', '#d90429', 1, 65.00, 30.00, 1.80, 4.60, 1, 3, 4.20),
  ('c1000000-0000-0000-0000-000000000003', 'DTDC Express',         'DTDC_EXP',          '#0f2d59', 1, 52.00, 25.00, 1.50, 4.50, 2, 4, 5.50),
  ('c1000000-0000-0000-0000-000000000004', 'Blue Dart Express',    'BLUEDART_EXP',      '#065dac', 1, 78.00, 35.00, 2.00, 4.70, 1, 2, 3.50),
  ('c1000000-0000-0000-0000-000000000005', 'Ekart Logistics',      'EKART_EXP',         '#0062a9', 1, 46.00, 25.00, 1.50, 4.40, 2, 4, 5.00),
  ('c1000000-0000-0000-0000-000000000006', 'Shadowfax Technologies','SHADOWFAX_EXP',    '#008d96', 1, 44.00, 25.00, 1.50, 4.20, 2, 5, 6.00),
  ('c1000000-0000-0000-0000-000000000007', 'Xpressbees Logistics', 'XPRESSBEES_EXP',   '#e65100', 1, 45.00, 25.00, 1.50, 4.30, 2, 4, 5.80),
  ('c1000000-0000-0000-0000-000000000008', 'Amazon Shipping',      'AMAZON_SHIPPING',   '#ea580c', 1, 58.00, 30.00, 1.60, 4.60, 1, 3, 4.00);

-- Make sure all 8 are ACTIVE
UPDATE `couriers`
SET `active` = 1
WHERE `id` IN (
  'c1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000002',
  'c1000000-0000-0000-0000-000000000003',
  'c1000000-0000-0000-0000-000000000004',
  'c1000000-0000-0000-0000-000000000005',
  'c1000000-0000-0000-0000-000000000006',
  'c1000000-0000-0000-0000-000000000007',
  'c1000000-0000-0000-0000-000000000008'
);

-- Verify result
SELECT id, name, code, active FROM `couriers` ORDER BY `name`;
