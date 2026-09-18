import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  DutyShift,
  ProductPricing,
  ProductType,
  CreditEntry,
  PaymentEntry,
  ExpenseEntry,
  FuelReading,
  DutyClosing,
  PaymentRequest,
  Customer,
  User
} from '../types';
import { db, DEFAULT_PRICES } from '../db/db';
import { syncEngine } from '../sync/syncEngine';
import { useAuth } from './AuthContext';

interface DutyContextType {
  activeDuty: DutyShift | null;
  pricing: ProductPricing;
  updatePricing: (newPricing: ProductPricing) => Promise<void>;
  startNewDuty: (
    shiftNumber: string,
    cashierId: string,
    supportCashierId?: string,
    notes?: string,
    customStartTime?: string
  ) => Promise<DutyShift>;
  recordCredit: (entry: Omit<CreditEntry, 'id' | 'timestamp' | 'status' | 'synced'>) => Promise<CreditEntry>;
  recordPayment: (entry: Omit<PaymentEntry, 'id' | 'timestamp' | 'synced'>) => Promise<PaymentEntry>;
  recordExpense: (entry: Omit<ExpenseEntry, 'id' | 'timestamp' | 'synced'>) => Promise<ExpenseEntry>;
  deleteExpense: (id: string) => Promise<void>;
  updateFuelReading: (reading: FuelReading) => Promise<void>;
  closeDutyShift: (closing: Omit<DutyClosing, 'id' | 'closedAt' | 'isLocked' | 'synced'>) => Promise<DutyClosing>;
  updateClosedDutyShift: (
    updatedClosing: DutyClosing,
    updatedReadings: FuelReading[],
    updatedCredits?: CreditEntry[]
  ) => Promise<DutyClosing>;
  sendPaymentRequest: (customerId: string, amount: number, message: string) => Promise<PaymentRequest>;
  createCustomer: (name: string, phoneNumber: string, creditLimit?: number) => Promise<Customer>;
  refreshDutyData: () => Promise<void>;
}

const DutyContext = createContext<DutyContextType | undefined>(undefined);

export const DutyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [activeDuty, setActiveDuty] = useState<DutyShift | null>(null);
  const [pricing, setPricing] = useState<ProductPricing>(DEFAULT_PRICES);

  const refreshDutyData = useCallback(async () => {
    // Fetch active duty - get the genuine ACTIVE shift across cloud and local DB
    const allShifts = await db.dutyShifts.toArray();
    const closings = await db.dutyClosings.toArray();
    const closedShiftIds = new Set(closings.map(c => c.dutyId).filter(Boolean));

    const now = Date.now();
    const activeShifts = allShifts
      .filter(d => {
        if ((d.status || '').toUpperCase() !== 'ACTIVE') return false;
        if (closedShiftIds.has(d.id)) {
          db.dutyShifts.update(d.id, { status: 'CLOSED' }).catch(() => {});
          return false;
        }
        // If shift is marked ACTIVE, clear any lingering endTime
        if (d.endTime) {
          db.dutyShifts.update(d.id, { endTime: undefined }).catch(() => {});
        }
        return true;
      })
      .sort((a, b) => new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime());

    const active = activeShifts.length > 0 ? activeShifts[0] : null;
    setActiveDuty(active);

    // Fetch pricing
    const savedPrice = await db.pricing.get('current');
    if (savedPrice) {
      setPricing(savedPrice.pricing);
    }
  }, []);

  useEffect(() => {
    // Initial local load + cloud pull
    refreshDutyData();
    syncEngine.pullAndHydrateFromCloud().then(() => {
      refreshDutyData();
    });

    // Fast 2-second background check to catch multi-device shifts seamlessly
    const interval = setInterval(() => {
      refreshDutyData();
    }, 2000);

    // Listen to background sync updates across tabs and cloud polling
    const handleSync = () => {
      refreshDutyData();
    };

    window.addEventListener('bunk_cloud_synced', handleSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener('bunk_cloud_synced', handleSync);
    };
  }, [refreshDutyData]);

  const updatePricing = async (newPricing: ProductPricing) => {
    setPricing(newPricing);
    await db.pricing.put({ id: 'current', pricing: newPricing });
  };

  const startNewDuty = async (
    shiftNumber: string,
    cashierId: string,
    supportCashierId?: string,
    notes?: string,
    customStartTime?: string
  ): Promise<DutyShift> => {
    const cashier = await db.users.get(cashierId);
    let supportCashierName: string | undefined;
    if (supportCashierId) {
      const support = await db.users.get(supportCashierId);
      supportCashierName = support?.fullName;
    }

    // Close any previous lingering active shifts before launching the new one
    const priorActiveShifts = await db.dutyShifts.filter(s => s.status === 'ACTIVE').toArray();
    for (const pas of priorActiveShifts) {
      await db.dutyShifts.update(pas.id, { status: 'CLOSED', endTime: new Date().toISOString() });
    }

    const newShift: DutyShift = {
      id: 'duty-' + Date.now(),
      shiftNumber,
      cashierId,
      cashierName: cashier?.fullName || 'Cashier',
      supportCashierId,
      supportCashierName,
      startTime: customStartTime || new Date().toISOString(),
      status: 'ACTIVE',
      notes,
      synced: false
    };

    await db.dutyShifts.put(newShift);

    // Define the full set of 4 Petrol, 4 Diesel, and 1 Oil pump dispensers
    const pumpDefinitions: { pumpNumber: string; productType: ProductType; defaultStart: number }[] = [
      // 4 Petrol Pumps
      { pumpNumber: 'Petrol Pump 1 (Dispenser A)', productType: 'PETROL', defaultStart: 125000 },
      { pumpNumber: 'Petrol Pump 2 (Dispenser B)', productType: 'PETROL', defaultStart: 142000 },
      { pumpNumber: 'Petrol Pump 3 (Dispenser C)', productType: 'PETROL', defaultStart: 168500 },
      { pumpNumber: 'Petrol Pump 4 (Dispenser D)', productType: 'PETROL', defaultStart: 195200 },

      // 4 Diesel Pumps
      { pumpNumber: 'Diesel Pump 1 (High-Flow 1)', productType: 'DIESEL', defaultStart: 346000 },
      { pumpNumber: 'Diesel Pump 2 (High-Flow 2)', productType: 'DIESEL', defaultStart: 378400 },
      { pumpNumber: 'Diesel Pump 3 (Commercial 3)', productType: 'DIESEL', defaultStart: 412000 },
      { pumpNumber: 'Diesel Pump 4 (Commercial 4)', productType: 'DIESEL', defaultStart: 456800 },

      // Oil & Lubricants
      { pumpNumber: 'Lube Dispenser 1 (Engine Oil)', productType: 'OIL', defaultStart: 260 }
    ];

    // Fetch previous readings to carry over endReading -> startReading seamlessly
    const allPastReadings = await db.fuelReadings.toArray();

    const initialReadings: FuelReading[] = pumpDefinitions.map((def, idx) => {
      // Find the latest reading for this specific pump
      const pastForPump = allPastReadings
        .filter(r => r.pumpNumber === def.pumpNumber)
        .sort((a, b) => (b.endReading || 0) - (a.endReading || 0));

      const startReading = pastForPump.length > 0 && pastForPump[0].endReading > 0
        ? pastForPump[0].endReading
        : def.defaultStart;

      return {
        id: `read-${newShift.id}-p${idx + 1}`,
        dutyId: newShift.id,
        productType: def.productType,
        pumpNumber: def.pumpNumber,
        startReading: startReading,
        endReading: startReading, // Initially same so liters = 0 until entered
        totalLiters: 0,
        rate: pricing[def.productType],
        totalAmount: 0,
        isFinalized: false,
        synced: false
      };
    });

    await db.fuelReadings.bulkPut(initialReadings);

    // Immediately activate shift locally so UI updates with zero delay
    setActiveDuty(newShift);
    window.dispatchEvent(new CustomEvent('bunk_cloud_synced'));

    // Batch sync to cloud in a single atomic network request
    const batchItems = [
      {
        entityType: 'DUTY' as const,
        action: 'CREATE' as const,
        syncId: newShift.id,
        payload: newShift
      },
      ...initialReadings.map(r => ({
        entityType: 'READING' as const,
        action: 'CREATE' as const,
        syncId: r.id,
        payload: r
      }))
    ];
    syncEngine.enqueueBatch(batchItems).catch(console.warn);

    return newShift;
  };

  const recordCredit = async (
    entry: Omit<CreditEntry, 'id' | 'timestamp' | 'status' | 'synced'>
  ): Promise<CreditEntry> => {
    const id = 'cred-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const newCredit: CreditEntry = {
      ...entry,
      id,
      timestamp: new Date().toISOString(),
      status: 'ACTIVE',
      synced: false
    };

    await db.transaction('rw', [db.creditEntries, db.customers], async () => {
      await db.creditEntries.put(newCredit);

      // Update customer ledger
      const customer = await db.customers.get(entry.customerId);
      if (customer) {
        const newTotalCredit = customer.totalCredit + entry.totalAmount;
        const newBalance = newTotalCredit - customer.totalPaid;
        await db.customers.update(entry.customerId, {
          totalCredit: newTotalCredit,
          currentBalance: newBalance
        });
      }
    });

    await syncEngine.enqueue('CREDIT', 'CREATE', id, newCredit);
    return newCredit;
  };

  const recordPayment = async (
    entry: Omit<PaymentEntry, 'id' | 'timestamp' | 'synced'>
  ): Promise<PaymentEntry> => {
    const id = 'pay-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const newPayment: PaymentEntry = {
      ...entry,
      id,
      timestamp: new Date().toISOString(),
      synced: false
    };

    await db.transaction('rw', [db.paymentEntries, db.customers], async () => {
      await db.paymentEntries.put(newPayment);

      // Update customer ledger
      const customer = await db.customers.get(entry.customerId);
      if (customer) {
        const newTotalPaid = customer.totalPaid + entry.amount;
        const newBalance = customer.totalCredit - newTotalPaid;
        await db.customers.update(entry.customerId, {
          totalPaid: newTotalPaid,
          currentBalance: newBalance
        });
      }
    });

    await syncEngine.enqueue('PAYMENT', 'CREATE', id, newPayment);
    return newPayment;
  };

  const recordExpense = async (
    entry: Omit<ExpenseEntry, 'id' | 'timestamp' | 'synced'>
  ): Promise<ExpenseEntry> => {
    const id = 'exp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const newExpense: ExpenseEntry = {
      ...entry,
      id,
      timestamp: new Date().toISOString(),
      synced: false
    };

    await db.expenseEntries.put(newExpense);
    await syncEngine.enqueue('EXPENSE', 'CREATE', id, newExpense);
    return newExpense;
  };

  const deleteExpense = async (id: string) => {
    await db.expenseEntries.delete(id);
    await syncEngine.enqueue('EXPENSE', 'DELETE', id, { id });
  };

  const updateFuelReading = async (reading: FuelReading) => {
    const totalLiters = Math.max(0, reading.endReading - reading.startReading);
    const totalAmount = totalLiters * reading.rate;

    const updated: FuelReading = {
      ...reading,
      totalLiters: Number(totalLiters.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
      synced: false
    };

    await db.fuelReadings.put(updated);
    await syncEngine.enqueue('READING', 'UPDATE', updated.id, updated);
  };

  const closeDutyShift = async (
    closing: Omit<DutyClosing, 'id' | 'closedAt' | 'isLocked' | 'synced'>
  ): Promise<DutyClosing> => {
    const id = 'close-' + closing.dutyId;
    const dutyClosing: DutyClosing = {
      ...closing,
      id,
      closedAt: new Date().toISOString(),
      isLocked: true,
      synced: false
    };

    await db.transaction('rw', [db.dutyClosings, db.dutyShifts, db.fuelReadings], async () => {
      await db.dutyClosings.put(dutyClosing);
      await db.dutyShifts.update(closing.dutyId, {
        status: 'CLOSED',
        endTime: dutyClosing.closedAt
      });
      // Mark all fuel readings for this shift as finalized
      const readings = await db.fuelReadings.where('dutyId').equals(closing.dutyId).toArray();
      for (const r of readings) {
        await db.fuelReadings.update(r.id, { isFinalized: true, finalizedAt: dutyClosing.closedAt });
      }
    });

    // 1. Enqueue Duty Shift status as CLOSED to cloud
    await syncEngine.enqueue('DUTY', 'CREATE', closing.dutyId, {
      id: closing.dutyId,
      shiftNumber: closing.shiftNumber,
      cashierId: closing.cashierId,
      cashierName: closing.cashierName,
      status: 'CLOSED',
      endTime: dutyClosing.closedAt
    });

    // 2. Enqueue Duty Closing record
    await syncEngine.enqueue('DUTY_CLOSING', 'CREATE', id, dutyClosing);

    // 3. Mark finalized readings in cloud
    const closedReadings = await db.fuelReadings.where('dutyId').equals(closing.dutyId).toArray();
    for (const r of closedReadings) {
      await syncEngine.enqueue('READING', 'CREATE', r.id, {
        ...r,
        isFinalized: true,
        finalizedAt: dutyClosing.closedAt
      });
    }

    // 4. Immediately trigger cloud sync so all devices reflect shift closure
    syncEngine.triggerSync().catch(console.warn);

    setActiveDuty(null);
    return dutyClosing;
  };

  const updateClosedDutyShift = async (
    updatedClosing: DutyClosing,
    updatedReadings: FuelReading[],
    updatedCredits?: CreditEntry[]
  ): Promise<DutyClosing> => {
    if (currentUser?.role !== 'ADMIN') {
      throw new Error('Unauthorized: Only Admin users can edit closed shift details.');
    }

    await db.transaction('rw', [db.dutyClosings, db.fuelReadings, db.creditEntries, db.customers, db.syncQueue], async () => {
      // 1. Update fuel readings for this shift
      for (const r of updatedReadings) {
        const totalLiters = Math.max(0, r.endReading - r.startReading);
        const totalAmount = totalLiters * r.rate;
        const upReading: FuelReading = {
          ...r,
          totalLiters: Number(totalLiters.toFixed(2)),
          totalAmount: Number(totalAmount.toFixed(2)),
          isFinalized: true,
          synced: false
        };
        await db.fuelReadings.put(upReading);
        await syncEngine.enqueue('READING', 'UPDATE', upReading.id, upReading);
      }

      // 2. If credits were updated, adjust customer ledgers
      if (updatedCredits && updatedCredits.length > 0) {
        for (const cr of updatedCredits) {
          const oldCredit = await db.creditEntries.get(cr.id);
          const oldAmt = oldCredit?.totalAmount || 0;
          const diffAmt = cr.totalAmount - oldAmt;

          await db.creditEntries.put({ ...cr, synced: false });
          await syncEngine.enqueue('CREDIT', 'UPDATE', cr.id, cr);

          if (diffAmt !== 0) {
            const customer = await db.customers.get(cr.customerId);
            if (customer) {
              const newTotalCredit = customer.totalCredit + diffAmt;
              const newBalance = newTotalCredit - customer.totalPaid;
              await db.customers.update(cr.customerId, {
                totalCredit: newTotalCredit,
                currentBalance: newBalance
              });
            }
          }
        }
      }

      // 3. Update closing record
      const finalClosing: DutyClosing = {
        ...updatedClosing,
        synced: false
      };
      await db.dutyClosings.put(finalClosing);
      await syncEngine.enqueue('DUTY_CLOSING', 'UPDATE', finalClosing.id, finalClosing);
    });

    return updatedClosing;
  };

  const sendPaymentRequest = async (customerId: string, amount: number, message: string): Promise<PaymentRequest> => {
    const customer = await db.customers.get(customerId);
    const id = 'pr-' + Date.now();
    const req: PaymentRequest = {
      id,
      customerId,
      customerName: customer?.name || 'Customer',
      requestedAmount: amount,
      message,
      sentByAdminId: currentUser?.id || 'admin',
      status: 'PENDING',
      sentAt: new Date().toISOString(),
      synced: false
    };

    await db.paymentRequests.put(req);
    await syncEngine.enqueue('PAYMENT_REQUEST', 'CREATE', id, req);
    return req;
  };

  const createCustomer = async (name: string, phoneNumber: string, creditLimit?: number): Promise<Customer> => {
    const id = 'c-' + Date.now();
    const cleanPhone = phoneNumber.trim();
    const cleanName = name.trim();
    const username = cleanPhone.replace(/\D/g, '') || cleanName.toLowerCase().replace(/\s+/g, '');

    const newCust: Customer = {
      id,
      name: cleanName,
      phoneNumber: cleanPhone,
      creditLimit: creditLimit !== undefined ? creditLimit : 50000,
      totalCredit: 0,
      totalPaid: 0,
      currentBalance: 0,
      active: true,
      accessStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
      synced: false
    };

    const newCustUser: User = {
      id: 'u-cust-' + id,
      username: username,
      password: 'Customer@123',
      fullName: cleanName,
      phone: cleanPhone,
      role: 'CUSTOMER',
      active: true,
      createdAt: new Date().toISOString(),
      synced: false
    };

    await db.customers.put(newCust);
    await db.users.put(newCustUser);
    await syncEngine.enqueue('CUSTOMER', 'CREATE', id, newCust);
    await syncEngine.enqueue('USER', 'CREATE', newCustUser.id, newCustUser);
    return newCust;
  };

  return (
    <DutyContext.Provider
      value={{
        activeDuty,
        pricing,
        updatePricing,
        startNewDuty,
        recordCredit,
        recordPayment,
        recordExpense,
        deleteExpense,
        updateFuelReading,
        closeDutyShift,
        updateClosedDutyShift,
        sendPaymentRequest,
        createCustomer,
        refreshDutyData
      }}
    >
      {children}
    </DutyContext.Provider>
  );
};

export const useDuty = () => {
  const context = useContext(DutyContext);
  if (!context) throw new Error('useDuty must be used within a DutyProvider');
  return context;
};
