import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const roleEnum = pgEnum('role', ['owner', 'admin', 'staff', 'partner', 'auditor']);
export const businessTypeEnum = pgEnum('business_type', ['machinery', 'gold_agent', 'gold_owner', 'spare_parts', 'fuel']);
export const currencyEnum = pgEnum('currency', ['GHS', 'USD', 'CNY']);
export const transactionDirectionEnum = pgEnum('transaction_direction', ['in', 'out']);
export const transactionStatusEnum = pgEnum('transaction_status', ['draft', 'posted']);
export const machineryStatusEnum = pgEnum('machinery_status', ['ordered', 'shipping', 'clearing', 'transport', 'storage', 'sold', 'on_lease']);
export const goldLotStatusEnum = pgEnum('gold_lot_status', ['funded', 'in_hand', 'sold']);
export const approvalStatusEnum = pgEnum('approval_status', ['pending', 'approved', 'rejected']);

// Ghana locations
export const GHANA_LOCATIONS = [
  'Accra', 'Tema', 'Kumasi', 'Obuasi', 'Tamale', 
  'Sekondi-Takoradi', 'Sunyani', 'Cape Coast', 'Koforidua', 'Techiman'
] as const;

// Users table
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  pin: varchar("pin", { length: 72 }),
  role: roleEnum("role").notNull().default('staff'),
  isActive: boolean("is_active").notNull().default(true),
  mustChangePin: boolean("must_change_pin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Access level enum for granular permissions
export const accessLevelEnum = pgEnum('access_level', ['full', 'view_only', 'transactions_only']);

// User business access (many-to-many)
export const userBusinessAccess = pgTable("user_business_access", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  businessId: varchar("business_id", { length: 36 }).notNull().references(() => businesses.id),
  accessLevel: accessLevelEnum("access_level").notNull().default('full'),
});

// Businesses table
export const businesses = pgTable("businesses", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: businessTypeEnum("type").notNull(),
  location: text("location"),
  approvalThreshold: decimal("approval_threshold", { precision: 15, scale: 2 }).default("5000"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Bank accounts table
export const bankAccounts = pgTable("bank_accounts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  bankName: text("bank_name").notNull(),
  accountRef: varchar("account_ref", { length: 50 }).notNull(),
  currency: currencyEnum("currency").notNull().default('GHS'),
  openingBalance: decimal("opening_balance", { precision: 15, scale: 2 }).notNull().default("0"),
  currentBalance: decimal("current_balance", { precision: 15, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Categories table
export const categories = pgTable("categories", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  businessType: businessTypeEnum("business_type"),
  isDefault: boolean("is_default").notNull().default(false),
});

// Unified ledger transactions
export const ledgerTransactions = pgTable("ledger_transactions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull().defaultNow(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: currencyEnum("currency").notNull().default('GHS'),
  direction: transactionDirectionEnum("direction").notNull(),
  businessId: varchar("business_id", { length: 36 }).notNull().references(() => businesses.id),
  bankAccountId: varchar("bank_account_id", { length: 36 }).references(() => bankAccounts.id),
  categoryId: varchar("category_id", { length: 36 }).references(() => categories.id),
  subcategory: text("subcategory"),
  counterparty: text("counterparty"),
  reference: text("reference"),
  notes: text("notes"),
  attachmentUrls: text("attachment_urls").array(),
  status: transactionStatusEnum("status").notNull().default('posted'),
  reconciled: boolean("reconciled").notNull().default(false),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastEditedBy: varchar("last_edited_by", { length: 36 }).references(() => users.id),
  lastEditedAt: timestamp("last_edited_at"),
});

// Machinery assets
export const machineryAssets = pgTable("machinery_assets", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id", { length: 36 }).notNull().references(() => businesses.id),
  assetType: text("asset_type").notNull(),
  serialNumber: varchar("serial_number", { length: 100 }),
  chassisNumber: varchar("chassis_number", { length: 100 }),
  status: machineryStatusEnum("status").notNull().default('ordered'),
  location: text("location"),
  purchasePrice: decimal("purchase_price", { precision: 15, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 15, scale: 2 }).default("0"),
  salePrice: decimal("sale_price", { precision: 15, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Machinery cost lines
export const machineryCostLines = pgTable("machinery_cost_lines", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id", { length: 36 }).notNull().references(() => machineryAssets.id),
  category: text("category").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  date: timestamp("date").notNull().defaultNow(),
  notes: text("notes"),
});

// Lease contracts
export const leaseContracts = pgTable("lease_contracts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id", { length: 36 }).notNull().references(() => machineryAssets.id),
  lesseeName: text("lessee_name").notNull(),
  lesseePhone: varchar("lessee_phone", { length: 20 }),
  monthlyRate: decimal("monthly_rate", { precision: 15, scale: 2 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Lease payments
export const leasePayments = pgTable("lease_payments", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id", { length: 36 }).notNull().references(() => leaseContracts.id),
  dueDate: timestamp("due_date").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 15, scale: 2 }).default("0"),
  paidDate: timestamp("paid_date"),
  isPaid: boolean("is_paid").notNull().default(false),
});

// Gold agents
export const agents = pgTable("agents", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }),
  location: text("location"),
  performanceStatus: text("performance_status").default('green'),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Gold lots
export const goldLots = pgTable("gold_lots", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id", { length: 36 }).notNull().references(() => businesses.id),
  agentId: varchar("agent_id", { length: 36 }).references(() => agents.id),
  stream: text("stream").notNull(),
  fundingAmount: decimal("funding_amount", { precision: 15, scale: 2 }),
  gramsReceived: decimal("grams_received", { precision: 10, scale: 2 }),
  purchaseCost: decimal("purchase_cost", { precision: 15, scale: 2 }),
  saleValue: decimal("sale_value", { precision: 15, scale: 2 }),
  cashReturned: decimal("cash_returned", { precision: 15, scale: 2 }),
  status: goldLotStatusEnum("status").notNull().default('funded'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Inventory items (spare parts)
export const inventoryItems = pgTable("inventory_items", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id", { length: 36 }).notNull().references(() => businesses.id),
  name: text("name").notNull(),
  sku: varchar("sku", { length: 50 }),
  quantity: integer("quantity").notNull().default(0),
  unitCost: decimal("unit_cost", { precision: 15, scale: 2 }),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }),
  reorderLevel: integer("reorder_level").default(5),
  location: text("location"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Inventory movements
export const inventoryMovements = pgTable("inventory_movements", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  itemId: varchar("item_id", { length: 36 }).notNull().references(() => inventoryItems.id),
  movementType: text("movement_type").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
});

// Fuel summaries
export const fuelSummaries = pgTable("fuel_summaries", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id", { length: 36 }).notNull().references(() => businesses.id),
  weekStartDate: timestamp("week_start_date").notNull(),
  weekEndDate: timestamp("week_end_date").notNull(),
  totalSales: decimal("total_sales", { precision: 15, scale: 2 }).notNull(),
  estimatedExpenses: decimal("estimated_expenses", { precision: 15, scale: 2 }),
  ownerSharePct: decimal("owner_share_pct", { precision: 5, scale: 2 }).notNull().default("40"),
  partnerSharePct: decimal("partner_share_pct", { precision: 5, scale: 2 }).notNull().default("60"),
  expectedOwnerShare: decimal("expected_owner_share", { precision: 15, scale: 2 }),
  cashRemitted: decimal("cash_remitted", { precision: 15, scale: 2 }),
  variance: decimal("variance", { precision: 15, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Alerts
export const alerts = pgTable("alerts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id", { length: 36 }).references(() => businesses.id),
  type: text("type").notNull(),
  severity: text("severity").notNull().default('warning'),
  title: text("title").notNull(),
  message: text("message"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Approvals
export const approvals = pgTable("approvals", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  transactionId: varchar("transaction_id", { length: 36 }).references(() => ledgerTransactions.id),
  businessId: varchar("business_id", { length: 36 }).notNull().references(() => businesses.id),
  requestedBy: varchar("requested_by", { length: 36 }).references(() => users.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  reason: text("reason"),
  status: approvalStatusEnum("status").notNull().default('pending'),
  approvedBy: varchar("approved_by", { length: 36 }).references(() => users.id),
  approvedAt: timestamp("approved_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Audit log
export const auditLog = pgTable("audit_log", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id", { length: 36 }),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Monthly reports
export const monthlyReports = pgTable("monthly_reports", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id", { length: 36 }).references(() => businesses.id),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  snapshotData: jsonb("snapshot_data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertBusinessSchema = createInsertSchema(businesses).omit({ id: true, createdAt: true });
export const insertBankAccountSchema = createInsertSchema(bankAccounts).omit({ id: true, createdAt: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertLedgerTransactionSchema = createInsertSchema(ledgerTransactions).omit({ id: true, createdAt: true });
export const insertMachineryAssetSchema = createInsertSchema(machineryAssets).omit({ id: true, createdAt: true });
export const insertMachineryCostLineSchema = createInsertSchema(machineryCostLines).omit({ id: true });
export const insertLeaseContractSchema = createInsertSchema(leaseContracts).omit({ id: true, createdAt: true });
export const insertLeasePaymentSchema = createInsertSchema(leasePayments).omit({ id: true });
export const insertAgentSchema = createInsertSchema(agents).omit({ id: true, createdAt: true });
export const insertGoldLotSchema = createInsertSchema(goldLots).omit({ id: true, createdAt: true });
export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({ id: true, createdAt: true });
export const insertInventoryMovementSchema = createInsertSchema(inventoryMovements).omit({ id: true, createdAt: true });
export const insertFuelSummarySchema = createInsertSchema(fuelSummaries).omit({ id: true, createdAt: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true, createdAt: true });
export const insertApprovalSchema = createInsertSchema(approvals).omit({ id: true, createdAt: true });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businesses.$inferSelect;
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;
export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;
export type InsertLedgerTransaction = z.infer<typeof insertLedgerTransactionSchema>;
export type LedgerTransaction = typeof ledgerTransactions.$inferSelect;
export type InsertMachineryAsset = z.infer<typeof insertMachineryAssetSchema>;
export type MachineryAsset = typeof machineryAssets.$inferSelect;
export type InsertMachineryCostLine = z.infer<typeof insertMachineryCostLineSchema>;
export type MachineryCostLine = typeof machineryCostLines.$inferSelect;
export type InsertLeaseContract = z.infer<typeof insertLeaseContractSchema>;
export type LeaseContract = typeof leaseContracts.$inferSelect;
export type InsertLeasePayment = z.infer<typeof insertLeasePaymentSchema>;
export type LeasePayment = typeof leasePayments.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;
export type InsertGoldLot = z.infer<typeof insertGoldLotSchema>;
export type GoldLot = typeof goldLots.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryMovement = z.infer<typeof insertInventoryMovementSchema>;
export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertFuelSummary = z.infer<typeof insertFuelSummarySchema>;
export type FuelSummary = typeof fuelSummaries.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertApproval = z.infer<typeof insertApprovalSchema>;
export type Approval = typeof approvals.$inferSelect;
export type UserBusinessAccess = typeof userBusinessAccess.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;
export type MonthlyReport = typeof monthlyReports.$inferSelect;
