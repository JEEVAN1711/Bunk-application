import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAgency } from '../../context/AgencyContext';
import { useDuty } from '../../context/DutyContext';
import { syncEngine } from '../../sync/syncEngine';
import { db, restoreDemoCredentials, DEFAULT_PRICES } from '../../db/db';
import { Fuel, ShieldCheck, CheckCircle2, UserCheck, Sparkles, Building2, Phone, Lock, User, ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';

export const InitialSetupPage: React.FC = () => {
  const { refreshUsers } = useAuth();
  const { currentAgency, clearAgency } = useAgency();
  const { updatePricing } = useDuty();

  const [stationName, setStationName] = useState(currentAgency?.name || '');
  const [fullName, setFullName] = useState(currentAgency?.ownerName || '');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState(currentAgency?.phone || '');
  const [password, setPassword] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [petrolRate, setPetrolRate] = useState(DEFAULT_PRICES.PETROL.toString());
  const [dieselRate, setDieselRate] = useState(DEFAULT_PRICES.DIESEL.toString());
  const [oilRate, setOilRate] = useState(DEFAULT_PRICES.OIL.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !username || !phone) return;

    setIsSubmitting(true);
    try {
      const adminId = 'u-admin-' + Date.now();
      const adminUser = {
        id: adminId,
        username: username.toLowerCase().trim(),
        password: password || 'admin123',
        fullName: fullName.trim(),
        phone: phone.trim(),
        role: 'ADMIN' as const,
        photoUrl: photoUrl.trim() || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
        active: true,
        createdAt: new Date().toISOString(),
        synced: false
      };

      await db.users.put(adminUser);
      await db.pricing.put({
        id: 'current',
        pricing: {
          PETROL: parseFloat(petrolRate) || DEFAULT_PRICES.PETROL,
          DIESEL: parseFloat(dieselRate) || DEFAULT_PRICES.DIESEL,
          OIL: parseFloat(oilRate) || DEFAULT_PRICES.OIL
        },
        stationName: stationName.trim() || 'Petrol Station'
      });

      await syncEngine.enqueue('USER', 'CREATE', adminId, adminUser);
      syncEngine.triggerSync().catch(console.warn);
      localStorage.setItem('bunk_active_user_id', adminId);

      try {
        confetti({
          particleCount: 80,
          spread: 90,
          origin: { y: 0.5 }
        });
      } catch {}

      await refreshUsers();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#080c14] relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-xl glass-panel rounded-3xl p-8 sm:p-10 border border-slate-800 shadow-2xl relative z-10 space-y-6 animate-in fade-in zoom-in-95 duration-300">
        {/* Active Agency & Back / Change Agency Navigation */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
          <button
            type="button"
            onClick={clearAgency}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-bold border border-slate-200 hover:border-emerald-300 transition-all shadow-sm active:scale-95 group cursor-pointer"
            title="Go back to select another agency"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-emerald-600 group-hover:-translate-x-0.5 transition-transform" />
            <span>Change Agency</span>
          </button>

          {currentAgency && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold max-w-[55%]">
              <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate font-bold text-slate-800">{currentAgency.name}</span>
              {currentAgency.code && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-extrabold border border-emerald-300/60 shrink-0">
                  {currentAgency.code}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          {/* Station Image Banner */}
          <div className="relative h-28 w-full rounded-2xl overflow-hidden mb-3 border border-slate-700/80 shadow-inner group">
            <img
              src="/assets/bunk_bg.jpg"
              alt="Bharat Petroleum Bunk"
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex items-end justify-between p-3">
              <span className="text-[11px] font-extrabold text-amber-300 flex items-center gap-1.5 drop-shadow">
                <Fuel className="w-3.5 h-3.5 text-emerald-400" />
                Bharat Petroleum Fuel Station Edition
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700">
                Offline-First PWA
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="font-black text-2xl tracking-tight bg-gradient-to-r from-emerald-400 via-teal-200 to-sky-300 bg-clip-text text-transparent">
              BUNK PRO
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
              Setup
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-200">
            Initialize Station & Create Admin/Owner Account
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Clean slate detected. Register the Primary Station Owner account to start managing staff, fuel readings, customer credit, and shifts.
          </p>
        </div>

        <form onSubmit={handleSetupSubmit} className="space-y-4 text-xs">
          {/* Station Details */}
          <div>
            <label className="block font-bold text-slate-300 uppercase tracking-wider text-[10px] mb-1.5">
              Petrol Bunk / Station Business Name
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder="e.g. Sri Balaji Fuel Station / Highway Express Bunk"
                value={stationName}
                onChange={e => setStationName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-300 uppercase tracking-wider text-[10px] mb-1.5">
                Owner / Admin Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Sharma"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-300 uppercase tracking-wider text-[10px] mb-1.5">
                Owner Mobile / Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm font-mono-numbers text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-slate-300 uppercase tracking-wider text-[10px] mb-1.5">
                Admin Login Username
              </label>
              <input
                type="text"
                required
                placeholder="e.g. admin"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 uppercase tracking-wider text-[10px] mb-1.5">
                Secure Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="Enter secure password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Initial Fuel Rates */}
          <div>
            <label className="block font-bold text-slate-300 uppercase tracking-wider text-[10px] mb-2">
              Initial Fuel Selling Prices (₹ / Liter)
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <span className="text-[10px] font-semibold text-sky-400">Petrol</span>
                <input
                  type="number"
                  step="0.01"
                  value={petrolRate}
                  onChange={e => setPetrolRate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 font-mono-numbers text-xs text-slate-100 font-bold focus:border-sky-500"
                />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-amber-400">Diesel</span>
                <input
                  type="number"
                  step="0.01"
                  value={dieselRate}
                  onChange={e => setDieselRate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 font-mono-numbers text-xs text-slate-100 font-bold focus:border-amber-500"
                />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-purple-400">Oil</span>
                <input
                  type="number"
                  step="0.01"
                  value={oilRate}
                  onChange={e => setOilRate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 font-mono-numbers text-xs text-slate-100 font-bold focus:border-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Photo URL */}
          <div>
            <label className="block font-bold text-slate-300 uppercase tracking-wider text-[10px] mb-1.5">
              Owner Profile Photo URL (Optional)
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={photoUrl}
              onChange={e => setPhotoUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-3 space-y-2">
            <button
              type="submit"
              disabled={isSubmitting || !fullName || !username || !phone}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold text-sm tracking-wide transition-all shadow-xl shadow-emerald-950/80 flex items-center justify-center gap-2 glow-emerald"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>{isSubmitting ? 'Creating Station & Account...' : 'Complete Setup & Launch Dashboard'}</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={async () => {
                setIsSubmitting(true);
                try {
                  await restoreDemoCredentials();
                  await syncEngine.syncAllLocalDataToCloud();
                  await refreshUsers();
                  confetti({ particleCount: 60, spread: 80 });
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Auto-Configure Station with Predefined Demo Accounts & Credentials</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
