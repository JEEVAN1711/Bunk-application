import React, { useState, useEffect } from 'react';
import { DutyClosing, CreditEntry, PaymentEntry, FuelReading } from '../types';
import { db } from '../db/db';
import { useAuth } from '../context/AuthContext';
import { AdminEditShiftModal } from '../components/AdminEditShiftModal';
import { StaffMonthlyReport } from '../components/StaffMonthlyReport';
import {
  History,
  Download,
  Search,
  FileCheck,
  Fuel,
  Banknote,
  Calendar,
  Gauge,
  Share2,
  Pencil,
  Clock
} from 'lucide-react';

export const HistoricalLedgerPage: React.FC = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';
  const [closings, setClosings] = useState<DutyClosing[]>([]);
  const [credits, setCredits] = useState<CreditEntry[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [fuelReadings, setFuelReadings] = useState<FuelReading[]>([]);
  const [activeTab, setActiveTab] = useState<'CLOSINGS' | 'METERS' | 'CREDITS' | 'PAYMENTS' | 'STAFF_TIMESHEET'>('CLOSINGS');
  const [editingClosing, setEditingClosing] = useState<DutyClosing | null>(null);

  // Guard: If non-admin is somehow on PAYMENTS tab, redirect to CLOSINGS immediately
  useEffect(() => {
    if (!isAdmin && activeTab === 'PAYMENTS') {
      setActiveTab('CLOSINGS');
    }
  }, [isAdmin, activeTab]);

  const loadAllHistory = async () => {
    const cls = await db.dutyClosings.reverse().toArray();
    const crd = await db.creditEntries.reverse().toArray();
    const fReadings = await db.fuelReadings.toArray();
    setClosings(cls);
    setCredits(crd);
    setFuelReadings(fReadings);

    // Only load payment collection records if user is Station Admin
    if (isAdmin) {
      const pym = await db.paymentEntries.reverse().toArray();
      setPayments(pym);
    } else {
      setPayments([]);
    }
  };

  useEffect(() => {
    loadAllHistory();
    const interval = setInterval(loadAllHistory, 3000);

    const handleSync = () => {
      loadAllHistory();
    };
    window.addEventListener('bunk_cloud_synced', handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('bunk_cloud_synced', handleSync);
    };
  }, [isAdmin]);

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    if (activeTab === 'CLOSINGS') {
      csvContent += "Shift Number,Lead Cashier,Closed By Admin,Gross Sales (INR),Credit Given (INR),Daily Expenses (INR),Expected Cash Handover (INR),Actual Cash Handed (INR),Difference (INR),Status,Closed At\n";
      closings.forEach(c => {
        csvContent += `"${c.shiftNumber}","${c.cashierName}","${c.closedByAdminName}",${c.grossFuelSalesAmount},${c.creditGivenAmount},${c.dailyExpensesAmount || 0},${c.expectedCashBalance},${c.actualCashInHand},${c.differenceAmount},"${c.closingStatus}","${c.closedAt}"\n`;
      });
    } else if (activeTab === 'METERS') {
      csvContent += "Shift ID,Dispenser / Pump Name,Product Type,Start Reading (Before Shift),End Reading (Closing),Liters Ran / Dispensed,Rate per Liter (INR),Total Sales Amount (INR)\n";
      fuelReadings.forEach(r => {
        csvContent += `"${r.dutyId}","${r.pumpNumber}","${r.productType}",${r.startReading},${r.endReading},${r.totalLiters},${r.rate},${r.totalAmount}\n`;
      });
    } else if (activeTab === 'CREDITS') {
      csvContent += "Customer Name,Product,Liters,Rate,Total Amount,Vehicle,Cashier,Timestamp\n";
      credits.forEach(c => {
        csvContent += `"${c.customerName}","${c.productType}",${c.liters},${c.ratePerLiter},${c.totalAmount},"${c.vehicleNumber || ''}","${c.cashierName}","${c.timestamp}"\n`;
      });
    } else if (activeTab === 'PAYMENTS' && isAdmin) {
      csvContent += "Customer Name,Amount,Payment Method,Ref No,Cashier,Timestamp\n";
      payments.forEach(p => {
        csvContent += `"${p.customerName}",${p.amount},"${p.paymentMethod}","${p.referenceNo || ''}","${p.cashierName}","${p.timestamp}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bunk_ledger_${activeTab.toLowerCase()}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendWhatsAppForShift = (c: DutyClosing) => {
    const shiftPumps = fuelReadings.filter(r => r.dutyId === c.dutyId);
    const adminPhone = '9159054084';

    let text = `⛽ *BHARAT PETROLEUM - SHIFT SETTLEMENT REPORT* ⛽\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📋 *Shift Number:* ${c.shiftNumber}\n`;
    text += `🕒 *Closed At:* ${new Date(c.closedAt).toLocaleString('en-IN')}\n`;
    text += `👤 *Lead Cashier:* ${c.cashierName}\n`;
    text += `👑 *Closed By:* ${c.closedByAdminName}\n\n`;

    if (shiftPumps.length > 0) {
      text += `📊 *PUMP METERS & LITERS:*\n`;
      shiftPumps.forEach(r => {
        text += ` • ${r.pumpNumber} (${r.productType}): ${r.startReading.toFixed(1)} ➔ ${r.endReading.toFixed(1)} = *${r.totalLiters.toFixed(2)} L* (₹${r.totalAmount.toFixed(2)})\n`;
      });
      text += `\n`;
    }

    text += `💰 *FINANCIAL SUMMARY:*\n`;
    text += `💵 *Gross Sales:* ₹${c.grossFuelSalesAmount.toFixed(2)}\n`;
    text += `💳 *Credit Given:* -₹${c.creditGivenAmount.toFixed(2)}\n`;
    text += `💸 *Daily Costs:* -₹${(c.dailyExpensesAmount || 0).toFixed(2)}\n`;
    text += `📥 *Net Handover Expected:* ₹${c.expectedCashBalance.toFixed(2)}\n`;
    text += `🤝 *Actual Cash Handed:* ₹${c.actualCashInHand.toFixed(2)}\n`;
    text += `⚖️ *Status:* ${c.closingStatus === 'MATCHED' ? '✅ MATCHED (₹0.00)' : c.closingStatus === 'EXTRA' ? `🔵 EXTRA (+₹${c.differenceAmount.toFixed(2)})` : `🔴 SHORTAGE (-₹${Math.abs(c.differenceAmount).toFixed(2)})`}\n`;
    if (c.notes) text += `📝 *Notes:* ${c.notes}\n`;
    text += `\n📍 *Bharat Petroleum Highway Hub*`;

    const waUrl = `https://wa.me/91${adminPhone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-200 shadow-md bg-white/95 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <History className="w-5 h-5 text-blue-700" />
            <span className="text-xs font-black text-blue-700 uppercase tracking-widest bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Permanent Audit & Historical Archive
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            Historical Records & Reconciliation Logs
          </h1>
          <p className="text-xs text-slate-500">
            Non-destructive audit records preserved across shifts, meter readings, and offline sessions
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportToCSV}
            className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export {activeTab} to CSV</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
        <button
          onClick={() => setActiveTab('CLOSINGS')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'CLOSINGS'
              ? 'bg-amber-100 border border-amber-300 text-amber-900 shadow-sm'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <FileCheck className="w-4 h-4 text-amber-700" />
          Shift Closings & Settlement ({closings.length})
        </button>
        <button
          onClick={() => setActiveTab('METERS')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'METERS'
              ? 'bg-indigo-100 border border-indigo-300 text-indigo-900 shadow-sm'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Gauge className="w-4 h-4 text-indigo-700" />
          Pump Meter Readings & Liters ({fuelReadings.length})
        </button>
        <button
          onClick={() => setActiveTab('CREDITS')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'CREDITS'
              ? 'bg-blue-100 border border-blue-300 text-blue-900 shadow-sm'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Fuel className="w-4 h-4 text-blue-700" />
          Customer Credit Slips ({credits.length})
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('PAYMENTS')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'PAYMENTS'
                ? 'bg-emerald-100 border border-emerald-300 text-emerald-900 shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Banknote className="w-4 h-4 text-emerald-700" />
            Payments Collected ({payments.length})
          </button>
        )}
        <button
          onClick={() => setActiveTab('STAFF_TIMESHEET')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'STAFF_TIMESHEET'
              ? 'bg-sky-100 border border-sky-400 text-sky-950 shadow-sm'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4 text-sky-700" />
          Monthly Staff Duty & Hours Report
        </button>
      </div>

      {/* Tab 1: Closed Shifts */}
      {activeTab === 'CLOSINGS' && (
        <div className="glass-panel rounded-3xl p-6 border border-slate-200 shadow-md space-y-4 bg-white/95">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="pb-3 px-3">Shift ID</th>
                  <th className="pb-3 px-3">Cashier</th>
                  <th className="pb-3 px-3">Closed By</th>
                  <th className="pb-3 px-3 text-right">Gross Sales</th>
                  <th className="pb-3 px-3 text-right">Credit Given</th>
                  <th className="pb-3 px-3 text-right">Expected Cash</th>
                  <th className="pb-3 px-3 text-right">Actual Handed</th>
                  <th className="pb-3 px-3 text-center">Status</th>
                  <th className="pb-3 px-3">Closed At</th>
                  <th className="pb-3 px-3 text-center">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {closings.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-500 text-xs">
                      No finalized shift closings found. Close an active shift to archive records.
                    </td>
                  </tr>
                ) : (
                  closings.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-all">
                      <td className="py-3 px-3 font-mono-numbers font-black text-slate-900">
                        {c.shiftNumber}
                      </td>
                      <td className="py-3 px-3 text-slate-800 font-bold">{c.cashierName}</td>
                      <td className="py-3 px-3 text-slate-600">{c.closedByAdminName}</td>
                      <td className="py-3 px-3 text-right font-mono-numbers font-bold text-slate-900">
                        ₹{c.grossFuelSalesAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-numbers text-rose-600 font-bold">
                        -₹{c.creditGivenAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-numbers font-bold text-slate-900">
                        ₹{c.expectedCashBalance.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-numbers font-black text-emerald-700">
                        ₹{c.actualCashInHand.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase ${
                          c.closingStatus === 'MATCHED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : c.closingStatus === 'EXTRA'
                            ? 'bg-sky-50 text-sky-800 border-sky-300'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                        }`}>
                          {c.closingStatus} {c.differenceAmount !== 0 ? `(₹${c.differenceAmount.toFixed(0)})` : ''}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-mono-numbers text-[11px]">
                        {new Date(c.closedAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {currentUser?.role === 'ADMIN' && (
                            <button
                              onClick={() => setEditingClosing(c)}
                              title="Admin Edit closed shift readings & credits (48h window)"
                              className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm"
                            >
                              <Pencil className="w-3 h-3 text-amber-700" />
                              <span>Edit (48h)</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleSendWhatsAppForShift(c)}
                            title="Send full pump-wise shift summary to Admin WhatsApp (9159054084)"
                            className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm"
                          >
                            <Share2 className="w-3 h-3 text-emerald-600" />
                            <span>WhatsApp</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Pump Meter Readings & Liters Ran */}
      {activeTab === 'METERS' && (
        <div className="glass-panel rounded-3xl p-6 border border-slate-200 shadow-md space-y-4 bg-white/95">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-blue-600" />
              Pump Meter Readings & Liters Dispensed (All Shifts)
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Total Pump Log Records: <strong>{fuelReadings.length}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="pb-3 px-3">Product</th>
                  <th className="pb-3 px-3">Dispenser / Pump Name</th>
                  <th className="pb-3 px-3 text-right">Start Meter (Before Shift)</th>
                  <th className="pb-3 px-3 text-right">End Meter (Closing)</th>
                  <th className="pb-3 px-3 text-right">Liters Ran / Dispensed</th>
                  <th className="pb-3 px-3 text-right">Rate (₹)</th>
                  <th className="pb-3 px-3 text-right">Total Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {fuelReadings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                      No pump readings recorded yet.
                    </td>
                  </tr>
                ) : (
                  fuelReadings.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${
                          r.productType === 'PETROL' ? 'bg-sky-50 text-sky-800 border-sky-200' :
                          r.productType === 'DIESEL' ? 'bg-amber-50 text-amber-900 border-amber-200' :
                          'bg-purple-50 text-purple-900 border-purple-200'
                        }`}>
                          {r.productType}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">{r.pumpNumber}</td>
                      <td className="py-3 px-3 text-right font-mono-numbers text-slate-700">{r.startReading.toFixed(1)}</td>
                      <td className="py-3 px-3 text-right font-mono-numbers text-slate-700">{r.endReading.toFixed(1)}</td>
                      <td className="py-3 px-3 text-right font-mono-numbers font-black text-slate-900">
                        {r.totalLiters.toFixed(2)} L
                      </td>
                      <td className="py-3 px-3 text-right font-mono-numbers text-slate-600">₹{r.rate.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-mono-numbers font-black text-emerald-700">
                        ₹{r.totalAmount.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Credits */}
      {activeTab === 'CREDITS' && (
        <div className="glass-panel rounded-3xl p-6 border border-slate-200 shadow-md space-y-4 bg-white/95">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="pb-3 px-3">Customer</th>
                  <th className="pb-3 px-3">Product</th>
                  <th className="pb-3 px-3 text-right">Liters</th>
                  <th className="pb-3 px-3 text-right">Rate</th>
                  <th className="pb-3 px-3 text-right">Total Amount</th>
                  <th className="pb-3 px-3">Vehicle</th>
                  <th className="pb-3 px-3">Cashier</th>
                  <th className="pb-3 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {credits.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                      No credit slips issued yet.
                    </td>
                  </tr>
                ) : (
                  credits.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-slate-900">{c.customerName}</td>
                      <td className="py-3 px-3">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${
                          c.productType === 'PETROL' ? 'bg-sky-50 text-sky-800 border-sky-200' :
                          c.productType === 'DIESEL' ? 'bg-amber-50 text-amber-900 border-amber-200' :
                          'bg-purple-50 text-purple-900 border-purple-200'
                        }`}>
                          {c.productType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono-numbers">{c.liters.toFixed(2)} L</td>
                      <td className="py-3 px-3 text-right font-mono-numbers">₹{c.ratePerLiter.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-mono-numbers font-bold text-rose-600">
                        ₹{c.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 font-mono-numbers text-slate-600">{c.vehicleNumber || '--'}</td>
                      <td className="py-3 px-3 text-slate-700">{c.cashierName}</td>
                      <td className="py-3 px-3 text-slate-500 font-mono-numbers">
                        {new Date(c.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Payments (ADMIN ONLY) */}
      {activeTab === 'PAYMENTS' && isAdmin && (
        <div className="glass-panel rounded-3xl p-6 border border-slate-200 shadow-md space-y-4 bg-white/95">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="pb-3 px-3">Customer</th>
                  <th className="pb-3 px-3 text-right">Amount Paid</th>
                  <th className="pb-3 px-3">Method</th>
                  <th className="pb-3 px-3">Reference No</th>
                  <th className="pb-3 px-3">Cashier</th>
                  <th className="pb-3 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                      No payments collected yet.
                    </td>
                  </tr>
                ) : (
                  payments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-slate-900">{p.customerName}</td>
                      <td className="py-3 px-3 text-right font-mono-numbers font-black text-emerald-700">
                        ₹{p.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono-numbers text-slate-600">{p.referenceNo || '--'}</td>
                      <td className="py-3 px-3 text-slate-700">{p.cashierName}</td>
                      <td className="py-3 px-3 text-slate-500 font-mono-numbers">
                        {new Date(p.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Staff Monthly Duty & Attendance Timesheet */}
      {activeTab === 'STAFF_TIMESHEET' && (
        <StaffMonthlyReport />
      )}

      {/* Admin 48h Shift Corrections Modal */}
      <AdminEditShiftModal
        isOpen={!!editingClosing}
        closing={editingClosing}
        onClose={() => setEditingClosing(null)}
        onUpdated={loadAllHistory}
      />
    </div>
  );
};
