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
  ShieldAlert
} from 'lucide-react';

export const CustomerPortal: React.FC = () => {
  const { currentUser } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [credits, setCredits] = useState<CreditEntry[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);

  useEffect(() => {
    const loadCustomerData = async () => {
      // Find customer corresponding to current user or default to first customer
      let cust = await db.customers.where('phoneNumber').equals(currentUser?.phone || '').first();
      if (!cust) {
        cust = await db.customers.toCollection().first();
      }
      setCustomer(cust || null);

      if (cust) {
        const cList = await db.creditEntries.where('customerId').equals(cust.id).reverse().toArray();
        const pList = await db.paymentEntries.where('customerId').equals(cust.id).reverse().toArray();
        const rList = await db.paymentRequests.where('customerId').equals(cust.id).reverse().toArray();
        setCredits(cList);
        setPayments(pList);
        setRequests(rList);
      }
    };

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
  }, [currentUser]);

  if (!customer) {
    return (
      <div className="glass-panel rounded-3xl p-12 text-center max-w-lg mx-auto my-12 border border-slate-800">
        <CreditCard className="w-12 h-12 text-slate-500 mx-auto mb-3" />
        <h3 className="font-bold text-slate-200">Customer Profile Not Found</h3>
        <p className="text-xs text-slate-400">Please switch to an authorized customer account</p>
      </div>
    );
  }

  // 1. LOCKED for Admin Reconciliation / Data Correction
  if (customer.accessStatus === 'LOCKED') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
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
      <div className="min-h-[70vh] flex items-center justify-center p-4">
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

  return (
    <div className="space-y-6 pb-12">
      {/* Customer Header */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 shadow-xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-purple-950/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">
                Customer Fuel Passbook
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              {customer.name}
            </h1>
            <p className="text-xs text-slate-400 font-mono-numbers mt-1">
              Registered Phone: {customer.phoneNumber} | Account ID: {customer.id}
            </p>
          </div>

          <div className="text-right sm:text-right">
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

      {/* Itemized Passbook Ledger */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" />
            Complete Statement & Passbook History
          </h3>
          <span className="text-xs text-slate-400">{ledgerItems.length} transactions</span>
        </div>

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
              {ledgerItems.map(item => (
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
