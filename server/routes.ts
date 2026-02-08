import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLedgerTransactionSchema } from "@shared/schema";
import { z } from "zod";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Helper: Check if user has access to a business
async function checkBusinessAccess(userId: string, businessId: string): Promise<boolean> {
  const userBusinesses = await storage.getUserBusinesses(userId);
  return userBusinesses.some(b => b.id === businessId);
}

// Middleware: Owner-only access
function ownerOnly(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Owner access required' });
  }
  next();
}

// Middleware: Owner or Admin access
function ownerOrAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !['owner', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Owner or Admin access required' });
  }
  next();
}

// Middleware: Can write (not auditor)
function canWrite(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role === 'auditor') {
    return res.status(403).json({ error: 'Auditor cannot modify data' });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Apply auth middleware to all /api routes except login/register
  app.use("/api", async (req, res, next) => {
    // Skip auth for login and register routes
    if (req.path === "/auth/login" || req.path === "/auth/register") {
      return next();
    }
    // For other routes, validate user header exists and load user
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - Please login' });
    }
    
    // Load and validate user
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized - Invalid user' });
    }
    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }
    
    req.user = user;
    next();
  });

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { phone, pin } = req.body;
      
      // Validate input
      if (!phone || typeof phone !== 'string') {
        return res.status(400).json({ error: "Phone number is required" });
      }
      
      const user = await storage.getUserByPhone(phone);
      
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      // Validate PIN
      if (pin && user.pin && pin !== user.pin) {
        return res.status(401).json({ error: "Invalid PIN" });
      }
      
      const businesses = await storage.getUserBusinesses(user.id);
      res.json({ user, businesses });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Register route - create new user with blank canvas
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { phone, pin, name } = req.body;
      
      // Validate input
      if (!phone || typeof phone !== 'string' || phone.length < 10) {
        return res.status(400).json({ error: "Valid phone number is required (10+ digits)" });
      }
      if (!pin || typeof pin !== 'string' || pin.length !== 4) {
        return res.status(400).json({ error: "PIN must be 4 digits" });
      }
      if (!name || typeof name !== 'string' || name.length < 2) {
        return res.status(400).json({ error: "Name is required (2+ characters)" });
      }
      
      // Check if phone already exists
      const existingUser = await storage.getUserByPhone(phone);
      if (existingUser) {
        return res.status(409).json({ error: "Phone number already registered" });
      }
      
      // Create new user as owner (they own their own businesses)
      const newUser = await storage.createUser({
        name,
        phone,
        pin,
        role: 'owner',
        isActive: true
      });
      
      res.status(201).json({ user: newUser, businesses: [] });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Users routes - Owner/Admin only
  app.get("/api/users", ownerOrAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Admin: Create new user with temporary PIN
  app.post("/api/users", ownerOrAdmin, async (req, res) => {
    try {
      const { name, phone, pin, role } = req.body;

      // Validate input
      if (!name || typeof name !== 'string' || name.length < 2) {
        return res.status(400).json({ error: "Name is required (2+ characters)" });
      }
      if (!phone || typeof phone !== 'string' || phone.length < 10) {
        return res.status(400).json({ error: "Valid phone number is required (10+ digits)" });
      }
      if (!pin || typeof pin !== 'string' || pin.length !== 4) {
        return res.status(400).json({ error: "PIN must be 4 digits" });
      }

      // Check if phone already exists
      const existingUser = await storage.getUserByPhone(phone);
      if (existingUser) {
        return res.status(409).json({ error: "Phone number already registered" });
      }

      // Create new user with mustChangePin = true
      const newUser = await storage.createUser({
        name,
        phone,
        pin,
        role: role || 'staff',
        isActive: true,
        mustChangePin: true  // Force PIN change on first login
      });

      res.status(201).json(newUser);
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Admin: Update user
  app.patch("/api/users/:id", ownerOrAdmin, async (req, res) => {
    try {
      const { name, phone, role, isActive, pin, mustChangePin } = req.body;
      const updates: any = {};

      if (name !== undefined) updates.name = name;
      if (phone !== undefined) updates.phone = phone;
      if (role !== undefined) updates.role = role;
      if (isActive !== undefined) updates.isActive = isActive;
      if (pin !== undefined) updates.pin = pin;
      if (mustChangePin !== undefined) updates.mustChangePin = mustChangePin;

      const updatedUser = await storage.updateUser(req.params.id, updates);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // User: Change own PIN
  app.post("/api/users/change-pin", async (req, res) => {
    try {
      const { currentPin, newPin } = req.body;

      // Validate new PIN
      if (!newPin || typeof newPin !== 'string' || newPin.length !== 4) {
        return res.status(400).json({ error: "New PIN must be 4 digits" });
      }

      // For users with mustChangePin, we don't require current PIN validation
      if (!req.user.mustChangePin) {
        // Verify current PIN for users changing voluntarily
        if (!currentPin || currentPin !== req.user.pin) {
          return res.status(401).json({ error: "Current PIN is incorrect" });
        }
      }

      // Update PIN and clear mustChangePin flag
      const updatedUser = await storage.updateUser(req.user.id, {
        pin: newPin,
        mustChangePin: false
      });

      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Change PIN error:", error);
      res.status(500).json({ error: "Failed to change PIN" });
    }
  });

  // Admin: Assign business access to user
  app.post("/api/users/:id/businesses", ownerOrAdmin, async (req, res) => {
    try {
      const { businessId } = req.body;
      if (!businessId) {
        return res.status(400).json({ error: "Business ID is required" });
      }

      await storage.addUserBusinessAccess(req.params.id, businessId);
      res.json({ success: true });
    } catch (error) {
      console.error("Add business access error:", error);
      res.status(500).json({ error: "Failed to add business access" });
    }
  });

  // Admin: Remove business access from user
  app.delete("/api/users/:id/businesses/:businessId", ownerOrAdmin, async (req, res) => {
    try {
      await storage.removeUserBusinessAccess(req.params.id, req.params.businessId);
      res.json({ success: true });
    } catch (error) {
      console.error("Remove business access error:", error);
      res.status(500).json({ error: "Failed to remove business access" });
    }
  });

  app.get("/api/users/:id/businesses", async (req, res) => {
    try {
      // Users can only view their own businesses unless owner/admin
      if (req.user.role !== 'owner' && req.user.role !== 'admin' && req.params.id !== req.user.id) {
        return res.status(403).json({ error: "Cannot view other user's businesses" });
      }
      const businesses = await storage.getUserBusinesses(req.params.id);
      res.json(businesses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user businesses" });
    }
  });

  // Dashboard route - Returns data filtered by user's business access
  app.get("/api/dashboard", async (req, res) => {
    try {
      // Get businesses user has explicit access to
      const userBusinesses = await storage.getUserBusinesses(req.user.id);
      const userBusinessIds = userBusinesses.map(b => b.id);

      // If user has no businesses, return empty dashboard
      if (userBusinessIds.length === 0) {
        return res.json({
          businesses: [],
          bankAccounts: [],
          todayIn: 0,
          todayOut: 0,
          totalBalance: 0
        });
      }

      const data = await storage.getDashboardData();
      // Filter to only show businesses user has access to
      data.businesses = data.businesses.filter((b: any) =>
        userBusinessIds.includes(b.id)
      );

      // For non-owner/admin users, also filter bank accounts and totals
      if (!['owner', 'admin'].includes(req.user.role)) {
        // Non-privileged users see empty bank section (bank accounts are company-wide)
        data.bankAccounts = [];
        data.totalBalance = 0;
      }

      res.json(data);
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });

  // Businesses routes - Filter by user's explicit business access
  app.get("/api/businesses", async (req, res) => {
    try {
      // All users only see businesses they have explicit access to
      const businesses = await storage.getUserBusinesses(req.user.id);
      res.json(businesses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch businesses" });
    }
  });

  app.get("/api/businesses/:id", async (req, res) => {
    try {
      // Check access for non-owner/admin
      if (!['owner', 'admin', 'auditor'].includes(req.user.role)) {
        const hasAccess = await checkBusinessAccess(req.user.id, req.params.id);
        if (!hasAccess) {
          return res.status(403).json({ error: "No access to this business" });
        }
      }
      
      const business = await storage.getBusiness(req.params.id);
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }
      res.json(business);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch business" });
    }
  });

  app.get("/api/businesses/:id/kpis", async (req, res) => {
    try {
      // Check access for non-owner/admin
      if (!['owner', 'admin', 'auditor'].includes(req.user.role)) {
        const hasAccess = await checkBusinessAccess(req.user.id, req.params.id);
        if (!hasAccess) {
          return res.status(403).json({ error: "No access to this business" });
        }
      }
      
      const kpis = await storage.getBusinessKPIs(req.params.id);
      res.json(kpis);
    } catch (error) {
      console.error("KPI error:", error);
      res.status(500).json({ error: "Failed to fetch KPIs" });
    }
  });

  // Bank accounts routes - Owner/Admin only
  app.get("/api/bank-accounts", ownerOrAdmin, async (req, res) => {
    try {
      const accounts = await storage.getAllBankAccounts();
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bank accounts" });
    }
  });

  // Get single bank account details
  app.get("/api/bank-accounts/:id", ownerOrAdmin, async (req, res) => {
    try {
      const account = await storage.getBankAccount(req.params.id);
      if (!account) {
        return res.status(404).json({ error: "Bank account not found" });
      }
      res.json(account);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bank account" });
    }
  });

  // Get transactions for a specific bank account
  app.get("/api/bank-accounts/:id/transactions", ownerOrAdmin, async (req, res) => {
    try {
      const transactions = await storage.getTransactionsByBankAccount(req.params.id);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bank account transactions" });
    }
  });

  // Categories routes - All authenticated users
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Transactions routes
  app.get("/api/transactions", async (req, res) => {
    try {
      const { business } = req.query;
      
      // Check business access for non-owner/admin
      if (business && typeof business === 'string') {
        if (!['owner', 'admin', 'auditor'].includes(req.user.role)) {
          const hasAccess = await checkBusinessAccess(req.user.id, business);
          if (!hasAccess) {
            return res.status(403).json({ error: "No access to this business" });
          }
        }
        const transactions = await storage.getTransactionsByBusiness(business);
        res.json(transactions);
      } else {
        // All transactions - filter by user access
        if (['owner', 'admin', 'auditor'].includes(req.user.role)) {
          const transactions = await storage.getAllTransactions();
          res.json(transactions);
        } else {
          // Staff/Partner: Only their businesses' transactions
          const userBusinesses = await storage.getUserBusinesses(req.user.id);
          const allTransactions = await storage.getAllTransactions();
          const filtered = allTransactions.filter((t: any) => 
            userBusinesses.some(b => b.id === t.businessId)
          );
          res.json(filtered);
        }
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", canWrite, async (req, res) => {
    try {
      const { amount, currency, direction, businessId, bankAccountId, categoryId,
              counterparty, notes, createdBy, customerId, supplierId, incomeSource,
              assetId, subcategory, reference } = req.body;

      // Validate required fields
      if (!amount || !direction || !businessId) {
        return res.status(400).json({ error: "amount, direction, and businessId are required" });
      }
      if (!['in', 'out'].includes(direction)) {
        return res.status(400).json({ error: "direction must be 'in' or 'out'" });
      }

      // Check business access for non-owner/admin
      if (!['owner', 'admin'].includes(req.user.role)) {
        const hasAccess = await checkBusinessAccess(req.user.id, businessId);
        if (!hasAccess) {
          return res.status(403).json({ error: "No access to this business" });
        }
      }

      const txData: any = {
        amount: String(amount),
        currency: currency || 'GHS',
        direction,
        businessId,
        date: new Date(),
        status: 'posted',
        reconciled: false,
      };

      // Add optional fields only if provided
      if (bankAccountId) txData.bankAccountId = bankAccountId;
      if (categoryId) txData.categoryId = categoryId;
      if (counterparty) txData.counterparty = counterparty;
      if (notes) txData.notes = notes;
      if (createdBy) txData.createdBy = createdBy;
      if (customerId) txData.customerId = customerId;
      if (supplierId) txData.supplierId = supplierId;
      if (incomeSource) txData.incomeSource = incomeSource;
      if (assetId) txData.assetId = assetId;
      if (subcategory) txData.subcategory = subcategory;
      if (reference) txData.reference = reference;

      const transaction = await storage.createTransaction(txData);
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Create transaction error:", error);
      const errMsg = error instanceof Error ? error.message : "Failed to create transaction";
      res.status(500).json({ error: errMsg });
    }
  });

  // Alerts routes
  app.get("/api/alerts", async (req, res) => {
    try {
      const alerts = await storage.getAllAlerts();
      
      // Filter alerts by user's business access
      if (!['owner', 'admin', 'auditor'].includes(req.user.role)) {
        const userBusinesses = await storage.getUserBusinesses(req.user.id);
        const filtered = alerts.filter((a: any) => 
          userBusinesses.some(b => b.id === a.businessId)
        );
        res.json(filtered);
      } else {
        res.json(alerts);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  // Alert dismiss validation schema
  const dismissAlertSchema = z.object({
    alertId: z.string().uuid().optional()
  });

  app.post("/api/alerts/:id/dismiss", canWrite, async (req, res) => {
    try {
      // Validate alert ID format
      if (!req.params.id || req.params.id.length < 10) {
        return res.status(400).json({ error: "Invalid alert ID" });
      }
      
      // Check business ownership for non-owner/admin
      if (!['owner', 'admin'].includes(req.user.role)) {
        const alerts = await storage.getAllAlerts();
        const alert = alerts.find((a: any) => a.id === req.params.id);
        if (alert && alert.businessId) {
          const hasAccess = await checkBusinessAccess(req.user.id, alert.businessId);
          if (!hasAccess) {
            return res.status(403).json({ error: "No access to dismiss this alert" });
          }
        }
      }
      
      await storage.dismissAlert(req.params.id as string);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to dismiss alert" });
    }
  });

  app.post("/api/alerts/dismiss-all", ownerOrAdmin, async (req, res) => {
    try {
      await storage.dismissAllAlerts();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to dismiss alerts" });
    }
  });

  // Approvals routes - Owner only
  app.get("/api/approvals", ownerOnly, async (req, res) => {
    try {
      const approvals = await storage.getPendingApprovals();
      res.json(approvals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch approvals" });
    }
  });

  // Approval action validation schema
  const approvalActionSchema = z.object({
    notes: z.string().optional()
  });

  app.post("/api/approvals/:id/approved", ownerOnly, async (req, res) => {
    try {
      // Validate request body
      approvalActionSchema.parse(req.body || {});
      await storage.updateApprovalStatus(req.params.id as string, 'approved', req.user.id);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to approve" });
    }
  });

  app.post("/api/approvals/:id/rejected", ownerOnly, async (req, res) => {
    try {
      // Validate request body
      approvalActionSchema.parse(req.body || {});
      await storage.updateApprovalStatus(req.params.id as string, 'rejected', req.user.id);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to reject" });
    }
  });

  // Health Dashboard route — the director's morning view
  app.get("/api/reports/health", async (req, res) => {
    try {
      const userBusinesses = await storage.getUserBusinesses(req.user.id);
      const userBusinessIds = userBusinesses.map(b => b.id);

      if (userBusinessIds.length === 0) {
        return res.json({
          healthScore: 0,
          monthlyTrend: [],
          currentMonth: { revenue: 0, expenses: 0, profit: 0 },
          lastMonth: { revenue: 0, expenses: 0, profit: 0 },
          categoryBreakdown: [],
          businessComparison: [],
          cashPosition: { total: 0, accounts: [] },
          alerts: {
            cashFlowPositive: false, todayIn: 0, todayOut: 0,
            receivablesAmount: 0, lowStockCount: 0, oldAssetCount: 0, unreadAlertCount: 0
          },
          recentTransactions: [],
        });
      }

      const data = await storage.getHealthDashboardData(userBusinessIds);
      res.json(data);
    } catch (error) {
      console.error("Health dashboard error:", error);
      res.status(500).json({ error: "Failed to fetch health dashboard data" });
    }
  });

  // Reports routes - Owner/Admin/Auditor only
  app.get("/api/reports", async (req, res) => {
    try {
      const { month, business } = req.query;
      
      // Check business access for non-owner/admin/auditor
      if (business && typeof business === 'string') {
        if (!['owner', 'admin', 'auditor'].includes(req.user.role)) {
          const hasAccess = await checkBusinessAccess(req.user.id, business);
          if (!hasAccess) {
            return res.status(403).json({ error: "No access to this business reports" });
          }
        }
      }
      
      const data = await storage.getReportData(
        (month as string) || new Date().toISOString().slice(0, 7),
        business as string | undefined
      );
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch report data" });
    }
  });

  // Agents routes - Gold business access only
  app.get("/api/agents", async (req, res) => {
    try {
      // Only users with gold business access can view agents
      if (!['owner', 'admin', 'auditor'].includes(req.user.role)) {
        const userBusinesses = await storage.getUserBusinesses(req.user.id);
        const hasGoldAccess = userBusinesses.some((b: any) =>
          b.type === 'gold_agent' || b.type === 'gold_owner'
        );
        if (!hasGoldAccess) {
          return res.status(403).json({ error: "No access to gold agent data" });
        }
      }
      const agents = await storage.getAllAgents();
      res.json(agents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch agents" });
    }
  });

  // Create a new business (Owner only)
  app.post("/api/businesses", ownerOnly, async (req, res) => {
    try {
      const { name, type, location } = req.body;
      if (!name || typeof name !== 'string' || name.length < 2) {
        return res.status(400).json({ error: "Business name is required (2+ characters)" });
      }
      if (!type || !['machinery', 'gold_agent', 'gold_owner', 'spare_parts', 'fuel'].includes(type)) {
        return res.status(400).json({ error: "Valid business type is required" });
      }

      const business = await storage.createBusiness({
        name,
        type,
        location: location || null,
        isActive: true,
      });

      // Auto-assign the creating owner access to this business
      await storage.addUserBusinessAccess(req.user.id, business.id);

      res.status(201).json(business);
    } catch (error) {
      console.error("Create business error:", error);
      res.status(500).json({ error: "Failed to create business" });
    }
  });

  // Admin: Get ALL businesses (for assigning to users)
  app.get("/api/admin/businesses", ownerOrAdmin, async (req, res) => {
    try {
      const allBusinesses = await storage.getAllBusinesses();
      res.json(allBusinesses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch businesses" });
    }
  });

  // Customers routes
  app.get("/api/customers", async (req, res) => {
    try {
      const { business } = req.query;
      if (business && typeof business === 'string') {
        const customers = await storage.getCustomersByBusiness(business);
        res.json(customers);
      } else {
        const customers = await storage.getAllCustomers();
        res.json(customers);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  app.post("/api/customers", canWrite, async (req, res) => {
    try {
      const { name, phone, email, address, notes, businessId } = req.body;
      if (!name || name.length < 2) {
        return res.status(400).json({ error: "Name is required" });
      }
      const customer = await storage.createCustomer({
        name,
        phone,
        email,
        address,
        notes,
        businessId,
        isActive: true
      });
      res.status(201).json(customer);
    } catch (error) {
      console.error("Create customer error:", error);
      res.status(500).json({ error: "Failed to create customer" });
    }
  });

  // Update customer
  app.patch("/api/customers/:id", canWrite, async (req, res) => {
    try {
      const { name, phone, email, address, notes, isActive } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (phone !== undefined) updates.phone = phone;
      if (email !== undefined) updates.email = email;
      if (address !== undefined) updates.address = address;
      if (notes !== undefined) updates.notes = notes;
      if (isActive !== undefined) updates.isActive = isActive;

      const customer = await storage.updateCustomer(req.params.id, updates);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Update customer error:", error);
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  // Soft-delete customer
  app.delete("/api/customers/:id", canWrite, async (req, res) => {
    try {
      const customer = await storage.updateCustomer(req.params.id, { isActive: false });
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  // Suppliers routes
  app.get("/api/suppliers", async (req, res) => {
    try {
      const { business } = req.query;
      if (business && typeof business === 'string') {
        const suppliers = await storage.getSuppliersByBusiness(business);
        res.json(suppliers);
      } else {
        const suppliers = await storage.getAllSuppliers();
        res.json(suppliers);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch suppliers" });
    }
  });

  app.post("/api/suppliers", canWrite, async (req, res) => {
    try {
      const { name, phone, email, address, category, notes, businessId } = req.body;
      if (!name || name.length < 2) {
        return res.status(400).json({ error: "Name is required" });
      }
      const supplier = await storage.createSupplier({
        name,
        phone,
        email,
        address,
        category,
        notes,
        businessId,
        isActive: true
      });
      res.status(201).json(supplier);
    } catch (error) {
      console.error("Create supplier error:", error);
      res.status(500).json({ error: "Failed to create supplier" });
    }
  });

  // Update supplier
  app.patch("/api/suppliers/:id", canWrite, async (req, res) => {
    try {
      const { name, phone, email, address, category, notes, isActive } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (phone !== undefined) updates.phone = phone;
      if (email !== undefined) updates.email = email;
      if (address !== undefined) updates.address = address;
      if (category !== undefined) updates.category = category;
      if (notes !== undefined) updates.notes = notes;
      if (isActive !== undefined) updates.isActive = isActive;

      const supplier = await storage.updateSupplier(req.params.id, updates);
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error) {
      console.error("Update supplier error:", error);
      res.status(500).json({ error: "Failed to update supplier" });
    }
  });

  // Soft-delete supplier
  app.delete("/api/suppliers/:id", canWrite, async (req, res) => {
    try {
      const supplier = await storage.updateSupplier(req.params.id, { isActive: false });
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete supplier" });
    }
  });

  // Today's transactions (for money overview drill-down) — MUST be before :id route
  app.get("/api/transactions/today", async (req, res) => {
    try {
      const transactions = await storage.getTodayTransactions();

      // Filter by user's business access
      if (!['owner', 'admin', 'auditor'].includes(req.user.role)) {
        const userBusinesses = await storage.getUserBusinesses(req.user.id);
        const filtered = transactions.filter((t: any) =>
          userBusinesses.some(b => b.id === t.businessId)
        );
        res.json(filtered);
      } else {
        res.json(transactions);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch today's transactions" });
    }
  });

  // Single transaction detail (for drill-down) — MUST be after /today route
  app.get("/api/transactions/:id", async (req, res) => {
    try {
      const transaction = await storage.getTransaction(req.params.id);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      // Check business access for non-privileged users
      if (!['owner', 'admin', 'auditor'].includes(req.user.role)) {
        const hasAccess = await checkBusinessAccess(req.user.id, transaction.businessId);
        if (!hasAccess) {
          return res.status(403).json({ error: "No access to this transaction" });
        }
      }

      // Enrich with related data
      const business = transaction.businessId ? await storage.getBusiness(transaction.businessId) : null;
      const category = transaction.categoryId ? await storage.getCategory(transaction.categoryId) : null;
      const bankAccount = transaction.bankAccountId ? await storage.getBankAccount(transaction.bankAccountId) : null;

      res.json({
        ...transaction,
        businessName: business?.name || null,
        categoryName: category?.name || null,
        bankAccountName: bankAccount ? `${bankAccount.bankName} - ${bankAccount.accountRef}` : null,
      });
    } catch (error) {
      console.error("Transaction detail error:", error);
      res.status(500).json({ error: "Failed to fetch transaction" });
    }
  });

  // Categories with direction filtering (uses DB direction field)
  app.get("/api/categories/by-direction", async (req, res) => {
    try {
      const { direction } = req.query;
      const allCategories = await storage.getAllCategories();

      if (direction === 'in' || direction === 'out') {
        // Show categories that match the direction OR are marked 'both'
        const filtered = allCategories.filter((c: any) =>
          c.direction === direction || c.direction === 'both'
        );
        res.json(filtered);
      } else {
        res.json(allCategories);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // ======= UNIFIED STOCK / ASSETS ROUTES =======

  // Get all stock across all businesses (unified view)
  app.get("/api/stock", async (req, res) => {
    try {
      const userBusinesses = await storage.getUserBusinesses(req.user.id);
      const allStock: any[] = [];

      for (const biz of userBusinesses) {
        // Machinery assets
        if (biz.type === 'machinery') {
          const assets = await storage.getMachineryAssetsByBusiness(biz.id);
          for (const asset of assets) {
            const costLines = await storage.getCostLinesByAsset(asset.id);
            const totalCostFromLines = costLines.reduce((sum, cl) => sum + parseFloat(cl.amount), 0);
            allStock.push({
              id: asset.id,
              stockType: 'machinery',
              name: asset.assetType + (asset.serialNumber ? ` (${asset.serialNumber})` : ''),
              businessId: biz.id,
              businessName: biz.name,
              status: asset.status,
              location: asset.location,
              purchasePrice: asset.purchasePrice ? parseFloat(asset.purchasePrice) : 0,
              totalCost: totalCostFromLines || parseFloat(asset.totalCost || '0'),
              salePrice: asset.salePrice ? parseFloat(asset.salePrice) : null,
              serialNumber: asset.serialNumber,
              chassisNumber: asset.chassisNumber,
              quantity: 1,
              createdAt: asset.createdAt,
              ageInDays: Math.floor((Date.now() - new Date(asset.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
            });
          }
        }

        // Gold lots
        if (biz.type === 'gold_agent' || biz.type === 'gold_owner') {
          const lots = await storage.getGoldLotsByBusiness(biz.id);
          for (const lot of lots) {
            allStock.push({
              id: lot.id,
              stockType: 'gold',
              name: `Gold Lot - ${lot.stream}`,
              businessId: biz.id,
              businessName: biz.name,
              status: lot.status,
              location: null,
              purchasePrice: lot.purchaseCost ? parseFloat(lot.purchaseCost) : 0,
              totalCost: lot.fundingAmount ? parseFloat(lot.fundingAmount) : 0,
              salePrice: lot.saleValue ? parseFloat(lot.saleValue) : null,
              serialNumber: null,
              chassisNumber: null,
              quantity: lot.gramsReceived ? parseFloat(lot.gramsReceived) : 0,
              unit: 'grams',
              createdAt: lot.createdAt,
              ageInDays: Math.floor((Date.now() - new Date(lot.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
            });
          }
        }

        // Spare parts / inventory
        if (biz.type === 'spare_parts') {
          const items = await storage.getInventoryItemsByBusiness(biz.id);
          for (const item of items) {
            allStock.push({
              id: item.id,
              stockType: 'inventory',
              name: item.name + (item.sku ? ` [${item.sku}]` : ''),
              businessId: biz.id,
              businessName: biz.name,
              status: item.quantity <= 0 ? 'out_of_stock' : item.quantity <= (item.reorderLevel || 5) ? 'low_stock' : 'in_stock',
              location: item.location,
              purchasePrice: item.unitCost ? parseFloat(item.unitCost) : 0,
              totalCost: item.unitCost ? parseFloat(item.unitCost) * item.quantity : 0,
              salePrice: item.unitPrice ? parseFloat(item.unitPrice) : null,
              serialNumber: item.sku,
              chassisNumber: null,
              quantity: item.quantity,
              unit: 'units',
              reorderLevel: item.reorderLevel,
              createdAt: item.createdAt,
              ageInDays: Math.floor((Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
            });
          }
        }

        // Fuel summaries (weekly)
        if (biz.type === 'fuel') {
          const summaries = await storage.getFuelSummariesByBusiness(biz.id);
          for (const s of summaries) {
            allStock.push({
              id: s.id,
              stockType: 'fuel',
              name: `Fuel Week ${new Date(s.weekStartDate).toLocaleDateString()} - ${new Date(s.weekEndDate).toLocaleDateString()}`,
              businessId: biz.id,
              businessName: biz.name,
              status: 'summary',
              location: null,
              purchasePrice: s.estimatedExpenses ? parseFloat(s.estimatedExpenses) : 0,
              totalCost: s.estimatedExpenses ? parseFloat(s.estimatedExpenses) : 0,
              salePrice: s.totalSales ? parseFloat(s.totalSales) : 0,
              serialNumber: null,
              chassisNumber: null,
              quantity: 1,
              unit: 'week',
              createdAt: s.createdAt,
              ageInDays: Math.floor((Date.now() - new Date(s.weekStartDate).getTime()) / (1000 * 60 * 60 * 24)),
            });
          }
        }
      }

      // Sort by age (oldest first)
      allStock.sort((a, b) => b.ageInDays - a.ageInDays);

      res.json(allStock);
    } catch (error) {
      console.error("Stock fetch error:", error);
      res.status(500).json({ error: "Failed to fetch stock" });
    }
  });

  // Get single stock item detail
  app.get("/api/stock/:type/:id", async (req, res) => {
    try {
      const { type, id } = req.params;
      let item: any = null;
      let costHistory: any[] = [];
      let movements: any[] = [];
      let leases: any[] = [];

      if (type === 'machinery') {
        item = await storage.getMachineryAsset(id);
        if (item) {
          costHistory = await storage.getCostLinesByAsset(id);
          const contracts = await storage.getLeaseContractsByAsset(id);
          for (const contract of contracts) {
            const payments = await storage.getLeasePaymentsByContract(contract.id);
            leases.push({ ...contract, payments });
          }
        }
      } else if (type === 'gold') {
        item = await storage.getGoldLot(id);
      } else if (type === 'inventory') {
        item = await storage.getInventoryItem(id);
        // Get movements for this item
        const allMovements = await storage.getInventoryMovementsByItem(id);
        movements = allMovements;
      } else if (type === 'fuel') {
        item = await storage.getFuelSummary(id);
      }

      if (!item) {
        return res.status(404).json({ error: "Stock item not found" });
      }

      // Get business name
      const business = item.businessId ? await storage.getBusiness(item.businessId) : null;

      res.json({
        item,
        businessName: business?.name || null,
        costHistory,
        movements,
        leases,
      });
    } catch (error) {
      console.error("Stock detail error:", error);
      res.status(500).json({ error: "Failed to fetch stock detail" });
    }
  });

  return httpServer;
}
