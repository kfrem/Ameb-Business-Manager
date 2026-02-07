import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '@shared/schema';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required. Check your .env file.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });

// Run database migrations on startup (safe to run multiple times)
export async function runMigrations() {
  const client = await pool.connect();
  try {
    // Add new currency enum values if they don't exist
    const newCurrencies = ['GBP', 'NGN', 'CDF'];
    for (const currency of newCurrencies) {
      await client.query(`
        DO $$ BEGIN
          ALTER TYPE currency ADD VALUE IF NOT EXISTS '${currency}';
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
    }
    // Add missing columns to ledger_transactions table
    const missingColumns = [
      { name: 'customer_id', type: 'VARCHAR(36)' },
      { name: 'supplier_id', type: 'VARCHAR(36)' },
      { name: 'income_source', type: 'TEXT' },
      { name: 'asset_id', type: 'VARCHAR(36)' },
      { name: 'subcategory', type: 'TEXT' },
      { name: 'last_edited_by', type: 'VARCHAR(36)' },
      { name: 'last_edited_at', type: 'TIMESTAMP' },
    ];
    for (const col of missingColumns) {
      await client.query(`
        DO $$ BEGIN
          ALTER TABLE ledger_transactions ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};
        EXCEPTION
          WHEN duplicate_column THEN NULL;
        END $$;
      `);
    }

    // Add missing tables: customers, suppliers
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id VARCHAR(36) REFERENCES businesses(id),
        name TEXT NOT NULL,
        phone VARCHAR(20),
        email TEXT,
        address TEXT,
        notes TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id VARCHAR(36) REFERENCES businesses(id),
        name TEXT NOT NULL,
        phone VARCHAR(20),
        email TEXT,
        address TEXT,
        category TEXT,
        notes TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Add category_direction enum and direction column to categories
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE category_direction AS ENUM ('in', 'out', 'both');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE categories ADD COLUMN IF NOT EXISTS direction category_direction NOT NULL DEFAULT 'both';
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END $$;
    `);

    // Set proper directions on existing categories (income vs expense)
    // Income categories (Money In only)
    await client.query(`
      UPDATE categories SET direction = 'in'
      WHERE direction = 'both' AND name IN (
        'Sales Revenue', 'Lease Payment', 'Gold Sale', 'Loan Received',
        'Owner Injection', 'Interest Income', 'Refund Received',
        'Credit Payment Received', 'Customer Payment'
      );
    `);
    // Expense categories (Money Out only)
    await client.query(`
      UPDATE categories SET direction = 'out'
      WHERE direction = 'both' AND name IN (
        'Purchase', 'Shipping', 'Clearing', 'Transport', 'Storage',
        'Agent Funding', 'Gold Purchase',
        'Salaries/Wages', 'Taxes/Levies', 'Fuel/Transport', 'Utilities', 'Maintenance',
        'Rent', 'Insurance', 'Office Supplies', 'Professional Fees',
        'Loan Repayment', 'Equipment Repair'
      );
    `);

    console.log('Database migrations completed');
  } catch (error: any) {
    console.log('Migration note:', error?.message || 'already up to date');
  } finally {
    client.release();
  }
}
