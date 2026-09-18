import React, { useState, useEffect } from 'react';
import { useDuty } from '../context/DutyContext';
import { useAuth } from '../context/AuthContext';
import { FuelReading } from '../types';
import { db } from '../db/db';
import { Fuel, X, CheckCircle2, Save, Gauge, Info, AlertTriangle, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PumpMetersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PumpMetersModal: React.FC<PumpMetersModalProps> = ({ isOpen, onClose }) => {
  const { activeDuty, pricing, updateFuelReading, refreshDutyData } = useDuty();
  const { currentUser } = useAuth();
  const [readings, setReadings] = useState<FuelReading[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PETROL' | 'DIESEL' | 'OIL'>('ALL');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const loadReadings = async () => {
    if (activeDuty) {
      const activeReadings = await db.fuelReadings
        .where('dutyId')
        .equals(activeDuty.id)
        .toArray();
      setReadings(activeReadings);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadReadings();
    }
  }, [isOpen, activeDuty]);

  const handleReadingChange = (id: string, field: 'startReading' | 'endReading', val: number) => {
    setReadings(prev =>
      prev.map(r => {
        if (r.id === id) {
          const newStart = field === 'startReading' ? Math.max(0, val) : r.startReading;
          const newEnd = field === 'endReading' ? Math.max(0, val) : r.endReading;
          const totalLiters = Math.max(0, newEnd - newStart);
          const totalAmount = totalLiters * (r.rate || pricing[r.productType]);

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

  const handleSaveAll = async () => {
    if (currentUser?.role !== 'ADMIN') {
      alert('Only Admin users can adjust pump meter readings.');
      return;
    }
    setIsSaving(true);
    try {
      for (const r of readings) {
        await updateFuelReading(r);
      }
      await refreshDutyData();
      setSavedSuccess(true);
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1200);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-6 h-6" />
          </div>
          <h4 className="font-black text-base text-slate-900">Admin Permission Required</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Pump meter calibrations, before-shift start meters, and closing meter readings are managed exclusively by <strong>Admin (Jeevan)</strong>. Cashiers are restricted from modifying meter readings.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-900 text-xs font-bold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const filteredReadings = readings.filter(r => {
    if (activeTab === 'ALL') return true;
    return r.productType === activeTab;
  });

  const totalLitersDispensed = readings.reduce((s, r) => s + (r.totalLiters || 0), 0);
  const totalSalesAmount = readings.reduce((s, r) => s + (r.totalAmount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shadow-sm">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">
                Shift Meter Readings & Before-Shift Opening Adjustment
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Shift: <strong className="text-slate-900">{activeDuty?.shiftNumber}</strong> | Manually enter or modify before-shift opening meters
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

        {/* Informational Guidance Banner */}
        <div className="px-6 pt-4 flex-shrink-0">
          <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 flex items-start gap-2.5 shadow-sm text-xs">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-bold">Manual Before-Shift Entry Allowed: </span>
              <span>
                You can enter or update the <strong>Before-Shift (Opening) Readings</strong> at any time during the shift. 
                Volume and sales will instantly recalculate accurately based on current rates.
              </span>
            </div>
          </div>
        </div>

        {/* Filter Tabs & Summary Header */}
        <div className="px-6 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            {(['ALL', 'PETROL', 'DIESEL', 'OIL'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === tab
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'ALL' ? 'All (9 Pumps)' : tab === 'PETROL' ? 'Petrol (4)' : tab === 'DIESEL' ? 'Diesel (4)' : 'Oil (1)'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs font-mono-numbers bg-slate-50 px-3.5 py-1.5 rounded-2xl border border-slate-200">
            <div>
              <span className="text-slate-500 font-sans font-semibold">Total Liters: </span>
              <strong className="text-slate-900">{totalLitersDispensed.toFixed(2)} L</strong>
            </div>
            <div className="h-3 w-px bg-slate-300"></div>
            <div>
              <span className="text-slate-500 font-sans font-semibold">Gross Value: </span>
              <strong className="text-emerald-700 font-black">₹{totalSalesAmount.toFixed(2)}</strong>
            </div>
          </div>
        </div>

        {/* Pump List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {filteredReadings.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              No active pump meter readings found for this shift.
            </div>
          ) : (
            filteredReadings.map(r => (
              <div
                key={r.id}
                className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-sm grid grid-cols-1 md:grid-cols-6 gap-3 items-center"
              >
                {/* Pump Name & Rate */}
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase shadow-sm ${
                        r.productType === 'PETROL'
                          ? 'bg-sky-50 text-sky-800 border-sky-200'
                          : r.productType === 'DIESEL'
                          ? 'bg-amber-50 text-amber-900 border-amber-200'
                          : 'bg-purple-50 text-purple-900 border-purple-200'
                      }`}
                    >
                      {r.productType}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono-numbers">₹{r.rate.toFixed(2)}/L</span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 mt-1">{r.pumpNumber}</h4>
                </div>

                {/* Before-Shift Opening Reading (Editable) */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Before-Shift (Opening)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={r.startReading}
                    onChange={e => handleReadingChange(r.id, 'startReading', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono-numbers font-bold text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm"
                  />
                </div>

                {/* Current / Closing Reading (Editable) */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Current / Closing Meter
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={r.endReading}
                    onChange={e => handleReadingChange(r.id, 'endReading', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono-numbers font-bold text-emerald-700 focus:outline-none focus:border-emerald-500 shadow-sm"
                  />
                </div>

                {/* Dispensed Volume */}
                <div className="text-right">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dispensed</span>
                  <p className="text-xs font-black font-mono-numbers text-slate-900">
                    {r.totalLiters.toFixed(2)} L
                  </p>
                </div>

                {/* Calculated Amount */}
                <div className="text-right">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sales (₹)</span>
                  <p className="text-xs font-black font-mono-numbers text-emerald-700">
                    ₹{r.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between flex-shrink-0">
          <div>
            {savedSuccess && (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 animate-pulse">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                All before-shift and current meter readings saved!
              </span>
            )}
          </div>
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
              disabled={isSaving || readings.length === 0}
              onClick={handleSaveAll}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black transition-all shadow-md flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Meter Readings'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
