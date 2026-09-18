import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Customer, CreditEntry, PaymentEntry, PaymentRequest } from '../types';
import { db } from '../db/db';
import {
  CreditCard,
  Banknote,
  Fuel,
  BellRing,
  CheckCircle2,
  Clock,
  Car,
  Receipt,
  FileText,
  ShieldCheck,
  Lock,
  ShieldAlert,
  ChevronDown,
  Users,
  Download,
  Calendar,
  Filter,
  FileSpreadsheet,
  RotateCcw
} from 'lucide-react';

export const CustomerPortal: React.FC = () => {
  const { currentUser } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(() => {
    return localStorage.getItem('bunk_passbook_selected_customer_id') || '';
  });
  const [credits, setCredits] = useState<CreditEntry[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);

  // Date Range Filtering for Datasheet
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [dateFilterPreset, setDateFilterPreset] = useState<'ALL' | 'THIS_MONTH' | 'LAST_30_DAYS' | 'CUSTOM'>('ALL');

  const isAdmin = currentUser?.role === 'ADMIN';

  const loadCustomerData = async () => {
    const custs = await db.customers.toArray();
    setAllCustomers(custs);

    let activeCust: Customer | null = null;

    // 1. If currently logged in as a CUSTOMER user, strictly lock to their own account by phone
    if (!isAdmin) {
      if (currentUser?.phone) {
        const uDigits = currentUser.phone.replace(/\D/g, '');
        activeCust = custs.find(c => {
          const cDigits = (c.phoneNumber || '').replace(/\D/g, '');
          return cDigits.length >= 8 && uDigits.length >= 8 && (cDigits.includes(uDigits) || uDigits.includes(cDigits));
        }) || null;
      }
    } else {
      // 2. For Admin / Manager: allow viewing selected customer or default to first
      if (selectedCustomerId) {
        activeCust = custs.find(c => c.id === selectedCustomerId) || null;
      }
      if (!activeCust && custs.length > 0) {
        activeCust = custs[0];
        setSelectedCustomerId(custs[0].id);
        localStorage.setItem('bunk_passbook_selected_customer_id', custs[0].id);
      }
    }

    setCustomer(activeCust || null);

    if (activeCust) {
      const cList = await db.creditEntries.where('customerId').equals(activeCust.id).reverse().toArray();
      const pList = await db.paymentEntries.where('customerId').equals(activeCust.id).reverse().toArray();
      const rList = await db.paymentRequests.where('customerId').equals(activeCust.id).reverse().toArray();
      setCredits(cList);
      setPayments(pList);
      setRequests(rList);
    } else {
      setCredits([]);
      setPayments([]);
      setRequests([]);
    }
  };

  const handleSelectCustomer = async (newCustId: string) => {
    if (!isAdmin) return;
    setSelectedCustomerId(newCustId);
    localStorage.setItem('bunk_passbook_selected_customer_id', newCustId);
    const target = allCustomers.find(c => c.id === newCustId);
    if (target) {
      setCustomer(target);
      const cList = await db.creditEntries.where('customerId').equals(target.id).reverse().toArray();
      const pList = await db.paymentEntries.where('customerId').equals(target.id).reverse().toArray();
      const rList = await db.paymentRequests.where('customerId').equals(target.id).reverse().toArray();
      setCredits(cList);
      setPayments(pList);
      setRequests(rList);
    }
  };

  useEffect(() => {
    loadCustomerData();
    const interval = setInterval(loadCustomerData, 3000);
    const handleLiveSync = () => {
      loadCustomerData();
    };
    window.addEventListener('bunk_cloud_synced', handleLiveSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener('bunk_cloud_synced', handleLiveSync);
    };
  }, [currentUser, selectedCustomerId]);

  if (!customer) {
    return (
      <div className="glass-panel rounded-3xl p-12 text-center max-w-lg mx-auto my-12 border border-slate-800 space-y-4">
        <CreditCard className="w-12 h-12 text-slate-500 mx-auto mb-3" />
        <h3 className="font-bold text-slate-200">Customer Profile Not Found</h3>
        <p className="text-xs text-slate-400">
          {isAdmin
            ? 'Please select an authorized customer account to view passbook.'
            : `No registered fuel passbook found linked to phone ${currentUser?.phone || ''}. Please contact Bunk Admin.`}
        </p>
        {allCustomers.length > 0 && isAdmin && (
          <div className="pt-2">
            <select
              onChange={e => handleSelectCustomer(e.target.value)}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded-xl px-4 py-2 text-xs font-bold"
            >
              <option value="">Select a Customer Account...</option>
              {allCustomers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phoneNumber})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  }

  // 1. LOCKED for Admin Reconciliation / Data Correction
  if (customer.accessStatus === 'LOCKED') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        {isAdmin && allCustomers.length > 1 && (
          <div className="w-full max-w-lg mb-3 p-3 rounded-2xl bg-slate-900/90 border border-purple-800/60 flex items-center justify-between gap-3 text-xs">
            <span className="text-purple-300 font-bold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Switch Customer Account:</span>
            </span>
            <div className="relative inline-flex items-center">
              <select
                value={customer?.id || ''}
                onChange={e => handleSelectCustomer(e.target.value)}
                className="appearance-none bg-purple-950/80 text-purple-200 border border-purple-600/50 rounded-xl px-3 py-1 pr-7 text-xs font-bold focus:outline-none cursor-pointer"
              >
                {allCustomers.map(c => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-slate-100">
                    {c.name} ({c.phoneNumber})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-purple-300 absolute right-2 pointer-events-none" />
            </div>
          </div>
        )}
        <div className="glass-panel rounded-3xl p-8 max-w-lg w-full text-center border border-amber-500/40 bg-slate-950/90 shadow-2xl space-y-5 animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center mx-auto shadow-lg shadow-amber-950/50">
            <Lock className="w-8 h-8 text-amber-400 animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/80">
              Audit & Ledger Reconciliation
            </span>
            <h2 className="text-xl font-extrabold text-slate-100">
              Passbook Temporarily Closed for Entry Correction
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Station Admin is currently auditing and adjusting fuel transaction entries for <strong>{customer.name}</strong>. 
              Your digital passbook will reopen automatically once data corrections are finalized.
            </p>
          </div>

          {customer.lockReason && (
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-amber-200/90">
              <span className="font-bold text-slate-400">Admin Note: </span>
              {customer.lockReason}
            </div>
          )}

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2 text-xs">
            <p className="text-slate-400">Need urgent fuel statement or diesel refill?</p>
            <a
              href="tel:+919159054084"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-lg"
            >
              <Fuel className="w-4 h-4" />
              <span>Call Station Admin: +91 91590 54084</span>
            </a>
          </div>

          <p className="text-[10px] text-slate-500">
            Checking status automatically every 3 seconds...
          </p>
        </div>
      </div>
    );
  }

  // 2. PENDING Admin Approval
  if (customer.accessStatus === 'PENDING') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        {isAdmin && allCustomers.length > 1 && (
          <div className="w-full max-w-lg mb-3 p-3 rounded-2xl bg-slate-900/90 border border-purple-800/60 flex items-center justify-between gap-3 text-xs">
            <span className="text-purple-300 font-bold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Switch Customer Account:</span>
            </span>
            <div className="relative inline-flex items-center">
              <select
                value={customer?.id || ''}
                onChange={e => handleSelectCustomer(e.target.value)}
                className="appearance-none bg-purple-950/80 text-purple-200 border border-purple-600/50 rounded-xl px-3 py-1 pr-7 text-xs font-bold focus:outline-none cursor-pointer"
              >
                {allCustomers.map(c => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-slate-100">
                    {c.name} ({c.phoneNumber})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-purple-300 absolute right-2 pointer-events-none" />
            </div>
          </div>
        )}
        <div className="glass-panel rounded-3xl p-8 max-w-lg w-full text-center border border-sky-500/40 bg-slate-950/90 shadow-2xl space-y-5 animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-3xl bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center justify-center mx-auto shadow-lg shadow-sky-950/50">
            <Clock className="w-8 h-8 text-sky-400 animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full bg-sky-950/80 text-sky-300 border border-sky-800/80">
              Verification Required
            </span>
            <h2 className="text-xl font-extrabold text-slate-100">
              Account Pending Admin Approval
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your customer passbook account for <strong>{customer.name}</strong> is awaiting authorization from Station Admin.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2 text-xs">
            <p className="text-slate-400">Contact Admin for immediate activation:</p>
            <a
              href="tel:+919159054084"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg"
            >
              <span>Contact Station Manager: +91 91590 54084</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Combined Passbook Ledger sorted chronologically
  interface LedgerItem {
    id: string;
    type: 'CREDIT' | 'PAYMENT';
    date: string;
    details: string;
    vehicle?: string;
    creditAmount?: number;
    paymentAmount?: number;
  }

  const ledgerItems: LedgerItem[] = [
    ...credits.map(c => ({
      id: c.id,
      type: 'CREDIT' as const,
      date: c.timestamp,
      details: `${c.productType} (${c.liters.toFixed(2)} L @ ₹${c.ratePerLiter.toFixed(2)})`,
      vehicle: c.vehicleNumber,
      creditAmount: c.totalAmount
    })),
    ...payments.map(p => ({
      id: p.id,
      type: 'PAYMENT' as const,
      date: p.timestamp,
      details: `Payment via ${p.paymentMethod} ${p.referenceNo ? `(Ref: ${p.referenceNo})` : ''}`,
      paymentAmount: p.amount
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handlePresetChange = (preset: 'ALL' | 'THIS_MONTH' | 'LAST_30_DAYS' | 'CUSTOM') => {
    setDateFilterPreset(preset);
    const now = new Date();
    if (preset === 'ALL') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDate(firstDay.toISOString().slice(0, 10));
      setToDate(now.toISOString().slice(0, 10));
    } else if (preset === 'LAST_30_DAYS') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setFromDate(past30.toISOString().slice(0, 10));
      setToDate(now.toISOString().slice(0, 10));
    }
  };

  const handleClearDateFilter = () => {
    setDateFilterPreset('ALL');
    setFromDate('');
    setToDate('');
  };

  const filteredLedgerItems = ledgerItems.filter(item => {
    if (!fromDate && !toDate) return true;
    const itemDate = new Date(item.date).getTime();
    if (fromDate) {
      const fromTime = new Date(fromDate + 'T00:00:00').getTime();
      if (itemDate < fromTime) return false;
    }
    if (toDate) {
      const toTime = new Date(toDate + 'T23:59:59.999').getTime();
      if (itemDate > toTime) return false;
    }
    return true;
  });

  const rangeCreditTotal = filteredLedgerItems
    .filter(i => i.type === 'CREDIT')
    .reduce((sum, i) => sum + (i.creditAmount || 0), 0);

  const rangePaymentTotal = filteredLedgerItems
    .filter(i => i.type === 'PAYMENT')
    .reduce((sum, i) => sum + (i.paymentAmount || 0), 0);

  const downloadDatasheetCSV = () => {
    if (!customer) return;

    let csv = `BHARAT PETROLEUM - CUSTOMER FUEL PASSBOOK STATEMENT\n`;
    csv += `====================================================\n\n`;
    csv += `Customer Name:,"${customer.name}"\n`;
    csv += `Registered Mobile:,"${customer.phoneNumber}"\n`;
    csv += `Account ID:,"${customer.id}"\n`;
    csv += `Statement Generated:,"${new Date().toLocaleString('en-IN')}"\n`;
    csv += `Custom Filter Range:,"${fromDate ? fromDate : 'Beginning'} to ${toDate ? toDate : 'Latest'}"\n`;
    csv += `Total Transactions in Range:,${filteredLedgerItems.length}\n`;
    csv += `Total Fuel Credit in Range (INR):,${rangeCreditTotal.toFixed(2)}\n`;
    csv += `Total Payments in Range (INR):,${rangePaymentTotal.toFixed(2)}\n`;
    csv += `Current Total Outstanding Balance (INR):,${customer.currentBalance.toFixed(2)}\n\n`;

    csv += `--- TRANSACTION DETAILS ---\n`;
    csv += `Date & Time,Type,Transaction Details,Vehicle Number,Credit Added (INR),Payment Paid (INR)\n`;

    filteredLedgerItems.forEach(item => {
      const dateStr = new Date(item.date).toLocaleString('en-IN').replace(/,/g, '');
      const typeStr = item.type;
      const detailsStr = `"${(item.details || '').replace(/"/g, '""')}"`;
      const vehicleStr = `"${(item.vehicle || '').replace(/"/g, '""')}"`;
      const creditStr = item.creditAmount ? item.creditAmount.toFixed(2) : '0.00';
      const paymentStr = item.paymentAmount ? item.paymentAmount.toFixed(2) : '0.00';

      csv += `"${dateStr}",${typeStr},${detailsStr},${vehicleStr},${creditStr},${paymentStr}\n`;
    });

    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const sanitizedName = customer.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const fromStr = fromDate || 'beginning';
    const toStr = toDate || 'today';
    link.setAttribute("download", `bunk_passbook_${sanitizedName}_${fromStr}_to_${toStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Customer Header */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 shadow-xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-purple-950/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                Customer Fuel Passbook
              </span>
              {isAdmin && allCustomers.length > 1 && (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/80 font-bold">
                  {allCustomers.length} Accounts Available
                </span>
              )}
            </div>

            {/* Customer Name & Account Dropdown Switcher */}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
                {customer.name}
              </h1>

              {/* Account Dropdown Switcher Button (Admin only) */}
              {isAdmin && allCustomers.length > 1 && (
                <div className="relative inline-flex items-center">
                  <select
                    id="customer-account-select"
                    value={customer.id}
                    onChange={e => handleSelectCustomer(e.target.value)}
                    className="appearance-none bg-purple-950/90 hover:bg-purple-900 text-purple-200 border border-purple-500/50 hover:border-purple-400 rounded-xl px-3.5 py-1.5 pr-8 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer shadow-md transition-all"
                    title="Change Customer Account"
                  >
                    {allCustomers.map(c => (
                      <option key={c.id} value={c.id} className="bg-slate-900 text-slate-100 py-1">
                        👤 {c.name} ({c.phoneNumber}) — Due: ₹{c.currentBalance.toFixed(2)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-purple-300 absolute right-2.5 pointer-events-none" />
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400 font-mono-numbers mt-1">
              Registered Phone: {customer.phoneNumber} | Account ID: {customer.id}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
              Current Outstanding Due
            </span>
            <p className="text-3xl sm:text-4xl font-black font-mono-numbers text-rose-400 mt-1">
              ₹{customer.currentBalance.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Payment Requests & Alerts from Admin */}
      {requests.length > 0 && (
        <div className="space-y-3">
          {requests.map(r => (
            <div
              key={r.id}
              className="glass-panel rounded-2xl p-4 border border-amber-500/40 bg-gradient-to-r from-amber-950/40 to-slate-900/60 shadow-lg flex items-start justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 flex-shrink-0 mt-0.5">
                  <BellRing className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-amber-300">Payment Request from Bunk Owner</h4>
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-900/60 text-amber-300 border border-amber-700">
                      Requested: ₹{r.requestedAmount.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{r.message}</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Sent at: {new Date(r.sentAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lifetime Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-sky-500/20">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total Fuel Credit Taken
          </span>
          <p className="text-2xl font-black font-mono-numbers text-sky-400 mt-1">
            ₹{customer.totalCredit.toFixed(2)}
          </p>
          <p className="text-[11px] text-slate-400 mt-2">{credits.length} total fuel slips</p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-emerald-500/20">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total Payments Made
          </span>
          <p className="text-2xl font-black font-mono-numbers text-emerald-400 mt-1">
            ₹{customer.totalPaid.toFixed(2)}
          </p>
          <p className="text-[11px] text-slate-400 mt-2">{payments.length} payment receipts</p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-rose-500/20">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Remaining Net Balance
          </span>
          <p className="text-2xl font-black font-mono-numbers text-rose-400 mt-1">
            ₹{customer.currentBalance.toFixed(2)}
          </p>
          <p className="text-[11px] text-slate-400 mt-2">Payable to bunk cashier</p>
        </div>
      </div>

      {/* Itemized Passbook Ledger & Date Filter Toolbar */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              Complete Statement & Passbook History
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Showing <strong className="text-purple-300">{filteredLedgerItems.length}</strong> of {ledgerItems.length} records {fromDate || toDate ? `(Filtered: ${fromDate || 'Start'} ➔ ${toDate || 'Latest'})` : '(All Time)'}
            </p>
          </div>

          {/* Export Datasheet Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={downloadDatasheetCSV}
              disabled={filteredLedgerItems.length === 0}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
              title="Download customized datasheet as CSV"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download Datasheet (CSV)</span>
            </button>
          </div>
        </div>

        {/* Date Range Customizer Toolbar */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5 text-purple-400" />
                <span>Quick Filter:</span>
              </span>
              {[
                { id: 'ALL', label: 'All Time' },
                { id: 'THIS_MONTH', label: 'This Month' },
                { id: 'LAST_30_DAYS', label: 'Last 30 Days' },
                { id: 'CUSTOM', label: 'Custom Range' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => handlePresetChange(p.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    dateFilterPreset === p.id
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Clear Filter */}
            {(fromDate || toDate) && (
              <button
                onClick={handleClearDateFilter}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-bold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Dates</span>
              </button>
            )}
          </div>

          {/* From & To Date Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end pt-1">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-purple-400" />
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={e => {
                  setFromDate(e.target.value);
                  setDateFilterPreset('CUSTOM');
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-purple-400" />
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={e => {
                  setToDate(e.target.value);
                  setDateFilterPreset('CUSTOM');
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Fuel Credit in Range</span>
              <span className="text-sm font-black font-mono-numbers text-rose-400">
                +₹{rangeCreditTotal.toFixed(2)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Payments in Range</span>
              <span className="text-sm font-black font-mono-numbers text-emerald-400">
                -₹{rangePaymentTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <th className="pb-3 px-3">Date & Time</th>
                <th className="pb-3 px-3">Type</th>
                <th className="pb-3 px-3">Transaction Details</th>
                <th className="pb-3 px-3">Vehicle</th>
                <th className="pb-3 px-3 text-right">Credit Added (+)</th>
                <th className="pb-3 px-3 text-right">Payment Paid (-)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredLedgerItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    No transactions found for the selected date range. Try selecting "All Time" or adjusting the dates above.
                  </td>
                </tr>
              ) : (
                filteredLedgerItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-900/40 transition-all">
                    <td className="py-3 px-3 text-slate-400 font-mono-numbers">
                      {new Date(item.date).toLocaleString([], {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                          item.type === 'CREDIT'
                            ? 'bg-rose-950 text-rose-400 border-rose-800'
                            : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        }`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-200">{item.details}</td>
                    <td className="py-3 px-3 text-slate-400 font-mono-numbers">{item.vehicle || '--'}</td>
                    <td className="py-3 px-3 text-right font-mono-numbers font-bold text-rose-400">
                      {item.creditAmount ? `+₹${item.creditAmount.toFixed(2)}` : '--'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono-numbers font-bold text-emerald-400">
                      {item.paymentAmount ? `-₹${item.paymentAmount.toFixed(2)}` : '--'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
