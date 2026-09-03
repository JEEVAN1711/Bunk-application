import React, { useState } from 'react';
import { useDuty } from '../context/DutyContext';
import { useAuth } from '../context/AuthContext';
import { ExpenseEntry } from '../types';
import {
  Receipt,
  X,
  CheckCircle2,
  TrendingDown,
  Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose }) => {
  const { activeDuty, recordExpense } = useDuty();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordedExpense, setRecordedExpense] = useState<ExpenseEntry | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || !parsedAmount || parsedAmount <= 0) return;

    if (!activeDuty) {
      alert('Cannot record Expense: No active shift is currently running. Please ask the Station Admin to start the shift first.');
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
      alert(`Unauthorized: Shift ${activeDuty.shiftNumber} is assigned to ${activeDuty.cashierName}. Only the assigned on-duty cashier can record shift expenses.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const liveDutyId = activeDuty.id;
      const liveCashierId = currentUser?.id || activeDuty.cashierId;
      const liveCashierName = currentUser?.fullName || activeDuty.cashierName;

      const created = await recordExpense({
        dutyId: liveDutyId,
        cashierId: liveCashierId,
        cashierName: liveCashierName,
        title: title.trim(),
        category: 'OTHER',
        amount: parsedAmount,
        notes: notes.trim() || undefined
      });

      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 }
      });

      setRecordedExpense(created);
      setTitle('');
      setAmount('');
      setNotes('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-sm">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">Record Daily Shift Expense</h3>
              <p className="text-xs text-slate-500 font-medium">
                Live Attendant: <strong className="text-slate-900">{currentUser?.fullName || activeDuty?.cashierName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setRecordedExpense(null);
              onClose();
            }}
            className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {recordedExpense ? (
          /* Confirmation Screen */
          <div className="p-6 space-y-4 text-center animate-in fade-in">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1.5">
              <CheckCircle2 className="w-8 h-8 text-amber-600 mx-auto" />
              <h4 className="font-black text-sm">Shift Expense Recorded & Deducted!</h4>
              <p className="text-xs text-amber-900">
                <strong>{recordedExpense.title}</strong> — <strong className="font-mono-numbers font-black">₹{recordedExpense.amount.toFixed(2)}</strong>
              </p>
              <p className="text-[11px] text-amber-800">
                This amount will be automatically deducted from your cash handover at shift closing.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRecordedExpense(null)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
              >
                + Add Another Cost
              </button>
              <button
                type="button"
                onClick={() => {
                  setRecordedExpense(null);
                  onClose();
                }}
                className="w-1/2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-sm"
              >
                Done & Close
              </button>
            </div>
          </div>
        ) : isAdmin ? (
          <div className="p-6 space-y-4 bg-white text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
              <Lock className="w-6 h-6" />
            </div>
            <h4 className="font-black text-base text-slate-900">Admin Action Restricted</h4>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              Shift daily expenses can only be logged by <strong>on-duty Cashiers / Pump Attendants</strong> during active shifts and deducted from their cash handover.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all"
            >
              Close
            </button>
          </div>
        ) : (
          /* Simplified Single Purpose Expense Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Purpose of Expense */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Purpose of Expense / Reason
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Staff tea, Generator fuel, Cleaning supplies, Repair..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-sm font-semibold"
              />
            </div>

            {/* Expense Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Amount Paid (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                placeholder="₹0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-2.5 text-base font-mono-numbers font-black text-amber-700 focus:outline-none focus:border-amber-500 shadow-sm"
              />
            </div>

            {/* Notes / Receipt details */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Bill / Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Bill #102 / Paid cash"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-2xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-sm"
              />
            </div>

            {/* Subtraction Notice */}
            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start gap-2.5 text-amber-900 text-xs">
              <TrendingDown className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="leading-tight">
                <strong>Automatic Deduction:</strong> This cost is subtracted from your shift sales so you only handover the remaining cash balance.
              </p>
            </div>

            {/* Action Buttons */}
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
                disabled={isSubmitting || !title.trim() || !amount}
                className="w-2/3 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving...' : 'Record Shift Cost'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
