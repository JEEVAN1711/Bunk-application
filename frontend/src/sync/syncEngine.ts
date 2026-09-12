import { db } from '../db/db';
import { SyncQueueItem } from '../types';
import { getApiBaseUrl } from '../config/api';
import './realtime';

export type SyncState = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'ERROR';

class SyncEngine {
  private isSyncing = false;
  private listeners: ((state: SyncState, pendingCount: number) => void)[] = [];
  private currentStatus: SyncState = navigator.onLine ? 'ONLINE' : 'OFFLINE';
  private syncTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.initEventListeners();
    this.startPeriodicSync();
  }

  private initEventListeners() {
    window.addEventListener('online', () => {
      this.currentStatus = 'ONLINE';
      this.notifyListeners();
      this.triggerSync();
    });

    window.addEventListener('offline', () => {
      this.currentStatus = 'OFFLINE';
      this.notifyListeners();
    });
  }

  private startPeriodicSync() {
    // Initial sync and pull immediately on startup
    if (navigator.onLine) {
      this.triggerSync().then(() => this.pullAndHydrateFromCloud());
    }

    // Attempt sync and pull every 3 seconds if online for near real-time multi-device collaboration
    this.syncTimer = setInterval(async () => {
      if (navigator.onLine && !this.isSyncing) {
        await this.triggerSync();
        await this.pullAndHydrateFromCloud();
      }
    }, 3000);
  }

  public subscribe(callback: (state: SyncState, pendingCount: number) => void) {
    this.listeners.push(callback);
    this.getPendingCount().then((count) => callback(this.currentStatus, count));
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private async notifyListeners() {
    const count = await this.getPendingCount();
    this.listeners.forEach((cb) => cb(this.currentStatus, count));
  }

  public async getPendingCount(): Promise<number> {
    try {
      return await db.syncQueue.count();
    } catch {
      return 0;
    }
  }

  /**
   * Mark local entity as synced in IndexedDB
   */
  private async markEntitySynced(entityType: SyncQueueItem['entityType'], syncId: string) {
    try {
      if (entityType === 'USER') await db.users.update(syncId, { synced: true });
      else if (entityType === 'CREDIT') await db.creditEntries.update(syncId, { synced: true });
      else if (entityType === 'PAYMENT') await db.paymentEntries.update(syncId, { synced: true });
      else if (entityType === 'READING') await db.fuelReadings.update(syncId, { synced: true });
      else if (entityType === 'DUTY_CLOSING') await db.dutyClosings.update(syncId, { synced: true });
      else if (entityType === 'CUSTOMER') await db.customers.update(syncId, { synced: true });
      else if (entityType === 'DUTY') await db.dutyShifts.update(syncId, { synced: true });
      else if (entityType === 'PAYMENT_REQUEST') await db.paymentRequests.update(syncId, { synced: true });
      else if (entityType === 'EXPENSE') await db.expenseEntries.update(syncId, { synced: true });
      else if (entityType === 'TANK_STOCK') await db.tankStocks.update(syncId, { synced: true });
    } catch {}
  }

  /**
   * Directly write change to the Cloud Database (PostgreSQL) immediately.
   * If offline or network error occurs, queues for automatic sync upon reconnect.
   */
  public async enqueue(
    entityType: SyncQueueItem['entityType'],
    action: SyncQueueItem['action'],
    syncId: string,
    payload: any
  ) {
    // 1. Direct write to Cloud PostgreSQL DB immediately if online
    if (navigator.onLine) {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/sync/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('bunk_jwt_token') || ''}`
          },
          body: JSON.stringify({
            batchId: 'direct-' + Date.now(),
            items: [{
              syncId,
              entityType,
              action,
              timestamp: new Date().toISOString(),
              payload
            }]
          })
        });

        const contentType = response.headers.get('content-type') || '';
        if (response.ok && contentType.includes('application/json')) {
          await this.markEntitySynced(entityType, syncId);
          this.currentStatus = 'ONLINE';
          this.notifyListeners();
          
          // Trigger instant refresh across local tabs/components
          window.dispatchEvent(new CustomEvent('bunk_cloud_synced'));

          // Also flush any previously accumulated offline items in the background
          this.triggerSync();
          return;
        }
      } catch (err) {
        console.warn('Direct cloud write failed, saving to offline sync queue as fallback:', err);
      }
    }

    // 2. Offline fallback (or if cloud request failed): queue locally
    await db.syncQueue.add({
      entityType,
      action,
      syncId,
      payload,
      timestamp: new Date().toISOString(),
      attempts: 0
    });

    this.notifyListeners();

    if (navigator.onLine) {
      this.triggerSync();
    }
  }

  /**
   * Main sync processor
   */
  public async triggerSync(): Promise<{ success: boolean; syncedCount: number }> {
    if (this.isSyncing) return { success: false, syncedCount: 0 };
    
    const items = await db.syncQueue.limit(50).toArray();
    if (items.length === 0) {
      this.currentStatus = navigator.onLine ? 'ONLINE' : 'OFFLINE';
      this.notifyListeners();
      return { success: true, syncedCount: 0 };
    }

    this.isSyncing = true;
    this.currentStatus = 'SYNCING';
    this.notifyListeners();

    try {
      // Send batch to backend API
      const response = await fetch(`${getApiBaseUrl()}/api/sync/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('bunk_jwt_token') || ''}`
        },
        body: JSON.stringify({
          batchId: 'batch-' + Date.now(),
          items: items.map(item => ({
            syncId: item.syncId,
            entityType: item.entityType,
            action: item.action,
            timestamp: item.timestamp,
            payload: item.payload
          }))
        })
      });

      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        const result = await response.json();
        const ackSyncIds: string[] = result.acknowledgedSyncIds || items.map(i => i.syncId);

        // Remove acknowledged items from queue
        await db.transaction('rw', [
          db.syncQueue,
          db.users,
          db.creditEntries,
          db.paymentEntries,
          db.fuelReadings,
          db.dutyClosings,
          db.customers,
          db.dutyShifts,
          db.paymentRequests,
          db.expenseEntries,
          db.tankStocks
        ], async () => {
          for (const item of items) {
            if (ackSyncIds.includes(item.syncId)) {
              if (item.id) await db.syncQueue.delete(item.id);

              // Mark local entity as synced
              if (item.entityType === 'USER') {
                await db.users.update(item.syncId, { synced: true });
              } else if (item.entityType === 'CREDIT') {
                await db.creditEntries.update(item.syncId, { synced: true });
              } else if (item.entityType === 'PAYMENT') {
                await db.paymentEntries.update(item.syncId, { synced: true });
              } else if (item.entityType === 'READING') {
                await db.fuelReadings.update(item.syncId, { synced: true });
              } else if (item.entityType === 'DUTY_CLOSING') {
                await db.dutyClosings.update(item.syncId, { synced: true });
              } else if (item.entityType === 'CUSTOMER') {
                await db.customers.update(item.syncId, { synced: true });
              } else if (item.entityType === 'DUTY') {
                await db.dutyShifts.update(item.syncId, { synced: true });
              } else if (item.entityType === 'PAYMENT_REQUEST') {
                await db.paymentRequests.update(item.syncId, { synced: true });
              } else if (item.entityType === 'EXPENSE') {
                await db.expenseEntries.update(item.syncId, { synced: true });
              } else if (item.entityType === 'TANK_STOCK') {
                await db.tankStocks.update(item.syncId, { synced: true });
              }
            }
          }
        });

        this.currentStatus = 'ONLINE';
        this.isSyncing = false;
        this.notifyListeners();
        return { success: true, syncedCount: ackSyncIds.length };
      } else {
        // Increment attempts on failure
        for (const item of items) {
          if (item.id) {
            await db.syncQueue.update(item.id, {
              attempts: item.attempts + 1,
              lastError: `HTTP Error: ${response.status}`
            });
          }
        }
        this.currentStatus = 'ERROR';
        this.isSyncing = false;
        this.notifyListeners();
        return { success: false, syncedCount: 0 };
      }
    } catch (err: any) {
      // Network failure (offline, timeout, connection refused)
      for (const item of items) {
        if (item.id) {
          await db.syncQueue.update(item.id, {
            attempts: item.attempts + 1,
            lastError: err.message || 'Network Disconnected'
          });
        }
      }
      this.currentStatus = 'OFFLINE';
      this.isSyncing = false;
      this.notifyListeners();
      return { success: false, syncedCount: 0 };
    }
  }

  /**
   * Push ALL local data (Users, Customers, Shifts, Readings, Credits, Payments, Closings) to Cloud Database
   */
  public async syncAllLocalDataToCloud(): Promise<{ success: boolean; totalItems: number; error?: string }> {
    try {
      this.isSyncing = true;
      this.currentStatus = 'SYNCING';
      this.notifyListeners();

      const [
        users,
        customers,
        shifts,
        readings,
        credits,
        payments,
        closings,
        paymentRequests,
        expenses,
        tankStocks
      ] = await Promise.all([
        db.users.toArray(),
        db.customers.toArray(),
        db.dutyShifts.toArray(),
        db.fuelReadings.toArray(),
        db.creditEntries.toArray(),
        db.paymentEntries.toArray(),
        db.dutyClosings.toArray(),
        db.paymentRequests.toArray(),
        db.expenseEntries.toArray(),
        db.tankStocks.toArray()
      ]);

      const allItems: { syncId: string; entityType: SyncQueueItem['entityType']; action: SyncQueueItem['action']; timestamp: string; payload: any }[] = [];

      users.forEach(u => allItems.push({ syncId: u.id, entityType: 'USER', action: 'CREATE', timestamp: u.createdAt || new Date().toISOString(), payload: u }));
      customers.forEach(c => allItems.push({ syncId: c.id, entityType: 'CUSTOMER', action: 'CREATE', timestamp: c.createdAt || new Date().toISOString(), payload: c }));
      shifts.forEach(s => allItems.push({ syncId: s.id, entityType: 'DUTY', action: 'CREATE', timestamp: s.startTime || new Date().toISOString(), payload: s }));
      readings.forEach(r => allItems.push({ syncId: r.id, entityType: 'READING', action: 'CREATE', timestamp: r.finalizedAt || new Date().toISOString(), payload: r }));
      credits.forEach(cr => allItems.push({ syncId: cr.id, entityType: 'CREDIT', action: 'CREATE', timestamp: cr.timestamp || new Date().toISOString(), payload: cr }));
      payments.forEach(p => allItems.push({ syncId: p.id, entityType: 'PAYMENT', action: 'CREATE', timestamp: p.timestamp || new Date().toISOString(), payload: p }));
      closings.forEach(cl => allItems.push({ syncId: cl.id, entityType: 'DUTY_CLOSING', action: 'CREATE', timestamp: cl.closedAt || new Date().toISOString(), payload: cl }));
      paymentRequests.forEach(pr => allItems.push({ syncId: pr.id, entityType: 'PAYMENT_REQUEST', action: 'CREATE', timestamp: pr.sentAt || new Date().toISOString(), payload: pr }));
      expenses.forEach(e => allItems.push({ syncId: e.id, entityType: 'EXPENSE', action: 'CREATE', timestamp: e.timestamp || new Date().toISOString(), payload: e }));
      tankStocks.forEach(t => allItems.push({ syncId: t.id, entityType: 'TANK_STOCK', action: 'CREATE', timestamp: t.timestamp || new Date().toISOString(), payload: t }));

      if (allItems.length === 0) {
        this.currentStatus = 'ONLINE';
        this.isSyncing = false;
        this.notifyListeners();
        return { success: true, totalItems: 0 };
      }

      // Send in batches of 50
      const batchSize = 50;
      let totalProcessed = 0;

      for (let i = 0; i < allItems.length; i += batchSize) {
        const chunk = allItems.slice(i, i + batchSize);
        const response = await fetch(`${getApiBaseUrl()}/api/sync/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batchId: `full-sync-${Date.now()}-${i}`,
            items: chunk
          })
        });

        if (response.ok) {
          totalProcessed += chunk.length;
        }
      }

      // Mark all local as synced
      await db.transaction('rw', [
        db.users,
        db.customers,
        db.dutyShifts,
        db.fuelReadings,
        db.creditEntries,
        db.paymentEntries,
        db.dutyClosings,
        db.paymentRequests,
        db.expenseEntries,
        db.tankStocks,
        db.syncQueue
      ], async () => {
        await Promise.all([
          db.users.toCollection().modify({ synced: true }),
          db.customers.toCollection().modify({ synced: true }),
          db.dutyShifts.toCollection().modify({ synced: true }),
          db.fuelReadings.toCollection().modify({ synced: true }),
          db.creditEntries.toCollection().modify({ synced: true }),
          db.paymentEntries.toCollection().modify({ synced: true }),
          db.dutyClosings.toCollection().modify({ synced: true }),
          db.paymentRequests.toCollection().modify({ synced: true }),
          db.expenseEntries.toCollection().modify({ synced: true }),
          db.tankStocks.toCollection().modify({ synced: true }),
          db.syncQueue.clear()
        ]);
      });

      this.currentStatus = 'ONLINE';
      this.isSyncing = false;
      this.notifyListeners();
      return { success: true, totalItems: totalProcessed };
    } catch (err: any) {
      this.currentStatus = 'ERROR';
      this.isSyncing = false;
      this.notifyListeners();
      return { success: false, totalItems: 0, error: err.message || 'Sync failed' };
    }
  }

  /**
   * Check Cloud Backend Connection and Statistics
   */
  public async getCloudStatus(): Promise<{ connected: boolean; statusData?: any }> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/sync/status`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        return { connected: true, statusData: data };
      }
      return { connected: false };
    } catch {
      return { connected: false };
    }
  }

  /**
   * Fetch complete live cloud database state from backend
   */
  public async getAllCloudData(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/sync/all`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        return { success: true, data };
      }
      return { success: false, error: 'HTTP ' + res.status };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to connect to cloud backend' };
    }
  }

  /**
   * Pull all data from Cloud Database and hydrate local IndexedDB across all devices
   */
  public async pullAndHydrateFromCloud(): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await this.getAllCloudData();
      if (!res.success || !res.data) {
        return { success: false, error: res.error || 'No data returned from cloud' };
      }

      const cloudData = res.data;

      await db.transaction('rw', [
        db.users,
        db.customers,
        db.dutyShifts,
        db.fuelReadings,
        db.creditEntries,
        db.paymentEntries,
        db.dutyClosings,
        db.paymentRequests,
        db.expenseEntries,
        db.tankStocks
      ], async () => {
        // Hydrate Users
        if (Array.isArray(cloudData.users) && cloudData.users.length > 0) {
          for (const u of cloudData.users) {
            await db.users.put({
              id: u.id,
              username: u.username,
              fullName: u.fullName,
              phone: u.phone,
              password: u.passwordHash || u.password || '1234',
              role: u.role,
              photoUrl: u.photoUrl,
              active: u.active ?? true,
              createdAt: u.createdAt,
              synced: true
            });
          }
        }

        // Hydrate Customers directly from Cloud DB
        if (Array.isArray(cloudData.customers)) {
          const cloudCustomerIds = new Set(cloudData.customers.map((c: any) => c.id).filter(Boolean));
          // Prune any deleted customers from local cache
          const localCustomers = await db.customers.toArray();
          for (const lc of localCustomers) {
            if (lc.synced && !cloudCustomerIds.has(lc.id)) {
              await db.customers.delete(lc.id);
            }
          }

          for (const c of cloudData.customers) {
            if (!c.id || !c.name) continue;
            await db.customers.put({
              id: c.id,
              name: c.name,
              phoneNumber: c.phoneNumber || '',
              totalCredit: Number(c.totalCredit || 0),
              totalPaid: Number(c.totalPaid || 0),
              currentBalance: Number(c.currentBalance || 0),
              active: c.active ?? true,
              createdAt: c.createdAt,
              synced: true
            });
          }
        }

        // Hydrate Duty Shifts
        if (Array.isArray(cloudData.dutyShifts) && cloudData.dutyShifts.length > 0) {
          for (const s of cloudData.dutyShifts) {
            await db.dutyShifts.put({
              id: s.id,
              shiftNumber: s.shiftNumber,
              cashierId: s.cashierId,
              cashierName: s.cashierName,
              supportCashierId: s.supportCashierId,
              supportCashierName: s.supportCashierName,
              startTime: s.startTime,
              endTime: s.endTime,
              status: s.status || 'ACTIVE',
              notes: s.notes,
              synced: true
            });
          }
        }

        // Hydrate Fuel Readings
        if (Array.isArray(cloudData.fuelReadings) && cloudData.fuelReadings.length > 0) {
          for (const r of cloudData.fuelReadings) {
            await db.fuelReadings.put({
              id: r.id,
              dutyId: r.dutyId,
              productType: r.productType,
              pumpNumber: r.pumpNumber,
              startReading: Number(r.startReading || 0),
              endReading: Number(r.endReading || 0),
              totalLiters: Number(r.totalLiters || 0),
              rate: Number(r.rate || 0),
              totalAmount: Number(r.totalAmount || 0),
              isFinalized: r.finalized ?? false,
              finalizedAt: r.finalizedAt,
              synced: true
            });
          }
        }

        // Hydrate Credit Entries
        if (Array.isArray(cloudData.creditEntries) && cloudData.creditEntries.length > 0) {
          for (const cr of cloudData.creditEntries) {
            await db.creditEntries.put({
              id: cr.id,
              customerId: cr.customerId,
              customerName: cr.customerName,
              customerPhone: cr.customerPhone,
              dutyId: cr.dutyId,
              cashierId: cr.cashierId,
              cashierName: cr.cashierName,
              productType: cr.productType,
              liters: Number(cr.liters || 0),
              ratePerLiter: Number(cr.ratePerLiter || 0),
              totalAmount: Number(cr.totalAmount || 0),
              vehicleNumber: cr.vehicleNumber,
              timestamp: cr.timestamp,
              status: cr.status || 'ACTIVE',
              synced: true
            });
          }
        }

        // Hydrate Payment Entries
        if (Array.isArray(cloudData.paymentEntries) && cloudData.paymentEntries.length > 0) {
          for (const p of cloudData.paymentEntries) {
            await db.paymentEntries.put({
              id: p.id,
              customerId: p.customerId,
              customerName: p.customerName,
              dutyId: p.dutyId,
              cashierId: p.cashierId,
              cashierName: p.cashierName,
              amount: Number(p.amount || 0),
              paymentMethod: p.paymentMethod,
              referenceNo: p.referenceNo,
              timestamp: p.timestamp,
              notes: p.notes,
              synced: true
            });
          }
        }

        // Hydrate Duty Closings
        if (Array.isArray(cloudData.dutyClosings) && cloudData.dutyClosings.length > 0) {
          for (const cl of cloudData.dutyClosings) {
            await db.dutyClosings.put({
              id: cl.id,
              dutyId: cl.dutyId,
              shiftNumber: cl.shiftNumber,
              cashierId: cl.cashierId,
              cashierName: cl.cashierName,
              closedByAdminId: cl.closedByAdminId,
              closedByAdminName: cl.closedByAdminName,
              grossFuelSalesAmount: Number(cl.grossFuelSalesAmount || 0),
              creditGivenAmount: Number(cl.creditGivenAmount || 0),
              creditPaymentsCollected: Number(cl.creditPaymentsCollected || 0),
              expectedCashBalance: Number(cl.expectedCashBalance || 0),
              actualCashInHand: Number(cl.actualCashInHand || 0),
              differenceAmount: Number(cl.differenceAmount || 0),
              closingStatus: cl.closingStatus,
              notes: cl.notes,
              closedAt: cl.closedAt,
              isLocked: cl.locked ?? true,
              synced: true
            });
          }
        }

        // Hydrate Payment Requests
        if (Array.isArray(cloudData.paymentRequests) && cloudData.paymentRequests.length > 0) {
          for (const pr of cloudData.paymentRequests) {
            await db.paymentRequests.put({
              id: pr.id,
              customerId: pr.customerId,
              customerName: pr.customerName,
              requestedAmount: Number(pr.requestedAmount || 0),
              message: pr.message,
              sentByAdminId: pr.sentByAdminId,
              status: pr.status,
              sentAt: pr.sentAt,
              synced: true
            });
          }
        }

        // Hydrate Expense Entries
        if (Array.isArray(cloudData.expenseEntries) && cloudData.expenseEntries.length > 0) {
          for (const exp of cloudData.expenseEntries) {
            await db.expenseEntries.put({
              id: exp.id,
              dutyId: exp.dutyId,
              cashierId: exp.cashierId,
              cashierName: exp.cashierName,
              title: exp.title,
              category: exp.category,
              amount: Number(exp.amount || 0),
              notes: exp.notes,
              timestamp: exp.timestamp,
              synced: true
            });
          }
        }

        // Hydrate Tank Stocks
        if (Array.isArray(cloudData.tankStocks) && cloudData.tankStocks.length > 0) {
          for (const st of cloudData.tankStocks) {
            await db.tankStocks.put({
              id: st.id,
              date: st.date,
              period: st.period,
              shiftName: st.shiftName,
              msAtgDipLevel: st.msAtgDipLevel,
              msAtgStock: Number(st.msAtgStock || 0),
              msTankDipLevel: st.msTankDipLevel,
              msTankDipStock: Number(st.msTankDipStock || 0),
              hsdAtgDipLevel: st.hsdAtgDipLevel,
              hsdAtgStock: Number(st.hsdAtgStock || 0),
              hsdTankDipLevel: st.hsdTankDipLevel,
              hsdTankDipStock: Number(st.hsdTankDipStock || 0),
              recordedByAdminId: st.recordedByAdminId,
              recordedByAdminName: st.recordedByAdminName,
              timestamp: st.timestamp,
              synced: true
            });
          }
        }
      });

      this.currentStatus = 'ONLINE';
      this.notifyListeners();
      // Notify all listening components/contexts
      window.dispatchEvent(new CustomEvent('bunk_cloud_synced'));
      return { success: true };
    } catch (err: any) {
      console.warn('Cloud sync hydration (offline mode):', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Permanently purge all customer records and test data from BOTH local Dexie and Backend Cloud
   */
  public async clearAllCustomersFromCloudAndLocal(): Promise<void> {
    try {
      // 1. Clear local IndexedDB
      await db.customers.clear();
      await db.creditEntries.clear();
      await db.paymentEntries.clear();
      await db.paymentRequests.clear();
      
      const custUsers = await db.users.filter(u => u.role === 'CUSTOMER').toArray();
      for (const u of custUsers) {
        await db.users.delete(u.id);
      }

      // 2. Call backend cloud wipe endpoints
      await Promise.allSettled([
        fetch(`${getApiBaseUrl()}/api/sync/customers/all`, { method: 'DELETE' }),
        fetch(`${getApiBaseUrl()}/api/sync/customers/clear`, { method: 'POST' })
      ]);

      window.dispatchEvent(new CustomEvent('bunk_cloud_synced'));
    } catch (err) {
      console.error('Failed to clear customers from cloud:', err);
    }
  }

  /**
   * Factory Reset: Permanently purge all shift transactions, meters, credits, payments, and customers from BOTH local Dexie and Cloud DB, while keeping Staff and Admin login credentials.
   */
  public async resetAllDataKeepUsers(): Promise<void> {
    try {
      // 1. Clear local IndexedDB tables
      await Promise.all([
        db.customers.clear(),
        db.dutyShifts.clear(),
        db.fuelReadings.clear(),
        db.creditEntries.clear(),
        db.paymentEntries.clear(),
        db.expenseEntries.clear(),
        db.dutyClosings.clear(),
        db.paymentRequests.clear(),
        db.syncQueue.clear(),
        db.tankStocks.clear()
      ]);

      // Remove customer-role users, keep staff and admin user accounts
      const custUsers = await db.users.filter(u => u.role === 'CUSTOMER').toArray();
      for (const u of custUsers) {
        await db.users.delete(u.id);
      }

      // 2. Call backend cloud wipe endpoints
      await Promise.allSettled([
        fetch(`${getApiBaseUrl()}/api/sync/reset-database-keep-users`, { method: 'POST' }),
        fetch(`${getApiBaseUrl()}/api/sync/database/reset`, { method: 'DELETE' })
      ]);

      window.dispatchEvent(new CustomEvent('bunk_cloud_synced'));
    } catch (err) {
      console.error('Failed to execute database reset from cloud:', err);
    }
  }
}

export const syncEngine = new SyncEngine();
