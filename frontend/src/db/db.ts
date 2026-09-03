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

export const DEFAULT_USERS: User[] = [
  {
    id: 'u-admin-default',
    username: 'jeevan',
    password: 'Jeevan@1711',
    fullName: 'Jeevan (Admin & Owner)',
    phone: '9159054084',
    role: 'ADMIN',
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    active: true,
    createdAt: new Date().toISOString(),
    synced: false
  },
  {
    id: 'u-cashier-mani',
    username: 'manishanker',
    password: 'Mani@123',
    fullName: 'Manishanker',
    phone: '+91 99445 12664',
    role: 'CASHIER',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    active: true,
    createdAt: new Date().toISOString(),
    synced: false
  },
  {
    id: 'u-cashier-selvam',
    username: 'selvam',
    password: 'Selvam@123',
    fullName: 'Selvam',
    phone: '+91 95971 35490',
    role: 'CASHIER',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    active: true,
    createdAt: new Date().toISOString(),
    synced: false
  }
];

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
  const obsoleteUserIds = ['u-admin-alias', 'u-cashier-1', 'u-support-1', 'u-cust-ramesh', 'u-cust-sharma'];
  for (const obsoleteId of obsoleteUserIds) {
    await db.users.delete(obsoleteId);
  }

  // Permanently purge all duplicate/test customers (Raja, Jayanthi, Rajakumar, etc.)
  const allExistingCusts = await db.customers.toArray();
  for (const c of allExistingCusts) {
    const nameLower = (c.name || '').toLowerCase().trim();
    const cleanDigits = (c.phoneNumber || '').replace(/\D/g, '');
    if (
      cleanDigits.length < 6 ||
      nameLower.includes('raja') ||
      nameLower.includes('jayanthi') ||
      nameLower.includes('ramesh') ||
      nameLower.includes('sharma') ||
      nameLower.includes('patel') ||
      nameLower.includes('test') ||
      nameLower.includes('dummy') ||
      c.id.startsWith('c-ramesh') ||
      c.id.startsWith('c-sharma') ||
      c.id.startsWith('c-patel')
    ) {
      await db.customers.delete(c.id);
      await db.users.delete('u-cust-' + c.id);
      await db.users.delete(c.id);
    }
  }

  // Also clean corresponding test user accounts
  const allTestUsers = await db.users.toArray();
  for (const u of allTestUsers) {
    const nameLower = (u.fullName || '').toLowerCase().trim();
    const unameLower = (u.username || '').toLowerCase().trim();
    if (
      u.role === 'CUSTOMER' &&
      (nameLower.includes('raja') || nameLower.includes('jayanthi') || unameLower.includes('raja') || unameLower.includes('jayanthi') || unameLower.includes('ramesh'))
    ) {
      await db.users.delete(u.id);
    }
  }

  // Clean up any legacy hardcoded demo active shifts
  const legacyShift = await db.dutyShifts.get('shift-morning-1');
  if (legacyShift) {
    await db.dutyShifts.delete('shift-morning-1');
  }

  const userCount = await db.users.count();
  if (userCount === 0) {
    await restoreDemoCredentials();
  } else {
    // Ensure only active allowed users (Jeevan, Manishanker, Selvam) are kept up to date
    for (const u of DEFAULT_USERS) {
      const existing = await db.users.get(u.id);
      if (!existing) {
        await db.users.put(u);
      } else {
        // Sync password and details
        await db.users.put({
          ...existing,
          password: u.password,
          username: u.username,
          fullName: u.fullName,
          phone: u.phone,
          role: u.role,
          active: true
        });
      }
    }
  }
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
