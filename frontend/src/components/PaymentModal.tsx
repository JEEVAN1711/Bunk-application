import React, { useState, useEffect } from 'react';
import { useDuty } from '../context/DutyContext';
import { useAuth } from '../context/AuthContext';
import { Customer, PaymentMethod, PaymentEntry } from '../types';
import { db } from '../db/db';
import {
  Banknote,
  X,
  CheckCircle2,
  QrCode,
  CreditCard,
  Building2,
  Lock,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedCustomerId?: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  preselectedCustomerId
}) => {
  const { activeDuty, recordPayment } = useDuty();
  const { currentUser } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordedPayment, setRecordedPayment] = useState<{
    entry: PaymentEntry;
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
    }
  }, [isOpen, preselectedCustomerId]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const currentBalance = selectedCustomer?.currentBalance || 0;
  const enteredAmount = parseFloat(amount) || 0;
  const isZeroBalance = currentBalance <= 0;
  const isExceedingBalance = enteredAmount > currentBalance;
  const canSubmit = !isZeroBalance && enteredAmount > 0 && !isExceedingBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !enteredAmount || enteredAmount <= 0) return;
    if (isExceedingBalance) {
      alert(`Amount exceeds outstanding balance of ₹${currentBalance.toFixed(2)}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const remainingBal = Math.max(0, currentBalance - enteredAmount);
      const liveDutyId = activeDuty ? activeDuty.id : 'counter-direct';
      const liveCashierId = currentUser?.id || activeDuty?.cashierId || 'admin';
      const liveCashierName = currentUser?.fullName || activeDuty?.cashierName || 'Admin';

      const newPayment = await recordPayment({
        customerId: selectedCustomerId,
        customerName: selectedCustomer?.name || 'Customer',
        dutyId: liveDutyId,
        cashierId: liveCashierId,
        cashierName: liveCashierName,
        amount: enteredAmount,
        paymentMethod,
        referenceNo: referenceNo.trim() || undefined,
        notes: notes.trim() || undefined
      });

      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.7 }
      });

      setRecordedPayment({
        entry: newPayment,
        newBalance: remainingBal,
        customerPhone: selectedCustomer?.phoneNumber
      });

      setAmount('');
      setReferenceNo('');
      setNotes('');
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
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-sm">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">Clear Customer Credit Repayment</h3>
              <p className="text-xs text-slate-500 font-medium">Authorized Admin Debt Settlement & Ledger Clearance</p>
            </div>
          </div>
          <button
            onClick={() => {
              setRecordedPayment(null);
              onClose();
            }}
            className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {recordedPayment ? (
          /* Payment Settlement Receipt Screen */
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1.5 animate-in fade-in">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="font-black text-emerald-950 text-base">Payment Recorded Successfully!</h4>
              <p className="text-xs text-emerald-800">
                Received <strong className="font-mono-numbers font-black">₹{recordedPayment.entry.amount.toFixed(2)}</strong> from <strong>{recordedPayment.entry.customerName}</strong>
              </p>
              <div className="mt-2 pt-2 border-t border-emerald-200 text-xs flex items-center justify-between text-emerald-900">
                <span>Remaining Due Balance:</span>
                <span className="font-black font-mono-numbers text-sm">₹{recordedPayment.newBalance.toFixed(2)}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">Payment Mode:</span>
                <span className="font-bold text-slate-900">{recordedPayment.entry.paymentMethod}</span>
              </div>
              {recordedPayment.entry.referenceNo && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">Ref / UTR No:</span>
                  <span className="font-mono text-slate-900">{recordedPayment.entry.referenceNo}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">Processed By:</span>
                <span className="font-semibold text-slate-900">{recordedPayment.entry.cashierName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">Time:</span>
                <span className="font-mono text-slate-600">{new Date(recordedPayment.entry.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRecordedPayment(null)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer"
              >
                + Record Another
              </button>
              <button
                type="button"
                onClick={() => {
                  setRecordedPayment(null);
                  onClose();
                }}
                className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm cursor-pointer"
              >
                Done & Close
              </button>
            </div>
          </div>
        ) : !isAdmin ? (
          <div className="p-6 space-y-4 bg-white text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
              <Lock className="w-6 h-6" />
            </div>
            <h4 className="font-black text-base text-slate-900">Admin Clearance Required</h4>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              Per station policy, customer debt repayments and ledger settlements must be cleared directly by <strong>Admin / Owner (Jeevan)</strong>. Cashiers are restricted from clearing customer debt.
            </p>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
              Current Session: <strong className="text-slate-900">{currentUser?.fullName}</strong> ({currentUser?.role})
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-900 text-xs font-bold transition-all"
            >
              Understood & Close
            </button>
          </div>
        ) : (
          /* ADMIN PAYMENT REPAYMENT FORM */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Customer Picker */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Select Customer Account
              </label>
              <select
                value={selectedCustomerId}
                onChange={e => {
                  setSelectedCustomerId(e.target.value);
                  setAmount('');
                }}
                className="w-full bg-white border border-slate-300 rounded-2xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-sm font-semibold"
                required
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} — Outstanding: ₹{c.currentBalance.toFixed(2)}
                  </option>
                ))}
              </select>

              {selectedCustomer && (
                <div className={`mt-2 p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
                  isZeroBalance ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}>
                  <span className="font-bold">Current Debt Balance:</span>
                  <span className={`font-mono-numbers font-black text-sm ${isZeroBalance ? 'text-emerald-700' : 'text-rose-600'}`}>
                    ₹{currentBalance.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* ZERO BALANCE NOTIFICATION */}
            {isZeroBalance ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2 animate-in fade-in">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-black text-emerald-950 text-sm">Account Fully Settled (₹0.00 Due)</h4>
                <p className="text-xs text-emerald-800">
                  This customer has no outstanding debt. Repayment amount cannot be paid.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Repayment Amount */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Repayment Amount Cleared (₹)
                    </label>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      Max: ₹{currentBalance.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={currentBalance}
                    required
                    placeholder="₹0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className={`w-full bg-white border rounded-2xl px-3 py-2.5 text-base font-mono-numbers font-black shadow-sm focus:outline-none ${
                      isExceedingBalance ? 'border-rose-500 text-rose-600' : 'border-slate-300 text-emerald-700 focus:border-emerald-500'
                    }`}
                  />
                  {isExceedingBalance && (
                    <p className="text-[11px] text-rose-600 font-bold mt-1">
                      ⚠️ Repayment amount cannot exceed current debt of ₹{currentBalance.toFixed(2)}.
                    </p>
                  )}
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Settlement Payment Method
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER'] as PaymentMethod[]).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        className={`py-2 px-2.5 rounded-2xl text-[11px] font-black transition-all border flex flex-col items-center gap-1 ${
                          paymentMethod === m
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {m === 'CASH' && <Banknote className="w-4 h-4" />}
                        {m === 'UPI' && <QrCode className="w-4 h-4" />}
                        {m === 'CARD' && <CreditCard className="w-4 h-4" />}
                        {m === 'BANK_TRANSFER' && <Building2 className="w-4 h-4" />}
                        <span>{m.replace('_', ' ')}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reference Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    UPI / Bank / Cheque Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UPI-987654321 / Bank Ref"
                    value={referenceNo}
                    onChange={e => setReferenceNo(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-2xl px-3 py-2 text-xs font-mono-numbers text-slate-900 focus:outline-none focus:border-emerald-500 shadow-sm"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Admin Clearance Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Full settlement received by Jeevan"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-2xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-sm"
                  />
                </div>

                {/* Submit Button Disappears if balance is 0 or if amount > balance */}
                {canSubmit && (
                  <div className="pt-2 animate-in fade-in">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{isSubmitting ? 'Clearing Amount...' : 'Clear Customer Debt & Update Ledger'}</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
