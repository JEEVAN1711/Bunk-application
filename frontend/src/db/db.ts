import Dexie, { Table } from 'dexie';
import {
  User,
  Customer,
  DutyShift,
  CreditEntry,
  PaymentEntry,
  ExpenseEntry,
  TankStockEntry,
  FuelReading,
  DutyClosing,
  PaymentRequest,
  SyncQueueItem,
  ProductPricing
} from '../types';

export class BunkDatabase extends Dexie {
  users!: Table<User, string>;
  customers!: Table<Customer, string>;
  dutyShifts!: Table<DutyShift, string>;
  creditEntries!: Table<CreditEntry, string>;
  paymentEntries!: Table<PaymentEntry, string>;
  expenseEntries!: Table<ExpenseEntry, string>;
  tankStocks!: Table<TankStockEntry, string>;
  fuelReadings!: Table<FuelReading, string>;
  dutyClosings!: Table<DutyClosing, string>;
  paymentRequests!: Table<PaymentRequest, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  pricing!: Table<{ id: string; pricing: ProductPricing; stationName?: string }, string>;

  constructor() {
    super('BunkManagementDB');
    this.version(1).stores({
      users: 'id, username, role, active, synced',
      customers: 'id, name, phoneNumber, active, synced',
      dutyShifts: 'id, shiftNumber, cashierId, status, startTime, synced',
      creditEntries: 'id, customerId, dutyId, cashierId, productType, timestamp, status, synced',
      paymentEntries: 'id, customerId, dutyId, cashierId, paymentMethod, timestamp, synced',
      expenseEntries: 'id, dutyId, cashierId, category, timestamp, synced',
      tankStocks: 'id, date, period, timestamp, synced',
      fuelReadings: 'id, dutyId, productType, pumpNumber, isFinalized, synced',
      dutyClosings: 'id, dutyId, cashierId, closingStatus, closedAt, isLocked, synced',
      paymentRequests: 'id, customerId, status, sentAt, synced',
      syncQueue: '++id, syncId, entityType, action, timestamp',
      pricing: 'id'
    });
  }
}

export const db = new BunkDatabase();

// Default Prices for initial configuration
export const DEFAULT_PRICES: ProductPricing = {
  PETROL: 102.50,
  DIESEL: 89.20,
  OIL: 340.00
};

export const DEFAULT_USERS: User[] = [];

// Clean start - customers are added manually by Admin
export const DEFAULT_CUSTOMERS: Customer[] = [];

export async function seedInitialData() {
  const pricingCount = await db.pricing.count();
  if (pricingCount === 0) {
    await db.pricing.put({ id: 'current', pricing: DEFAULT_PRICES, stationName: 'Bharat Petroleum Highway Hub' });
  }

  // Remove obsolete mock/dummy customers and users
  const dummyCustIds = ['c-ramesh-1', 'c-sharma-1', 'c-patel-1'];
  for (const dId of dummyCustIds) {
    await db.customers.delete(dId);
  }
  const obsoleteUserIds = ['u-admin-alias', 'u-cashier-1', 'u-support-1', 'u-cust-ramesh', 'u-cust-sharma', 'u-admin-default', 'u-cashier-mani', 'u-cashier-selvam'];
  for (const obsoleteId of obsoleteUserIds) {
    await db.users.delete(obsoleteId);
  }

  // Clean up any legacy dummy customer test IDs only
  const dummyCustIdsToDelete = ['c-ramesh-1', 'c-sharma-1', 'c-patel-1'];
  for (const dId of dummyCustIdsToDelete) {
    await db.customers.delete(dId);
    await db.users.delete('u-cust-' + dId);
  }

  // Clean up any legacy hardcoded demo active shifts
  const legacyShift = await db.dutyShifts.get('shift-morning-1');
  if (legacyShift) {
    await db.dutyShifts.delete('shift-morning-1');
  }

  // Clean up any orphaned or test credit slips
  const allCredits = await db.creditEntries.toArray();
  const allValidCustIds = new Set((await db.customers.toArray()).map(c => c.id));
  for (const cr of allCredits) {
    if (
      !allValidCustIds.has(cr.customerId) ||
      (cr.customerName && (cr.customerName.toLowerCase().includes('ramesh') || cr.customerName.toLowerCase().includes('test'))) ||
      cr.cashierName?.toLowerCase().includes('selvam')
    ) {
      await db.creditEntries.delete(cr.id);
    }
  }

  // Deduplicate users in local IndexedDB by normalized phone number and username
  const allUsersInDb = await db.users.toArray();
  const seenUserPhones = new Set<string>();
  const seenUsernames = new Set<string>();

  for (const u of allUsersInDb) {
    const rawDigits = (u.phone || '').replace(/\D/g, '');
    const cleanPhone = rawDigits.length >= 10 ? rawDigits.slice(-10) : rawDigits;
    const cleanUsername = (u.username || '').toLowerCase().trim();

    if ((cleanPhone && seenUserPhones.has(cleanPhone)) || (cleanUsername && seenUsernames.has(cleanUsername))) {
      await db.users.delete(u.id);
    } else {
      if (cleanPhone) seenUserPhones.add(cleanPhone);
      if (cleanUsername) seenUsernames.add(cleanUsername);
    }
  }

  // Deduplicate customers in local IndexedDB by phone
  const allCustsInDb = await db.customers.toArray();
  const seenCustPhones = new Set<string>();
  for (const c of allCustsInDb) {
    const rawDigits = (c.phoneNumber || '').replace(/\D/g, '');
    const cleanPhone = rawDigits.length >= 10 ? rawDigits.slice(-10) : rawDigits;
    if (cleanPhone && seenCustPhones.has(cleanPhone)) {
      await db.customers.delete(c.id);
    } else {
      if (cleanPhone) seenCustPhones.add(cleanPhone);
    }
  }

  // Users are created manually by the station owner in InitialSetupPage and StaffManagementPage.
  // We do NOT automatically inject default demo users.
}

export async function restoreDemoCredentials() {
  await db.transaction('rw', [
    db.users,
    db.customers,
    db.dutyShifts,
    db.pricing,
    db.syncQueue
  ], async () => {
    // Put users
    for (const u of DEFAULT_USERS) {
      await db.users.put(u);
      await db.syncQueue.add({
        entityType: 'USER',
        action: 'CREATE',
        syncId: u.id,
        payload: u,
        timestamp: new Date().toISOString(),
        attempts: 0
      });
    }

    // Put customers
    for (const c of DEFAULT_CUSTOMERS) {
      await db.customers.put(c);
      await db.syncQueue.add({
        entityType: 'CUSTOMER',
        action: 'CREATE',
        syncId: c.id,
        payload: c,
        timestamp: new Date().toISOString(),
        attempts: 0
      });
    }

    // Note: No active duty shifts are seeded by default.
    // Active duty shifts must only be initiated by the Station Admin.

    // Ensure default tank stock record if none exists
    const tankCount = await db.tankStocks.count();
    if (tankCount === 0) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const defaultStock: TankStockEntry = {
        id: 'stock-' + todayStr + '-day',
        date: todayStr,
        period: 'DAY_SHIFT_END',
        shiftName: 'Day Shift End Stock',
        msAtgDipLevel: '1420',
        msAtgStock: 14500,
        msTankDipLevel: '1420',
        msTankDipStock: 14500,
        hsdAtgDipLevel: '1850',
        hsdAtgStock: 18200,
        hsdTankDipLevel: '1850',
        hsdTankDipStock: 18200,
        recordedByAdminId: 'u-admin-default',
        recordedByAdminName: 'Jeevan (Admin)',
        timestamp: new Date().toISOString(),
        synced: false
      };
      await db.tankStocks.add(defaultStock);
    }
  });

  if (!localStorage.getItem('bunk_active_user_id')) {
    localStorage.setItem('bunk_active_user_id', 'u-admin-default');
  }
}

// Function to wipe database or restore
export async function clearAllDatabaseData(keepAdmin: boolean = false) {
  await db.transaction('rw', [
    db.users,
    db.customers,
    db.dutyShifts,
    db.creditEntries,
    db.paymentEntries,
    db.expenseEntries,
    db.tankStocks,
    db.fuelReadings,
    db.dutyClosings,
    db.paymentRequests,
    db.syncQueue,
    db.pricing
  ], async () => {
    if (!keepAdmin) {
      await db.users.clear();
    } else {
      const admin = await db.users.where('role').equals('ADMIN').first();
      await db.users.clear();
      if (admin) await db.users.add(admin);
    }
    await db.customers.clear();
    await db.dutyShifts.clear();
    await db.creditEntries.clear();
    await db.paymentEntries.clear();
    await db.expenseEntries.clear();
    await db.tankStocks.clear();
    await db.fuelReadings.clear();
    await db.dutyClosings.clear();
    await db.paymentRequests.clear();
    await db.syncQueue.clear();
    await db.pricing.put({ id: 'current', pricing: DEFAULT_PRICES, stationName: 'Bharat Petroleum Highway Hub' });
  });

  if (!keepAdmin) {
    localStorage.removeItem('bunk_active_user_id');
  }
}
