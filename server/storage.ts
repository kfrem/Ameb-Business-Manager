import { db } from './db';
import { eq, and, desc, gte, lte, sql, inArray } from 'drizzle-orm';
import {
  users, businesses, bankAccounts, categories, ledgerTransactions,
  machineryAssets, machineryCostLines, leaseContracts, leasePayments,
  agents, goldLots, inventoryItems, inventoryMovements, fuelSummaries,
  alerts, approvals, auditLog, userBusinessAccess,
  type User, type InsertUser,
  type Business, type InsertBusiness,
  type BankAccount, type InsertBankAccount,
  type Category, type InsertCategory,
  type LedgerTransaction, type InsertLedgerTransaction,
  type MachineryAsset, type InsertMachineryAsset,
  type MachineryCostLine, type InsertMachineryCostLine,
  type LeaseContract, type InsertLeaseContract,
  type LeasePayment, type InsertLeasePayment,
  type Agent, type InsertAgent,
  type GoldLot, type InsertGoldLot,
  type InventoryItem, type InsertInventoryItem,
  type InventoryMovement, type InsertInventoryMovement,
  type FuelSummary, type InsertFuelSummary,
  type Alert, type InsertAlert,
  type Approval, type InsertApproval,
} from '@shared/schema';

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;

  // Businesses
  getBusiness(id: string): Promise<Business | undefined>;
  getAllBusinesses(): Promise<Business[]>;
  createBusiness(business: InsertBusiness): Promise<Business>;
  getUserBusinesses(userId: string): Promise<Business[]>;

  // Bank Accounts
  getBankAccount(id: string): Promise<BankAccount | undefined>;
  getAllBankAccounts(): Promise<BankAccount[]>;
  createBankAccount(account: InsertBankAccount): Promise<BankAccount>;
  updateBankBalance(id: string, amount: number, direction: 'in' | 'out'): Promise<void>;

  // Categories
  getCategory(id: string): Promise<Category | undefined>;
  getAllCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Ledger Transactions
  getTransaction(id: string): Promise<LedgerTransaction | undefined>;
  getAllTransactions(): Promise<LedgerTransaction[]>;
  getTransactionsByBusiness(businessId: string): Promise<LedgerTransaction[]>;
  createTransaction(transaction: InsertLedgerTransaction): Promise<LedgerTransaction>;

  // Machinery
  getMachineryAsset(id: string): Promise<MachineryAsset | undefined>;
  getMachineryAssetsByBusiness(businessId: string): Promise<MachineryAsset[]>;
  createMachineryAsset(asset: InsertMachineryAsset): Promise<MachineryAsset>;
  createMachineryCostLine(costLine: InsertMachineryCostLine): Promise<MachineryCostLine>;
  getCostLinesByAsset(assetId: string): Promise<MachineryCostLine[]>;

  // Leases
  getLeaseContract(id: string): Promise<LeaseContract | undefined>;
  getLeaseContractsByAsset(assetId: string): Promise<LeaseContract[]>;
  createLeaseContract(contract: InsertLeaseContract): Promise<LeaseContract>;
  createLeasePayment(payment: InsertLeasePayment): Promise<LeasePayment>;
  getLeasePaymentsByContract(contractId: string): Promise<LeasePayment[]>;

  // Agents
  getAgent(id: string): Promise<Agent | undefined>;
  getAllAgents(): Promise<Agent[]>;
  createAgent(agent: InsertAgent): Promise<Agent>;

  // Gold Lots
  getGoldLot(id: string): Promise<GoldLot | undefined>;
  getGoldLotsByBusiness(businessId: string): Promise<GoldLot[]>;
  createGoldLot(lot: InsertGoldLot): Promise<GoldLot>;

  // Inventory
  getInventoryItem(id: string): Promise<InventoryItem | undefined>;
  getInventoryItemsByBusiness(businessId: string): Promise<InventoryItem[]>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryQuantity(id: string, quantityChange: number): Promise<void>;
  createInventoryMovement(movement: InsertInventoryMovement): Promise<InventoryMovement>;

  // Fuel Summaries
  getFuelSummary(id: string): Promise<FuelSummary | undefined>;
  getFuelSummariesByBusiness(businessId: string): Promise<FuelSummary[]>;
  createFuelSummary(summary: InsertFuelSummary): Promise<FuelSummary>;

  // Alerts
  getAlert(id: string): Promise<Alert | undefined>;
  getAllAlerts(): Promise<Alert[]>;
  getUnreadAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  dismissAlert(id: string): Promise<void>;
  dismissAllAlerts(): Promise<void>;

  // Approvals
  getApproval(id: string): Promise<Approval | undefined>;
  getPendingApprovals(): Promise<Approval[]>;
  createApproval(approval: InsertApproval): Promise<Approval>;
  updateApprovalStatus(id: string, status: 'approved' | 'rejected', approvedBy: string): Promise<void>;

  // Dashboard
  getDashboardData(): Promise<any>;
  getBusinessKPIs(businessId: string): Promise<any>;
  getReportData(month: string, businessId?: string): Promise<any>;

  // Bank account transactions
  getTransactionsByBankAccount(bankAccountId: string): Promise<LedgerTransaction[]>;

  // User business access management
  addUserBusinessAccess(userId: string, businessId: string): Promise<void>;
  removeUserBusinessAccess(userId: string, businessId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return result[0];
  }

  // Businesses
  async getBusiness(id: string): Promise<Business | undefined> {
    const result = await db.select().from(businesses).where(eq(businesses.id, id)).limit(1);
    return result[0];
  }

  async getAllBusinesses(): Promise<Business[]> {
    return db.select().from(businesses).where(eq(businesses.isActive, true));
  }

  async createBusiness(business: InsertBusiness): Promise<Business> {
    const result = await db.insert(businesses).values(business).returning();
    return result[0];
  }

  async getUserBusinesses(userId: string): Promise<Business[]> {
    // Always filter by explicit userBusinessAccess entries
    // This ensures new users start with a blank canvas
    const access = await db.select().from(userBusinessAccess).where(eq(userBusinessAccess.userId, userId));
    const businessIds = access.map(a => a.businessId);
    if (businessIds.length === 0) return [];
    return db.select().from(businesses).where(inArray(businesses.id, businessIds));
  }

  // Bank Accounts
  async getBankAccount(id: string): Promise<BankAccount | undefined> {
    const result = await db.select().from(bankAccounts).where(eq(bankAccounts.id, id)).limit(1);
    return result[0];
  }

  async getAllBankAccounts(): Promise<BankAccount[]> {
    return db.select().from(bankAccounts).where(eq(bankAccounts.isActive, true));
  }

  async createBankAccount(account: InsertBankAccount): Promise<BankAccount> {
    const result = await db.insert(bankAccounts).values({
      ...account,
      currentBalance: account.openingBalance,
    }).returning();
    return result[0];
  }

  async updateBankBalance(id: string, amount: number, direction: 'in' | 'out'): Promise<void> {
    const adjustment = direction === 'in' ? amount : -amount;
    await db.update(bankAccounts)
      .set({ currentBalance: sql`${bankAccounts.currentBalance} + ${adjustment}` })
      .where(eq(bankAccounts.id, id));
  }

  // Categories
  async getCategory(id: string): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return result[0];
  }

  async getAllCategories(): Promise<Category[]> {
    return db.select().from(categories);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const result = await db.insert(categories).values(category).returning();
    return result[0];
  }

  // Ledger Transactions
  async getTransaction(id: string): Promise<LedgerTransaction | undefined> {
    const result = await db.select().from(ledgerTransactions).where(eq(ledgerTransactions.id, id)).limit(1);
    return result[0];
  }

  async getAllTransactions(): Promise<LedgerTransaction[]> {
    return db.select().from(ledgerTransactions).orderBy(desc(ledgerTransactions.date));
  }

  async getTransactionsByBusiness(businessId: string): Promise<LedgerTransaction[]> {
    return db.select().from(ledgerTransactions)
      .where(eq(ledgerTransactions.businessId, businessId))
      .orderBy(desc(ledgerTransactions.date));
  }

  async createTransaction(transaction: InsertLedgerTransaction): Promise<LedgerTransaction> {
    const result = await db.insert(ledgerTransactions).values(transaction).returning();
    
    // Update bank balance if linked
    if (transaction.bankAccountId && transaction.amount) {
      const amount = typeof transaction.amount === 'string' ? parseFloat(transaction.amount) : transaction.amount;
      await this.updateBankBalance(transaction.bankAccountId, amount, transaction.direction);
    }
    
    return result[0];
  }

  // Machinery
  async getMachineryAsset(id: string): Promise<MachineryAsset | undefined> {
    const result = await db.select().from(machineryAssets).where(eq(machineryAssets.id, id)).limit(1);
    return result[0];
  }

  async getMachineryAssetsByBusiness(businessId: string): Promise<MachineryAsset[]> {
    return db.select().from(machineryAssets).where(eq(machineryAssets.businessId, businessId));
  }

  async createMachineryAsset(asset: InsertMachineryAsset): Promise<MachineryAsset> {
    const result = await db.insert(machineryAssets).values(asset).returning();
    return result[0];
  }

  async createMachineryCostLine(costLine: InsertMachineryCostLine): Promise<MachineryCostLine> {
    const result = await db.insert(machineryCostLines).values(costLine).returning();
    // Update total cost on asset
    await db.update(machineryAssets)
      .set({ totalCost: sql`${machineryAssets.totalCost} + ${costLine.amount}` })
      .where(eq(machineryAssets.id, costLine.assetId));
    return result[0];
  }

  async getCostLinesByAsset(assetId: string): Promise<MachineryCostLine[]> {
    return db.select().from(machineryCostLines).where(eq(machineryCostLines.assetId, assetId));
  }

  // Leases
  async getLeaseContract(id: string): Promise<LeaseContract | undefined> {
    const result = await db.select().from(leaseContracts).where(eq(leaseContracts.id, id)).limit(1);
    return result[0];
  }

  async getLeaseContractsByAsset(assetId: string): Promise<LeaseContract[]> {
    return db.select().from(leaseContracts).where(eq(leaseContracts.assetId, assetId));
  }

  async createLeaseContract(contract: InsertLeaseContract): Promise<LeaseContract> {
    const result = await db.insert(leaseContracts).values(contract).returning();
    return result[0];
  }

  async createLeasePayment(payment: InsertLeasePayment): Promise<LeasePayment> {
    const result = await db.insert(leasePayments).values(payment).returning();
    return result[0];
  }

  async getLeasePaymentsByContract(contractId: string): Promise<LeasePayment[]> {
    return db.select().from(leasePayments).where(eq(leasePayments.contractId, contractId));
  }

  // Agents
  async getAgent(id: string): Promise<Agent | undefined> {
    const result = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
    return result[0];
  }

  async getAllAgents(): Promise<Agent[]> {
    return db.select().from(agents).where(eq(agents.isActive, true));
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    const result = await db.insert(agents).values(agent).returning();
    return result[0];
  }

  // Gold Lots
  async getGoldLot(id: string): Promise<GoldLot | undefined> {
    const result = await db.select().from(goldLots).where(eq(goldLots.id, id)).limit(1);
    return result[0];
  }

  async getGoldLotsByBusiness(businessId: string): Promise<GoldLot[]> {
    return db.select().from(goldLots).where(eq(goldLots.businessId, businessId));
  }

  async createGoldLot(lot: InsertGoldLot): Promise<GoldLot> {
    const result = await db.insert(goldLots).values(lot).returning();
    return result[0];
  }

  // Inventory
  async getInventoryItem(id: string): Promise<InventoryItem | undefined> {
    const result = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).limit(1);
    return result[0];
  }

  async getInventoryItemsByBusiness(businessId: string): Promise<InventoryItem[]> {
    return db.select().from(inventoryItems).where(eq(inventoryItems.businessId, businessId));
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const result = await db.insert(inventoryItems).values(item).returning();
    return result[0];
  }

  async updateInventoryQuantity(id: string, quantityChange: number): Promise<void> {
    await db.update(inventoryItems)
      .set({ quantity: sql`${inventoryItems.quantity} + ${quantityChange}` })
      .where(eq(inventoryItems.id, id));
  }

  async createInventoryMovement(movement: InsertInventoryMovement): Promise<InventoryMovement> {
    const result = await db.insert(inventoryMovements).values(movement).returning();
    // Update inventory quantity
    const qtyChange = movement.movementType === 'in' ? movement.quantity : -movement.quantity;
    await this.updateInventoryQuantity(movement.itemId, qtyChange);
    return result[0];
  }

  // Fuel Summaries
  async getFuelSummary(id: string): Promise<FuelSummary | undefined> {
    const result = await db.select().from(fuelSummaries).where(eq(fuelSummaries.id, id)).limit(1);
    return result[0];
  }

  async getFuelSummariesByBusiness(businessId: string): Promise<FuelSummary[]> {
    return db.select().from(fuelSummaries)
      .where(eq(fuelSummaries.businessId, businessId))
      .orderBy(desc(fuelSummaries.weekStartDate));
  }

  async createFuelSummary(summary: InsertFuelSummary): Promise<FuelSummary> {
    const result = await db.insert(fuelSummaries).values(summary).returning();
    return result[0];
  }

  // Alerts
  async getAlert(id: string): Promise<Alert | undefined> {
    const result = await db.select().from(alerts).where(eq(alerts.id, id)).limit(1);
    return result[0];
  }

  async getAllAlerts(): Promise<Alert[]> {
    return db.select().from(alerts).orderBy(desc(alerts.createdAt));
  }

  async getUnreadAlerts(): Promise<Alert[]> {
    return db.select().from(alerts)
      .where(eq(alerts.isRead, false))
      .orderBy(desc(alerts.createdAt));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const result = await db.insert(alerts).values(alert).returning();
    return result[0];
  }

  async dismissAlert(id: string): Promise<void> {
    await db.update(alerts).set({ isRead: true }).where(eq(alerts.id, id));
  }

  async dismissAllAlerts(): Promise<void> {
    await db.update(alerts).set({ isRead: true }).where(eq(alerts.isRead, false));
  }

  // Approvals
  async getApproval(id: string): Promise<Approval | undefined> {
    const result = await db.select().from(approvals).where(eq(approvals.id, id)).limit(1);
    return result[0];
  }

  async getPendingApprovals(): Promise<Approval[]> {
    return db.select().from(approvals)
      .where(eq(approvals.status, 'pending'))
      .orderBy(desc(approvals.createdAt));
  }

  async createApproval(approval: InsertApproval): Promise<Approval> {
    const result = await db.insert(approvals).values(approval).returning();
    return result[0];
  }

  async updateApprovalStatus(id: string, status: 'approved' | 'rejected', approvedBy: string): Promise<void> {
    await db.update(approvals)
      .set({ status, approvedBy, approvedAt: new Date() })
      .where(eq(approvals.id, id));
  }

  // Dashboard
  async getDashboardData(): Promise<any> {
    const allBusinesses = await this.getAllBusinesses();
    const allBankAccounts = await this.getAllBankAccounts();
    const allTransactions = await this.getAllTransactions();
    const allAlerts = await this.getUnreadAlerts();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayTransactions = allTransactions.filter(t => new Date(t.date) >= today);
    const todayIn = todayTransactions
      .filter(t => t.direction === 'in')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const todayOut = todayTransactions
      .filter(t => t.direction === 'out')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const totalBalance = allBankAccounts.reduce((sum, b) => sum + parseFloat(b.currentBalance || '0'), 0);

    const businessesWithStats = await Promise.all(allBusinesses.map(async (business) => {
      const businessTxns = allTransactions.filter(t => t.businessId === business.id);
      const cashIn = businessTxns.filter(t => t.direction === 'in').reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const cashOut = businessTxns.filter(t => t.direction === 'out').reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const alertCount = allAlerts.filter(a => a.businessId === business.id).length;
      
      return {
        ...business,
        cashIn,
        cashOut,
        profit: cashIn - cashOut,
        alertCount,
      };
    }));

    return {
      businesses: businessesWithStats,
      bankAccounts: allBankAccounts.map(b => ({
        ...b,
        balance: parseFloat(b.currentBalance || '0'),
      })),
      todayIn,
      todayOut,
      totalBalance,
    };
  }

  async getBusinessKPIs(businessId: string): Promise<any> {
    const business = await this.getBusiness(businessId);
    if (!business) return null;

    const transactions = await this.getTransactionsByBusiness(businessId);
    const totalRevenue = transactions.filter(t => t.direction === 'in').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalExpenses = transactions.filter(t => t.direction === 'out').reduce((sum, t) => sum + parseFloat(t.amount), 0);

    let statusCounts: Record<string, number> = {};
    let costBreakdown: any[] = [];
    let revenueBreakdown: any[] = [];
    let receivables = 0;

    if (business.type === 'machinery') {
      const assets = await this.getMachineryAssetsByBusiness(businessId);
      statusCounts = assets.reduce((acc, a) => {
        acc[a.status] = (acc[a.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Get cost breakdown from cost lines
      const allCostLines: MachineryCostLine[] = [];
      for (const asset of assets) {
        const lines = await this.getCostLinesByAsset(asset.id);
        allCostLines.push(...lines);
      }
      
      const costByCategory = allCostLines.reduce((acc, line) => {
        acc[line.category] = (acc[line.category] || 0) + parseFloat(line.amount);
        return acc;
      }, {} as Record<string, number>);
      
      costBreakdown = Object.entries(costByCategory).map(([name, value]) => ({ name, value }));
      
      // Get receivables from unpaid lease payments
      for (const asset of assets.filter(a => a.status === 'on_lease')) {
        const contracts = await this.getLeaseContractsByAsset(asset.id);
        for (const contract of contracts) {
          const payments = await this.getLeasePaymentsByContract(contract.id);
          receivables += payments.filter(p => !p.isPaid).reduce((sum, p) => sum + parseFloat(p.amount), 0);
        }
      }
    }

    if (business.type === 'gold_agent' || business.type === 'gold_owner') {
      const lots = await this.getGoldLotsByBusiness(businessId);
      statusCounts = lots.reduce((acc, l) => {
        acc[l.status] = (acc[l.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    }

    if (business.type === 'spare_parts') {
      const items = await this.getInventoryItemsByBusiness(businessId);
      const lowStock = items.filter(i => i.quantity <= (i.reorderLevel || 5)).length;
      statusCounts = { 'In Stock': items.length - lowStock, 'Low Stock': lowStock };
    }

    return {
      totalRevenue,
      totalExpenses,
      profit: totalRevenue - totalExpenses,
      cashIn: totalRevenue,
      cashOut: totalExpenses,
      costBreakdown,
      revenueBreakdown,
      statusCounts,
      receivables,
    };
  }

  async getReportData(month: string, businessId?: string): Promise<any> {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59);

    let transactions = await this.getAllTransactions();
    transactions = transactions.filter(t => {
      const date = new Date(t.date);
      return date >= startDate && date <= endDate;
    });

    if (businessId && businessId !== 'all') {
      transactions = transactions.filter(t => t.businessId === businessId);
    }

    const totalRevenue = transactions.filter(t => t.direction === 'in').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalExpenses = transactions.filter(t => t.direction === 'out').reduce((sum, t) => sum + parseFloat(t.amount), 0);

    // Category breakdown
    const allCategories = await this.getAllCategories();
    const categoryMap = new Map(allCategories.map(c => [c.id, c.name]));
    
    const expensesByCategory = transactions
      .filter(t => t.direction === 'out' && t.categoryId)
      .reduce((acc, t) => {
        const catName = categoryMap.get(t.categoryId!) || 'Other';
        acc[catName] = (acc[catName] || 0) + parseFloat(t.amount);
        return acc;
      }, {} as Record<string, number>);

    const categoryBreakdown = Object.entries(expensesByCategory).map(([name, value]) => ({ name, value }));

    // Business breakdown
    const allBusinesses = await this.getAllBusinesses();
    const businessMap = new Map(allBusinesses.map(b => [b.id, b.name]));
    
    const revenueByBusiness = transactions
      .filter(t => t.direction === 'in')
      .reduce((acc, t) => {
        const bizName = businessMap.get(t.businessId) || 'Unknown';
        acc[bizName] = (acc[bizName] || 0) + parseFloat(t.amount);
        return acc;
      }, {} as Record<string, number>);

    const businessBreakdown = Object.entries(revenueByBusiness).map(([name, value]) => ({ name, value }));

    return {
      totalRevenue,
      totalExpenses,
      profit: totalRevenue - totalExpenses,
      categoryBreakdown,
      businessBreakdown,
    };
  }

  // Bank account transactions
  async getTransactionsByBankAccount(bankAccountId: string): Promise<LedgerTransaction[]> {
    return db.select().from(ledgerTransactions)
      .where(eq(ledgerTransactions.bankAccountId, bankAccountId))
      .orderBy(desc(ledgerTransactions.date));
  }

  // User business access management
  async addUserBusinessAccess(userId: string, businessId: string): Promise<void> {
    // Check if access already exists
    const existing = await db.select().from(userBusinessAccess)
      .where(and(
        eq(userBusinessAccess.userId, userId),
        eq(userBusinessAccess.businessId, businessId)
      ))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(userBusinessAccess).values({ userId, businessId });
    }
  }

  async removeUserBusinessAccess(userId: string, businessId: string): Promise<void> {
    await db.delete(userBusinessAccess)
      .where(and(
        eq(userBusinessAccess.userId, userId),
        eq(userBusinessAccess.businessId, businessId)
      ));
  }
}

export const storage = new DatabaseStorage();
