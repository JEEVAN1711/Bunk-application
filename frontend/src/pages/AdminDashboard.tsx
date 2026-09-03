import React, { useState, useEffect } from 'react';
import { useDuty } from '../context/DutyContext';
import { useAuth } from '../context/AuthContext';
import { CreditEntry, PaymentEntry, Customer, FuelReading, TankStockEntry } from '../types';
import { db } from '../db/db';
import {
  Fuel,
  CreditCard,
  Banknote,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  PlayCircle,
  CheckCircle2,
  TrendingUp,
  Clock,
  Send,
  Plus,
  Receipt,
  FileCheck,
  Database,
  Cloud,
  Gauge,
  Layers,
  Droplets,
  Lock,
  Unlock,
  ShieldAlert
} from 'lucide-react';
import { syncEngine } from '../sync/syncEngine';
import { CreditModal } from '../components/CreditModal';
import { PaymentModal } from '../components/PaymentModal';
import { PaymentRequestModal } from '../components/PaymentRequestModal';
import { NewDutyModal } from '../components/NewDutyModal';
import { CloudDatabaseModal } from '../components/CloudDatabaseModal';
import { PumpMetersModal } from '../components/PumpMetersModal';
import { DailyStockModal } from '../components/DailyStockModal';

export const AdminDashboard: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const { activeDuty, pricing } = useDuty();
  const { currentUser } = useAuth();

  const [todayCredits, setTodayCredits] = useState<CreditEntry[]>([]);
  const [todayPayments, setTodayPayments] = useState<PaymentEntry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [readings, setReadings] = useState<FuelReading[]>([]);
  const [tanks, setTanks] = useState<TankStockEntry[]>([]);
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [newDutyModalOpen, setNewDutyModalOpen] = useState(false);
  const [cloudModalOpen, setCloudModalOpen] = useState(false);
  const [metersModalOpen, setMetersModalOpen] = useState(false);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [targetCustomer, setTargetCustomer] = useState<Customer | undefined>();

  const loadData = async () => {
    const credits = await db.creditEntries.toArray();
    const payments = await db.paymentEntries.toArray();
    const custs = await db.customers.toArray();
    const tList = await db.tankStocks.toArray();
    setTodayCredits(credits);
    setTodayPayments(payments);
    setCustomers(custs);
    setTanks(tList);

    if (activeDuty) {
      const shiftReadings = await db.fuelReadings.where('dutyId').equals(activeDuty.id).toArray();
      setReadings(shiftReadings);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [activeDuty]);

  // Aggregate Metrics
  const totalCreditOutstanding = customers.reduce((sum, c) => sum + (c.currentBalance || 0), 0);
  const totalCreditIssued = todayCredits.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
  const totalPaymentsCollected = todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalFuelLitersDispensed = readings.reduce((sum, r) => sum + (r.totalLiters || 0), 0);
  const totalFuelGrossAmount = readings.reduce((sum, r) => sum + (r.totalAmount || 0), 0);

  const handleSendReminder = (cust: Customer) => {
    setTargetCustomer(cust);
    setRequestModalOpen(true);
  };

  const handleToggleCustomerAccess = async (cust: Customer) => {
    const isCurrentlyLocked = cust.accessStatus === 'LOCKED';
    const newStatus = isCurrentlyLocked ? 'ACTIVE' : 'LOCKED';
    const lockReason = isCurrentlyLocked ? undefined : 'Ledger Audit & Transaction Verification in Progress';

    const updatedCust: Customer = {
      ...cust,
      accessStatus: newStatus,
      lockReason: lockReason,
      synced: false
    };

    await db.customers.put(updatedCust);
    await syncEngine.enqueue('CUSTOMER', 'CREATE', cust.id, updatedCust);
    await loadData();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/95 p-6 rounded-3xl border border-slate-200 shadow-lg relative overflow-hidden">
        {/* Decorative Bharat Petroleum brand bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-amber-500 to-emerald-500"></div>

        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-widest bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Live Station Control
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Admin & Owner Command Center
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Welcome back, <span className="font-bold text-slate-900">{currentUser?.fullName}</span>. Real-time station monitoring & cloud sync active.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setStockModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Layers className="w-4 h-4 text-purple-600" />
            <span>Daily Tank Stock & Dip</span>
          </button>
          <button
            onClick={() => setCloudModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Database className="w-4 h-4 text-indigo-600" />
            <span>See Cloud Database</span>
          </button>
          <button
            onClick={() => setPaymentModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Banknote className="w-4 h-4 text-emerald-600" />
            <span>Clear Customer Repayment</span>
          </button>
          <button
            onClick={() => onNavigate('staff')}
            className="px-4 py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Clock className="w-4 h-4 text-sky-600" />
            <span>Monthly Staff Report</span>
          </button>
          <button
            onClick={() => setMetersModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Gauge className="w-4 h-4 text-blue-600" />
            <span>Pump Meter Readings</span>
          </button>
          {activeDuty ? (
            <button
              onClick={() => onNavigate('closing')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-md"
            >
              <FileCheck className="w-4 h-4" />
              <span>Close Shift & Reconcile</span>
            </button>
          ) : (
            <button
              onClick={() => setNewDutyModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-md"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Start New Duty Shift</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Credit Outstanding */}
        <div className="glass-card rounded-2xl p-5 border border-rose-500/20 relative overflow-hidden">
          <div className="absolute right-3 top-3 w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            Total Credit Outstanding
          </p>
          <h3 className="text-2xl font-black text-rose-400 font-mono-numbers">
            ₹{totalCreditOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h3>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>Across {customers.filter(c => c.currentBalance > 0).length} active credit customers</span>
          </div>
        </div>

        {/* Total Fuel Dispensed (Active Shift) */}
        <div className="glass-card rounded-2xl p-5 border border-sky-500/20 relative overflow-hidden">
          <div className="absolute right-3 top-3 w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
            <Fuel className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            Active Shift Fuel Sales
          </p>
          <h3 className="text-2xl font-black text-sky-400 font-mono-numbers">
            ₹{totalFuelGrossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h3>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-sky-300/80">
            <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
            <span>{totalFuelLitersDispensed.toFixed(2)} Total Liters Dispensed</span>
          </div>
        </div>

        {/* Payments Collected */}
        <div className="glass-card rounded-2xl p-5 border border-emerald-500/20 relative overflow-hidden">
          <div className="absolute right-3 top-3 w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Banknote className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            Payments Recovered
          </p>
          <h3 className="text-2xl font-black text-emerald-400 font-mono-numbers">
            ₹{totalPaymentsCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h3>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-400/80">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{todayPayments.length} Payment Transactions</span>
          </div>
        </div>

        {/* Credit Given */}
        <div className="glass-card rounded-2xl p-5 border border-amber-500/20 relative overflow-hidden">
          <div className="absolute right-3 top-3 w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            Total Credit Disbursed
          </p>
          <h3 className="text-2xl font-black text-amber-400 font-mono-numbers">
            ₹{totalCreditIssued.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h3>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-400/80">
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
            <span>{todayCredits.length} Credit Slips Issued</span>
          </div>
        </div>
      </div>

      {/* Shift End Fuel Stock (ATG & Tank Dip - Admin Only) */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-200 bg-white/95 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-sm sm:text-base">Shift-End Fuel Stock (ATG & Tank Dip)</h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  Admin Only
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Recorded at Day Shift End and Night Shift End
              </p>
            </div>
          </div>
          <button
            onClick={() => setStockModalOpen(true)}
            className="px-4 py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-sm flex items-center gap-1.5 transition-all self-start sm:self-auto"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Record Shift Stock</span>
          </button>
        </div>

        {tanks.length > 0 ? (
          (() => {
            const latest = tanks[0];
            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Latest Record: <strong className="text-slate-900">{latest.date}</strong> ({latest.shiftName || latest.period})</span>
                  <span className="text-[11px] font-mono-numbers">Recorded by: {latest.recordedByAdminName}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* MS Petrol Card */}
                  <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-sky-950 uppercase">MS (Petrol) Stock</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                        ATG: {latest.msAtgDipLevel}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">ATG Stock</span>
                        <p className="text-2xl font-black font-mono-numbers text-sky-900">
                          {latest.msAtgStock?.toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-500">Liters</span>
                        </p>
                      </div>
                      {latest.msTankDipStock && (
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Tank Dip ({latest.msTankDipLevel || 'Dip'})</span>
                          <p className="text-sm font-bold font-mono-numbers text-slate-700">
                            {latest.msTankDipStock.toLocaleString('en-IN')} L
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* HSD Diesel Card */}
                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-amber-950 uppercase">HSD (Diesel) Stock</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        ATG: {latest.hsdAtgDipLevel}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between pt-1">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">ATG Stock</span>
                        <p className="text-2xl font-black font-mono-numbers text-amber-900">
                          {latest.hsdAtgStock?.toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-500">Liters</span>
                        </p>
                      </div>
                      {latest.hsdTankDipStock && (
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Tank Dip ({latest.hsdTankDipLevel || 'Dip'})</span>
                          <p className="text-sm font-bold font-mono-numbers text-slate-700">
                            {latest.hsdTankDipStock.toLocaleString('en-IN')} L
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          <p className="text-xs text-slate-500 text-center py-4">
            No stock records yet. Click "Record Shift Stock" above to note ATG and Tank dip levels.
          </p>
        )}
      </div>

      {/* Active Shift Monitor & Pump Readings Panel */}
      {activeDuty ? (
        <div className="glass-panel rounded-2xl p-6 border border-emerald-800/40 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
              <div>
                <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
                  Active Shift: {activeDuty.shiftNumber}
                </h3>
                <p className="text-xs text-slate-400">
                  Lead Cashier: <span className="text-emerald-300 font-semibold">{activeDuty.cashierName}</span>
                  {activeDuty.supportCashierName && (
                    <> | Support: <span className="text-sky-300 font-semibold">{activeDuty.supportCashierName}</span></>
                  )}
                  {' '}| Started: {new Date(activeDuty.startTime).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
              <button
                onClick={() => setMetersModalOpen(true)}
                className="px-4 py-2 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Gauge className="w-4 h-4 text-blue-600" />
                <span>Enter Before-Shift Meters</span>
              </button>
              <button
                onClick={() => onNavigate('closing')}
                className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 border border-slate-300 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <FileCheck className="w-4 h-4 text-amber-600" />
                <span>Perform Duty Closing Wizard</span>
              </button>
            </div>
          </div>

          {/* Pump Meter Readings Grid with Fuel Categorization */}
          <div className="mt-5 space-y-4">
            {/* 4 Petrol Pumps */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                  Petrol Dispensers (4 Pumps)
                </span>
                <span className="text-[11px] text-slate-400 font-mono-numbers">Rate: ₹{pricing.PETROL.toFixed(2)}/L</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {readings.filter(r => r.productType === 'PETROL').map(r => (
                  <div key={r.id} className="bg-slate-900/80 rounded-xl p-3.5 border border-slate-800/80 hover:border-sky-800/50 transition-all">
                    <p className="text-xs font-bold text-slate-200 truncate">{r.pumpNumber}</p>
                    <div className="flex items-center justify-between text-[11px] font-mono-numbers text-slate-400 bg-slate-950/80 px-2 py-1 rounded my-2">
                      <span>Start: {r.startReading.toFixed(1)}</span>
                      <span>End: {r.endReading.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/50">
                      <span className="text-slate-400">{r.totalLiters.toFixed(2)} L</span>
                      <span className="text-sky-300 font-bold font-mono-numbers">₹{r.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4 Diesel Pumps */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Diesel Dispensers (4 Pumps)
                </span>
                <span className="text-[11px] text-slate-400 font-mono-numbers">Rate: ₹{pricing.DIESEL.toFixed(2)}/L</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {readings.filter(r => r.productType === 'DIESEL').map(r => (
                  <div key={r.id} className="bg-slate-900/80 rounded-xl p-3.5 border border-slate-800/80 hover:border-amber-800/50 transition-all">
                    <p className="text-xs font-bold text-slate-200 truncate">{r.pumpNumber}</p>
                    <div className="flex items-center justify-between text-[11px] font-mono-numbers text-slate-400 bg-slate-950/80 px-2 py-1 rounded my-2">
                      <span>Start: {r.startReading.toFixed(1)}</span>
                      <span>End: {r.endReading.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/50">
                      <span className="text-slate-400">{r.totalLiters.toFixed(2)} L</span>
                      <span className="text-amber-300 font-bold font-mono-numbers">₹{r.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Oil Dispenser */}
            {readings.filter(r => r.productType === 'OIL').length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                    Lubricant Counter (1 Dispenser)
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono-numbers">Rate: ₹{pricing.OIL.toFixed(2)}/L</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {readings.filter(r => r.productType === 'OIL').map(r => (
                    <div key={r.id} className="bg-slate-900/80 rounded-xl p-3.5 border border-slate-800/80 hover:border-purple-800/50 transition-all">
                      <p className="text-xs font-bold text-slate-200 truncate">{r.pumpNumber}</p>
                      <div className="flex items-center justify-between text-[11px] font-mono-numbers text-slate-400 bg-slate-950/80 px-2 py-1 rounded my-2">
                        <span>Start: {r.startReading.toFixed(1)}</span>
                        <span>End: {r.endReading.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/50">
                        <span className="text-slate-400">{r.totalLiters.toFixed(2)} L</span>
                        <span className="text-purple-300 font-bold font-mono-numbers">₹{r.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 text-center space-y-3">
          <Clock className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">No Shift Currently Active</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Assign staff and launch a new duty shift to track live fuel dispensing and cashier reconciliation.
          </p>
          <button
            onClick={() => setNewDutyModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all shadow-lg"
          >
            Launch Shift Now
          </button>
        </div>
      )}

      {/* Customer Credit Ledgers & Outstanding Payment Triggers */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-slate-100">Customer Credit Balances</h3>
            <p className="text-xs text-slate-400">Send instant payment requests to customers with balances</p>
          </div>
          <button
            onClick={() => onNavigate('customers')}
            className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
          >
            View All Passbooks &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3 px-3">Customer / Fleet</th>
                <th className="pb-3 px-3">Phone</th>
                <th className="pb-3 px-3 text-center">Portal Access</th>
                <th className="pb-3 px-3 text-right">Total Credit</th>
                <th className="pb-3 px-3 text-right">Total Paid</th>
                <th className="pb-3 px-3 text-right">Outstanding Balance</th>
                <th className="pb-3 px-3 text-center">Admin Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {customers.map(c => {
                const isLocked = c.accessStatus === 'LOCKED';
                return (
                  <tr key={c.id} className="hover:bg-slate-900/40 transition-all">
                    <td className="py-3 px-3 font-semibold text-slate-200">
                      <div className="flex items-center gap-2">
                        <span>{c.name}</span>
                        {isLocked && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            Audit Lock
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono-numbers">{c.phoneNumber}</td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleToggleCustomerAccess(c)}
                        title={isLocked ? 'Click to Open Customer Portal Access' : 'Click to Lock Customer Portal for Data Audit/Correction'}
                        className={`px-2 py-1 rounded-full text-[10px] font-extrabold border transition-all inline-flex items-center gap-1 shadow-sm ${
                          isLocked
                            ? 'bg-rose-950 text-rose-300 border-rose-700 hover:bg-rose-900'
                            : c.accessStatus === 'PENDING'
                            ? 'bg-amber-950 text-amber-300 border-amber-700 hover:bg-amber-900'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-700 hover:bg-emerald-900'
                        }`}
                      >
                        {isLocked ? (
                          <>
                            <Lock className="w-3 h-3 text-rose-400" />
                            <span>LOCKED (Audit)</span>
                          </>
                        ) : c.accessStatus === 'PENDING' ? (
                          <>
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>PENDING (Approve)</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3 h-3 text-emerald-400" />
                            <span>OPEN (Active)</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-right font-mono-numbers text-slate-300">
                      ₹{c.totalCredit.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-numbers text-emerald-400">
                      ₹{c.totalPaid.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-numbers font-bold">
                      <span className={c.currentBalance > 0 ? 'text-rose-400' : 'text-slate-400'}>
                        ₹{c.currentBalance.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Lock / Unlock Toggle Action */}
                        <button
                          onClick={() => handleToggleCustomerAccess(c)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1 ${
                            isLocked
                              ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-700 text-emerald-300'
                              : 'bg-slate-900 hover:bg-rose-950/60 border-slate-700 hover:border-rose-700 text-slate-300 hover:text-rose-300'
                          }`}
                          title={isLocked ? 'Open Access to Customer' : 'Lock Customer Portal for Correction'}
                        >
                          {isLocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          <span>{isLocked ? 'Open Access' : 'Lock for Audit'}</span>
                        </button>

                        {c.currentBalance > 0 && (
                          <button
                            onClick={() => handleSendReminder(c)}
                            className="px-2.5 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/60 text-amber-300 text-[11px] font-bold transition-all flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            Alert
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setTargetCustomer(c);
                            setCreditModalOpen(true);
                          }}
                          className="px-2 py-1 rounded-lg bg-sky-950/60 hover:bg-sky-900/60 border border-sky-800/60 text-sky-300 text-[11px] font-bold transition-all"
                        >
                          + Credit
                        </button>
                        <button
                          onClick={() => {
                            setTargetCustomer(c);
                            setPaymentModalOpen(true);
                          }}
                          className="px-2 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-300 text-[11px] font-bold transition-all"
                        >
                          + Pay
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <CreditModal
        isOpen={creditModalOpen}
        onClose={() => {
          setCreditModalOpen(false);
          setTargetCustomer(undefined);
          loadData();
        }}
        preselectedCustomerId={targetCustomer?.id}
      />
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setTargetCustomer(undefined);
          loadData();
        }}
        preselectedCustomerId={targetCustomer?.id}
      />
      <PaymentRequestModal
        isOpen={requestModalOpen}
        onClose={() => {
          setRequestModalOpen(false);
          setTargetCustomer(undefined);
        }}
        targetCustomer={targetCustomer}
      />
      <NewDutyModal
        isOpen={newDutyModalOpen}
        onClose={() => {
          setNewDutyModalOpen(false);
          loadData();
        }}
      />
      <CloudDatabaseModal
        isOpen={cloudModalOpen}
        onClose={() => setCloudModalOpen(false)}
      />
      <PumpMetersModal
        isOpen={metersModalOpen}
        onClose={() => {
          setMetersModalOpen(false);
          loadData();
        }}
      />
      <DailyStockModal
        isOpen={stockModalOpen}
        onClose={() => {
          setStockModalOpen(false);
          loadData();
        }}
      />
    </div>
  );
};
