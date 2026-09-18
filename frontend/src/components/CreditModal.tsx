import React, { useState, useEffect } from 'react';
import { useDuty } from '../context/DutyContext';
import { useAuth } from '../context/AuthContext';
import { Customer, ProductType, CreditEntry } from '../types';
import { db } from '../db/db';
import {
  Fuel,
  Car,
  User,
  CheckCircle2,
  X,
  PlusCircle,
  Lock,
  Phone,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedCustomerId?: string;
}

export const CreditModal: React.FC<CreditModalProps> = ({
  isOpen,
  onClose,
  preselectedCustomerId
}) => {
  const { activeDuty, pricing, recordCredit, createCustomer } = useDuty();
  const { currentUser } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [productType, setProductType] = useState<ProductType>('DIESEL');
  const [liters, setLiters] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [vehicleNumber, setVehicleNumber] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQuickAddCust, setShowQuickAddCust] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustCreditLimit, setNewCustCreditLimit] = useState('50000');

  // Post-entry Receipt State for instant WhatsApp / SMS share
  const [recordedEntry, setRecordedEntry] = useState<{
    entry: CreditEntry;
    newBalance: number;
    customerPhone?: string;
  } | null>(null);

  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => {
    if (isOpen) {
      db.customers.filter(c => c.active).toArray().then(custs => {
        setCustomers(custs);
        if (preselectedCustomerId) {
          setSelectedCustomerId(preselectedCustomerId);
        } else if (custs.length > 0) {
          setSelectedCustomerId(custs[0].id);
        }
      });
      setRecordedEntry(null);
      setShowQuickAddCust(false);
    }
  }, [isOpen, preselectedCustomerId]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const custLimit = selectedCustomer?.creditLimit || 50000;
  const currentBal = selectedCustomer?.currentBalance || 0;
  const availableCredit = Math.max(0, custLimit - currentBal);
  const parsedAmount = parseFloat(totalAmount) || 0;
  const isLimitExceeded = parsedAmount > availableCredit;

  const handleLitersChange = (val: string) => {
    setLiters(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const amt = num * pricing[productType];
      setTotalAmount(amt.toFixed(2));
    } else {
      setTotalAmount('');
    }
  };

  const handleAmountChange = (val: string) => {
    setTotalAmount(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const ltrs = num / pricing[productType];
      setLiters(ltrs.toFixed(2));
    } else {
      setLiters('');
    }
  };

  const handleProductChange = (prod: ProductType) => {
    setProductType(prod);
    const numLiters = parseFloat(liters);
    if (!isNaN(numLiters) && numLiters > 0) {
      setTotalAmount((numLiters * pricing[prod]).toFixed(2));
    }
  };

  // Only Admin can enroll new customers with custom credit limit
  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only Admin users can register new customer accounts.');
      return;
    }
    if (!newCustName || !newCustPhone) return;
    const limit = parseFloat(newCustCreditLimit) || 50000;
    const created = await createCustomer(newCustName, newCustPhone, limit);
    const updatedCusts = await db.customers.filter(c => c.active).toArray();
    setCustomers(updatedCusts);
    setSelectedCustomerId(created.id);
    setShowQuickAddCust(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustCreditLimit('50000');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !liters || !totalAmount) return;

    if (!activeDuty) {
      alert('Cannot issue Credit Slip: No active shift is currently running. Please ask the Station Admin to start the shift first.');
      return;
    }

    const isAssigned = Boolean(
      isAdmin ||
      currentUser?.id === activeDuty.cashierId ||
      currentUser?.id === activeDuty.supportCashierId ||
      (currentUser?.fullName && activeDuty.cashierName && currentUser.fullName.toLowerCase().trim() === activeDuty.cashierName.toLowerCase().trim()) ||
      (currentUser?.fullName && activeDuty.supportCashierName && currentUser.fullName.toLowerCase().trim() === activeDuty.supportCashierName.toLowerCase().trim()) ||
      (currentUser?.username && activeDuty.cashierName && currentUser.username.toLowerCase().trim() === activeDuty.cashierName.toLowerCase().trim())
    );

    if (!isAssigned) {
      alert(`Unauthorized: Shift ${activeDuty.shiftNumber} is assigned to ${activeDuty.cashierName}. Only the assigned on-duty cashier can issue credit slips.`);
      return;
    }

    if (isLimitExceeded) {
      alert(`Credit Limit Exceeded: Customer limit is ₹${custLimit}. Available limit is ₹${availableCredit.toFixed(2)}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedBalance = currentBal + parsedAmount;

      const liveDutyId = activeDuty.id;
      const liveCashierId = currentUser?.id || activeDuty.cashierId;
      const liveCashierName = currentUser?.fullName || activeDuty.cashierName;

      const newCredit = await recordCredit({
        customerId: selectedCustomerId,
        customerName: selectedCustomer?.name || 'Customer',
        customerPhone: selectedCustomer?.phoneNumber,
        dutyId: liveDutyId,
        cashierId: liveCashierId,
        cashierName: liveCashierName,
        productType,
        liters: parseFloat(liters),
        ratePerLiter: pricing[productType],
        totalAmount: parsedAmount,
        vehicleNumber: vehicleNumber.toUpperCase().trim()
      });

      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 }
      });

      setRecordedEntry({
        entry: newCredit,
        newBalance: updatedBalance,
        customerPhone: selectedCustomer?.phoneNumber
      });

      // Reset form fields
      setLiters('');
      setTotalAmount('');
      setVehicleNumber('');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-200 shadow-sm">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">Record Customer Credit Slip</h3>
              <p className="text-xs text-slate-500 font-medium">
                Live Attendant: <strong className="text-slate-900">{currentUser?.fullName || activeDuty?.cashierName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-all"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {recordedEntry ? (
          /* CREDIT CONFIRMATION VIEW */
          <div className="p-6 space-y-4 bg-white animate-in fade-in">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="font-black text-sm text-emerald-950">Credit Fuel Slip Recorded!</h4>
              <p className="text-xs text-emerald-800">
                Customer: <strong>{recordedEntry.entry.customerName}</strong>
              </p>
              <p className="text-xs text-emerald-800">
                Amount: <strong className="text-emerald-950 font-mono-numbers">₹{recordedEntry.entry.totalAmount.toFixed(2)}</strong> ({recordedEntry.entry.liters}L {recordedEntry.entry.productType})
              </p>
              <p className="text-[11px] text-emerald-700">
                New Customer Balance: <strong className="font-mono-numbers">₹{recordedEntry.newBalance.toFixed(2)}</strong> / ₹{custLimit.toLocaleString('en-IN')}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">Vehicle No:</span>
                <span className="font-mono font-bold text-slate-900">{recordedEntry.entry.vehicleNumber || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">Duty Attendant:</span>
                <span className="font-semibold text-slate-900">{recordedEntry.entry.cashierName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">Recorded At:</span>
                <span className="font-mono text-slate-600">{new Date(recordedEntry.entry.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRecordedEntry(null)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all cursor-pointer"
              >
                + Record Another
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-sm transition-all cursor-pointer"
              >
                Done & Close
              </button>
            </div>
          </div>
        ) : showQuickAddCust ? (
          /* QUICK ADD CUSTOMER (Admin only with Credit Limit) */
          <form onSubmit={handleQuickAddCustomer} className="p-6 space-y-4 bg-slate-50">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Register New Customer (Admin Only)
              </h4>
              <button
                type="button"
                onClick={() => setShowQuickAddCust(false)}
                className="text-xs text-slate-500 hover:text-slate-900 font-bold"
              >
                Cancel
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Customer / Fleet Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Balaji Transport / Ramesh"
                value={newCustName}
                onChange={e => setNewCustName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Phone Number</label>
              <input
                type="tel"
                required
                placeholder="e.g. +91 98765 43210"
                value={newCustPhone}
                onChange={e => setNewCustPhone(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Credit Limit (₹)</label>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  Admin Settable
                </span>
              </div>
              <input
                type="number"
                step="1000"
                min="0"
                required
                placeholder="₹50000"
                value={newCustCreditLimit}
                onChange={e => setNewCustCreditLimit(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono-numbers font-bold text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all shadow-md"
            >
              Save Customer & Continue
            </button>
          </form>
        ) : isAdmin ? (
          /* ADMIN RESTRICTION SCREEN WITH NEW CUSTOMER ENROLLMENT */
          <div className="p-6 space-y-4 bg-white text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
              <Lock className="w-6 h-6" />
            </div>
            <h4 className="font-black text-base text-slate-900">Admin Action Restricted</h4>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              Credit fuel slips can only be recorded by <strong>on-duty Cashiers / Pump Attendants</strong> at the dispenser. Admin is authorized to enroll new customers and configure credit limits.
            </p>
            <div className="pt-2 flex items-center gap-2 justify-center">
              <button
                type="button"
                onClick={() => setShowQuickAddCust(true)}
                className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-sm flex items-center gap-1.5 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Enroll New Customer Details</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* MAIN CREDIT SLIP ENTRY FORM FOR ON-DUTY CASHIERS */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Customer Picker */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Select Registered Customer
                </label>
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => setShowQuickAddCust(true)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    + New Customer
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Enrolled by Admin
                  </span>
                )}
              </div>

              <select
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-2xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm font-semibold"
                required
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phoneNumber}) — Limit: ₹{(c.creditLimit || 50000).toLocaleString('en-IN')} (Due: ₹{c.currentBalance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {/* Credit Limit & Balance Monitor Card */}
            {selectedCustomer && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 font-bold uppercase tracking-wider">Credit Limit:</span>
                  <span className="font-mono-numbers font-black text-slate-900">₹{custLimit.toLocaleString('en-IN')}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      ((currentBal + parsedAmount) / custLimit) > 1 ? 'bg-rose-600' :
                      ((currentBal + parsedAmount) / custLimit) > 0.8 ? 'bg-amber-500' : 'bg-emerald-600'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, ((currentBal + parsedAmount) / custLimit) * 100))}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200">
                  <div>
                    <span className="text-slate-500 block">Current Outstanding:</span>
                    <span className="font-mono-numbers font-black text-rose-600">₹{currentBal.toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block">Available Limit:</span>
                    <span className={`font-mono-numbers font-black ${availableCredit < 1000 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      ₹{availableCredit.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Limit Exceeded Alert */}
            {isLimitExceeded && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>
                  <strong>Credit Limit Exceeded:</strong> Fuel amount (₹{parsedAmount.toFixed(2)}) exceeds remaining credit limit (₹{availableCredit.toFixed(2)}).
                </span>
              </div>
            )}

            {/* Product Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Fuel Product
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['PETROL', 'DIESEL', 'OIL'] as ProductType[]).map(prod => (
                  <button
                    key={prod}
                    type="button"
                    onClick={() => handleProductChange(prod)}
                    className={`py-2 px-3 rounded-2xl text-xs font-black transition-all border ${
                      productType === prod
                        ? 'bg-blue-50 border-blue-400 text-blue-800 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div>{prod}</div>
                    <div className="text-[10px] font-mono-numbers font-normal opacity-80">
                      ₹{pricing[prod].toFixed(2)}/L
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Liters & Amount inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Liters Dispensed
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  required
                  placeholder="0.00"
                  value={liters}
                  onChange={e => handleLitersChange(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-2xl px-3 py-2 text-sm font-mono-numbers font-bold text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Total Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="₹0.00"
                  value={totalAmount}
                  onChange={e => handleAmountChange(e.target.value)}
                  className={`w-full bg-white border rounded-2xl px-3 py-2 text-sm font-mono-numbers font-black focus:outline-none shadow-sm ${
                    isLimitExceeded ? 'border-rose-500 text-rose-700' : 'border-slate-300 text-slate-900 focus:border-blue-500'
                  }`}
                />
              </div>
            </div>

            {/* Vehicle Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Vehicle Plate Number (Optional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. TN-45-A-1234"
                  value={vehicleNumber}
                  onChange={e => setVehicleNumber(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-2xl pl-10 pr-3 py-2 text-xs font-mono-numbers uppercase text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm"
                />
                <Car className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              </div>
            </div>

            {/* Live Duty Cashier Attribution Badge */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-center justify-between">
              <span>Attendant Attribution:</span>
              <strong className="text-slate-900 font-bold">{currentUser?.fullName || activeDuty?.cashierName}</strong>
            </div>

            {/* Submit & Close Buttons */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedCustomerId || !liters || !totalAmount || isLimitExceeded}
                className={`w-2/3 py-3 rounded-2xl text-white font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 ${
                  isLimitExceeded
                    ? 'bg-rose-500 cursor-not-allowed opacity-75'
                    : 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 disabled:opacity-50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isSubmitting ? 'Recording Slip...' : isLimitExceeded ? 'Credit Limit Exceeded' : 'Record Credit Fuel Slip'}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
