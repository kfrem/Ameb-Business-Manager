-- ============================================================
-- DEEBI Business Manager - Full Supabase Database Setup
-- ============================================================
-- HOW TO USE:
-- 1. Go to https://supabase.com/dashboard
-- 2. Open your project (olrctztbkbfnmnyztnwk)
-- 3. Click "SQL Editor" in the left sidebar
-- 4. Click "+ New query"
-- 5. Paste this ENTIRE file
-- 6. Click "Run" (the green play button)
-- 7. Wait until you see "Success" at the bottom
-- ============================================================
-- NOTE: This script will DROP and RECREATE all DEEBI tables.
-- It will NOT affect any other tables in your Supabase project.
-- Only tables named specifically for DEEBI are touched.
-- ============================================================

-- Step 0: Clean up any existing DEEBI tables from previous installs
-- (Drop in reverse dependency order to avoid foreign key errors)
-- This ONLY drops DEEBI-specific tables, not your other project tables.

DROP TABLE IF EXISTS monthly_reports CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS approvals CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS fuel_summaries CASCADE;
DROP TABLE IF EXISTS inventory_movements CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS gold_lots CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
DROP TABLE IF EXISTS lease_payments CASCADE;
DROP TABLE IF EXISTS lease_contracts CASCADE;
DROP TABLE IF EXISTS machinery_cost_lines CASCADE;
DROP TABLE IF EXISTS machinery_assets CASCADE;
DROP TABLE IF EXISTS ledger_transactions CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS bank_accounts CASCADE;
DROP TABLE IF EXISTS user_business_access CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop old enum types too (so they get recreated fresh)
DROP TYPE IF EXISTS role CASCADE;
DROP TYPE IF EXISTS business_type CASCADE;
DROP TYPE IF EXISTS currency CASCADE;
DROP TYPE IF EXISTS transaction_direction CASCADE;
DROP TYPE IF EXISTS transaction_status CASCADE;
DROP TYPE IF EXISTS machinery_status CASCADE;
DROP TYPE IF EXISTS gold_lot_status CASCADE;
DROP TYPE IF EXISTS approval_status CASCADE;
DROP TYPE IF EXISTS access_level CASCADE;

-- Step 1: Create all custom enum types
-- (These are like dropdown options for certain columns)

CREATE TYPE role AS ENUM ('owner', 'admin', 'staff', 'partner', 'auditor');
CREATE TYPE business_type AS ENUM ('machinery', 'gold_agent', 'gold_owner', 'spare_parts', 'fuel');
CREATE TYPE currency AS ENUM ('GHS', 'USD', 'CNY');
CREATE TYPE transaction_direction AS ENUM ('in', 'out');
CREATE TYPE transaction_status AS ENUM ('draft', 'posted');
CREATE TYPE machinery_status AS ENUM ('ordered', 'shipping', 'clearing', 'transport', 'storage', 'sold', 'on_lease');
CREATE TYPE gold_lot_status AS ENUM ('funded', 'in_hand', 'sold');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE access_level AS ENUM ('full', 'view_only', 'transactions_only');


-- Step 2: Create all tables

-- Users table
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  pin VARCHAR(72),
  role role NOT NULL DEFAULT 'staff',
  is_active BOOLEAN NOT NULL DEFAULT true,
  must_change_pin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Businesses table
CREATE TABLE businesses (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type business_type NOT NULL,
  location TEXT,
  approval_threshold DECIMAL(15, 2) DEFAULT 5000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- User business access (links users to businesses with access levels)
CREATE TABLE user_business_access (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL REFERENCES users(id),
  business_id VARCHAR(36) NOT NULL REFERENCES businesses(id),
  access_level access_level NOT NULL DEFAULT 'full',
  UNIQUE(user_id, business_id)
);

-- Bank accounts
CREATE TABLE bank_accounts (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL,
  account_ref VARCHAR(50) NOT NULL,
  currency currency NOT NULL DEFAULT 'GHS',
  opening_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Categories
CREATE TABLE categories (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  business_type business_type,
  is_default BOOLEAN NOT NULL DEFAULT false
);

-- Ledger transactions (the main money tracking table)
CREATE TABLE ledger_transactions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  date TIMESTAMP NOT NULL DEFAULT now(),
  amount DECIMAL(15, 2) NOT NULL,
  currency currency NOT NULL DEFAULT 'GHS',
  direction transaction_direction NOT NULL,
  business_id VARCHAR(36) NOT NULL REFERENCES businesses(id),
  bank_account_id VARCHAR(36) REFERENCES bank_accounts(id),
  category_id VARCHAR(36) REFERENCES categories(id),
  subcategory TEXT,
  counterparty TEXT,
  reference TEXT,
  notes TEXT,
  attachment_urls TEXT[],
  status transaction_status NOT NULL DEFAULT 'posted',
  reconciled BOOLEAN NOT NULL DEFAULT false,
  created_by VARCHAR(36) REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  last_edited_by VARCHAR(36) REFERENCES users(id),
  last_edited_at TIMESTAMP
);

-- Machinery assets
CREATE TABLE machinery_assets (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id VARCHAR(36) NOT NULL REFERENCES businesses(id),
  asset_type TEXT NOT NULL,
  serial_number VARCHAR(100),
  chassis_number VARCHAR(100),
  status machinery_status NOT NULL DEFAULT 'ordered',
  location TEXT,
  purchase_price DECIMAL(15, 2),
  total_cost DECIMAL(15, 2) DEFAULT 0,
  sale_price DECIMAL(15, 2),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Machinery cost lines
CREATE TABLE machinery_cost_lines (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id VARCHAR(36) NOT NULL REFERENCES machinery_assets(id),
  category TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  date TIMESTAMP NOT NULL DEFAULT now(),
  notes TEXT
);

-- Lease contracts
CREATE TABLE lease_contracts (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id VARCHAR(36) NOT NULL REFERENCES machinery_assets(id),
  lessee_name TEXT NOT NULL,
  lessee_phone VARCHAR(20),
  monthly_rate DECIMAL(15, 2) NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Lease payments
CREATE TABLE lease_payments (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id VARCHAR(36) NOT NULL REFERENCES lease_contracts(id),
  due_date TIMESTAMP NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  paid_amount DECIMAL(15, 2) DEFAULT 0,
  paid_date TIMESTAMP,
  is_paid BOOLEAN NOT NULL DEFAULT false
);

-- Gold agents
CREATE TABLE agents (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone VARCHAR(20),
  location TEXT,
  performance_status TEXT DEFAULT 'green',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Gold lots
CREATE TABLE gold_lots (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id VARCHAR(36) NOT NULL REFERENCES businesses(id),
  agent_id VARCHAR(36) REFERENCES agents(id),
  stream TEXT NOT NULL,
  funding_amount DECIMAL(15, 2),
  grams_received DECIMAL(10, 2),
  purchase_cost DECIMAL(15, 2),
  sale_value DECIMAL(15, 2),
  cash_returned DECIMAL(15, 2),
  status gold_lot_status NOT NULL DEFAULT 'funded',
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Inventory items (spare parts)
CREATE TABLE inventory_items (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id VARCHAR(36) NOT NULL REFERENCES businesses(id),
  name TEXT NOT NULL,
  sku VARCHAR(50),
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_cost DECIMAL(15, 2),
  unit_price DECIMAL(15, 2),
  reorder_level INTEGER DEFAULT 5,
  location TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Inventory movements
CREATE TABLE inventory_movements (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id VARCHAR(36) NOT NULL REFERENCES inventory_items(id),
  movement_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(15, 2),
  total_amount DECIMAL(15, 2),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  created_by VARCHAR(36) REFERENCES users(id)
);

-- Fuel summaries
CREATE TABLE fuel_summaries (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id VARCHAR(36) NOT NULL REFERENCES businesses(id),
  week_start_date TIMESTAMP NOT NULL,
  week_end_date TIMESTAMP NOT NULL,
  total_sales DECIMAL(15, 2) NOT NULL,
  estimated_expenses DECIMAL(15, 2),
  owner_share_pct DECIMAL(5, 2) NOT NULL DEFAULT 40,
  partner_share_pct DECIMAL(5, 2) NOT NULL DEFAULT 60,
  expected_owner_share DECIMAL(15, 2),
  cash_remitted DECIMAL(15, 2),
  variance DECIMAL(15, 2),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Alerts
CREATE TABLE alerts (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id VARCHAR(36) REFERENCES businesses(id),
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Approvals
CREATE TABLE approvals (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id VARCHAR(36) REFERENCES ledger_transactions(id),
  business_id VARCHAR(36) NOT NULL REFERENCES businesses(id),
  requested_by VARCHAR(36) REFERENCES users(id),
  amount DECIMAL(15, 2) NOT NULL,
  reason TEXT,
  status approval_status NOT NULL DEFAULT 'pending',
  approved_by VARCHAR(36) REFERENCES users(id),
  approved_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Audit log
CREATE TABLE audit_log (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id VARCHAR(36),
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Monthly reports
CREATE TABLE monthly_reports (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id VARCHAR(36) REFERENCES businesses(id),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  snapshot_data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);


-- Step 2b: Create indexes for performance
CREATE INDEX idx_user_business_access_user ON user_business_access(user_id);
CREATE INDEX idx_user_business_access_business ON user_business_access(business_id);
CREATE INDEX idx_ledger_transactions_business ON ledger_transactions(business_id);
CREATE INDEX idx_ledger_transactions_date ON ledger_transactions(date);
CREATE INDEX idx_ledger_transactions_bank ON ledger_transactions(bank_account_id);
CREATE INDEX idx_alerts_business ON alerts(business_id);
CREATE INDEX idx_alerts_read ON alerts(is_read);
CREATE INDEX idx_approvals_status ON approvals(status);

-- ============================================================
-- Step 3: Seed demo data
-- ============================================================

-- Fresh seed (tables were just created, so they are empty)
DO $$
DECLARE
  -- User IDs
  owner_id VARCHAR(36);
  admin_id VARCHAR(36);
  staff_machinery_id VARCHAR(36);
  staff_gold_id VARCHAR(36);
  staff_parts_id VARCHAR(36);
  partner_fuel_id VARCHAR(36);
  auditor_id VARCHAR(36);

  -- Business IDs
  machinery_biz_id VARCHAR(36);
  gold_agent_biz_id VARCHAR(36);
  gold_owner_biz_id VARCHAR(36);
  spare_parts_biz_id VARCHAR(36);
  fuel_biz_id VARCHAR(36);

  -- Bank IDs
  gcb_bank_id VARCHAR(36);
  eco_bank_id VARCHAR(36);
  absa_bank_id VARCHAR(36);
  fid_bank_id VARCHAR(36);
  usd_bank_id VARCHAR(36);
  cash_bank_id VARCHAR(36);

  -- Category IDs
  cat_purchase_id VARCHAR(36);
  cat_shipping_id VARCHAR(36);
  cat_clearing_id VARCHAR(36);
  cat_transport_id VARCHAR(36);
  cat_storage_id VARCHAR(36);
  cat_agent_funding_id VARCHAR(36);
  cat_gold_purchase_id VARCHAR(36);
  cat_gold_sale_id VARCHAR(36);
  cat_salaries_id VARCHAR(36);
  cat_taxes_id VARCHAR(36);
  cat_fuel_transport_id VARCHAR(36);
  cat_utilities_id VARCHAR(36);
  cat_maintenance_id VARCHAR(36);
  cat_sales_revenue_id VARCHAR(36);
  cat_lease_payment_id VARCHAR(36);

  -- Asset IDs
  asset1_id VARCHAR(36);
  asset2_id VARCHAR(36);
  asset3_id VARCHAR(36);
  asset4_id VARCHAR(36);
  asset5_id VARCHAR(36);
  asset6_id VARCHAR(36);

  -- Agent IDs
  agent1_id VARCHAR(36);
  agent2_id VARCHAR(36);
  agent3_id VARCHAR(36);
  agent4_id VARCHAR(36);

  -- Lease contract ID
  lease1_id VARCHAR(36);

BEGIN
  RAISE NOTICE 'Seeding database with demo data...';

  -- ==========================================
  -- CREATE USERS
  -- ==========================================
  -- Login with phone + PIN (all PINs are 1234)

  INSERT INTO users (id, name, phone, pin, role) VALUES
    (gen_random_uuid(), 'DEEBI Owner',          '0201234567', '1234', 'owner'),
    (gen_random_uuid(), 'eACG Finance',          '0202345678', '1234', 'admin'),
    (gen_random_uuid(), 'Machinery Accountant',  '0203456789', '1234', 'staff'),
    (gen_random_uuid(), 'Gold Desk',             '0204567890', '1234', 'staff'),
    (gen_random_uuid(), 'Spare Parts Clerk',     '0205678901', '1234', 'staff'),
    (gen_random_uuid(), 'Fuel Partner',          '0206789012', '1234', 'partner'),
    (gen_random_uuid(), 'Auditor',               '0207890123', '1234', 'auditor');

  SELECT id INTO owner_id FROM users WHERE phone = '0201234567';
  SELECT id INTO admin_id FROM users WHERE phone = '0202345678';
  SELECT id INTO staff_machinery_id FROM users WHERE phone = '0203456789';
  SELECT id INTO staff_gold_id FROM users WHERE phone = '0204567890';
  SELECT id INTO staff_parts_id FROM users WHERE phone = '0205678901';
  SELECT id INTO partner_fuel_id FROM users WHERE phone = '0206789012';
  SELECT id INTO auditor_id FROM users WHERE phone = '0207890123';

  -- ==========================================
  -- CREATE BUSINESSES
  -- ==========================================

  INSERT INTO businesses (id, name, type, location, approval_threshold) VALUES
    (gen_random_uuid(), 'DEEBI Machinery',     'machinery',    'Tema',   10000),
    (gen_random_uuid(), 'DEEBI Gold (Agents)',  'gold_agent',   'Obuasi', 5000),
    (gen_random_uuid(), 'DEEBI Gold (Owner)',   'gold_owner',   'Kumasi', 5000),
    (gen_random_uuid(), 'DEEBI Spare Parts',    'spare_parts',  'Accra',  3000),
    (gen_random_uuid(), 'DEEBI Fuel Station',   'fuel',         'Tema',   5000);

  SELECT id INTO machinery_biz_id   FROM businesses WHERE type = 'machinery';
  SELECT id INTO gold_agent_biz_id  FROM businesses WHERE type = 'gold_agent';
  SELECT id INTO gold_owner_biz_id  FROM businesses WHERE type = 'gold_owner';
  SELECT id INTO spare_parts_biz_id FROM businesses WHERE type = 'spare_parts';
  SELECT id INTO fuel_biz_id        FROM businesses WHERE type = 'fuel';

  -- ==========================================
  -- LINK USERS TO BUSINESSES
  -- ==========================================
  -- Owner gets FULL access to ALL businesses
  INSERT INTO user_business_access (id, user_id, business_id, access_level) VALUES
    (gen_random_uuid(), owner_id, machinery_biz_id, 'full'),
    (gen_random_uuid(), owner_id, gold_agent_biz_id, 'full'),
    (gen_random_uuid(), owner_id, gold_owner_biz_id, 'full'),
    (gen_random_uuid(), owner_id, spare_parts_biz_id, 'full'),
    (gen_random_uuid(), owner_id, fuel_biz_id, 'full');

  -- Admin gets FULL access to ALL businesses
  INSERT INTO user_business_access (id, user_id, business_id, access_level) VALUES
    (gen_random_uuid(), admin_id, machinery_biz_id, 'full'),
    (gen_random_uuid(), admin_id, gold_agent_biz_id, 'full'),
    (gen_random_uuid(), admin_id, gold_owner_biz_id, 'full'),
    (gen_random_uuid(), admin_id, spare_parts_biz_id, 'full'),
    (gen_random_uuid(), admin_id, fuel_biz_id, 'full');

  -- Staff get transactions_only access to their specific businesses
  INSERT INTO user_business_access (id, user_id, business_id, access_level) VALUES
    (gen_random_uuid(), staff_machinery_id, machinery_biz_id, 'transactions_only'),
    (gen_random_uuid(), staff_gold_id, gold_agent_biz_id, 'transactions_only'),
    (gen_random_uuid(), staff_gold_id, gold_owner_biz_id, 'transactions_only'),
    (gen_random_uuid(), staff_parts_id, spare_parts_biz_id, 'transactions_only'),
    (gen_random_uuid(), partner_fuel_id, fuel_biz_id, 'view_only');

  -- Auditor gets view_only access to ALL businesses
  INSERT INTO user_business_access (id, user_id, business_id, access_level) VALUES
    (gen_random_uuid(), auditor_id, machinery_biz_id, 'view_only'),
    (gen_random_uuid(), auditor_id, gold_agent_biz_id, 'view_only'),
    (gen_random_uuid(), auditor_id, gold_owner_biz_id, 'view_only'),
    (gen_random_uuid(), auditor_id, spare_parts_biz_id, 'view_only'),
    (gen_random_uuid(), auditor_id, fuel_biz_id, 'view_only');

  -- ==========================================
  -- CREATE BANK ACCOUNTS
  -- ==========================================

  INSERT INTO bank_accounts (id, bank_name, account_ref, currency, opening_balance, current_balance) VALUES
    (gen_random_uuid(), 'GCB Bank',              'GCB-OPS',  'GHS', 150000, 150000),
    (gen_random_uuid(), 'Ecobank Ghana',         'ECO-OPS',  'GHS', 85000,  85000),
    (gen_random_uuid(), 'Absa Bank Ghana',       'ABSA-OPS', 'GHS', 120000, 120000),
    (gen_random_uuid(), 'Fidelity Bank Ghana',   'FID-OPS',  'GHS', 65000,  65000),
    (gen_random_uuid(), 'USD Trading Account',   'USD-TRD',  'USD', 25000,  25000),
    (gen_random_uuid(), 'Cash Wallet',           'CASH',     'GHS', 15000,  15000);

  SELECT id INTO gcb_bank_id  FROM bank_accounts WHERE account_ref = 'GCB-OPS';
  SELECT id INTO eco_bank_id  FROM bank_accounts WHERE account_ref = 'ECO-OPS';
  SELECT id INTO absa_bank_id FROM bank_accounts WHERE account_ref = 'ABSA-OPS';
  SELECT id INTO fid_bank_id  FROM bank_accounts WHERE account_ref = 'FID-OPS';
  SELECT id INTO usd_bank_id  FROM bank_accounts WHERE account_ref = 'USD-TRD';
  SELECT id INTO cash_bank_id FROM bank_accounts WHERE account_ref = 'CASH';

  -- ==========================================
  -- CREATE CATEGORIES
  -- ==========================================

  INSERT INTO categories (id, name, business_type, is_default) VALUES
    (gen_random_uuid(), 'Purchase',        'machinery',    true),
    (gen_random_uuid(), 'Shipping',        'machinery',    true),
    (gen_random_uuid(), 'Clearing',        'machinery',    true),
    (gen_random_uuid(), 'Transport',       'machinery',    true),
    (gen_random_uuid(), 'Storage',         'machinery',    true),
    (gen_random_uuid(), 'Agent Funding',   'gold_agent',   true),
    (gen_random_uuid(), 'Gold Purchase',   'gold_owner',   true),
    (gen_random_uuid(), 'Gold Sale',       'gold_agent',   true),
    (gen_random_uuid(), 'Salaries/Wages',  NULL,           true),
    (gen_random_uuid(), 'Taxes/Levies',    NULL,           true),
    (gen_random_uuid(), 'Fuel/Transport',  NULL,           true),
    (gen_random_uuid(), 'Utilities',       NULL,           true),
    (gen_random_uuid(), 'Maintenance',     NULL,           true),
    (gen_random_uuid(), 'Sales Revenue',   NULL,           true),
    (gen_random_uuid(), 'Lease Payment',   NULL,           true);

  SELECT id INTO cat_purchase_id       FROM categories WHERE name = 'Purchase' AND business_type = 'machinery';
  SELECT id INTO cat_shipping_id       FROM categories WHERE name = 'Shipping';
  SELECT id INTO cat_clearing_id       FROM categories WHERE name = 'Clearing';
  SELECT id INTO cat_transport_id      FROM categories WHERE name = 'Transport';
  SELECT id INTO cat_storage_id        FROM categories WHERE name = 'Storage';
  SELECT id INTO cat_agent_funding_id  FROM categories WHERE name = 'Agent Funding';
  SELECT id INTO cat_gold_purchase_id  FROM categories WHERE name = 'Gold Purchase';
  SELECT id INTO cat_gold_sale_id      FROM categories WHERE name = 'Gold Sale';
  SELECT id INTO cat_salaries_id       FROM categories WHERE name = 'Salaries/Wages';
  SELECT id INTO cat_taxes_id          FROM categories WHERE name = 'Taxes/Levies';
  SELECT id INTO cat_fuel_transport_id FROM categories WHERE name = 'Fuel/Transport';
  SELECT id INTO cat_utilities_id      FROM categories WHERE name = 'Utilities';
  SELECT id INTO cat_maintenance_id    FROM categories WHERE name = 'Maintenance';
  SELECT id INTO cat_sales_revenue_id  FROM categories WHERE name = 'Sales Revenue';
  SELECT id INTO cat_lease_payment_id  FROM categories WHERE name = 'Lease Payment';

  -- ==========================================
  -- CREATE MACHINERY ASSETS
  -- ==========================================

  INSERT INTO machinery_assets (id, business_id, asset_type, serial_number, chassis_number, status, location, purchase_price, total_cost, sale_price) VALUES
    (gen_random_uuid(), machinery_biz_id, 'Excavator',    'EXC-2024-001', 'CH-EXC-001', 'sold',     'Accra',      180000, 0, 220000),
    (gen_random_uuid(), machinery_biz_id, 'Excavator',    'EXC-2024-002', 'CH-EXC-002', 'on_lease', 'Kumasi',     175000, 0, NULL),
    (gen_random_uuid(), machinery_biz_id, 'Wheel Loader', 'WL-2024-001',  'CH-WL-001',  'storage',  'Tema',       145000, 0, NULL),
    (gen_random_uuid(), machinery_biz_id, 'Wheel Loader', 'WL-2024-002',  'CH-WL-002',  'clearing', 'Tema Port',  150000, 0, NULL),
    (gen_random_uuid(), machinery_biz_id, 'Bulldozer',    'BD-2024-001',  'CH-BD-001',  'shipping', 'In Transit', 220000, 0, NULL),
    (gen_random_uuid(), machinery_biz_id, 'Backhoe',      'BH-2024-001',  'CH-BH-001',  'sold',     'Tamale',     95000,  0, 125000);

  SELECT id INTO asset1_id FROM machinery_assets WHERE serial_number = 'EXC-2024-001';
  SELECT id INTO asset2_id FROM machinery_assets WHERE serial_number = 'EXC-2024-002';
  SELECT id INTO asset3_id FROM machinery_assets WHERE serial_number = 'WL-2024-001';
  SELECT id INTO asset4_id FROM machinery_assets WHERE serial_number = 'WL-2024-002';
  SELECT id INTO asset5_id FROM machinery_assets WHERE serial_number = 'BD-2024-001';
  SELECT id INTO asset6_id FROM machinery_assets WHERE serial_number = 'BH-2024-001';

  -- Cost lines for assets
  INSERT INTO machinery_cost_lines (id, asset_id, category, amount, date) VALUES
    -- Asset 1 (Excavator - sold)
    (gen_random_uuid(), asset1_id, 'Purchase',  180000, now() - interval '60 days'),
    (gen_random_uuid(), asset1_id, 'Shipping',  12000,  now() - interval '50 days'),
    (gen_random_uuid(), asset1_id, 'Clearing',  8000,   now() - interval '40 days'),
    (gen_random_uuid(), asset1_id, 'Transport', 5000,   now() - interval '30 days'),
    (gen_random_uuid(), asset1_id, 'Storage',   2000,   now() - interval '20 days'),
    -- Asset 2 (Excavator - on lease)
    (gen_random_uuid(), asset2_id, 'Purchase',  175000, now() - interval '55 days'),
    (gen_random_uuid(), asset2_id, 'Shipping',  11000,  now() - interval '45 days'),
    (gen_random_uuid(), asset2_id, 'Clearing',  7500,   now() - interval '35 days'),
    (gen_random_uuid(), asset2_id, 'Transport', 4500,   now() - interval '25 days'),
    (gen_random_uuid(), asset2_id, 'Storage',   1500,   now() - interval '15 days'),
    -- Asset 3 (Wheel Loader - storage)
    (gen_random_uuid(), asset3_id, 'Purchase',  145000, now() - interval '50 days'),
    (gen_random_uuid(), asset3_id, 'Shipping',  10000,  now() - interval '40 days'),
    (gen_random_uuid(), asset3_id, 'Clearing',  6500,   now() - interval '30 days'),
    (gen_random_uuid(), asset3_id, 'Transport', 4000,   now() - interval '20 days'),
    -- Asset 4 (Wheel Loader - clearing)
    (gen_random_uuid(), asset4_id, 'Purchase',  150000, now() - interval '45 days'),
    (gen_random_uuid(), asset4_id, 'Shipping',  13000,  now() - interval '35 days'),
    (gen_random_uuid(), asset4_id, 'Clearing',  9000,   now() - interval '25 days'),
    -- Asset 5 (Bulldozer - shipping)
    (gen_random_uuid(), asset5_id, 'Purchase',  220000, now() - interval '40 days'),
    (gen_random_uuid(), asset5_id, 'Shipping',  14000,  now() - interval '30 days'),
    (gen_random_uuid(), asset5_id, 'Clearing',  10000,  now() - interval '20 days'),
    -- Asset 6 (Backhoe - sold)
    (gen_random_uuid(), asset6_id, 'Purchase',  95000,  now() - interval '60 days'),
    (gen_random_uuid(), asset6_id, 'Shipping',  9000,   now() - interval '50 days'),
    (gen_random_uuid(), asset6_id, 'Clearing',  6000,   now() - interval '40 days'),
    (gen_random_uuid(), asset6_id, 'Transport', 3500,   now() - interval '30 days'),
    (gen_random_uuid(), asset6_id, 'Storage',   1200,   now() - interval '20 days');

  -- ==========================================
  -- CREATE LEASE CONTRACT (for on_lease asset)
  -- ==========================================

  INSERT INTO lease_contracts (id, asset_id, lessee_name, lessee_phone, monthly_rate, start_date, is_active) VALUES
    (gen_random_uuid(), asset2_id, 'Goldfields Mining Ltd', '0248765432', 8500, now() - interval '90 days', true);

  SELECT id INTO lease1_id FROM lease_contracts WHERE lessee_name = 'Goldfields Mining Ltd';

  -- Lease payments (2 paid, 1 overdue)
  INSERT INTO lease_payments (id, contract_id, due_date, amount, paid_amount, paid_date, is_paid) VALUES
    (gen_random_uuid(), lease1_id, now() - interval '60 days', 8500, 8500, now() - interval '58 days', true),
    (gen_random_uuid(), lease1_id, now() - interval '30 days', 8500, 8500, now() - interval '28 days', true),
    (gen_random_uuid(), lease1_id, now() - interval '5 days',  8500, 0,    NULL,                       false);

  -- ==========================================
  -- CREATE GOLD AGENTS
  -- ==========================================

  INSERT INTO agents (id, name, phone, location, performance_status) VALUES
    (gen_random_uuid(), 'Kofi Mensah',   '0241234567', 'Obuasi',            'green'),
    (gen_random_uuid(), 'Ama Darko',     '0242345678', 'Kumasi',            'green'),
    (gen_random_uuid(), 'Yaw Boateng',   '0243456789', 'Sekondi-Takoradi',  'amber'),
    (gen_random_uuid(), 'Akua Sarpong',  '0244567890', 'Tarkwa',            'red');

  SELECT id INTO agent1_id FROM agents WHERE name = 'Kofi Mensah';
  SELECT id INTO agent2_id FROM agents WHERE name = 'Ama Darko';
  SELECT id INTO agent3_id FROM agents WHERE name = 'Yaw Boateng';
  SELECT id INTO agent4_id FROM agents WHERE name = 'Akua Sarpong';

  -- ==========================================
  -- CREATE GOLD LOTS
  -- ==========================================

  -- Agent stream lots
  INSERT INTO gold_lots (id, business_id, agent_id, stream, funding_amount, grams_received, sale_value, cash_returned, status) VALUES
    (gen_random_uuid(), gold_agent_biz_id, agent1_id, 'agent', 25000, 45.5, 32000, 30000, 'sold'),
    (gen_random_uuid(), gold_agent_biz_id, agent1_id, 'agent', 30000, 52.0, 38500, 36000, 'sold'),
    (gen_random_uuid(), gold_agent_biz_id, agent2_id, 'agent', 20000, 35.0, 26000, 24500, 'sold'),
    (gen_random_uuid(), gold_agent_biz_id, agent3_id, 'agent', 28000, 48.0, NULL,  NULL,  'in_hand'),
    (gen_random_uuid(), gold_agent_biz_id, agent4_id, 'agent', 35000, 55.0, 38000, 32000, 'sold'),
    (gen_random_uuid(), gold_agent_biz_id, agent4_id, 'agent', 15000, NULL, NULL,  NULL,  'funded');

  -- Owner stream lots
  INSERT INTO gold_lots (id, business_id, agent_id, stream, purchase_cost, grams_received, sale_value, cash_returned, status) VALUES
    (gen_random_uuid(), gold_owner_biz_id, NULL, 'owner', 45000, 82.5, 62000, 62000, 'sold'),
    (gen_random_uuid(), gold_owner_biz_id, NULL, 'owner', 38000, 68.0, 52000, 52000, 'sold'),
    (gen_random_uuid(), gold_owner_biz_id, NULL, 'owner', 55000, 95.0, NULL,  NULL,  'in_hand'),
    (gen_random_uuid(), gold_owner_biz_id, NULL, 'owner', 42000, 75.0, 58000, 58000, 'sold');

  -- ==========================================
  -- CREATE INVENTORY ITEMS (Spare Parts)
  -- ==========================================

  INSERT INTO inventory_items (id, business_id, name, sku, quantity, unit_cost, unit_price, reorder_level) VALUES
    (gen_random_uuid(), spare_parts_biz_id, 'Oil Filter',       'OF-001', 45, 35,   55,   10),
    (gen_random_uuid(), spare_parts_biz_id, 'Fuel Filter',      'FF-001', 38, 42,   68,   10),
    (gen_random_uuid(), spare_parts_biz_id, 'Hydraulic Hose',   'HH-001', 22, 180,  280,  5),
    (gen_random_uuid(), spare_parts_biz_id, 'Fan Belt',         'FB-001', 3,  65,   95,   8),
    (gen_random_uuid(), spare_parts_biz_id, 'Brake Pads',       'BP-001', 28, 120,  185,  10),
    (gen_random_uuid(), spare_parts_biz_id, 'Bearing Set',      'BS-001', 2,  85,   130,  5),
    (gen_random_uuid(), spare_parts_biz_id, 'Injector Nozzle',  'IN-001', 15, 220,  350,  5),
    (gen_random_uuid(), spare_parts_biz_id, 'Grease (Bucket)',  'GR-001', 12, 95,   140,  5),
    (gen_random_uuid(), spare_parts_biz_id, 'Engine Oil (Drum)','EO-001', 8,  450,  650,  3),
    (gen_random_uuid(), spare_parts_biz_id, 'Tyres (Heavy)',    'TY-001', 6,  2500, 3500, 2),
    (gen_random_uuid(), spare_parts_biz_id, 'Battery',          'BT-001', 10, 380,  550,  3),
    (gen_random_uuid(), spare_parts_biz_id, 'Alternator',       'AL-001', 5,  650,  950,  2);

  -- ==========================================
  -- CREATE FUEL SUMMARIES (10 weeks)
  -- ==========================================

  INSERT INTO fuel_summaries (id, business_id, week_start_date, week_end_date, total_sales, owner_share_pct, partner_share_pct, expected_owner_share, cash_remitted, variance) VALUES
    (gen_random_uuid(), fuel_biz_id, now() - interval '77 days', now() - interval '71 days', 55000, 40, 60, 22000, 22100,  100),
    (gen_random_uuid(), fuel_biz_id, now() - interval '70 days', now() - interval '64 days', 62000, 40, 60, 24800, 24650, -150),
    (gen_random_uuid(), fuel_biz_id, now() - interval '63 days', now() - interval '57 days', 58000, 40, 60, 23200, 23200,  0),
    (gen_random_uuid(), fuel_biz_id, now() - interval '56 days', now() - interval '50 days', 71000, 40, 60, 28400, 28300, -100),
    (gen_random_uuid(), fuel_biz_id, now() - interval '49 days', now() - interval '43 days', 65000, 40, 60, 26000, 25850, -150),
    (gen_random_uuid(), fuel_biz_id, now() - interval '42 days', now() - interval '36 days', 59000, 40, 60, 23600, 23700,  100),
    (gen_random_uuid(), fuel_biz_id, now() - interval '35 days', now() - interval '29 days', 67000, 40, 60, 26800, 26600, -200),
    (gen_random_uuid(), fuel_biz_id, now() - interval '28 days', now() - interval '22 days', 72000, 40, 60, 28800, 28800,  0),
    (gen_random_uuid(), fuel_biz_id, now() - interval '21 days', now() - interval '15 days', 63000, 40, 60, 25200, 24000, -1200),
    (gen_random_uuid(), fuel_biz_id, now() - interval '14 days', now() - interval '8 days',  68000, 40, 60, 27200, 25700, -1500);

  -- ==========================================
  -- CREATE LEDGER TRANSACTIONS
  -- ==========================================

  -- Machinery sales
  INSERT INTO ledger_transactions (id, date, amount, currency, direction, business_id, bank_account_id, category_id, counterparty, notes, status) VALUES
    (gen_random_uuid(), now() - interval '20 days', 220000, 'GHS', 'in', machinery_biz_id, gcb_bank_id, cat_sales_revenue_id, 'Mining Company', 'Sale of Excavator EXC-2024-001', 'posted'),
    (gen_random_uuid(), now() - interval '15 days', 125000, 'GHS', 'in', machinery_biz_id, gcb_bank_id, cat_sales_revenue_id, 'Mining Company', 'Sale of Backhoe BH-2024-001', 'posted');

  -- Lease payments received
  INSERT INTO ledger_transactions (id, date, amount, currency, direction, business_id, bank_account_id, category_id, counterparty, notes, status) VALUES
    (gen_random_uuid(), now() - interval '58 days', 8500, 'GHS', 'in', machinery_biz_id, gcb_bank_id, cat_lease_payment_id, 'Goldfields Mining Ltd', 'Lease payment - Month 1', 'posted'),
    (gen_random_uuid(), now() - interval '28 days', 8500, 'GHS', 'in', machinery_biz_id, gcb_bank_id, cat_lease_payment_id, 'Goldfields Mining Ltd', 'Lease payment - Month 2', 'posted');

  -- Gold agent funding (money out)
  INSERT INTO ledger_transactions (id, date, amount, currency, direction, business_id, bank_account_id, category_id, counterparty, notes, status) VALUES
    (gen_random_uuid(), now() - interval '55 days', 25000, 'GHS', 'out', gold_agent_biz_id, gcb_bank_id,  cat_agent_funding_id, 'Kofi Mensah',  'Agent funding', 'posted'),
    (gen_random_uuid(), now() - interval '50 days', 30000, 'GHS', 'out', gold_agent_biz_id, eco_bank_id,  cat_agent_funding_id, 'Kofi Mensah',  'Agent funding', 'posted'),
    (gen_random_uuid(), now() - interval '45 days', 20000, 'GHS', 'out', gold_agent_biz_id, absa_bank_id, cat_agent_funding_id, 'Ama Darko',    'Agent funding', 'posted'),
    (gen_random_uuid(), now() - interval '40 days', 28000, 'GHS', 'out', gold_agent_biz_id, fid_bank_id,  cat_agent_funding_id, 'Yaw Boateng',  'Agent funding', 'posted'),
    (gen_random_uuid(), now() - interval '35 days', 35000, 'GHS', 'out', gold_agent_biz_id, gcb_bank_id,  cat_agent_funding_id, 'Akua Sarpong', 'Agent funding', 'posted'),
    (gen_random_uuid(), now() - interval '20 days', 15000, 'GHS', 'out', gold_agent_biz_id, eco_bank_id,  cat_agent_funding_id, 'Akua Sarpong', 'Agent funding', 'posted');

  -- Gold sales (money in)
  INSERT INTO ledger_transactions (id, date, amount, currency, direction, business_id, bank_account_id, category_id, counterparty, notes, status) VALUES
    (gen_random_uuid(), now() - interval '40 days', 32000, 'GHS', 'in', gold_agent_biz_id, gcb_bank_id,  cat_gold_sale_id, 'Gold Buyer', 'Gold sale proceeds', 'posted'),
    (gen_random_uuid(), now() - interval '35 days', 38500, 'GHS', 'in', gold_agent_biz_id, eco_bank_id,  cat_gold_sale_id, 'Gold Buyer', 'Gold sale proceeds', 'posted'),
    (gen_random_uuid(), now() - interval '30 days', 26000, 'GHS', 'in', gold_agent_biz_id, absa_bank_id, cat_gold_sale_id, 'Gold Buyer', 'Gold sale proceeds', 'posted'),
    (gen_random_uuid(), now() - interval '25 days', 38000, 'GHS', 'in', gold_agent_biz_id, fid_bank_id,  cat_gold_sale_id, 'Gold Buyer', 'Gold sale proceeds', 'posted');

  -- Gold owner purchases and sales
  INSERT INTO ledger_transactions (id, date, amount, currency, direction, business_id, bank_account_id, category_id, counterparty, notes, status) VALUES
    (gen_random_uuid(), now() - interval '55 days', 45000, 'GHS', 'out', gold_owner_biz_id, gcb_bank_id,  cat_gold_purchase_id, 'Gold Supplier', 'Gold purchase', 'posted'),
    (gen_random_uuid(), now() - interval '50 days', 38000, 'GHS', 'out', gold_owner_biz_id, eco_bank_id,  cat_gold_purchase_id, 'Gold Supplier', 'Gold purchase', 'posted'),
    (gen_random_uuid(), now() - interval '40 days', 55000, 'GHS', 'out', gold_owner_biz_id, absa_bank_id, cat_gold_purchase_id, 'Gold Supplier', 'Gold purchase', 'posted'),
    (gen_random_uuid(), now() - interval '35 days', 42000, 'GHS', 'out', gold_owner_biz_id, fid_bank_id,  cat_gold_purchase_id, 'Gold Supplier', 'Gold purchase', 'posted'),
    (gen_random_uuid(), now() - interval '35 days', 62000, 'GHS', 'in',  gold_owner_biz_id, gcb_bank_id,  cat_gold_sale_id,     'Gold Buyer',    'Gold sale proceeds', 'posted'),
    (gen_random_uuid(), now() - interval '30 days', 52000, 'GHS', 'in',  gold_owner_biz_id, eco_bank_id,  cat_gold_sale_id,     'Gold Buyer',    'Gold sale proceeds', 'posted'),
    (gen_random_uuid(), now() - interval '20 days', 58000, 'GHS', 'in',  gold_owner_biz_id, absa_bank_id, cat_gold_sale_id,     'Gold Buyer',    'Gold sale proceeds', 'posted');

  -- Spare parts transactions
  INSERT INTO ledger_transactions (id, date, amount, currency, direction, business_id, bank_account_id, category_id, counterparty, notes, status) VALUES
    (gen_random_uuid(), now() - interval '50 days', 2500, 'GHS', 'in',  spare_parts_biz_id, gcb_bank_id,  cat_sales_revenue_id, 'Customer',             'Parts sale', 'posted'),
    (gen_random_uuid(), now() - interval '48 days', 1800, 'GHS', 'out', spare_parts_biz_id, eco_bank_id,  cat_purchase_id,      'Spare Parts Supplier', 'Stock purchase', 'posted'),
    (gen_random_uuid(), now() - interval '45 days', 3200, 'GHS', 'out', spare_parts_biz_id, absa_bank_id, cat_purchase_id,      'Spare Parts Supplier', 'Stock purchase', 'posted'),
    (gen_random_uuid(), now() - interval '42 days', 4100, 'GHS', 'in',  spare_parts_biz_id, fid_bank_id,  cat_sales_revenue_id, 'Customer',             'Parts sale', 'posted'),
    (gen_random_uuid(), now() - interval '38 days', 2200, 'GHS', 'out', spare_parts_biz_id, gcb_bank_id,  cat_purchase_id,      'Spare Parts Supplier', 'Stock purchase', 'posted'),
    (gen_random_uuid(), now() - interval '35 days', 1500, 'GHS', 'in',  spare_parts_biz_id, eco_bank_id,  cat_sales_revenue_id, 'Customer',             'Parts sale', 'posted'),
    (gen_random_uuid(), now() - interval '30 days', 3800, 'GHS', 'out', spare_parts_biz_id, absa_bank_id, cat_purchase_id,      'Spare Parts Supplier', 'Stock purchase', 'posted'),
    (gen_random_uuid(), now() - interval '25 days', 2900, 'GHS', 'in',  spare_parts_biz_id, fid_bank_id,  cat_sales_revenue_id, 'Customer',             'Parts sale', 'posted'),
    (gen_random_uuid(), now() - interval '20 days', 4500, 'GHS', 'out', spare_parts_biz_id, gcb_bank_id,  cat_purchase_id,      'Spare Parts Supplier', 'Stock purchase', 'posted'),
    (gen_random_uuid(), now() - interval '15 days', 1900, 'GHS', 'in',  spare_parts_biz_id, eco_bank_id,  cat_sales_revenue_id, 'Customer',             'Parts sale', 'posted');

  -- Fuel station remittances
  INSERT INTO ledger_transactions (id, date, amount, currency, direction, business_id, bank_account_id, category_id, counterparty, notes, status) VALUES
    (gen_random_uuid(), now() - interval '70 days', 22000, 'GHS', 'in', fuel_biz_id, cash_bank_id, cat_sales_revenue_id, 'Fuel Partner', 'Weekly remittance - Week 1', 'posted'),
    (gen_random_uuid(), now() - interval '63 days', 24800, 'GHS', 'in', fuel_biz_id, cash_bank_id, cat_sales_revenue_id, 'Fuel Partner', 'Weekly remittance - Week 2', 'posted'),
    (gen_random_uuid(), now() - interval '56 days', 23200, 'GHS', 'in', fuel_biz_id, cash_bank_id, cat_sales_revenue_id, 'Fuel Partner', 'Weekly remittance - Week 3', 'posted'),
    (gen_random_uuid(), now() - interval '49 days', 28400, 'GHS', 'in', fuel_biz_id, cash_bank_id, cat_sales_revenue_id, 'Fuel Partner', 'Weekly remittance - Week 4', 'posted'),
    (gen_random_uuid(), now() - interval '42 days', 26000, 'GHS', 'in', fuel_biz_id, cash_bank_id, cat_sales_revenue_id, 'Fuel Partner', 'Weekly remittance - Week 5', 'posted'),
    (gen_random_uuid(), now() - interval '35 days', 23600, 'GHS', 'in', fuel_biz_id, cash_bank_id, cat_sales_revenue_id, 'Fuel Partner', 'Weekly remittance - Week 6', 'posted'),
    (gen_random_uuid(), now() - interval '28 days', 26800, 'GHS', 'in', fuel_biz_id, cash_bank_id, cat_sales_revenue_id, 'Fuel Partner', 'Weekly remittance - Week 7', 'posted'),
    (gen_random_uuid(), now() - interval '21 days', 28800, 'GHS', 'in', fuel_biz_id, cash_bank_id, cat_sales_revenue_id, 'Fuel Partner', 'Weekly remittance - Week 8', 'posted'),
    (gen_random_uuid(), now() - interval '14 days', 24000, 'GHS', 'in', fuel_biz_id, cash_bank_id, cat_sales_revenue_id, 'Fuel Partner', 'Weekly remittance - Week 9', 'posted'),
    (gen_random_uuid(), now() - interval '7 days',  25700, 'GHS', 'in', fuel_biz_id, cash_bank_id, cat_sales_revenue_id, 'Fuel Partner', 'Weekly remittance - Week 10', 'posted');

  -- General expenses across all businesses
  INSERT INTO ledger_transactions (id, date, amount, currency, direction, business_id, bank_account_id, category_id, counterparty, notes, status) VALUES
    (gen_random_uuid(), now() - interval '60 days', 5000, 'GHS', 'out', machinery_biz_id,   gcb_bank_id,  cat_salaries_id,       'Staff',          'Salaries/Wages', 'posted'),
    (gen_random_uuid(), now() - interval '55 days', 3500, 'GHS', 'out', gold_agent_biz_id,  eco_bank_id,  cat_taxes_id,          'GRA',            'Taxes/Levies',   'posted'),
    (gen_random_uuid(), now() - interval '50 days', 1200, 'GHS', 'out', gold_owner_biz_id,  absa_bank_id, cat_fuel_transport_id, 'Shell',          'Fuel/Transport', 'posted'),
    (gen_random_uuid(), now() - interval '45 days', 800,  'GHS', 'out', spare_parts_biz_id, fid_bank_id,  cat_utilities_id,      'ECG',            'Utilities',      'posted'),
    (gen_random_uuid(), now() - interval '40 days', 2500, 'GHS', 'out', fuel_biz_id,        gcb_bank_id,  cat_maintenance_id,    'Maintenance Co', 'Maintenance',    'posted'),
    (gen_random_uuid(), now() - interval '35 days', 6000, 'GHS', 'out', machinery_biz_id,   eco_bank_id,  cat_salaries_id,       'Staff',          'Salaries/Wages', 'posted'),
    (gen_random_uuid(), now() - interval '30 days', 4200, 'GHS', 'out', gold_agent_biz_id,  absa_bank_id, cat_taxes_id,          'GRA',            'Taxes/Levies',   'posted'),
    (gen_random_uuid(), now() - interval '25 days', 1500, 'GHS', 'out', gold_owner_biz_id,  fid_bank_id,  cat_fuel_transport_id, 'Shell',          'Fuel/Transport', 'posted'),
    (gen_random_uuid(), now() - interval '20 days', 950,  'GHS', 'out', spare_parts_biz_id, gcb_bank_id,  cat_utilities_id,      'ECG',            'Utilities',      'posted'),
    (gen_random_uuid(), now() - interval '15 days', 3000, 'GHS', 'out', fuel_biz_id,        eco_bank_id,  cat_maintenance_id,    'Maintenance Co', 'Maintenance',    'posted'),
    (gen_random_uuid(), now() - interval '10 days', 7000, 'GHS', 'out', machinery_biz_id,   absa_bank_id, cat_salaries_id,       'Staff',          'Salaries/Wages', 'posted'),
    (gen_random_uuid(), now() - interval '5 days',  2800, 'GHS', 'out', gold_agent_biz_id,  fid_bank_id,  cat_taxes_id,          'GRA',            'Taxes/Levies',   'posted');

  -- ==========================================
  -- CREATE ALERTS
  -- ==========================================

  INSERT INTO alerts (id, business_id, type, severity, title, message) VALUES
    (gen_random_uuid(), spare_parts_biz_id, 'low_stock',         'warning', 'Low Stock Alert',          'Fan Belt stock is below reorder level (3 units remaining)'),
    (gen_random_uuid(), spare_parts_biz_id, 'low_stock',         'warning', 'Low Stock Alert',          'Bearing Set stock is below reorder level (2 units remaining)'),
    (gen_random_uuid(), machinery_biz_id,   'overdue_payment',   'error',   'Overdue Lease Payment',    'Goldfields Mining Ltd has an overdue payment of GH₵8,500'),
    (gen_random_uuid(), fuel_biz_id,        'variance',          'warning', 'Cash Variance Detected',   'Weekly remittance is GH₵1,500 below expected'),
    (gen_random_uuid(), gold_agent_biz_id,  'agent_performance', 'warning', 'Agent Performance Warning','Akua Sarpong has underperforming returns on recent lots');

  -- ==========================================
  -- CREATE PENDING APPROVALS
  -- ==========================================

  INSERT INTO approvals (id, business_id, amount, reason, status, requested_by) VALUES
    (gen_random_uuid(), machinery_biz_id,  15000, 'Emergency repair parts for Excavator EXC-2024-002',  'pending', staff_machinery_id),
    (gen_random_uuid(), gold_agent_biz_id, 45000, 'Agent funding for Kofi Mensah - large gold lot',     'pending', staff_gold_id);

  RAISE NOTICE '✅ Database seeded successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📱 Demo Login Accounts (all PINs are 1234):';
  RAISE NOTICE '   Owner:   0201234567';
  RAISE NOTICE '   Admin:   0202345678';
  RAISE NOTICE '   Staff:   0203456789';
  RAISE NOTICE '   Auditor: 0207890123';

END $$;
