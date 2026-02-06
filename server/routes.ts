import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLedgerTransactionSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Helper: Safely extract route param as string (Express 5 returns string | string[])
function getParam(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? val[0] : val;
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
      if (!pin || typeof pin !== 'string') {
        return res.status(400).json({ error: "PIN is required" });
      }

      const user = await storage.getUserByPhone(phone);

      if (!user) {
        return res.status(401).json({ error: "Invalid phone number or PIN" });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: "Account is deactivated" });
      }

      if (!user.pin) {
        return res.status(401).json({ error: "Invalid phone number or PIN" });
      }

      // Validate PIN - support both hashed and legacy plaintext PINs
      let pinValid = false;
      if (user.pin.startsWith('$2')) {
        // bcrypt hashed PIN
        pinValid = await bcrypt.compare(pin, user.pin);
      } else {
        // Legacy plaintext PIN - verify and upgrade to hash
        pinValid = pin === user.pin;
        if (pinValid) {
          const hashedPin = await bcrypt.hash(pin, 10);
          await storage.updateUser(user.id, { pin: hashedPin });
        }
      }

      if (!pinValid) {
        return res.status(401).json({ error: "Invalid phone number or PIN" });
      }

      // Don't send the PIN hash to the client
      const { pin: _pin, ...safeUser } = user;
      const businesses = await storage.getUserBusinesses(user.id);
      res.json({ user: safeUser, businesses });
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
      
      // Hash PIN before storing
      const hashedPin = await bcrypt.hash(pin, 10);

      // Create new user as owner (they own their own businesses)
      const newUser = await storage.createUser({
        name,
        phone,
        pin: hashedPin,
        role: 'owner',
        isActive: true
      });

      // Don't send the PIN hash to the client
      const { pin: _pin, ...safeUser } = newUser;
      res.status(201).json({ user: safeUser, businesses: [] });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Users routes - Owner/Admin only
  app.get("/api/users", ownerOrAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Strip PIN hashes from response
      const safeUsers = users.map(({ pin, ...u }) => u);
      res.json(safeUsers);
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
      if (!pin || typeof pin !== 'string' || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        return res.status(400).json({ error: "PIN must be exactly 4 digits" });
      }

      // Prevent role escalation - only owners can create admins/owners
      const allowedRoles = ['staff', 'partner', 'auditor'];
      if (req.user.role === 'owner') {
        allowedRoles.push('admin', 'owner');
      }
      const assignedRole = role || 'staff';
      if (!allowedRoles.includes(assignedRole)) {
        return res.status(403).json({ error: `Cannot assign role '${assignedRole}'` });
      }

      // Check if phone already exists
      const existingUser = await storage.getUserByPhone(phone);
      if (existingUser) {
        return res.status(409).json({ error: "Phone number already registered" });
      }

      // Hash PIN before storing
      const hashedPin = await bcrypt.hash(pin, 10);

      // Create new user with mustChangePin = true
      const newUser = await storage.createUser({
        name,
        phone,
        pin: hashedPin,
        role: assignedRole,
        isActive: true,
        mustChangePin: true
      });

      // Don't send PIN hash to client
      const { pin: _pin, ...safeUser } = newUser;
      res.status(201).json(safeUser);
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
      if (isActive !== undefined) updates.isActive = isActive;
      if (mustChangePin !== undefined) updates.mustChangePin = mustChangePin;

      // Prevent role escalation - only owners can assign admin/owner roles
      if (role !== undefined) {
        const allowedRoles = ['staff', 'partner', 'auditor'];
        if (req.user.role === 'owner') {
          allowedRoles.push('admin', 'owner');
        }
        if (!allowedRoles.includes(role)) {
          return res.status(403).json({ error: `Cannot assign role '${role}'` });
        }
        updates.role = role;
      }

      // Hash PIN if being reset
      if (pin !== undefined) {
        if (typeof pin !== 'string' || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
          return res.status(400).json({ error: "PIN must be exactly 4 digits" });
        }
        updates.pin = await bcrypt.hash(pin, 10);
      }

      // Prevent users from deactivating themselves
      if (isActive === false && getParam(req, 'id') === req.user.id) {
        return res.status(400).json({ error: "Cannot deactivate your own account" });
      }

      const updatedUser = await storage.updateUser(getParam(req, 'id'), updates);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Don't send PIN hash to client
      const { pin: _pin, ...safeUser } = updatedUser;
      res.json(safeUser);
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
      if (!newPin || typeof newPin !== 'string' || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
        return res.status(400).json({ error: "New PIN must be exactly 4 digits" });
      }

      // For users with mustChangePin, we don't require current PIN validation
      if (!req.user.mustChangePin) {
        if (!currentPin || typeof currentPin !== 'string') {
          return res.status(401).json({ error: "Current PIN is required" });
        }
        // Verify current PIN (support both hashed and plaintext)
        let currentValid = false;
        if (req.user.pin && req.user.pin.startsWith('$2')) {
          currentValid = await bcrypt.compare(currentPin, req.user.pin);
        } else {
          currentValid = currentPin === req.user.pin;
        }
        if (!currentValid) {
          return res.status(401).json({ error: "Current PIN is incorrect" });
        }
      }

      // Hash and update PIN, clear mustChangePin flag
      const hashedPin = await bcrypt.hash(newPin, 10);
      const updatedUser = await storage.updateUser(req.user.id, {
        pin: hashedPin,
        mustChangePin: false
      });

      if (updatedUser) {
        const { pin: _pin, ...safeUser } = updatedUser;
        res.json({ success: true, user: safeUser });
      } else {
        res.status(500).json({ error: "Failed to change PIN" });
      }
    } catch (error) {
      console.error("Change PIN error:", error);
      res.status(500).json({ error: "Failed to change PIN" });
    }
  });

  // Admin: Assign business access to user
  app.post("/api/users/:id/businesses", ownerOrAdmin, async (req, res) => {
    try {
      const { businessId, accessLevel } = req.body;
      if (!businessId) {
        return res.status(400).json({ error: "Business ID is required" });
      }

      // Validate access level
      const validLevels = ['full', 'view_only', 'transactions_only'];
      const level = accessLevel || 'full';
      if (!validLevels.includes(level)) {
        return res.status(400).json({ error: "Invalid access level. Must be: full, view_only, or transactions_only" });
      }

      await storage.addUserBusinessAccess(getParam(req, 'id'), businessId, level);
      res.json({ success: true });
    } catch (error) {
      console.error("Add business access error:", error);
      res.status(500).json({ error: "Failed to add business access" });
    }
  });

  // Admin: Update access level for a user's business
  app.patch("/api/users/:id/businesses/:businessId", ownerOrAdmin, async (req, res) => {
    try {
      const { accessLevel } = req.body;
      const validLevels = ['full', 'view_only', 'transactions_only'];
      if (!accessLevel || !validLevels.includes(accessLevel)) {
        return res.status(400).json({ error: "Invalid access level. Must be: full, view_only, or transactions_only" });
      }

      await storage.updateUserBusinessAccessLevel(getParam(req, 'id'), getParam(req, 'businessId'), accessLevel);
      res.json({ success: true });
    } catch (error) {
      console.error("Update business access error:", error);
      res.status(500).json({ error: "Failed to update business access" });
    }
  });

  // Admin: Remove business access from user
  app.delete("/api/users/:id/businesses/:businessId", ownerOrAdmin, async (req, res) => {
    try {
      await storage.removeUserBusinessAccess(getParam(req, 'id'), getParam(req, 'businessId'));
      res.json({ success: true });
    } catch (error) {
      console.error("Remove business access error:", error);
      res.status(500).json({ error: "Failed to remove business access" });
    }
  });

  // Get user's businesses with access levels
  app.get("/api/users/:id/businesses", async (req, res) => {
    try {
      // Users can only view their own businesses unless owner/admin
      if (req.user.role !== 'owner' && req.user.role !== 'admin' && getParam(req, 'id') !== req.user.id) {
        return res.status(403).json({ error: "Cannot view other user's businesses" });
      }
      const accessList = await storage.getUserBusinessAccessList(getParam(req, 'id'));
      res.json(accessList);
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
        const hasAccess = await checkBusinessAccess(req.user.id, getParam(req, 'id'));
        if (!hasAccess) {
          return res.status(403).json({ error: "No access to this business" });
        }
      }
      
      const business = await storage.getBusiness(getParam(req, 'id'));
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
        const hasAccess = await checkBusinessAccess(req.user.id, getParam(req, 'id'));
        if (!hasAccess) {
          return res.status(403).json({ error: "No access to this business" });
        }
      }
      
      const kpis = await storage.getBusinessKPIs(getParam(req, 'id'));
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
      const account = await storage.getBankAccount(getParam(req, 'id'));
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
      const transactions = await storage.getTransactionsByBankAccount(getParam(req, 'id'));
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
      const validatedData = insertLedgerTransactionSchema.parse(req.body);
      
      // Check business access for non-owner/admin
      if (!['owner', 'admin'].includes(req.user.role)) {
        const hasAccess = await checkBusinessAccess(req.user.id, validatedData.businessId);
        if (!hasAccess) {
          return res.status(403).json({ error: "No access to this business" });
        }
      }
      
      const transaction = await storage.createTransaction(validatedData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Create transaction error:", error);
      res.status(500).json({ error: "Failed to create transaction" });
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
      if (!getParam(req, 'id') || getParam(req, 'id').length < 10) {
        return res.status(400).json({ error: "Invalid alert ID" });
      }
      
      // Check business ownership for non-owner/admin
      if (!['owner', 'admin'].includes(req.user.role)) {
        const alerts = await storage.getAllAlerts();
        const alert = alerts.find((a: any) => a.id === getParam(req, 'id'));
        if (alert && alert.businessId) {
          const hasAccess = await checkBusinessAccess(req.user.id, alert.businessId);
          if (!hasAccess) {
            return res.status(403).json({ error: "No access to dismiss this alert" });
          }
        }
      }
      
      await storage.dismissAlert(getParam(req, 'id'));
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
      await storage.updateApprovalStatus(getParam(req, 'id'), 'approved', req.user.id);
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
      await storage.updateApprovalStatus(getParam(req, 'id'), 'rejected', req.user.id);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to reject" });
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

  return httpServer;
}
