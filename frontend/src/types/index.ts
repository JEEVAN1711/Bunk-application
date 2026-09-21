export type UserRole = 'ADMIN' | 'CASHIER' | 'SUPPORT_CASHIER' | 'CUSTOMER';

export type ProductType = 'PETROL' | 'DIESEL' | 'OIL';

export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER';

export type ShiftStatus = 'ACTIVE' | 'CLOSED';

export type ClosingStatus = 'MATCHED' | 'EXTRA' | 'SHORTAGE';

export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED';

export interface User {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  phone: string;
  role: UserRole;
  photoUrl?: string;
  active: boolean;
  createdAt: string;
  synced?: boolean;
}

export type CustomerAccessStatus = 'ACTIVE' | 'LOCKED' | 'PENDING';

export interface Customer {
  id: string;
  name: string;
  phoneNumber: string;
  photoUrl?: string;
  creditLimit?: number;
  totalCredit: number;
  totalPaid: number;
  currentBalance: number;
  active: boolean;
  accessStatus?: CustomerAccessStatus; // 'ACTIVE' | 'LOCKED' | 'PENDING'
  lockReason?: string; // e.g. "Data reconciliation in progress"
  createdAt: string;
  synced?: boolean;
}

export interface DutyShift {
  id: string;
  shiftNumber: string;
  cashierId: string;
  cashierName: string;
  supportCashierId?: string;
  supportCashierName?: string;
  startTime: string;
  endTime?: string;
  status: ShiftStatus;
  notes?: string;
  synced?: boolean;
}

export interface CreditEntry {
  id: string; // syncId (client UUID)
  customerId: string;
  customerName: string;
  customerPhone?: string;
  dutyId: string;
  cashierId: string;
  cashierName: string;
  productType: ProductType;
  liters: number;
  ratePerLiter: number;
  totalAmount: number;
  vehicleNumber?: string;
  timestamp: string;
  status: 'ACTIVE' | 'VOIDED';
  synced?: boolean;
}

export interface PaymentEntry {
  id: string; // syncId (client UUID)
  customerId: string;
  customerName: string;
  dutyId: string;
  cashierId: string;
  cashierName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNo?: string;
  timestamp: string;
  notes?: string;
  synced?: boolean;
}

export interface ExpenseEntry {
  id: string;
  dutyId: string;
  cashierId: string;
  cashierName: string;
  title: string; // e.g. "Staff Tea & Snacks", "Generator Diesel", "Cleaning supplies"
  category: 'FOOD_BEVERAGES' | 'GENERATOR_FUEL' | 'CLEANING_MAINTENANCE' | 'STATIONERY' | 'TRANSPORT' | 'OTHER';
  amount: number;
  notes?: string;
  timestamp: string;
  synced?: boolean;
}

export interface TankStockEntry {
  id: string;
  date: string; // Today date
  period: 'DAY_SHIFT_END' | 'NIGHT_SHIFT_END' | 'SHIFT_END';
  shiftName?: string;
  
  // MS (Petrol)
  msAtgDipLevel: string;
  msAtgStock: number;
  msTankDipLevel?: string;
  msTankDipStock?: number;

  // HSD (Diesel)
  hsdAtgDipLevel: string;
  hsdAtgStock: number;
  hsdTankDipLevel?: string;
  hsdTankDipStock?: number;

  recordedByAdminId: string;
  recordedByAdminName: string;
  timestamp: string;
  synced?: boolean;
}

export interface FuelReading {
  id: string;
  dutyId: string;
  productType: ProductType;
  pumpNumber: string;
  startReading: number;
  endReading: number;
  totalLiters: number;
  rate: number;
  totalAmount: number;
  isFinalized: boolean;
  finalizedAt?: string;
  synced?: boolean;
}

export interface CashDenominations {
  notes500?: number;
  notes200?: number;
  notes100?: number;
  notes50?: number;
  notes20?: number;
  notes10?: number;
  coins?: number;
  totalNotes?: number;
  summaryText?: string;
}

export interface ClosingTankStock {
  msDipLevel?: string;
  msStockLiters?: number;
  hsdDipLevel?: string;
  hsdStockLiters?: number;
  stockNotes?: string;
}

export interface DutyClosing {
  id: string;
  dutyId: string;
  shiftNumber: string;
  cashierId: string;
  cashierName: string;
  closedByAdminId: string;
  closedByAdminName: string;
  grossFuelSalesAmount: number;
  creditGivenAmount: number;
  creditPaymentsCollected: number;
  dailyExpensesAmount?: number; // Shift expenses deducted from actual cash
  expectedCashBalance: number; // grossFuelSales + creditPayments - creditGiven - (dailyExpensesAmount || 0)
  actualCashInHand: number;
  differenceAmount: number; // actual - expected
  closingStatus: ClosingStatus;
  denominations?: CashDenominations;
  tankStock?: ClosingTankStock;
  notes?: string;
  closedAt: string;
  isLocked: boolean;
  synced?: boolean;
}

export interface PaymentRequest {
  id: string;
  customerId: string;
  customerName: string;
  requestedAmount: number;
  message: string;
  sentByAdminId: string;
  status: 'PENDING' | 'SETTLED' | 'CANCELLED';
  sentAt: string;
  synced?: boolean;
}

export interface SyncQueueItem {
  id?: number;
  entityType: 'CREDIT' | 'PAYMENT' | 'CUSTOMER' | 'DUTY' | 'READING' | 'DUTY_CLOSING' | 'PAYMENT_REQUEST' | 'USER' | 'EXPENSE' | 'TANK_STOCK' | 'AGENCY';
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  syncId: string;
  timestamp: string;
  attempts: number;
  lastError?: string;
}

export interface ProductPricing {
  PETROL: number;
  DIESEL: number;
  OIL: number;
}

export interface Agency {
  id: string;
  name: string;          // e.g. "Bharat Petroleum - Anna Nagar"
  code: string;          // short unique code e.g. "BP-AN01"
  ownerName: string;
  phone: string;
  address?: string;
  logoUrl?: string;
  createdAt: string;
  synced?: boolean;
}
