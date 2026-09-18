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
  Share2,
  Calculator,
  Coins,
  RotateCcw
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

  // Cash Denominations Note Split State: 500, 200, 100, 50, 20, 10 notes & loose coins
  const [denominations, setDenominations] = useState<{
    500: string;
    200: string;
    100: string;
    50: string;
    20: string;
    10: string;
    coins: string;
  }>({
    500: '',
    200: '',
    100: '',
    50: '',
    20: '',
    10: '',
    coins: ''
  });

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
    text += `💵 *Gross Fuel Sales:* ₹${c.grossFuelSalesAmount.toFixed(2)}\n`;
    text += `💳 *Credit Given (Shift):* -₹${c.creditGivenAmount.toFixed(2)}\n`;
    text += `💸 *Daily Costs / Expenses:* -₹${(c.dailyExpensesAmount || 0).toFixed(2)}\n`;
    text += `📥 *Net Expected Handover:* ₹${c.expectedCashBalance.toFixed(2)}\n`;
    text += `🤝 *Actual Cash Handed:* ₹${c.actualCashInHand.toFixed(2)}\n`;
    text += `⚖️ *Status:* ${c.closingStatus === 'MATCHED' ? '✅ MATCHED (₹0.00)' : c.closingStatus === 'EXTRA' ? `🔵 EXTRA (+₹${c.differenceAmount.toFixed(2)})` : `🔴 SHORTAGE (-₹${Math.abs(c.differenceAmount).toFixed(2)})`}\n`;
    if (c.denominations && (c.denominations.totalNotes || c.denominations.coins)) {
      text += `\n💵 *PHYSICAL CASH SPLIT BREAKDOWN:*\n`;
      if (c.denominations.notes500) text += ` • ₹500 Notes: ${c.denominations.notes500} (₹${(c.denominations.notes500 * 500).toLocaleString('en-IN')})\n`;
      if (c.denominations.notes200) text += ` • ₹200 Notes: ${c.denominations.notes200} (₹${(c.denominations.notes200 * 200).toLocaleString('en-IN')})\n`;
      if (c.denominations.notes100) text += ` • ₹100 Notes: ${c.denominations.notes100} (₹${(c.denominations.notes100 * 100).toLocaleString('en-IN')})\n`;
      if (c.denominations.notes50) text += ` • ₹50 Notes: ${c.denominations.notes50} (₹${(c.denominations.notes50 * 50).toLocaleString('en-IN')})\n`;
      if (c.denominations.notes20) text += ` • ₹20 Notes: ${c.denominations.notes20} (₹${(c.denominations.notes20 * 20).toLocaleString('en-IN')})\n`;
      if (c.denominations.notes10) text += ` • ₹10 Notes: ${c.denominations.notes10} (₹${(c.denominations.notes10 * 10).toLocaleString('en-IN')})\n`;
      if (c.denominations.coins) text += ` • Coins: ₹${c.denominations.coins.toLocaleString('en-IN')}\n`;
      text += `   ↳ *Total Notes: ${c.denominations.totalNotes || 0} | Total Handover: ₹${c.actualCashInHand.toFixed(2)}*\n`;
    }
    if (c.notes) text += `📝 *Notes:* ${c.notes}\n`;
    text += `\n📍 *Bharat Petroleum Highway Hub*`;

    return text;
  };

  const downloadShiftExcelCSV = (c: DutyClosing, pReadings: FuelReading[]) => {
    let csv = "BHARAT PETROLEUM - SHIFT SETTLEMENT & PUMP AUDIT\n\n";
    csv += "--- SHIFT SUMMARY ---\n";
    csv += "Shift Number,Lead Cashier,Settled By Admin,Closed At,Gross Sales (INR),Credit Given (INR),Daily Expenses (INR),Expected Cash Handover (INR),Actual Cash Handed (INR),Difference (INR),Audit Status\n";
    csv += `"${c.shiftNumber}","${c.cashierName}","${c.closedByAdminName}","${new Date(c.closedAt).toLocaleString('en-IN')}",${c.grossFuelSalesAmount},${c.creditGivenAmount},${c.dailyExpensesAmount || 0},${c.expectedCashBalance},${c.actualCashInHand},${c.differenceAmount},"${c.closingStatus}"\n\n`;

    if (c.denominations && (c.denominations.totalNotes || c.denominations.coins)) {
      csv += "--- CASH DENOMINATION & NOTE SPLIT ---\n";
      csv += "Denomination,Count / Quantity,Subtotal Amount (INR)\n";
      csv += `"₹500 Notes",${c.denominations.notes500 || 0},${(c.denominations.notes500 || 0) * 500}\n`;
      csv += `"₹200 Notes",${c.denominations.notes200 || 0},${(c.denominations.notes200 || 0) * 200}\n`;
      csv += `"₹100 Notes",${c.denominations.notes100 || 0},${(c.denominations.notes100 || 0) * 100}\n`;
      csv += `"₹50 Notes",${c.denominations.notes50 || 0},${(c.denominations.notes50 || 0) * 50}\n`;
      csv += `"₹20 Notes",${c.denominations.notes20 || 0},${(c.denominations.notes20 || 0) * 20}\n`;
      csv += `"₹10 Notes",${c.denominations.notes10 || 0},${(c.denominations.notes10 || 0) * 10}\n`;
      csv += `"Coins (INR)",-,${c.denominations.coins || 0}\n`;
      csv += `"TOTAL COUNTED NOTES",${c.denominations.totalNotes || 0},${c.actualCashInHand}\n\n`;
    }

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

  const [meterInputStrings, setMeterInputStrings] = useState<Record<string, { start: string; end: string }>>({});
  const isEditingMetersRef = React.useRef(false);
  const readingsRef = React.useRef(readings);
  useEffect(() => {
    readingsRef.current = readings;
  }, [readings]);

  const loadShiftData = async () => {
    if (activeDuty) {
      const c = await db.creditEntries.where('dutyId').equals(activeDuty.id).toArray();
      const p = await db.paymentEntries.where('dutyId').equals(activeDuty.id).toArray();
      const exp = await db.expenseEntries.where('dutyId').equals(activeDuty.id).toArray();
      setShiftCredits(c);
      setShiftPayments(p);
      setShiftExpenses(exp);

      // Only overwrite readings if user is NOT currently editing/typing in any meter field
      if (!isEditingMetersRef.current) {
        const r = await db.fuelReadings.where('dutyId').equals(activeDuty.id).toArray();
        setReadings(r);
        setMeterInputStrings(prev => {
          const next: Record<string, { start: string; end: string }> = {};
          r.forEach(item => {
            next[item.id] = {
              start: item.startReading !== undefined && item.startReading !== null ? String(item.startReading) : '0',
              end: item.endReading !== undefined && item.endReading !== null ? String(item.endReading) : '0'
            };
          });
          return next;
        });
      }
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

  const handleMeterInputChange = (
    readingId: string,
    field: 'startReading' | 'endReading',
    valStr: string
  ) => {
    isEditingMetersRef.current = true;

    // Allow empty string, numbers, and at most one decimal point
    if (!/^\d*\.?\d*$/.test(valStr)) {
      return;
    }

    // 1. Update text string buffer immediately so typing is smooth and doesn't drop decimal points
    setMeterInputStrings(prev => ({
      ...prev,
      [readingId]: {
        start: prev[readingId]?.start ?? '',
        end: prev[readingId]?.end ?? '',
        [field === 'startReading' ? 'start' : 'end']: valStr
      }
    }));

    // 2. Parse numeric value for real-time live calculations
    const parsed = parseFloat(valStr);
    const numVal = isNaN(parsed) ? 0 : parsed;

    // 3. Update in-memory readings array so all totals (liters, amounts, gross fuel sales, expected cash) update live!
    setReadings(prev =>
      prev.map(item => {
        if (item.id === readingId) {
          const newStart = field === 'startReading' ? numVal : (item.startReading || 0);
          const newEnd = field === 'endReading' ? numVal : (item.endReading || 0);
          const totalLiters = Math.max(0, newEnd - newStart);
          const totalAmount = totalLiters * item.rate;
          return {
            ...item,
            [field]: numVal,
            totalLiters: Number(totalLiters.toFixed(2)),
            totalAmount: Number(totalAmount.toFixed(2))
          };
        }
        return item;
      })
    );
  };

  const handleMeterInputBlur = async (
    readingId: string,
    field: 'startReading' | 'endReading'
  ) => {
    // Delay resetting isEditingMetersRef so clicking between inputs doesn't trigger a background sync wipe
    setTimeout(() => {
      const activeEl = document.activeElement;
      if (!activeEl || !activeEl.classList.contains('meter-reading-input')) {
        isEditingMetersRef.current = false;
      }
    }, 300);

    const valStr = meterInputStrings[readingId]?.[field === 'startReading' ? 'start' : 'end'] ?? '';
    if (valStr === '' || valStr === '.') {
      setMeterInputStrings(prev => ({
        ...prev,
        [readingId]: {
          start: prev[readingId]?.start ?? '0',
          end: prev[readingId]?.end ?? '0',
          [field === 'startReading' ? 'start' : 'end']: '0'
        }
      }));
    }

    // Persist current reading to DB
    const currentReading = readingsRef.current.find(r => r.id === readingId);
    if (currentReading) {
      await updateFuelReading(currentReading);
    }
  };

  // Calculations
  const grossFuelSales = readings.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  const totalCreditGiven = shiftCredits.reduce((sum, c) => sum + (c.totalAmount || 0), 0);
  const totalDailyExpenses = shiftExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

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

  // Expected Balance Formula: Gross Sales - Credit Issued (This Shift) - Daily Expenses
  const expectedCashBalance = grossFuelSales - totalCreditGiven - totalDailyExpenses;

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

  // Denominations Subtotals & Counters
  const c500 = parseInt(denominations['500']) || 0;
  const c200 = parseInt(denominations['200']) || 0;
  const c100 = parseInt(denominations['100']) || 0;
  const c50 = parseInt(denominations['50']) || 0;
  const c20 = parseInt(denominations['20']) || 0;
  const c10 = parseInt(denominations['10']) || 0;
  const cCoins = parseFloat(denominations.coins) || 0;

  const totalDenominationNotes = c500 + c200 + c100 + c50 + c20 + c10;
  const totalDenominationAmount = (c500 * 500) + (c200 * 200) + (c100 * 100) + (c50 * 50) + (c20 * 20) + (c10 * 10) + cCoins;
  const hasDenominations = totalDenominationNotes > 0 || cCoins > 0;

  const handleDenominationChange = (
    key: '500' | '200' | '100' | '50' | '20' | '10' | 'coins',
    val: string
  ) => {
    const clean = val.replace(/[^0-9.]/g, '');
    const next = { ...denominations, [key]: clean };
    setDenominations(next);

    const n500 = parseInt(next['500']) || 0;
    const n200 = parseInt(next['200']) || 0;
    const n100 = parseInt(next['100']) || 0;
    const n50 = parseInt(next['50']) || 0;
    const n20 = parseInt(next['20']) || 0;
    const n10 = parseInt(next['10']) || 0;
    const nCoins = parseFloat(next.coins) || 0;

    const sum = (n500 * 500) + (n200 * 200) + (n100 * 100) + (n50 * 50) + (n20 * 20) + (n10 * 10) + nCoins;

    if (n500 > 0 || n200 > 0 || n100 > 0 || n50 > 0 || n20 > 0 || n10 > 0 || nCoins > 0) {
      setActualCashInHand(sum.toFixed(2));
    } else if (clean === '') {
      setActualCashInHand('');
    }
  };

  const handleClearDenominations = () => {
    setDenominations({
      500: '',
      200: '',
      100: '',
      50: '',
      20: '',
      10: '',
      coins: ''
    });
    setActualCashInHand('');
  };

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
      // Ensure all current meter readings from memory are safely persisted in DB first
      for (const r of readingsRef.current) {
        await updateFuelReading(r);
      }

      const denomData = hasDenominations ? {
        notes500: c500,
        notes200: c200,
        notes100: c100,
        notes50: c50,
        notes20: c20,
        notes10: c10,
        coins: cCoins,
        totalNotes: totalDenominationNotes,
        summaryText: [
          c500 > 0 ? `500×${c500}` : '',
          c200 > 0 ? `200×${c200}` : '',
          c100 > 0 ? `100×${c100}` : '',
          c50 > 0 ? `50×${c50}` : '',
          c20 > 0 ? `20×${c20}` : '',
          c10 > 0 ? `10×${c10}` : '',
          cCoins > 0 ? `Coins:₹${cCoins}` : ''
        ].filter(Boolean).join(', ')
      } : undefined;

      const formattedNotes = [
        closingNotes.trim(),
        denomData ? `[Cash Split: ${denomData.summaryText}]` : ''
      ].filter(Boolean).join(' | ');

      const closed = await closeDutyShift({
        dutyId: activeDuty.id,
        shiftNumber: activeDuty.shiftNumber,
        cashierId: activeDuty.cashierId,
        cashierName: activeDuty.cashierName,
        closedByAdminId: currentUser?.id || 'admin',
        closedByAdminName: currentUser?.fullName || 'Admin',
        grossFuelSalesAmount: grossFuelSales,
        creditGivenAmount: totalCreditGiven,
        creditPaymentsCollected: 0,
        dailyExpensesAmount: totalDailyExpenses,
        expectedCashBalance,
        actualCashInHand: actualCash,
        differenceAmount: cashDifference,
        closingStatus,
        denominations: denomData,
        notes: formattedNotes || undefined
      });

      setFinalizedClosing(closed);

      try {
        const msg = generateWhatsAppShiftReport(closed, readingsRef.current);
        setWhatsappMessage(msg);
      } catch (e) {
        console.warn('WhatsApp report generation note:', e);
      }

      // Automatically generate & download the complete Shift Excel / CSV sheet!
      try {
        downloadShiftExcelCSV(closed, readingsRef.current);
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

          {/* Physical Cash Denominations Handed Over Card */}
          {finalizedClosing.denominations && (finalizedClosing.denominations.totalNotes || finalizedClosing.denominations.coins) ? (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  Physical Cash Denominations Count & Note Split
                </h3>
                <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                  {finalizedClosing.denominations.totalNotes || 0} Total Notes
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 pt-1 text-xs">
                {finalizedClosing.denominations.notes500 ? (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">₹500 Notes</span>
                    <span className="font-extrabold text-slate-900 text-base font-mono-numbers block">{finalizedClosing.denominations.notes500}</span>
                    <span className="text-[10px] text-emerald-700 block font-bold font-mono-numbers">₹{(finalizedClosing.denominations.notes500 * 500).toLocaleString('en-IN')}</span>
                  </div>
                ) : null}

                {finalizedClosing.denominations.notes200 ? (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-center space-y-1">
                    <span className="text-[10px] font-bold text-amber-800 block uppercase">₹200 Notes</span>
                    <span className="font-extrabold text-amber-950 text-base font-mono-numbers block">{finalizedClosing.denominations.notes200}</span>
                    <span className="text-[10px] text-amber-800 block font-bold font-mono-numbers">₹{(finalizedClosing.denominations.notes200 * 200).toLocaleString('en-IN')}</span>
                  </div>
                ) : null}

                {finalizedClosing.denominations.notes100 ? (
                  <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-center space-y-1">
                    <span className="text-[10px] font-bold text-indigo-800 block uppercase">₹100 Notes</span>
                    <span className="font-extrabold text-indigo-950 text-base font-mono-numbers block">{finalizedClosing.denominations.notes100}</span>
                    <span className="text-[10px] text-indigo-800 block font-bold font-mono-numbers">₹{(finalizedClosing.denominations.notes100 * 100).toLocaleString('en-IN')}</span>
                  </div>
                ) : null}

                {finalizedClosing.denominations.notes50 ? (
                  <div className="p-2.5 rounded-xl bg-cyan-50 border border-cyan-200 text-center space-y-1">
                    <span className="text-[10px] font-bold text-cyan-800 block uppercase">₹50 Notes</span>
                    <span className="font-extrabold text-cyan-950 text-base font-mono-numbers block">{finalizedClosing.denominations.notes50}</span>
                    <span className="text-[10px] text-cyan-800 block font-bold font-mono-numbers">₹{(finalizedClosing.denominations.notes50 * 50).toLocaleString('en-IN')}</span>
                  </div>
                ) : null}

                {finalizedClosing.denominations.notes20 ? (
                  <div className="p-2.5 rounded-xl bg-lime-50 border border-lime-200 text-center space-y-1">
                    <span className="text-[10px] font-bold text-lime-800 block uppercase">₹20 Notes</span>
                    <span className="font-extrabold text-lime-950 text-base font-mono-numbers block">{finalizedClosing.denominations.notes20}</span>
                    <span className="text-[10px] text-lime-800 block font-bold font-mono-numbers">₹{(finalizedClosing.denominations.notes20 * 20).toLocaleString('en-IN')}</span>
                  </div>
                ) : null}

                {finalizedClosing.denominations.notes10 ? (
                  <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-center space-y-1">
                    <span className="text-[10px] font-bold text-orange-800 block uppercase">₹10 Notes</span>
                    <span className="font-extrabold text-orange-950 text-base font-mono-numbers block">{finalizedClosing.denominations.notes10}</span>
                    <span className="text-[10px] text-orange-800 block font-bold font-mono-numbers">₹{(finalizedClosing.denominations.notes10 * 10).toLocaleString('en-IN')}</span>
                  </div>
                ) : null}

                {finalizedClosing.denominations.coins ? (
                  <div className="p-2.5 rounded-xl bg-yellow-50 border border-yellow-200 text-center space-y-1">
                    <span className="text-[10px] font-bold text-yellow-800 block uppercase flex items-center justify-center gap-1">
                      <Coins className="w-3 h-3 text-yellow-600" />
                      Coins
                    </span>
                    <span className="font-extrabold text-yellow-950 text-base font-mono-numbers block">₹{finalizedClosing.denominations.coins.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] text-yellow-800 block font-bold font-mono-numbers">Loose Cash</span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

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
                      type="text"
                      inputMode="decimal"
                      value={meterInputStrings[r.id]?.start ?? (r.startReading !== undefined && r.startReading !== null ? String(r.startReading) : '')}
                      onFocus={() => { isEditingMetersRef.current = true; }}
                      onChange={e => handleMeterInputChange(r.id, 'startReading', e.target.value)}
                      onBlur={() => handleMeterInputBlur(r.id, 'startReading')}
                      placeholder="0.00"
                      className="meter-reading-input w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono-numbers text-slate-200 focus:border-sky-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      End / Closing Reading
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={meterInputStrings[r.id]?.end ?? (r.endReading !== undefined && r.endReading !== null ? String(r.endReading) : '')}
                      onFocus={() => { isEditingMetersRef.current = true; }}
                      onChange={e => handleMeterInputChange(r.id, 'endReading', e.target.value)}
                      onBlur={() => handleMeterInputBlur(r.id, 'endReading')}
                      placeholder="0.00"
                      className="meter-reading-input w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono-numbers text-emerald-400 font-bold focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="text-right">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Liters Dispensed
                    </label>
                    <p className="text-sm font-bold font-mono-numbers text-slate-100">
                      {(r.totalLiters || 0).toFixed(2)} L
                    </p>
                  </div>

                  <div className="text-right">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Total Amount
                    </label>
                    <p className="text-sm font-bold font-mono-numbers text-emerald-400">
                      ₹{(r.totalAmount || 0).toFixed(2)}
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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">Gross Fuel Sales</span>
                <p className="text-base font-bold font-mono-numbers text-slate-100 mt-1">
                  ₹{grossFuelSales.toFixed(2)}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">Dispensed across all nozzles</p>
              </div>

              <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/40">
                <span className="text-rose-400 font-semibold uppercase text-[10px]">(-) Credit Given (This Shift)</span>
                <p className="text-base font-bold font-mono-numbers text-rose-400 mt-1">
                  -₹{totalCreditGiven.toFixed(2)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{shiftCredits.length} credit slips recorded</p>
              </div>

              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/40">
                <span className="text-amber-400 font-semibold uppercase text-[10px]">(-) Daily Costs / Expenses</span>
                <p className="text-base font-bold font-mono-numbers text-amber-400 mt-1">
                  -₹{totalDailyExpenses.toFixed(2)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{shiftExpenses.length} costs recorded</p>
              </div>

              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 glow-amber">
                <span className="text-amber-300 font-bold uppercase text-[10px]">(=) Expected Cash Handover</span>
                <p className="text-lg font-black font-mono-numbers text-amber-300 mt-1">
                  ₹{expectedCashBalance.toFixed(2)}
                </p>
                <p className="text-[10px] text-amber-400/80 mt-0.5">Physical cash cashier must hand over</p>
              </div>
            </div>
          </div>

          {/* STEP 3: Enter Actual Cash in Hand & Cash Reconciliation Comparison */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-emerald-400" />
                  Step 3: Actual Cash in Hand & Audit Verification
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Count notes using the denomination split below or enter the counted cash amount directly.
                </p>
              </div>

              {hasDenominations && (
                <button
                  type="button"
                  onClick={handleClearDenominations}
                  className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto shadow-sm"
                  title="Reset all note counts and cash total"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Notes</span>
                </button>
              )}
            </div>

            {/* Currency Denominations Split Counter Grid */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  Cash Denomination & Note Split Counter
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {totalDenominationNotes > 0 ? `${totalDenominationNotes} Total Notes` : 'Enter note quantities'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
                {/* 500 Notes */}
                <div className="p-2.5 rounded-xl border bg-slate-900/90 border-slate-700/80 flex flex-col justify-between space-y-1.5 hover:border-slate-500 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-xs font-black bg-stone-800 text-stone-200 border border-stone-600 font-mono">
                      ₹500
                    </span>
                    <span className="text-[9px] text-stone-400 font-semibold uppercase">Note</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-bold">×</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={denominations['500']}
                      onChange={e => handleDenominationChange('500', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-sm font-bold text-slate-100 font-mono-numbers text-center focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono-numbers">
                    <span className="text-slate-500 text-[9px]">Amt</span>
                    <span className="font-extrabold text-emerald-400">₹{(c500 * 500).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* 200 Notes */}
                <div className="p-2.5 rounded-xl border bg-slate-900/90 border-amber-900/40 flex flex-col justify-between space-y-1.5 hover:border-amber-700/60 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-xs font-black bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                      ₹200
                    </span>
                    <span className="text-[9px] text-amber-400/70 font-semibold uppercase">Note</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-bold">×</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={denominations['200']}
                      onChange={e => handleDenominationChange('200', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-sm font-bold text-slate-100 font-mono-numbers text-center focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono-numbers">
                    <span className="text-slate-500 text-[9px]">Amt</span>
                    <span className="font-extrabold text-emerald-400">₹{(c200 * 200).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* 100 Notes */}
                <div className="p-2.5 rounded-xl border bg-slate-900/90 border-indigo-900/40 flex flex-col justify-between space-y-1.5 hover:border-indigo-700/60 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-xs font-black bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                      ₹100
                    </span>
                    <span className="text-[9px] text-indigo-400/70 font-semibold uppercase">Note</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-bold">×</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={denominations['100']}
                      onChange={e => handleDenominationChange('100', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-sm font-bold text-slate-100 font-mono-numbers text-center focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono-numbers">
                    <span className="text-slate-500 text-[9px]">Amt</span>
                    <span className="font-extrabold text-emerald-400">₹{(c100 * 100).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* 50 Notes */}
                <div className="p-2.5 rounded-xl border bg-slate-900/90 border-cyan-900/40 flex flex-col justify-between space-y-1.5 hover:border-cyan-700/60 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-xs font-black bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                      ₹50
                    </span>
                    <span className="text-[9px] text-cyan-400/70 font-semibold uppercase">Note</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-bold">×</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={denominations['50']}
                      onChange={e => handleDenominationChange('50', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-sm font-bold text-slate-100 font-mono-numbers text-center focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono-numbers">
                    <span className="text-slate-500 text-[9px]">Amt</span>
                    <span className="font-extrabold text-emerald-400">₹{(c50 * 50).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* 20 Notes */}
                <div className="p-2.5 rounded-xl border bg-slate-900/90 border-lime-900/40 flex flex-col justify-between space-y-1.5 hover:border-lime-700/60 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-xs font-black bg-lime-950 text-lime-300 border border-lime-800 font-mono">
                      ₹20
                    </span>
                    <span className="text-[9px] text-lime-400/70 font-semibold uppercase">Note</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-bold">×</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={denominations['20']}
                      onChange={e => handleDenominationChange('20', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-sm font-bold text-slate-100 font-mono-numbers text-center focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono-numbers">
                    <span className="text-slate-500 text-[9px]">Amt</span>
                    <span className="font-extrabold text-emerald-400">₹{(c20 * 20).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* 10 Notes */}
                <div className="p-2.5 rounded-xl border bg-slate-900/90 border-orange-900/40 flex flex-col justify-between space-y-1.5 hover:border-orange-700/60 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-xs font-black bg-orange-950 text-orange-300 border border-orange-800 font-mono">
                      ₹10
                    </span>
                    <span className="text-[9px] text-orange-400/70 font-semibold uppercase">Note</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-bold">×</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={denominations['10']}
                      onChange={e => handleDenominationChange('10', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-sm font-bold text-slate-100 font-mono-numbers text-center focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono-numbers">
                    <span className="text-slate-500 text-[9px]">Amt</span>
                    <span className="font-extrabold text-emerald-400">₹{(c10 * 10).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Coins */}
                <div className="p-2.5 rounded-xl border bg-slate-900/90 border-yellow-900/40 flex flex-col justify-between space-y-1.5 hover:border-yellow-700/60 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-xs font-black bg-yellow-950 text-yellow-300 border border-yellow-800 font-mono flex items-center gap-1">
                      <Coins className="w-3 h-3 text-yellow-400" />
                      Coins
                    </span>
                    <span className="text-[9px] text-yellow-400/70 font-semibold uppercase">Loose</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-bold">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={denominations.coins}
                      onChange={e => handleDenominationChange('coins', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-sm font-bold text-slate-100 font-mono-numbers text-center focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono-numbers">
                    <span className="text-slate-500 text-[9px]">Amt</span>
                    <span className="font-extrabold text-emerald-400">₹{cCoins.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Subtotal Banner inside Denomination Split */}
              <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Total Currency Notes Counted:</span>
                  <span className="font-bold text-slate-100 bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-700 font-mono">
                    {totalDenominationNotes} Notes
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Split Total Cash:</span>
                  <span className="text-sm font-extrabold text-emerald-400 font-mono-numbers">
                    ₹{totalDenominationAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Inputs: Actual Physical Cash & Audit Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-200">
                    Actual Physical Cash Counted in Hand (₹)
                  </label>
                  {hasDenominations && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Auto-summed from Notes
                    </span>
                  )}
                </div>
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
