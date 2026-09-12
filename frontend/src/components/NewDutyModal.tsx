import React, { useState, useEffect } from 'react';
import { useDuty } from '../context/DutyContext';
import { User } from '../types';
import { db } from '../db/db';
import { PlayCircle, X, Calendar, Clock, RotateCcw } from 'lucide-react';

interface NewDutyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewDutyModal: React.FC<NewDutyModalProps> = ({ isOpen, onClose }) => {
  const { startNewDuty } = useDuty();
  const [cashiers, setCashiers] = useState<User[]>([]);
  const [supportCashiers, setSupportCashiers] = useState<User[]>([]);
  const [shiftNumber, setShiftNumber] = useState('');
  const [selectedCashierId, setSelectedCashierId] = useState('');
  const [selectedSupportId, setSelectedSupportId] = useState('');
  const [notes, setNotes] = useState('');
  
  // Manual Date & Time State
  const [shiftDate, setShiftDate] = useState('');
  const [shiftTime, setShiftTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetToCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    setShiftDate(dateStr);
    setShiftTime(timeStr);

    const hour = now.getHours();
    const slot = hour < 14 ? 'MORNING' : hour < 22 ? 'EVENING' : 'NIGHT';
    setShiftNumber(`SHIFT-${dateStr}-${slot}`);
  };

  useEffect(() => {
    if (isOpen) {
      resetToCurrentDateTime();

      db.users.filter(u => u.active).toArray().then(users => {
        const cashs = users.filter(u => u.role === 'CASHIER' || u.role === 'ADMIN');
        const sups = users.filter(u => u.role === 'SUPPORT_CASHIER' || u.role === 'CASHIER');
        setCashiers(cashs);
        setSupportCashiers(sups);
        if (cashs.length > 0) setSelectedCashierId(cashs[0].id);
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftNumber || !selectedCashierId || !shiftDate || !shiftTime) return;

    setIsSubmitting(true);
    try {
      // Build full manual timestamp
      const manualDateObj = new Date(`${shiftDate}T${shiftTime}:00`);
      const manualIsoTime = isNaN(manualDateObj.getTime())
        ? new Date().toISOString()
        : manualDateObj.toISOString();

      await startNewDuty(
        shiftNumber,
        selectedCashierId,
        selectedSupportId || undefined,
        notes || undefined,
        manualIsoTime
      );
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-sm">
              <PlayCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">Assign & Start New Duty Shift</h3>
              <p className="text-xs text-slate-500 font-medium">Initialize shift meters, custom time, and assign staff</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Shift Identifier */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Shift Identifier</label>
            <input
              type="text"
              required
              value={shiftNumber}
              onChange={e => setShiftNumber(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-2xl px-3.5 py-2.5 text-sm font-mono-numbers text-slate-900 focus:outline-none focus:border-emerald-500 shadow-sm font-bold"
            />
          </div>

          {/* Manual Date & Time Controls */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                Shift Start Date & Time (Manual)
              </span>
              <button
                type="button"
                onClick={resetToCurrentDateTime}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
              >
                <RotateCcw className="w-3 h-3" />
                Set to Now
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={shiftDate}
                  onChange={e => setShiftDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono-numbers text-slate-900 font-bold focus:outline-none focus:border-emerald-500 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  Time
                </label>
                <input
                  type="time"
                  required
                  value={shiftTime}
                  onChange={e => setShiftTime(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono-numbers text-slate-900 font-bold focus:outline-none focus:border-emerald-500 shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Lead Cashier */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Lead Cashier (Primary Duty Holder)
            </label>
            <select
              value={selectedCashierId}
              onChange={e => setSelectedCashierId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-2xl px-3.5 py-2.5 text-sm text-slate-900 font-bold focus:outline-none focus:border-emerald-500 shadow-sm"
            >
              {cashiers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.role})
                </option>
              ))}
            </select>
          </div>

          {/* Support Cashier */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Support Cashier (Optional Daily Entry)
            </label>
            <select
              value={selectedSupportId}
              onChange={e => setSelectedSupportId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-2xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 shadow-sm"
            >
              <option value="">-- None / Solo Duty --</option>
              {supportCashiers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.role})
                </option>
              ))}
            </select>
          </div>

          {/* Shift Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Shift Notes</label>
            <input
              type="text"
              placeholder="e.g. Pump 1 & 2 active, tank replenishment scheduled"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-2xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 shadow-sm"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !shiftNumber || !selectedCashierId || !shiftDate || !shiftTime}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-black text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2"
            >
              <PlayCircle className="w-5 h-5" />
              <span>{isSubmitting ? 'Starting...' : 'Launch Active Duty Shift'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
