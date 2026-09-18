import React, { useState, useEffect } from 'react';
import { DutyClosing, FuelReading, CreditEntry, Customer } from '../types';
import { db } from '../db/db';
import { useDuty } from '../context/DutyContext';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Save,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Fuel,
  Banknote,
  Receipt,
  ShieldAlert,
  Info,
  Calendar
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AdminEditShiftModalProps {
  isOpen: boolean;
  closing: DutyClosing | null;
  onClose: () => void;
  onUpdated: () => void;
}

export const AdminEditShiftModal: React.FC<AdminEditShiftModalProps> = ({
  isOpen,
  closing,
  onClose,
  onUpdated
}) => {
  const { updateClosedDutyShift } = useDuty();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'READINGS' | 'CREDITS' | 'SETTLEMENT'>('READINGS');
  const [readings, setReadings] = useState<FuelReading[]>([]);
  const [credits, setCredits] = useState<CreditEntry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [actualCashInHand, setActualCashInHand] = useState<number>(0);
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 48-Hour Window Calculation
  const closedTime = closing ? new Date(closing.closedAt).getTime() : 0;
  const hoursSinceClosed = closedTime ? (Date.now() - closedTime) / (1000 * 60 * 60) : 0;
  const hoursRemaining = Math.max(0, 48 - hoursSinceClosed);
  const isWithin48h = hoursSinceClosed <= 48;

  useEffect(() => {
    if (isOpen && closing) {
      const loadShiftDetails = async () => {
        const pReadings = await db.fuelReadings.where('dutyId').equals(closing.dutyId).toArray();
        const pCredits = await db.creditEntries.where('dutyId').equals(closing.dutyId).toArray();
        const allCust = await db.customers.toArray();
        setReadings(pReadings);
        setCredits(pCredits);
        setCustomers(allCust);
        setActualCashInHand(closing.actualCashInHand);
        setAdminNotes(closing.notes || '');
      };
      loadShiftDetails();
    }
  }, [isOpen, closing]);

  if (!isOpen || !closing) return null;

  const handleMeterChange = (id: string, field: 'startReading' | 'endReading', val: number) => {
    setReadings(prev =>
      prev.map(r => {
        if (r.id === id) {
          const newStart = field === 'startReading' ? Math.max(0, val) : r.startReading;
          const newEnd = field === 'endReading' ? Math.max(0, val) : r.endReading;
          const totalLiters = Math.max(0, newEnd - newStart);
          const totalAmount = totalLiters * r.rate;
          return {
            ...r,
            [field]: Math.max(0, val),
            totalLiters: Number(totalLiters.toFixed(2)),
            totalAmount: Number(totalAmount.toFixed(2))
          };
        }
        return r;
      })
    );
  };

  const handleCreditChange = (id: string, field: 'liters' | 'ratePerLiter' | 'vehicleNumber', val: any) => {
    setCredits(prev =>
      prev.map(c => {
        if (c.id === id) {
          const newLiters = field === 'liters' ? Math.max(0, parseFloat(val) || 0) : c.liters;
          const newRate = field === 'ratePerLiter' ? Math.max(0, parseFloat(val) || 0) : c.ratePerLiter;
          const newVehicle = field === 'vehicleNumber' ? String(val) : c.vehicleNumber;
          const totalAmount = newLiters * newRate;

          return {
            ...c,
            liters: newLiters,
            ratePerLiter: newRate,
            vehicleNumber: newVehicle,
            totalAmount: Number(totalAmount.toFixed(2))
          };
        }
        return c;
      })
    );
  };

  // Recalculations
  const newGrossFuelSales = readings.reduce((s, r) => s + (r.totalAmount || 0), 0);
  const newCreditGiven = credits.reduce((s, c) => s + (c.totalAmount || 0), 0);
  const dailyExpensesAmount = closing.dailyExpensesAmount || 0;
  const newExpectedCash = newGrossFuelSales - newCreditGiven - dailyExpensesAmount;
  const newCashDiff = actualCashInHand - newExpectedCash;

  let newClosingStatus = closing.closingStatus;
  if (Math.abs(newCashDiff) < 0.01) {
    newClosingStatus = 'MATCHED';
  } else if (newCashDiff > 0) {
    newClosingStatus = 'EXTRA';
  } else {
    newClosingStatus = 'SHORTAGE';
  }

  const handleSaveCorrections = async () => {
    if (currentUser?.role !== 'ADMIN') {
      setErrorMessage('Access Denied: Only Admin users can edit closed shift records.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const updatedClosing: DutyClosing = {
        ...closing,
        grossFuelSalesAmount: Number(newGrossFuelSales.toFixed(2)),
        creditGivenAmount: Number(newCreditGiven.toFixed(2)),
        expectedCashBalance: Number(newExpectedCash.toFixed(2)),
        actualCashInHand: Number(actualCashInHand.toFixed(2)),
        differenceAmount: Number(newCashDiff.toFixed(2)),
        closingStatus: newClosingStatus,
        notes: (adminNotes ? adminNotes + ` | Admin edit on ${new Date().toLocaleString()}` : `Admin corrected by ${currentUser.fullName} on ${new Date().toLocaleString()}`).trim()
      };

      await updateClosedDutyShift(updatedClosing, readings, credits);
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
      onUpdated();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update shift corrections');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-sm">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">
                Admin Shift Audit & Corrections (48-Hour Window)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Shift: <strong className="text-slate-900">{closing.shiftNumber}</strong> | Lead Cashier: {closing.cashierName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 48-Hour Policy Notice */}
        <div className="px-6 pt-4 flex-shrink-0">
          {isWithin48h ? (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-3 text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>
                  <strong>48-Hour Admin Correction Window Active: </strong>
                  You have <strong className="text-amber-800 font-mono-numbers">{Math.floor(hoursRemaining)}h {Math.round((hoursRemaining % 1) * 60)}m</strong> remaining to adjust wrong readings or credit slips.
                </span>
              </div>
              <span className="text-[10px] uppercase font-extrabold bg-amber-200/80 px-2 py-0.5 rounded-full text-amber-900 border border-amber-300">
                Admin Authorized
              </span>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center gap-2.5 text-xs shadow-sm">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>
                <strong>Warning: </strong> Standard 48-hour window has expired ({Math.floor(hoursSinceClosed)}h since closing). Changes will be recorded in the immutable admin audit trail.
              </span>
            </div>
          )}
        </div>

        {/* Tabs & Summary */}
        <div className="px-6 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveTab('READINGS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'READINGS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Fuel className="w-3.5 h-3.5 text-blue-600" />
              <span>Pump Meters ({readings.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('CREDITS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'CREDITS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5 text-amber-600" />
              <span>Credit Slips ({credits.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('SETTLEMENT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'SETTLEMENT' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cash Settlement</span>
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono-numbers bg-slate-50 px-3.5 py-1.5 rounded-2xl border border-slate-200">
            <div>
              <span className="text-slate-500 font-sans font-semibold">Gross: </span>
              <strong className="text-slate-900">₹{newGrossFuelSales.toFixed(2)}</strong>
            </div>
            <div className="h-3 w-px bg-slate-300"></div>
            <div>
              <span className="text-slate-500 font-sans font-semibold">Expected Cash: </span>
              <strong className="text-emerald-700 font-black">₹{newExpectedCash.toFixed(2)}</strong>
            </div>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              {errorMessage}
            </div>
          )}

          {/* TAB 1: Pump Meter Readings */}
          {activeTab === 'READINGS' && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>You can edit Before-Shift Opening & Closing meters for any pump. Total liters and sales will recalculate automatically.</span>
              </div>
              <div className="space-y-2.5">
                {readings.map(r => (
                  <div
                    key={r.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-white grid grid-cols-1 md:grid-cols-6 gap-3 items-center shadow-sm"
                  >
                    <div className="md:col-span-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${
                          r.productType === 'PETROL' ? 'bg-sky-50 text-sky-800 border-sky-200' :
                          r.productType === 'DIESEL' ? 'bg-amber-50 text-amber-900 border-amber-200' :
                          'bg-purple-50 text-purple-900 border-purple-200'
                        }`}>
                          {r.productType}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{r.pumpNumber}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono-numbers">₹{r.rate.toFixed(2)}/L</span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Start Meter</label>
                      <input
                        type="number"
                        step="0.01"
                        value={r.startReading}
                        onChange={e => handleMeterChange(r.id, 'startReading', parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono-numbers font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">End Meter</label>
                      <input
                        type="number"
                        step="0.01"
                        value={r.endReading}
                        onChange={e => handleMeterChange(r.id, 'endReading', parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono-numbers font-bold text-emerald-700"
                      />
                    </div>

                    <div className="text-right">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Liters Ran</span>
                      <p className="text-xs font-black font-mono-numbers text-slate-900">{r.totalLiters.toFixed(2)} L</p>
                    </div>

                    <div className="text-right">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Total (₹)</span>
                      <p className="text-xs font-black font-mono-numbers text-emerald-700">₹{r.totalAmount.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Credit Slips */}
          {activeTab === 'CREDITS' && (
            <div className="space-y-3">
              {credits.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  No credit slips were issued in this shift.
                </div>
              ) : (
                credits.map(c => (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white grid grid-cols-1 md:grid-cols-5 gap-3 items-center shadow-sm"
                  >
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 uppercase">Customer</span>
                      <p className="text-xs font-bold text-slate-900">{c.customerName}</p>
                      <span className="text-[10px] text-slate-500">{c.productType}</span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Liters</label>
                      <input
                        type="number"
                        step="0.01"
                        value={c.liters}
                        onChange={e => handleCreditChange(c.id, 'liters', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono-numbers font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Rate (₹/L)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={c.ratePerLiter}
                        onChange={e => handleCreditChange(c.id, 'ratePerLiter', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono-numbers font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Vehicle No</label>
                      <input
                        type="text"
                        value={c.vehicleNumber || ''}
                        onChange={e => handleCreditChange(c.id, 'vehicleNumber', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono-numbers text-slate-900"
                        placeholder="TN-XX-XXXX"
                      />
                    </div>

                    <div className="text-right">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Credit Total</span>
                      <p className="text-xs font-black font-mono-numbers text-rose-600">₹{c.totalAmount.toFixed(2)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: Cash Settlement Audit */}
          {activeTab === 'SETTLEMENT' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Recalculated Expected Cash</span>
                  <p className="text-xl font-black font-mono-numbers text-slate-900 mt-1">₹{newExpectedCash.toFixed(2)}</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-300 shadow-sm">
                  <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Actual Cash Handed Over (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={actualCashInHand}
                    onChange={e => setActualCashInHand(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-base font-black font-mono-numbers text-emerald-700"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Audit Difference & Status</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`text-xs font-black px-2.5 py-1 rounded-full border uppercase ${
                      newClosingStatus === 'MATCHED' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                      newClosingStatus === 'EXTRA' ? 'bg-sky-50 text-sky-800 border-sky-300' :
                      'bg-rose-50 text-rose-800 border-rose-300'
                    }`}>
                      {newClosingStatus} ({newCashDiff >= 0 ? '+' : ''}₹{newCashDiff.toFixed(2)})
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Reason for Admin Modification (Audit Trail Note)
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Explain reason for correction (e.g. Pump 2 start reading calibrated from 12400 to 12350, Cash count recounted)..."
                  className="w-full bg-white border border-slate-300 rounded-2xl p-3 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            Authenticated Admin: <strong className="text-slate-900">{currentUser?.fullName}</strong>
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveCorrections}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-black transition-all shadow-md flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Corrections...' : 'Save & Update Shift'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
