import React, { useState, useEffect } from 'react';
import { useDuty } from '../context/DutyContext';
import { useAuth } from '../context/AuthContext';
import { FuelReading, CreditEntry, PaymentEntry, ExpenseEntry, ClosingStatus, DutyClosing, ProductType } from '../types';
import { db } from '../db/db';
import {
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Fuel,
  Banknote,
  Printer,
  Lock,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Sparkles,
  History,
  ChevronDown,
  ChevronUp,
  Download,
  Share2
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const DutyClosingPage: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const { activeDuty, pricing, updateFuelReading, closeDutyShift } = useDuty();
  const { currentUser } = useAuth();

  const [readings, setReadings] = useState<FuelReading[]>([]);
  const [shiftCredits, setShiftCredits] = useState<CreditEntry[]>([]);
  const [shiftPayments, setShiftPayments] = useState<PaymentEntry[]>([]);
  const [shiftExpenses, setShiftExpenses] = useState<ExpenseEntry[]>([]);
  const [actualCashInHand, setActualCashInHand] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [isClosing, setIsClosing] = useState(false);
  const [finalizedClosing, setFinalizedClosing] = useState<DutyClosing | null>(null);

  // Pump Fuel Filter Tab: ALL, PETROL, DIESEL, OIL
  const [activePumpTab, setActivePumpTab] = useState<'ALL' | 'PETROL' | 'DIESEL' | 'OIL'>('ALL');
  const [whatsappMessage, setWhatsappMessage] = useState<string>('');

  // Past shift calculations
  const [previousClosing, setPreviousClosing] = useState<DutyClosing | null>(null);
  const [showOldCalculation, setShowOldCalculation] = useState(false);

  const generateWhatsAppShiftReport = (c: DutyClosing, pReadings: FuelReading[]) => {
    const pRead = pReadings.filter(r => r.productType === 'PETROL');
    const dRead = pReadings.filter(r => r.productType === 'DIESEL');
    const oRead = pReadings.filter(r => r.productType === 'OIL');

    const totalPetrolL = pRead.reduce((s, r) => s + (r.totalLiters || 0), 0);
    const totalPetrolAmt = pRead.reduce((s, r) => s + (r.totalAmount || 0), 0);
    const totalDieselL = dRead.reduce((s, r) => s + (r.totalLiters || 0), 0);
    const totalDieselAmt = dRead.reduce((s, r) => s + (r.totalAmount || 0), 0);
    const totalOilL = oRead.reduce((s, r) => s + (r.totalLiters || 0), 0);
    const totalOilAmt = oRead.reduce((s, r) => s + (r.totalAmount || 0), 0);
    const grandTotalLiters = totalPetrolL + totalDieselL + totalOilL;

    let text = `⛽ *BHARAT PETROLEUM - SHIFT SETTLEMENT REPORT* ⛽\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📋 *Shift Number:* ${c.shiftNumber}\n`;
    text += `🕒 *Closed At:* ${new Date(c.closedAt).toLocaleString('en-IN')}\n`;
    text += `👤 *Lead Cashier:* ${c.cashierName}\n`;
    text += `👑 *Closed By:* ${c.closedByAdminName}\n\n`;

    text += `📊 *PUMP-WISE METER READINGS & LITERS:*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🔹 *PETROL DISPENSERS (4 Pumps):*\n`;
    pRead.forEach((r, idx) => {
      text += ` • Pump ${idx + 1}: ${r.startReading.toFixed(1)} ➔ ${r.endReading.toFixed(1)} = *${r.totalLiters.toFixed(2)} L* (₹${r.totalAmount.toFixed(2)})\n`;
    });
    text += `   ↳ *Total Petrol: ${totalPetrolL.toFixed(2)} L (₹${totalPetrolAmt.toFixed(2)})*\n\n`;

    text += `🔸 *DIESEL DISPENSERS (4 Pumps):*\n`;
    dRead.forEach((r, idx) => {
      text += ` • Pump ${idx + 1}: ${r.startReading.toFixed(1)} ➔ ${r.endReading.toFixed(1)} = *${r.totalLiters.toFixed(2)} L* (₹${r.totalAmount.toFixed(2)})\n`;
    });
    text += `   ↳ *Total Diesel: ${totalDieselL.toFixed(2)} L (₹${totalDieselAmt.toFixed(2)})*\n\n`;

    if (oRead.length > 0) {
      text += `🛢️ *OIL & LUBRICANTS:*\n`;
      oRead.forEach(r => {
        text += ` • ${r.pumpNumber}: ${r.startReading.toFixed(1)} ➔ ${r.endReading.toFixed(1)} = *${r.totalLiters.toFixed(2)} L* (₹${r.totalAmount.toFixed(2)})\n`;
      });
      text += `   ↳ *Total Oil: ${totalOilL.toFixed(2)} L (₹${totalOilAmt.toFixed(2)})*\n\n`;
    }

    text += `📈 *TOTAL DISPENSED VOLUME:* *${grandTotalLiters.toFixed(2)} Liters*\n\n`;

    text += `💰 *FINANCIAL SUMMARY & CASH AUDIT:*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💵 *Gross Sales:* ₹${c.grossFuelSalesAmount.toFixed(2)}\n`;
    text += `💳 *Credit Given:* ₹${c.creditGivenAmount.toFixed(2)}\n`;
    text += `💸 *Daily Costs / Expenses:* -₹${(c.dailyExpensesAmount || 0).toFixed(2)}\n`;
    text += `💸 *Payments Collected:* ₹${c.creditPaymentsCollected.toFixed(2)}\n`;
    text += `📥 *Expected Cash:* ₹${c.expectedCashBalance.toFixed(2)}\n`;
    text += `🤝 *Actual Cash Handed:* ₹${c.actualCashInHand.toFixed(2)}\n`;
    text += `⚖️ *Status:* ${c.closingStatus === 'MATCHED' ? '✅ MATCHED (₹0.00)' : c.closingStatus === 'EXTRA' ? `🔵 EXTRA (+₹${c.differenceAmount.toFixed(2)})` : `🔴 SHORTAGE (-₹${Math.abs(c.differenceAmount).toFixed(2)})`}\n`;
    if (c.notes) text += `📝 *Notes:* ${c.notes}\n`;
    text += `\n📍 *Bharat Petroleum Highway Hub*`;

    return text;
  };

  const downloadShiftExcelCSV = (c: DutyClosing, pReadings: FuelReading[]) => {
    let csv = "BHARAT PETROLEUM - SHIFT SETTLEMENT & PUMP AUDIT\n\n";
    csv += "--- SHIFT SUMMARY ---\n";
    csv += "Shift Number,Lead Cashier,Settled By Admin,Closed At,Gross Sales (INR),Credit Given (INR),Daily Expenses (INR),Payments Recovered (INR),Expected Cash (INR),Actual Cash Handed (INR),Difference (INR),Audit Status\n";
    csv += `"${c.shiftNumber}","${c.cashierName}","${c.closedByAdminName}","${new Date(c.closedAt).toLocaleString('en-IN')}",${c.grossFuelSalesAmount},${c.creditGivenAmount},${c.dailyExpensesAmount || 0},${c.creditPaymentsCollected},${c.expectedCashBalance},${c.actualCashInHand},${c.differenceAmount},"${c.closingStatus}"\n\n`;

    csv += "--- PUMP METER DISPENSED BREAKDOWN & LITERS RAN ---\n";
    csv += "Product Type,Dispenser / Pump Name,Start Reading (Before Shift),End Reading (Closing),Liters Ran / Dispensed,Rate per Liter (INR),Total Sales Amount (INR)\n";
    pReadings.forEach(r => {
      csv += `"${r.productType}","${r.pumpNumber}",${r.startReading},${r.endReading},${r.totalLiters},${r.rate},${r.totalAmount}\n`;
    });

    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bunk_shift_${c.shiftNumber.toLowerCase().replace(/[^a-z0-9]/g, '_')}_reconciliation.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShareSheet = async (c: DutyClosing, pReadings: FuelReading[]) => {
    const reportText = generateWhatsAppShiftReport(c, pReadings);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Bharat Petroleum Shift Report - ${c.shiftNumber}`,
          text: reportText
        });
        return;
      } catch (err) {
        console.log('Native share cancelled, falling back to WhatsApp');
      }
    }
    const waUrl = `https://wa.me/?text=${encodeURIComponent(reportText)}`;
    window.open(waUrl, '_blank');
  };

  const handleSendWhatsApp = (customText?: string) => {
    const adminPhone = '9159054084';
    const textToSend = customText || whatsappMessage;
    const waUrl = `https://wa.me/91${adminPhone}?text=${encodeURIComponent(textToSend)}`;
    window.open(waUrl, '_blank');
  };

  const loadShiftData = async () => {
    if (activeDuty) {
      const r = await db.fuelReadings.where('dutyId').equals(activeDuty.id).toArray();
      const c = await db.creditEntries.where('dutyId').equals(activeDuty.id).toArray();
      const p = await db.paymentEntries.where('dutyId').equals(activeDuty.id).toArray();
      const exp = await db.expenseEntries.where('dutyId').equals(activeDuty.id).toArray();
      setReadings(r);
      setShiftCredits(c);
      setShiftPayments(p);
      setShiftExpenses(exp);
    }

    // Load most recent closed duty for historical calculation review
    const pastClosings = await db.dutyClosings.reverse().toArray();
    if (pastClosings.length > 0) {
      setPreviousClosing(pastClosings[0]);
    }
  };

  useEffect(() => {
    loadShiftData();
    const interval = setInterval(loadShiftData, 2000);
    const handleLiveSync = () => {
      loadShiftData();
    };
    window.addEventListener('bunk_cloud_synced', handleLiveSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener('bunk_cloud_synced', handleLiveSync);
    };
  }, [activeDuty]);

  const handleMeterChange = async (
    readingId: string,
    field: 'startReading' | 'endReading',
    val: number
  ) => {
    const target = readings.find(r => r.id === readingId);
    if (!target) return;

    const updatedReading: FuelReading = {
      ...target,
      [field]: val
    };
    await updateFuelReading(updatedReading);
    await loadShiftData();
  };

  // Calculations
  const grossFuelSales = readings.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  const totalCreditGiven = shiftCredits.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
  const totalDailyExpenses = shiftExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const cashPaymentsCollected = shiftPayments
    .filter(p => p.paymentMethod === 'CASH')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const digitalPaymentsCollected = shiftPayments
    .filter(p => p.paymentMethod !== 'CASH')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  // Subtotals per fuel product
  const petrolReadings = readings.filter(r => r.productType === 'PETROL');
  const dieselReadings = readings.filter(r => r.productType === 'DIESEL');
  const oilReadings = readings.filter(r => r.productType === 'OIL');

  const totalPetrolLiters = petrolReadings.reduce((s, r) => s + (r.totalLiters || 0), 0);
  const totalPetrolAmount = petrolReadings.reduce((s, r) => s + (r.totalAmount || 0), 0);

  const totalDieselLiters = dieselReadings.reduce((s, r) => s + (r.totalLiters || 0), 0);
  const totalDieselAmount = dieselReadings.reduce((s, r) => s + (r.totalAmount || 0), 0);

  const totalOilLiters = oilReadings.reduce((s, r) => s + (r.totalLiters || 0), 0);
  const totalOilAmount = oilReadings.reduce((s, r) => s + (r.totalAmount || 0), 0);

  // Expected Balance Formula: Gross Sales - Credit Issued - Daily Expenses + Cash Payments
  const expectedCashBalance = grossFuelSales - totalCreditGiven - totalDailyExpenses + cashPaymentsCollected;

  const actualCash = parseFloat(actualCashInHand) || 0;
  const cashDifference = actualCash - expectedCashBalance;

  let closingStatus: ClosingStatus = 'MATCHED';
  if (Math.abs(cashDifference) < 0.01) {
    closingStatus = 'MATCHED';
  } else if (cashDifference > 0) {
    closingStatus = 'EXTRA';
  } else {
    closingStatus = 'SHORTAGE';
  }

  const handleFinalizeShift = async () => {
    if (!activeDuty) {
      alert('No active duty shift found to close.');
      return;
    }

    if (actualCashInHand === '' || actualCashInHand === undefined) {
      alert('Please enter the physical cash counted in hand in Step 3 (enter ₹0 or your counted cash amount) before finalizing.');
      return;
    }

    setIsClosing(true);
    try {
      const closed = await closeDutyShift({
        dutyId: activeDuty.id,
        shiftNumber: activeDuty.shiftNumber,
        cashierId: activeDuty.cashierId,
        cashierName: activeDuty.cashierName,
        closedByAdminId: currentUser?.id || 'admin',
        closedByAdminName: currentUser?.fullName || 'Admin',
        grossFuelSalesAmount: grossFuelSales,
        creditGivenAmount: totalCreditGiven,
        creditPaymentsCollected: cashPaymentsCollected + digitalPaymentsCollected,
        dailyExpensesAmount: totalDailyExpenses,
        expectedCashBalance,
        actualCashInHand: actualCash,
        differenceAmount: cashDifference,
        closingStatus,
        notes: closingNotes.trim() || undefined
      });

      setFinalizedClosing(closed);

      try {
        const msg = generateWhatsAppShiftReport(closed, readings);
        setWhatsappMessage(msg);
      } catch (e) {
        console.warn('WhatsApp report generation note:', e);
      }

      // Automatically generate & download the complete Shift Excel / CSV sheet!
      try {
        downloadShiftExcelCSV(closed, readings);
      } catch (err) {
        console.warn('Auto-download CSV warning:', err);
      }

      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      console.error('Finalize Shift Error:', err);
      alert('Failed to finalize shift: ' + (err.message || 'Unknown error. Please try again.'));
    } finally {
      setIsClosing(false);
    }
  };

  const filteredReadings = readings.filter(r => {
    if (activePumpTab === 'ALL') return true;
    return r.productType === activePumpTab;
  });

  if (!activeDuty && !finalizedClosing) {
    return (
      <div className="space-y-6 pb-12">
        <div className="glass-panel rounded-3xl p-10 text-center border border-slate-800 space-y-4 max-w-2xl mx-auto my-8">
          <Lock className="w-12 h-12 text-slate-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-200">No Active Duty Shift in Progress</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            All previous shifts are closed. When you launch a new duty shift, its start readings will automatically carry over from the last closed shift across all 4 Petrol & 4 Diesel pumps.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all"
            >
              Back to Overview
            </button>
          </div>
        </div>

        {/* Previous Closed Shift Calculation Review */}
        {previousClosing && (
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-slate-100">
                  Last Finalized Shift Settlement: {previousClosing.shiftNumber}
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono-numbers">
                Closed: {new Date(previousClosing.closedAt).toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Gross Fuel Sales</span>
                <p className="text-sm font-bold font-mono-numbers text-slate-100 mt-0.5">
                  ₹{previousClosing.grossFuelSalesAmount.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-rose-400 font-bold uppercase">Credit Issued</span>
                <p className="text-sm font-bold font-mono-numbers text-rose-400 mt-0.5">
                  -₹{previousClosing.creditGivenAmount.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-amber-300 font-bold uppercase">Expected Cash</span>
                <p className="text-sm font-bold font-mono-numbers text-amber-300 mt-0.5">
                  ₹{previousClosing.expectedCashBalance.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Audit Status</span>
                <p className={`text-xs font-bold uppercase mt-0.5 ${
                  previousClosing.closingStatus === 'MATCHED' ? 'text-emerald-400' :
                  previousClosing.closingStatus === 'EXTRA' ? 'text-sky-400' : 'text-rose-400'
                }`}>
                  {previousClosing.closingStatus} ({previousClosing.differenceAmount >= 0 ? '+' : ''}₹{previousClosing.differenceAmount.toFixed(2)})
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Shift Finalized Success Slip */}
      {finalizedClosing && (
        <div className="glass-panel rounded-3xl p-8 border border-emerald-500/40 shadow-2xl bg-gradient-to-b from-emerald-950/20 to-slate-950/80 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-100">
                  Duty Shift Finalized & Locked
                </h2>
                <p className="text-xs text-emerald-400 font-semibold">
                  Shift: {finalizedClosing.shiftNumber} | Closed at {new Date(finalizedClosing.closedAt).toLocaleTimeString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => downloadShiftExcelCSV(finalizedClosing, readings)}
                className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-2 shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download Excel Sheet (.CSV)</span>
              </button>
              <button
                type="button"
                onClick={() => handleShareSheet(finalizedClosing, readings)}
                className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-2 shadow-sm transition-all"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Excel Sheet</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendWhatsApp()}
                className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <span>📲 WhatsApp (9159054084)</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-800 flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Printer className="w-4 h-4 text-slate-700" />
                <span>Print Slip</span>
              </button>
            </div>
          </div>

          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 uppercase font-bold">Expected Cash Balance</span>
              <p className="text-2xl font-black font-mono-numbers text-slate-900 mt-1">
                ₹{finalizedClosing.expectedCashBalance.toFixed(2)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 uppercase font-bold">Actual Cash Handed Over</span>
              <p className="text-2xl font-black font-mono-numbers text-emerald-700 mt-1">
                ₹{finalizedClosing.actualCashInHand.toFixed(2)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 uppercase font-bold">Reconciliation Status</span>
              <div className="mt-1">
                {finalizedClosing.closingStatus === 'MATCHED' ? (
                  <span className="text-lg font-black text-emerald-700">MATCHED (₹0.00)</span>
                ) : finalizedClosing.closingStatus === 'EXTRA' ? (
                  <span className="text-lg font-black text-sky-700">
                    EXTRA AMOUNT (+₹{finalizedClosing.differenceAmount.toFixed(2)})
                  </span>
                ) : (
                  <span className="text-lg font-black text-rose-700">
                    SHORTAGE (-₹{Math.abs(finalizedClosing.differenceAmount).toFixed(2)})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Pump-by-Pump Meter Breakdown Table */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Fuel className="w-4 h-4 text-blue-600" />
              Pump Meter Readings & Dispensed Fuel Summary
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 font-bold uppercase">
                    <th className="pb-2 px-3">Product</th>
                    <th className="pb-2 px-3">Dispenser</th>
                    <th className="pb-2 px-3 text-right">Start Meter</th>
                    <th className="pb-2 px-3 text-right">Closing Meter</th>
                    <th className="pb-2 px-3 text-right">Liters Ran</th>
                    <th className="pb-2 px-3 text-right">Rate (₹)</th>
                    <th className="pb-2 px-3 text-right">Total Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {readings.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3">
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase ${
                          r.productType === 'PETROL' ? 'bg-sky-50 text-sky-800 border-sky-200' :
                          r.productType === 'DIESEL' ? 'bg-amber-50 text-amber-900 border-amber-200' :
                          'bg-purple-50 text-purple-900 border-purple-200'
                        }`}>
                          {r.productType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{r.pumpNumber}</td>
                      <td className="py-2.5 px-3 text-right font-mono-numbers">{r.startReading.toFixed(1)}</td>
                      <td className="py-2.5 px-3 text-right font-mono-numbers">{r.endReading.toFixed(1)}</td>
                      <td className="py-2.5 px-3 text-right font-mono-numbers font-bold text-slate-900">{r.totalLiters.toFixed(2)} L</td>
                      <td className="py-2.5 px-3 text-right font-mono-numbers">₹{r.rate.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-mono-numbers font-black text-emerald-700">₹{r.totalAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition-all shadow-sm"
            >
              Done & Return to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Main Closing Wizard (if active duty in progress) */}
      {activeDuty && !finalizedClosing && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                  Official Shift Closing & Cash Audit
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-100">
                Reconciliation Wizard: {activeDuty.shiftNumber}
              </h1>
              <p className="text-xs text-slate-400">
                Lead Cashier: <strong className="text-slate-200">{activeDuty.cashierName}</strong> | 
                Tracking <span className="text-sky-300 font-bold">4 Petrol Pumps</span>, <span className="text-amber-300 font-bold">4 Diesel Pumps</span> & Lube Dispenser
              </p>
            </div>

            {/* Previous Shift Calculation Drawer Toggle */}
            {previousClosing && (
              <button
                onClick={() => setShowOldCalculation(!showOldCalculation)}
                className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-all self-start sm:self-auto"
              >
                <History className="w-4 h-4 text-amber-400" />
                <span>{showOldCalculation ? 'Hide Previous Shift Calc' : 'Open Previous Shift Calc'}</span>
                {showOldCalculation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          {/* Previous Shift Calculation Accordion Drawer */}
          {showOldCalculation && previousClosing && (
            <div className="glass-panel rounded-2xl p-5 border border-amber-500/30 bg-gradient-to-r from-amber-950/20 to-slate-900/60 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <History className="w-4 h-4" />
                  Previous Closed Shift Settlement ({previousClosing.shiftNumber})
                </span>
                <span className="text-[11px] text-slate-400 font-mono-numbers">
                  Closed at: {new Date(previousClosing.closedAt).toLocaleString()} by {previousClosing.closedByAdminName}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Gross Sales</span>
                  <p className="text-sm font-bold font-mono-numbers text-slate-200">₹{previousClosing.grossFuelSalesAmount.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-rose-400 uppercase font-bold">Credit Given</span>
                  <p className="text-sm font-bold font-mono-numbers text-rose-400">-₹{previousClosing.creditGivenAmount.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-amber-300 uppercase font-bold">Expected Balance</span>
                  <p className="text-sm font-bold font-mono-numbers text-amber-300">₹{previousClosing.expectedCashBalance.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Audit Status</span>
                  <p className="text-xs font-bold text-emerald-400 uppercase">{previousClosing.closingStatus} (₹{previousClosing.differenceAmount.toFixed(2)})</p>
                </div>
              </div>
            </div>
          )}

          {/* Fuel Volumes & Subtotals Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 4 Petrol Pumps Total */}
            <div className="glass-card rounded-2xl p-4 border border-sky-500/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-sky-400 uppercase">Petrol (4 Pumps Total)</span>
                <span className="text-[10px] font-mono-numbers text-slate-400">₹{pricing.PETROL.toFixed(2)}/L</span>
              </div>
              <p className="text-xl font-black font-mono-numbers text-slate-100">
                {totalPetrolLiters.toFixed(2)} <span className="text-xs text-sky-400 font-normal">Liters</span>
              </p>
              <p className="text-xs text-sky-300 font-bold font-mono-numbers mt-1">
                ₹{totalPetrolAmount.toFixed(2)}
              </p>
            </div>

            {/* 4 Diesel Pumps Total */}
            <div className="glass-card rounded-2xl p-4 border border-amber-500/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-amber-400 uppercase">Diesel (4 Pumps Total)</span>
                <span className="text-[10px] font-mono-numbers text-slate-400">₹{pricing.DIESEL.toFixed(2)}/L</span>
              </div>
              <p className="text-xl font-black font-mono-numbers text-slate-100">
                {totalDieselLiters.toFixed(2)} <span className="text-xs text-amber-400 font-normal">Liters</span>
              </p>
              <p className="text-xs text-amber-300 font-bold font-mono-numbers mt-1">
                ₹{totalDieselAmount.toFixed(2)}
              </p>
            </div>

            {/* Oil Dispenser Total */}
            <div className="glass-card rounded-2xl p-4 border border-purple-500/30">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-purple-400 uppercase">Oil & Lubes</span>
                <span className="text-[10px] font-mono-numbers text-slate-400">₹{pricing.OIL.toFixed(2)}/L</span>
              </div>
              <p className="text-xl font-black font-mono-numbers text-slate-100">
                {totalOilLiters.toFixed(2)} <span className="text-xs text-purple-400 font-normal">Liters</span>
              </p>
              <p className="text-xs text-purple-300 font-bold font-mono-numbers mt-1">
                ₹{totalOilAmount.toFixed(2)}
              </p>
            </div>
          </div>

          {/* STEP 1: Enter Fuel Dispenser Final Readings */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
                  <Fuel className="w-5 h-5 text-sky-400" />
                  Step 1: Enter Closing Meter Readings ({readings.length} Dispensers)
                </h3>
                <p className="text-xs text-slate-400">
                  Start readings automatically carried over from previous shift. Enter closing meter to compute dispensed volume.
                </p>
              </div>

              {/* Pump Type Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                {(['ALL', 'PETROL', 'DIESEL', 'OIL'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActivePumpTab(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      activePumpTab === tab
                        ? 'bg-slate-800 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab === 'ALL' ? 'All (9)' : tab === 'PETROL' ? 'Petrol (4)' : tab === 'DIESEL' ? 'Diesel (4)' : 'Oil (1)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredReadings.map(r => (
                <div
                  key={r.id}
                  className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 items-center hover:border-slate-700 transition-all"
                >
                  <div className="md:col-span-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                      r.productType === 'PETROL' ? 'bg-sky-950 text-sky-400 border-sky-800' :
                      r.productType === 'DIESEL' ? 'bg-amber-950 text-amber-400 border-amber-800' :
                      'bg-purple-950 text-purple-400 border-purple-800'
                    }`}>
                      {r.productType}
                    </span>
                    <p className="text-xs font-bold text-slate-200 mt-1">{r.pumpNumber}</p>
                    <p className="text-[11px] text-slate-400 font-mono-numbers">Rate: ₹{r.rate.toFixed(2)}/L</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">
                        Start Reading
                      </label>
                      <span className="text-[9px] text-emerald-400 font-semibold">Carried Over</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={r.startReading}
                      onChange={e => handleMeterChange(r.id, 'startReading', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono-numbers text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      End / Closing Reading
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={r.endReading}
                      onChange={e => handleMeterChange(r.id, 'endReading', parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono-numbers text-emerald-400 font-bold focus:border-emerald-500"
                    />
                  </div>

                  <div className="text-right">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Liters Dispensed
                    </label>
                    <p className="text-sm font-bold font-mono-numbers text-slate-100">
                      {r.totalLiters.toFixed(2)} L
                    </p>
                  </div>

                  <div className="text-right">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Total Amount
                    </label>
                    <p className="text-sm font-bold font-mono-numbers text-emerald-400">
                      ₹{r.totalAmount.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-sm font-bold">
              <span className="text-slate-400 mr-3">Total Gross Shift Fuel Sales:</span>
              <span className="text-emerald-400 font-mono-numbers text-base">₹{grossFuelSales.toFixed(2)}</span>
            </div>
          </div>

          {/* STEP 2: Shift Cash Reconciliation Formula */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-amber-400" />
              Step 2: Expected Balance Calculation Formula
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Gross Fuel Sales</span>
                <p className="text-base font-bold font-mono-numbers text-slate-100 mt-1">
                  ₹{grossFuelSales.toFixed(2)}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/40">
                <span className="text-rose-400 font-semibold uppercase text-[10px]">(-) Credit Given</span>
                <p className="text-base font-bold font-mono-numbers text-rose-400 mt-1">
                  -₹{totalCreditGiven.toFixed(2)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{shiftCredits.length} credit slips</p>
              </div>

              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/40">
                <span className="text-amber-400 font-semibold uppercase text-[10px]">(-) Daily Costs / Exp</span>
                <p className="text-base font-bold font-mono-numbers text-amber-400 mt-1">
                  -₹{totalDailyExpenses.toFixed(2)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{shiftExpenses.length} costs recorded</p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40">
                <span className="text-emerald-400 font-semibold uppercase text-[10px]">(+) Cash Payments</span>
                <p className="text-base font-bold font-mono-numbers text-emerald-400 mt-1">
                  +₹{cashPaymentsCollected.toFixed(2)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">(Digital: ₹{digitalPaymentsCollected.toFixed(2)})</p>
              </div>

              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 glow-amber">
                <span className="text-amber-300 font-bold uppercase text-[10px]">(=) Expected Cash</span>
                <p className="text-lg font-black font-mono-numbers text-amber-300 mt-1">
                  ₹{expectedCashBalance.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* STEP 3: Enter Actual Cash in Hand & Cash Reconciliation Comparison */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-400" />
              Step 3: Actual Cash in Hand & Audit Verification
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Actual Physical Cash Counted in Hand (₹)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="Enter counted cash..."
                    value={actualCashInHand}
                    onChange={e => setActualCashInHand(e.target.value)}
                    className="w-full bg-slate-950 border-2 border-emerald-500/50 rounded-xl px-4 py-3 text-xl font-black text-emerald-400 font-mono-numbers focus:outline-none focus:border-emerald-400 pl-9"
                  />
                  <span className="absolute left-3.5 top-3.5 text-base text-slate-500 font-bold">₹</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Audit Notes / Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Verified by Admin. All physical cash and dispenser meters cross-verified."
                  value={closingNotes}
                  onChange={e => setClosingNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Reconciliation Comparison Banner */}
            {actualCashInHand !== '' && (
              <div className={`p-5 rounded-2xl border transition-all ${
                closingStatus === 'MATCHED'
                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                  : closingStatus === 'EXTRA'
                  ? 'bg-sky-950/60 border-sky-500 text-sky-300'
                  : 'bg-rose-950/60 border-rose-500 text-rose-300'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {closingStatus === 'MATCHED' ? (
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                    ) : closingStatus === 'EXTRA' ? (
                      <TrendingUp className="w-8 h-8 text-sky-400 flex-shrink-0" />
                    ) : (
                      <TrendingDown className="w-8 h-8 text-rose-400 flex-shrink-0" />
                    )}
                    <div>
                      <h4 className="font-extrabold text-base">
                        {closingStatus === 'MATCHED' && 'CASH BALANCES MATCHED PERFECTLY!'}
                        {closingStatus === 'EXTRA' && `EXTRA AMOUNT SURPLUS: +₹${cashDifference.toFixed(2)}`}
                        {closingStatus === 'SHORTAGE' && `CASH SHORTAGE DETECTED: -₹${Math.abs(cashDifference).toFixed(2)}`}
                      </h4>
                      <p className="text-xs opacity-80">
                        Expected: ₹{expectedCashBalance.toFixed(2)} | Actual Cash: ₹{actualCash.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-black/30 border border-white/20 self-start sm:self-auto font-mono-numbers">
                    Diff: ₹{cashDifference.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Finalize Button */}
            <div className="pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleFinalizeShift}
                disabled={isClosing || actualCashInHand === '' || actualCashInHand === undefined}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold text-base tracking-wide transition-all shadow-xl shadow-emerald-950/80 flex items-center justify-center gap-2 glow-emerald"
              >
                <Lock className="w-5 h-5" />
                <span>{isClosing ? 'Finalizing & Locking Shift...' : 'Finalize & Lock Duty Record'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
