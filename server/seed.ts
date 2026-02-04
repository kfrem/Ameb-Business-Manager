import { db } from './db';
import { 
  users, businesses, bankAccounts, categories, ledgerTransactions,
  machineryAssets, machineryCostLines, leaseContracts, leasePayments,
  agents, goldLots, inventoryItems, inventoryMovements, fuelSummaries,
  alerts, approvals, userBusinessAccess
} from '@shared/schema';
import { sql } from 'drizzle-orm';

const GHANA_LOCATIONS = ['Accra', 'Tema', 'Kumasi', 'Obuasi', 'Tamale', 'Sekondi-Takoradi', 'Sunyani', 'Cape Coast', 'Koforidua', 'Techiman'];

function randomDate(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date;
}

function randomAmount(min: number, max: number): string {
  return (Math.floor(Math.random() * (max - min + 1)) + min).toString();
}

export async function seedDatabase() {
  console.log('🌱 Starting database seed...');

  // Check if already seeded
  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  // Create Users
  console.log('Creating users...');
  const createdUsers = await db.insert(users).values([
    { name: 'DEEBI Owner', phone: '0201234567', pin: '1234', role: 'owner' },
    { name: 'eACG Finance', phone: '0202345678', pin: '1234', role: 'admin' },
    { name: 'Machinery Accountant', phone: '0203456789', pin: '1234', role: 'staff' },
    { name: 'Gold Desk', phone: '0204567890', pin: '1234', role: 'staff' },
    { name: 'Spare Parts Clerk', phone: '0205678901', pin: '1234', role: 'staff' },
    { name: 'Fuel Partner', phone: '0206789012', pin: '1234', role: 'partner' },
    { name: 'Auditor', phone: '0207890123', pin: '1234', role: 'auditor' },
  ]).returning();

  // Create Businesses
  console.log('Creating businesses...');
  const createdBusinesses = await db.insert(businesses).values([
    { name: 'DEEBI Machinery', type: 'machinery', location: 'Tema', approvalThreshold: '10000' },
    { name: 'DEEBI Gold (Agents)', type: 'gold_agent', location: 'Obuasi', approvalThreshold: '5000' },
    { name: 'DEEBI Gold (Owner)', type: 'gold_owner', location: 'Kumasi', approvalThreshold: '5000' },
    { name: 'DEEBI Spare Parts', type: 'spare_parts', location: 'Accra', approvalThreshold: '3000' },
    { name: 'DEEBI Fuel Station', type: 'fuel', location: 'Tema', approvalThreshold: '5000' },
  ]).returning();

  const machineryBiz = createdBusinesses.find(b => b.type === 'machinery')!;
  const goldAgentBiz = createdBusinesses.find(b => b.type === 'gold_agent')!;
  const goldOwnerBiz = createdBusinesses.find(b => b.type === 'gold_owner')!;
  const sparePartsBiz = createdBusinesses.find(b => b.type === 'spare_parts')!;
  const fuelBiz = createdBusinesses.find(b => b.type === 'fuel')!;

  // Create User Business Access
  console.log('Creating user access...');
  await db.insert(userBusinessAccess).values([
    { userId: createdUsers[2].id, businessId: machineryBiz.id },
    { userId: createdUsers[3].id, businessId: goldAgentBiz.id },
    { userId: createdUsers[3].id, businessId: goldOwnerBiz.id },
    { userId: createdUsers[4].id, businessId: sparePartsBiz.id },
    { userId: createdUsers[5].id, businessId: fuelBiz.id },
  ]);

  // Create Bank Accounts
  console.log('Creating bank accounts...');
  const createdBanks = await db.insert(bankAccounts).values([
    { bankName: 'GCB Bank', accountRef: 'GCB-OPS', currency: 'GHS', openingBalance: '150000', currentBalance: '150000' },
    { bankName: 'Ecobank Ghana', accountRef: 'ECO-OPS', currency: 'GHS', openingBalance: '85000', currentBalance: '85000' },
    { bankName: 'Absa Bank Ghana', accountRef: 'ABSA-OPS', currency: 'GHS', openingBalance: '120000', currentBalance: '120000' },
    { bankName: 'Fidelity Bank Ghana', accountRef: 'FID-OPS', currency: 'GHS', openingBalance: '65000', currentBalance: '65000' },
    { bankName: 'USD Trading Account', accountRef: 'USD-TRD', currency: 'USD', openingBalance: '25000', currentBalance: '25000' },
    { bankName: 'Cash Wallet', accountRef: 'CASH', currency: 'GHS', openingBalance: '15000', currentBalance: '15000' },
  ]).returning();

  // Create Categories
  console.log('Creating categories...');
  const createdCategories = await db.insert(categories).values([
    // Machinery categories
    { name: 'Purchase', businessType: 'machinery', isDefault: true },
    { name: 'Shipping', businessType: 'machinery', isDefault: true },
    { name: 'Clearing', businessType: 'machinery', isDefault: true },
    { name: 'Transport', businessType: 'machinery', isDefault: true },
    { name: 'Storage', businessType: 'machinery', isDefault: true },
    // Gold categories
    { name: 'Agent Funding', businessType: 'gold_agent', isDefault: true },
    { name: 'Gold Purchase', businessType: 'gold_owner', isDefault: true },
    { name: 'Gold Sale', businessType: 'gold_agent', isDefault: true },
    // General categories
    { name: 'Salaries/Wages', isDefault: true },
    { name: 'Taxes/Levies', isDefault: true },
    { name: 'Fuel/Transport', isDefault: true },
    { name: 'Utilities', isDefault: true },
    { name: 'Maintenance', isDefault: true },
    { name: 'Sales Revenue', isDefault: true },
    { name: 'Lease Payment', isDefault: true },
  ]).returning();

  const getCategoryId = (name: string) => createdCategories.find(c => c.name === name)?.id;

  // Create Machinery Assets
  console.log('Creating machinery assets...');
  const createdAssets = await db.insert(machineryAssets).values([
    { businessId: machineryBiz.id, assetType: 'Excavator', serialNumber: 'EXC-2024-001', chassisNumber: 'CH-EXC-001', status: 'sold', location: 'Accra', purchasePrice: '180000', totalCost: '0', salePrice: '220000' },
    { businessId: machineryBiz.id, assetType: 'Excavator', serialNumber: 'EXC-2024-002', chassisNumber: 'CH-EXC-002', status: 'on_lease', location: 'Kumasi', purchasePrice: '175000', totalCost: '0' },
    { businessId: machineryBiz.id, assetType: 'Wheel Loader', serialNumber: 'WL-2024-001', chassisNumber: 'CH-WL-001', status: 'storage', location: 'Tema', purchasePrice: '145000', totalCost: '0' },
    { businessId: machineryBiz.id, assetType: 'Wheel Loader', serialNumber: 'WL-2024-002', chassisNumber: 'CH-WL-002', status: 'clearing', location: 'Tema Port', purchasePrice: '150000', totalCost: '0' },
    { businessId: machineryBiz.id, assetType: 'Bulldozer', serialNumber: 'BD-2024-001', chassisNumber: 'CH-BD-001', status: 'shipping', location: 'In Transit', purchasePrice: '220000', totalCost: '0' },
    { businessId: machineryBiz.id, assetType: 'Backhoe', serialNumber: 'BH-2024-001', chassisNumber: 'CH-BH-001', status: 'sold', location: 'Tamale', purchasePrice: '95000', totalCost: '0', salePrice: '125000' },
  ]).returning();

  // Create Machinery Cost Lines
  console.log('Creating cost lines...');
  for (const asset of createdAssets) {
    const costs = [
      { assetId: asset.id, category: 'Purchase', amount: asset.purchasePrice || '0', date: randomDate(60) },
      { assetId: asset.id, category: 'Shipping', amount: randomAmount(8000, 15000), date: randomDate(50) },
      { assetId: asset.id, category: 'Clearing', amount: randomAmount(5000, 12000), date: randomDate(40) },
    ];
    
    if (['storage', 'sold', 'on_lease'].includes(asset.status)) {
      costs.push({ assetId: asset.id, category: 'Transport', amount: randomAmount(3000, 8000), date: randomDate(30) });
    }
    if (['sold', 'on_lease'].includes(asset.status)) {
      costs.push({ assetId: asset.id, category: 'Storage', amount: randomAmount(1000, 3000), date: randomDate(20) });
    }

    await db.insert(machineryCostLines).values(costs);
  }

  // Create Lease Contract for on_lease asset
  console.log('Creating lease contracts...');
  const leasedAsset = createdAssets.find(a => a.status === 'on_lease')!;
  const leaseContract = await db.insert(leaseContracts).values({
    assetId: leasedAsset.id,
    lesseeNname: 'Goldfields Mining Ltd',
    lesseePhone: '0248765432',
    monthlyRate: '8500',
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    isActive: true,
  }).returning();

  // Create Lease Payments (including one overdue)
  console.log('Creating lease payments...');
  await db.insert(leasePayments).values([
    { contractId: leaseContract[0].id, dueDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), amount: '8500', paidAmount: '8500', paidDate: new Date(Date.now() - 58 * 24 * 60 * 60 * 1000), isPaid: true },
    { contractId: leaseContract[0].id, dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), amount: '8500', paidAmount: '8500', paidDate: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), isPaid: true },
    { contractId: leaseContract[0].id, dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), amount: '8500', paidAmount: '0', isPaid: false }, // Overdue
  ]);

  // Create Gold Agents
  console.log('Creating gold agents...');
  const createdAgents = await db.insert(agents).values([
    { name: 'Kofi Mensah', phone: '0241234567', location: 'Obuasi', performanceStatus: 'green' },
    { name: 'Ama Darko', phone: '0242345678', location: 'Kumasi', performanceStatus: 'green' },
    { name: 'Yaw Boateng', phone: '0243456789', location: 'Sekondi-Takoradi', performanceStatus: 'amber' },
    { name: 'Akua Sarpong', phone: '0244567890', location: 'Tarkwa', performanceStatus: 'red' },
  ]).returning();

  // Create Gold Lots
  console.log('Creating gold lots...');
  // Agent stream lots
  await db.insert(goldLots).values([
    { businessId: goldAgentBiz.id, agentId: createdAgents[0].id, stream: 'agent', fundingAmount: '25000', gramsReceived: '45.5', saleValue: '32000', cashReturned: '30000', status: 'sold' },
    { businessId: goldAgentBiz.id, agentId: createdAgents[0].id, stream: 'agent', fundingAmount: '30000', gramsReceived: '52.0', saleValue: '38500', cashReturned: '36000', status: 'sold' },
    { businessId: goldAgentBiz.id, agentId: createdAgents[1].id, stream: 'agent', fundingAmount: '20000', gramsReceived: '35.0', saleValue: '26000', cashReturned: '24500', status: 'sold' },
    { businessId: goldAgentBiz.id, agentId: createdAgents[2].id, stream: 'agent', fundingAmount: '28000', gramsReceived: '48.0', status: 'in_hand' },
    { businessId: goldAgentBiz.id, agentId: createdAgents[3].id, stream: 'agent', fundingAmount: '35000', gramsReceived: '55.0', saleValue: '38000', cashReturned: '32000', status: 'sold' }, // Underperforming
    { businessId: goldAgentBiz.id, agentId: createdAgents[3].id, stream: 'agent', fundingAmount: '15000', status: 'funded' },
  ]);

  // Owner stream lots
  await db.insert(goldLots).values([
    { businessId: goldOwnerBiz.id, stream: 'owner', purchaseCost: '45000', gramsReceived: '82.5', saleValue: '62000', cashReturned: '62000', status: 'sold' },
    { businessId: goldOwnerBiz.id, stream: 'owner', purchaseCost: '38000', gramsReceived: '68.0', saleValue: '52000', cashReturned: '52000', status: 'sold' },
    { businessId: goldOwnerBiz.id, stream: 'owner', purchaseCost: '55000', gramsReceived: '95.0', status: 'in_hand' },
    { businessId: goldOwnerBiz.id, stream: 'owner', purchaseCost: '42000', gramsReceived: '75.0', saleValue: '58000', cashReturned: '58000', status: 'sold' },
  ]);

  // Create Inventory Items
  console.log('Creating inventory items...');
  const createdItems = await db.insert(inventoryItems).values([
    { businessId: sparePartsBiz.id, name: 'Oil Filter', sku: 'OF-001', quantity: 45, unitCost: '35', unitPrice: '55', reorderLevel: 10 },
    { businessId: sparePartsBiz.id, name: 'Fuel Filter', sku: 'FF-001', quantity: 38, unitCost: '42', unitPrice: '68', reorderLevel: 10 },
    { businessId: sparePartsBiz.id, name: 'Hydraulic Hose', sku: 'HH-001', quantity: 22, unitCost: '180', unitPrice: '280', reorderLevel: 5 },
    { businessId: sparePartsBiz.id, name: 'Fan Belt', sku: 'FB-001', quantity: 3, unitCost: '65', unitPrice: '95', reorderLevel: 8 }, // Low stock!
    { businessId: sparePartsBiz.id, name: 'Brake Pads', sku: 'BP-001', quantity: 28, unitCost: '120', unitPrice: '185', reorderLevel: 10 },
    { businessId: sparePartsBiz.id, name: 'Bearing Set', sku: 'BS-001', quantity: 2, unitCost: '85', unitPrice: '130', reorderLevel: 5 }, // Low stock!
    { businessId: sparePartsBiz.id, name: 'Injector Nozzle', sku: 'IN-001', quantity: 15, unitCost: '220', unitPrice: '350', reorderLevel: 5 },
    { businessId: sparePartsBiz.id, name: 'Grease (Bucket)', sku: 'GR-001', quantity: 12, unitCost: '95', unitPrice: '140', reorderLevel: 5 },
    { businessId: sparePartsBiz.id, name: 'Engine Oil (Drum)', sku: 'EO-001', quantity: 8, unitCost: '450', unitPrice: '650', reorderLevel: 3 },
    { businessId: sparePartsBiz.id, name: 'Tyres (Heavy)', sku: 'TY-001', quantity: 6, unitCost: '2500', unitPrice: '3500', reorderLevel: 2 },
    { businessId: sparePartsBiz.id, name: 'Battery', sku: 'BT-001', quantity: 10, unitCost: '380', unitPrice: '550', reorderLevel: 3 },
    { businessId: sparePartsBiz.id, name: 'Alternator', sku: 'AL-001', quantity: 5, unitCost: '650', unitPrice: '950', reorderLevel: 2 },
  ]).returning();

  // Create Inventory Movements
  console.log('Creating inventory movements...');
  for (const item of createdItems.slice(0, 6)) {
    // Stock in
    await db.insert(inventoryMovements).values({
      itemId: item.id,
      movementType: 'in',
      quantity: 20,
      unitPrice: item.unitCost,
      totalAmount: (parseFloat(item.unitCost || '0') * 20).toString(),
      notes: 'Initial stock purchase',
      createdAt: randomDate(45),
    });
    // Some sales
    await db.insert(inventoryMovements).values({
      itemId: item.id,
      movementType: 'out',
      quantity: 5,
      unitPrice: item.unitPrice,
      totalAmount: (parseFloat(item.unitPrice || '0') * 5).toString(),
      notes: 'Customer sale',
      createdAt: randomDate(30),
    });
  }

  // Create Fuel Summaries
  console.log('Creating fuel summaries...');
  for (let i = 0; i < 10; i++) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (i * 7) - 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const sales = parseFloat(randomAmount(45000, 75000));
    const ownerSharePct = 40;
    const expectedOwnerShare = sales * (ownerSharePct / 100);
    const variance = i < 2 ? parseFloat(randomAmount(-2000, -500)) : parseFloat(randomAmount(-200, 200)); // Recent weeks have variance
    const cashRemitted = expectedOwnerShare + variance;

    await db.insert(fuelSummaries).values({
      businessId: fuelBiz.id,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      totalSales: sales.toString(),
      ownerSharePct: ownerSharePct.toString(),
      partnerSharePct: '60',
      expectedOwnerShare: expectedOwnerShare.toString(),
      cashRemitted: cashRemitted.toString(),
      variance: variance.toString(),
    });
  }

  // Create Ledger Transactions (120+ rows)
  console.log('Creating ledger transactions...');
  const transactions: any[] = [];

  // Machinery transactions
  for (const asset of createdAssets.filter(a => a.status === 'sold')) {
    transactions.push({
      date: randomDate(30),
      amount: asset.salePrice,
      currency: 'GHS',
      direction: 'in',
      businessId: machineryBiz.id,
      bankAccountId: createdBanks[0].id,
      categoryId: getCategoryId('Sales Revenue'),
      counterparty: 'Mining Company',
      notes: `Sale of ${asset.assetType} ${asset.serialNumber}`,
      status: 'posted',
    });
  }

  // Lease payments received
  transactions.push({
    date: randomDate(60),
    amount: '8500',
    currency: 'GHS',
    direction: 'in',
    businessId: machineryBiz.id,
    bankAccountId: createdBanks[0].id,
    categoryId: getCategoryId('Lease Payment'),
    counterparty: 'Goldfields Mining Ltd',
    notes: 'Lease payment - Month 1',
    status: 'posted',
  });
  transactions.push({
    date: randomDate(30),
    amount: '8500',
    currency: 'GHS',
    direction: 'in',
    businessId: machineryBiz.id,
    bankAccountId: createdBanks[0].id,
    categoryId: getCategoryId('Lease Payment'),
    counterparty: 'Goldfields Mining Ltd',
    notes: 'Lease payment - Month 2',
    status: 'posted',
  });

  // Gold transactions
  for (let i = 0; i < 15; i++) {
    const isAgentStream = i % 2 === 0;
    const bizId = isAgentStream ? goldAgentBiz.id : goldOwnerBiz.id;
    
    // Funding/purchase out
    transactions.push({
      date: randomDate(60),
      amount: randomAmount(20000, 50000),
      currency: 'GHS',
      direction: 'out',
      businessId: bizId,
      bankAccountId: createdBanks[Math.floor(Math.random() * 4)].id,
      categoryId: getCategoryId(isAgentStream ? 'Agent Funding' : 'Gold Purchase'),
      counterparty: isAgentStream ? createdAgents[i % 4].name : 'Gold Supplier',
      notes: isAgentStream ? 'Agent funding' : 'Gold purchase',
      status: 'posted',
    });
    
    // Sale in
    transactions.push({
      date: randomDate(45),
      amount: randomAmount(25000, 65000),
      currency: 'GHS',
      direction: 'in',
      businessId: bizId,
      bankAccountId: createdBanks[Math.floor(Math.random() * 4)].id,
      categoryId: getCategoryId('Gold Sale'),
      counterparty: 'Gold Buyer',
      notes: 'Gold sale proceeds',
      status: 'posted',
    });
  }

  // Spare parts transactions
  for (let i = 0; i < 20; i++) {
    const isIn = i % 3 === 0;
    transactions.push({
      date: randomDate(60),
      amount: randomAmount(500, 5000),
      currency: 'GHS',
      direction: isIn ? 'in' : 'out',
      businessId: sparePartsBiz.id,
      bankAccountId: createdBanks[Math.floor(Math.random() * 4)].id,
      categoryId: getCategoryId(isIn ? 'Sales Revenue' : 'Purchase'),
      counterparty: isIn ? 'Customer' : 'Spare Parts Supplier',
      notes: isIn ? 'Parts sale' : 'Stock purchase',
      status: 'posted',
    });
  }

  // Fuel station transactions
  for (let i = 0; i < 10; i++) {
    transactions.push({
      date: randomDate(70),
      amount: randomAmount(18000, 30000),
      currency: 'GHS',
      direction: 'in',
      businessId: fuelBiz.id,
      bankAccountId: createdBanks[5].id,
      categoryId: getCategoryId('Sales Revenue'),
      counterparty: 'Fuel Partner',
      notes: `Weekly remittance - Week ${i + 1}`,
      status: 'posted',
    });
  }

  // General expenses across all businesses
  const expenseCategories = ['Salaries/Wages', 'Taxes/Levies', 'Fuel/Transport', 'Utilities', 'Maintenance'];
  for (let i = 0; i < 30; i++) {
    const bizIndex = i % createdBusinesses.length;
    transactions.push({
      date: randomDate(90),
      amount: randomAmount(500, 8000),
      currency: 'GHS',
      direction: 'out',
      businessId: createdBusinesses[bizIndex].id,
      bankAccountId: createdBanks[Math.floor(Math.random() * 4)].id,
      categoryId: getCategoryId(expenseCategories[i % expenseCategories.length]),
      counterparty: ['Staff', 'GRA', 'Shell', 'ECG', 'Maintenance Co'][i % 5],
      notes: expenseCategories[i % expenseCategories.length],
      status: 'posted',
      attachmentUrls: i % 7 === 0 ? ['https://example.com/receipt.jpg'] : null,
    });
  }

  // Insert all transactions
  await db.insert(ledgerTransactions).values(transactions);

  // Create Alerts
  console.log('Creating alerts...');
  await db.insert(alerts).values([
    { businessId: sparePartsBiz.id, type: 'low_stock', severity: 'warning', title: 'Low Stock Alert', message: 'Fan Belt stock is below reorder level (3 units remaining)' },
    { businessId: sparePartsBiz.id, type: 'low_stock', severity: 'warning', title: 'Low Stock Alert', message: 'Bearing Set stock is below reorder level (2 units remaining)' },
    { businessId: machineryBiz.id, type: 'overdue_payment', severity: 'error', title: 'Overdue Lease Payment', message: 'Goldfields Mining Ltd has an overdue payment of GH₵8,500' },
    { businessId: fuelBiz.id, type: 'variance', severity: 'warning', title: 'Cash Variance Detected', message: 'Weekly remittance is GH₵1,500 below expected' },
    { businessId: goldAgentBiz.id, type: 'agent_performance', severity: 'warning', title: 'Agent Performance Warning', message: 'Akua Sarpong has underperforming returns on recent lots' },
  ]);

  // Create Pending Approvals
  console.log('Creating pending approvals...');
  await db.insert(approvals).values([
    { businessId: machineryBiz.id, amount: '15000', reason: 'Emergency repair parts for Excavator EXC-2024-002', status: 'pending', requestedBy: createdUsers[2].id },
    { businessId: goldAgentBiz.id, amount: '45000', reason: 'Agent funding for Kofi Mensah - large gold lot', status: 'pending', requestedBy: createdUsers[3].id },
  ]);

  console.log('✅ Database seeded successfully!');
}
