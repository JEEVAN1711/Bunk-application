import React, { useState, useEffect } from 'react';
import { useDuty } from '../context/DutyContext';
import { useAuth } from '../context/AuthContext';
import { CreditEntry, PaymentEntry, ExpenseEntry } from '../types';
import { db } from '../db/db';
import {
  Fuel,
  Banknote,
  Plus,
  Clock,
  CheckCircle2,
  Receipt,
  Car,
  TrendingDown,
  Trash2,
  Coffee,
  Sparkles,
  Lock,
  UserPlus
} from 'lucide-react';
import { CreditModal } from '../components/CreditModal';
import { PaymentModal } from '../components/PaymentModal';
import { ExpenseModal } from '../components/ExpenseModal';

export const CashierPortal: React.FC = () => {
  const { activeDuty, pricing, deleteExpense } = useDuty();
  const { currentUser } = useAuth();

  const [shiftCredits, setShiftCredits] = useState<CreditEntry[]>([]);
  const [shiftPayments, setShiftPayments] = useState<PaymentEntry[]>([]);
  const [shiftExpenses, setShiftExpenses] = useState<ExpenseEntry[]>([]);
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);

  const loadShiftData = async () => {
    if (activeDuty) {
      const credits = await db.creditEntries.where('dutyId').equals(activeDuty.id).reverse().toArray();
      const payments = await db.paymentEntries.where('dutyId').equals(activeDuty.id).reverse().toArray();
      const expenses = await db.expenseEntries.where('dutyId').equals(activeDuty.id).reverse().toArray();
      setShiftCredits(credits);
      setShiftPayments(payments);
      setShiftExpenses(expenses);
    }
  };

  useEffect(() => {
    loadShiftData();
    const interval = setInterval(loadShiftData, 2000);
    return () => clearInterval(interval);
  }, [activeDuty]);

  const totalCreditInShift = shiftCredits.reduce((s, c) => s + (c.totalAmount || 0), 0);
  const totalPaymentInShift = shiftPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalExpenseInShift = shiftExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  const handleDeleteExpense = async (id: string, title: string) => {
    if (confirm(`Remove expense "${title}"?`)) {
      await deleteExpense(id);
      await loadShiftData();
    }
  };

  const isAdmin = currentUser?.role === 'ADMIN';
  const isAssignedCashier = Boolean(
    currentUser && (
      currentUser.role === 'ADMIN' ||
      currentUser.id === activeDuty?.cashierId ||
      currentUser.id === activeDuty?.supportCashierId ||
      (currentUser.fullName && activeDuty?.cashierName && currentUser.fullName.toLowerCase().trim() === activeDuty.cashierName.toLowerCase().trim()) ||
      (currentUser.fullName && activeDuty?.supportCashierName && currentUser.fullName.toLowerCase().trim() === activeDuty.supportCashierName.toLowerCase().trim()) ||
      (currentUser.username && activeDuty?.cashierName && currentUser.username.toLowerCase().trim() === activeDuty.cashierName.toLowerCase().trim()) ||
      (currentUser.phone && (activeDuty as any)?.cashierPhone && currentUser.phone.replace(/\D/g, '') === (activeDuty as any).cashierPhone?.replace(/\D/g, ''))
    )
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Shift Header */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-200 shadow-md bg-white/95 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-xs font-black text-emerald-700 uppercase tracking-widest bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Pump Attendant & Cashier Portal
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {activeDuty ? activeDuty.shiftNumber : 'Duty Standby'}
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Logged in as: <strong className="text-slate-900">{currentUser?.fullName}</strong> ({currentUser?.role})
              {activeDuty && (
                <> | Assigned Lead: <strong className="text-blue-700">{activeDuty.cashierName}</strong></>
              )}
              {activeDuty?.supportCashierName && (
                <> | Support: <strong className="text-indigo-700">{activeDuty.supportCashierName}</strong></>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl shadow-sm">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-slate-500 font-medium">Shift Start:</span>
              <span className="text-xs font-black font-mono-numbers text-slate-900">
                {activeDuty ? new Date(activeDuty.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Area: Admin vs Standby vs Unassigned vs Assigned Cashier */}
        {isAdmin ? (
          <div className="mt-6 p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-300 flex-shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-xs sm:text-sm text-slate-900">Admin Mode Restricted</h4>
                <p className="text-xs text-slate-600">
                  Credit slips and shift daily expenses are <strong>restricted to on-duty Cashiers</strong>. Admin is authorized to start shifts, enroll customers, and manage pump meters.
                </p>
              </div>
            </div>
            <button
              onClick={() => setCreditModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm whitespace-nowrap self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>Enroll New Customer</span>
            </button>
          </div>
        ) : !activeDuty ? (
          /* Standby Alert when Admin has not started the shift */
          <div className="mt-6 p-5 rounded-3xl bg-amber-50 border-2 border-amber-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center flex-shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base text-amber-950">
                  Shift Standby - Waiting for Admin to Start Shift
                </h3>
                <p className="text-xs text-amber-800 mt-0.5 max-w-xl">
                  Credit slip entry and daily expenses are <strong>locked</strong> until the Station Admin opens a new duty shift. Once the Admin starts the shift, this screen will unlock automatically in real-time.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-200/70 border border-amber-300 text-amber-900 text-xs font-bold whitespace-nowrap self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              Waiting for Admin
            </div>
          </div>
        ) : !isAssignedCashier ? (
          /* Alert when shift is in progress but assigned to another cashier */
          <div className="mt-6 p-5 rounded-3xl bg-slate-100 border-2 border-slate-300 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-slate-200 border border-slate-300 text-slate-700 flex items-center justify-center flex-shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base text-slate-900">
                  Shift Assigned to: {activeDuty.cashierName}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
                  Active duty <strong>{activeDuty.shiftNumber}</strong> is currently assigned to <strong className="text-blue-700">{activeDuty.cashierName}</strong>{activeDuty.supportCashierName ? ` and ${activeDuty.supportCashierName}` : ''}. You ({currentUser?.fullName}) are on standby. Credit slips and daily expenses are only enabled for the assigned cashier.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold whitespace-nowrap self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              Standby Cashier
            </div>
          </div>
        ) : (
          /* Big Action Touch Buttons for the assigned cashier on duty */
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Button 1: Credit Slip */}
            <button
              onClick={() => setCreditModalOpen(true)}
              className="p-5 rounded-3xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-black text-left transition-all shadow-md flex items-center justify-between group active:scale-[0.98]"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Fuel className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-base sm:text-lg">Record Credit Slip</div>
                  <div className="text-xs text-sky-100 font-normal">Diesel / Petrol / Oil Fuel Entry</div>
                </div>
              </div>
              <Plus className="w-6 h-6 text-sky-100 group-hover:rotate-90 transition-transform duration-200" />
            </button>

            {/* Button 2: Daily Cost / Shift Expense */}
            <button
              onClick={() => setExpenseModalOpen(true)}
              className="p-5 rounded-3xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-left transition-all shadow-md flex items-center justify-between group active:scale-[0.98]"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Receipt className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-base sm:text-lg">Record Daily Cost / Expense</div>
                  <div className="text-xs text-amber-100 font-normal">Tea, Gen Fuel, Repairs (Sub from Handover)</div>
                </div>
              </div>
              <Plus className="w-6 h-6 text-amber-100 group-hover:rotate-90 transition-transform duration-200" />
            </button>
          </div>
        )}
      </div>

      {/* Shift Live Statistics (3 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Credit Card */}
        <div className="glass-panel rounded-3xl p-5 border border-sky-200 bg-white/95 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-sky-700">
            <span>Credit Issued This Shift</span>
            <Fuel className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-sky-900 font-mono-numbers">
            ₹{totalCreditInShift.toFixed(2)}
          </p>
          <p className="text-[11px] text-slate-500 font-medium">
            {shiftCredits.length} slips recorded
          </p>
        </div>

        {/* Expense Card */}
        <div className="glass-panel rounded-3xl p-5 border border-amber-200 bg-white/95 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-amber-700">
            <span>Daily Costs / Expenses</span>
            <Receipt className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-900 font-mono-numbers">
            ₹{totalExpenseInShift.toFixed(2)}
          </p>
          <p className="text-[11px] text-amber-800 font-medium flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
            <span>Subtracted from Cash Handover</span>
          </p>
        </div>

        {/* Payments Card */}
        <div className="glass-panel rounded-3xl p-5 border border-emerald-200 bg-white/95 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700">
            <span>Debt Payments Cleared</span>
            <Banknote className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-900 font-mono-numbers">
            ₹{totalPaymentInShift.toFixed(2)}
          </p>
          <p className="text-[11px] text-slate-500 font-medium">
            {shiftPayments.length} payments collected
          </p>
        </div>
      </div>

      {/* Shift Transactions Activity Stream */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-200 bg-white/95 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-base text-slate-900">Live Shift Entry Stream</h3>
          <span className="text-xs text-slate-500 font-mono-numbers font-bold">
            {shiftCredits.length + shiftPayments.length + shiftExpenses.length} total entries
          </span>
        </div>

        <div className="space-y-2.5">
          {shiftCredits.length === 0 && shiftPayments.length === 0 && shiftExpenses.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">
              No credit, expense, or payment entries recorded in this shift yet. Use the buttons above to record.
            </p>
          ) : (
            <>
              {/* Daily Shift Expenses */}
              {shiftExpenses.map(e => (
                <div
                  key={e.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 hover:border-amber-300 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-300 shadow-sm flex-shrink-0">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-slate-900">{e.title}</span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                          {e.category.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {e.notes ? `Note: ${e.notes} | ` : ''}Recorded by: {e.cashierName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-black text-amber-800 font-mono-numbers">
                        -₹{e.amount.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteExpense(e.id, e.title)}
                      title="Delete Expense Entry"
                      className="p-1.5 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Credit Entries */}
              {shiftCredits.map(c => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-sky-50/60 border border-sky-200 hover:border-sky-300 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center border border-sky-300 shadow-sm flex-shrink-0">
                      <Fuel className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-slate-900">{c.customerName}</span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
                          {c.productType}
                        </span>
                        {c.vehicleNumber && (
                          <span className="text-[10px] text-slate-600 font-mono-numbers flex items-center gap-0.5">
                            <Car className="w-3 h-3 text-slate-500" />
                            {c.vehicleNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {c.liters.toFixed(2)} Liters @ ₹{c.ratePerLiter.toFixed(2)} | Attendant: {c.cashierName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-sky-800 font-mono-numbers">
                      +₹{c.totalAmount.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}

              {/* Payment Entries */}
              {shiftPayments.map(p => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200 hover:border-emerald-300 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-300 shadow-sm flex-shrink-0">
                      <Banknote className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-slate-900">{p.customerName}</span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {p.paymentMethod}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Debt clearance received | Settled by: {p.cashierName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-emerald-800 font-mono-numbers">
                      -₹{p.amount.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreditModal
        isOpen={creditModalOpen}
        onClose={() => {
          setCreditModalOpen(false);
          loadShiftData();
        }}
      />
      <ExpenseModal
        isOpen={expenseModalOpen}
        onClose={() => {
          setExpenseModalOpen(false);
          loadShiftData();
        }}
      />
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          loadShiftData();
        }}
      />
    </div>
  );
};
