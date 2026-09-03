import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { TankStockEntry } from '../types';
import { db } from '../db/db';
import { syncEngine } from '../sync/syncEngine';
import {
  Layers,
  X,
  CheckCircle2,
  Lock,
  Fuel,
  Calendar,
  Clock,
  Trash2,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DailyStockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DailyStockModal: React.FC<DailyStockModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [stockHistory, setStockHistory] = useState<TankStockEntry[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [period, setPeriod] = useState<'DAY_SHIFT_END' | 'NIGHT_SHIFT_END' | 'SHIFT_END'>('DAY_SHIFT_END');

  // MS (Petrol)
  const [msAtgDipLevel, setMsAtgDipLevel] = useState('');
  const [msAtgStock, setMsAtgStock] = useState('');
  const [msTankDipLevel, setMsTankDipLevel] = useState('');
  const [msTankDipStock, setMsTankDipStock] = useState('');

  // HSD (Diesel)
  const [hsdAtgDipLevel, setHsdAtgDipLevel] = useState('');
  const [hsdAtgStock, setHsdAtgStock] = useState('');
  const [hsdTankDipLevel, setHsdTankDipLevel] = useState('');
  const [hsdTankDipStock, setHsdTankDipStock] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const loadStockHistory = async () => {
    const list = await db.tankStocks.reverse().toArray();
    setStockHistory(list);
    if (list.length > 0) {
      const latest = list[0];
      setMsAtgDipLevel(latest.msAtgDipLevel || '');
      setMsAtgStock(latest.msAtgStock ? latest.msAtgStock.toString() : '');
      setMsTankDipLevel(latest.msTankDipLevel || '');
      setMsTankDipStock(latest.msTankDipStock ? latest.msTankDipStock.toString() : '');

      setHsdAtgDipLevel(latest.hsdAtgDipLevel || '');
      setHsdAtgStock(latest.hsdAtgStock ? latest.hsdAtgStock.toString() : '');
      setHsdTankDipLevel(latest.hsdTankDipLevel || '');
      setHsdTankDipStock(latest.hsdTankDipStock ? latest.hsdTankDipStock.toString() : '');
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStockHistory();
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const parsedMsStock = parseFloat(msAtgStock);
    const parsedHsdStock = parseFloat(hsdAtgStock);

    if (!msAtgDipLevel.trim() || isNaN(parsedMsStock) || !hsdAtgDipLevel.trim() || isNaN(parsedHsdStock)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const shiftTitle =
        period === 'DAY_SHIFT_END'
          ? 'Day Shift End Stock'
          : period === 'NIGHT_SHIFT_END'
          ? 'Night Shift End Stock'
          : 'Shift End Stock';

      const id = 'stock-' + date + '-' + (period === 'DAY_SHIFT_END' ? 'day' : 'night') + '-' + Date.now().toString().slice(-4);

      const newEntry: TankStockEntry = {
        id,
        date,
        period,
        shiftName: shiftTitle,
        // MS
        msAtgDipLevel: msAtgDipLevel.trim(),
        msAtgStock: parsedMsStock,
        msTankDipLevel: msTankDipLevel.trim() || undefined,
        msTankDipStock: msTankDipStock ? parseFloat(msTankDipStock) : undefined,
        // HSD
        hsdAtgDipLevel: hsdAtgDipLevel.trim(),
        hsdAtgStock: parsedHsdStock,
        hsdTankDipLevel: hsdTankDipLevel.trim() || undefined,
        hsdTankDipStock: hsdTankDipStock ? parseFloat(hsdTankDipStock) : undefined,
        recordedByAdminId: currentUser?.id || 'admin',
        recordedByAdminName: currentUser?.fullName || 'Admin',
        timestamp: new Date().toISOString(),
        synced: false
      };

      await db.tankStocks.put(newEntry);
      await syncEngine.enqueue('DUTY', 'CREATE', id, newEntry);
      await syncEngine.syncAllLocalDataToCloud();
      await loadStockHistory();

      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.7 }
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this stock entry?')) {
      await db.tankStocks.delete(id);
      await loadStockHistory();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-200 shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 text-base">Daily Shift Fuel Stock (ATG & Tank Dip)</h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  Admin Only
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Record MS (Petrol) & HSD (Diesel) stock at shift end
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

        {/* NON-ADMIN RESTRICTION */}
        {!isAdmin ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
              <Lock className="w-6 h-6" />
            </div>
            <h4 className="font-black text-base text-slate-900">Admin Permission Required</h4>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Fuel stock readings can only be recorded by <strong>Admin (Jeevan)</strong>.
            </p>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
            <form onSubmit={handleSaveStock} className="space-y-4">
              {/* Timing Selection (Date & Shift Period) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Date</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Stock Period</span>
                  </label>
                  <select
                    value={period}
                    onChange={e => setPeriod(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 shadow-sm"
                  >
                    <option value="DAY_SHIFT_END">☀️ Day Shift End Stock</option>
                    <option value="NIGHT_SHIFT_END">🌙 Night Shift End Stock</option>
                    <option value="SHIFT_END">🕒 Shift End Stock</option>
                  </select>
                </div>
              </div>

              {/* MS (PETROL) SECTION */}
              <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                  <h4 className="font-black text-xs uppercase tracking-wider text-sky-950">
                    MS (Petrol) Stock
                  </h4>
                </div>

                {/* MS ATG Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      MS: ATG Dip Level
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 1420 mm"
                      value={msAtgDipLevel}
                      onChange={e => setMsAtgDipLevel(e.target.value)}
                      className="w-full bg-white border border-sky-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-sky-600 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      MS: ATG Stock (Liters)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="e.g. 14500"
                      value={msAtgStock}
                      onChange={e => setMsAtgStock(e.target.value)}
                      className="w-full bg-white border border-sky-300 rounded-xl px-3 py-2 text-slate-900 font-mono-numbers font-black focus:outline-none focus:border-sky-600 shadow-sm"
                    />
                  </div>
                </div>

                {/* MS Optional Manual Dip */}
                <div className="pt-2 border-t border-sky-200/70">
                  <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block mb-1.5">
                    Optional: Manual Tank Dip
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <input
                        type="text"
                        placeholder="MS: Tank Dip Level (Optional)"
                        value={msTankDipLevel}
                        onChange={e => setMsTankDipLevel(e.target.value)}
                        className="w-full bg-white/90 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-sky-500 shadow-sm"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="MS: Tank Dip Stock (Liters)"
                        value={msTankDipStock}
                        onChange={e => setMsTankDipStock(e.target.value)}
                        className="w-full bg-white/90 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono-numbers focus:outline-none focus:border-sky-500 shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* HSD (DIESEL) SECTION */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <h4 className="font-black text-xs uppercase tracking-wider text-amber-950">
                    HSD (Diesel) Stock
                  </h4>
                </div>

                {/* HSD ATG Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      HSD: ATG Dip Level
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 1850 mm"
                      value={hsdAtgDipLevel}
                      onChange={e => setHsdAtgDipLevel(e.target.value)}
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-slate-900 font-bold focus:outline-none focus:border-amber-600 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      HSD: ATG Stock (Liters)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="e.g. 18200"
                      value={hsdAtgStock}
                      onChange={e => setHsdAtgStock(e.target.value)}
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-slate-900 font-mono-numbers font-black focus:outline-none focus:border-amber-600 shadow-sm"
                    />
                  </div>
                </div>

                {/* HSD Optional Manual Dip */}
                <div className="pt-2 border-t border-amber-200/70">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-1.5">
                    Optional: Manual Tank Dip
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <input
                        type="text"
                        placeholder="HSD: Tank Dip Level (Optional)"
                        value={hsdTankDipLevel}
                        onChange={e => setHsdTankDipLevel(e.target.value)}
                        className="w-full bg-white/90 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-sm"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="HSD: Tank Dip Stock (Liters)"
                        value={hsdTankDipStock}
                        onChange={e => setHsdTankDipStock(e.target.value)}
                        className="w-full bg-white/90 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono-numbers focus:outline-none focus:border-amber-500 shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {savedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Shift Stock Saved Successfully!
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !msAtgDipLevel || !msAtgStock || !hsdAtgDipLevel || !hsdAtgStock}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md flex items-center gap-1.5 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : 'Save Shift Stock'}</span>
                </button>
              </div>
            </form>

            {/* Previous Stock Logs */}
            <div className="pt-4 border-t border-slate-200 space-y-2.5">
              <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                Shift Stock Records History ({stockHistory.length})
              </h4>

              <div className="space-y-2">
                {stockHistory.slice(0, 5).map(s => (
                  <div
                    key={s.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <span>{s.date}</span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                          {s.shiftName || s.period}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-slate-600 font-mono-numbers">
                        <span>
                          <strong className="text-sky-700">MS ATG:</strong> {s.msAtgDipLevel} ({s.msAtgStock} L)
                          {s.msTankDipStock ? ` | Tank: ${s.msTankDipStock} L` : ''}
                        </span>
                        <span>
                          <strong className="text-amber-700">HSD ATG:</strong> {s.hsdAtgDipLevel} ({s.hsdAtgStock} L)
                          {s.hsdTankDipStock ? ` | Tank: ${s.hsdTankDipStock} L` : ''}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
