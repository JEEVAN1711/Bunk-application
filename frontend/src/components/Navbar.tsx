import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { useDuty } from '../context/DutyContext';
import { useTheme } from '../context/ThemeContext';
import { syncEngine } from '../sync/syncEngine';
import {
  Fuel,
  Wifi,
  WifiOff,
  RefreshCw,
  UserCheck,
  ChevronDown,
  Shield,
  Clock,
  LogOut,
  AlertCircle,
  Palette
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentUser, switchUser, allUsers, logout } = useAuth();
  const { status, pendingCount, triggerSync } = useSync();
  const { activeDuty, pricing } = useDuty();
  const { theme, setTheme } = useTheme();
  const [time, setTime] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSyncingSpin, setIsSyncingSpin] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    setIsSyncingSpin(true);
    try {
      await syncEngine.syncAllLocalDataToCloud();
    } finally {
      setTimeout(() => setIsSyncingSpin(false), 800);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold shadow-sm';
      case 'CASHIER':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold shadow-sm';
      case 'SUPPORT_CASHIER':
        return 'bg-sky-100 text-sky-900 border-sky-300 font-extrabold shadow-sm';
      case 'CUSTOMER':
        return 'bg-purple-100 text-purple-900 border-purple-300 font-extrabold shadow-sm';
      default:
        return 'bg-slate-100 text-slate-900 border-slate-300 font-extrabold shadow-sm';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-2.5 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Fuel Ticker */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-500 flex items-center justify-center shadow-md">
              <Fuel className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight text-slate-900">
                  BUNK PRO
                </span>
                <span className="text-[10px] uppercase font-extrabold tracking-widest px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Bharat Petroleum
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Fuel Station Management</p>
            </div>
          </div>

          {/* Pricing Ticker */}
          <div className="hidden lg:flex items-center gap-3 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-mono-numbers shadow-sm">
            <span className="text-slate-600 font-sans font-bold text-[11px]">Today's Rates:</span>
            <div className="flex items-center gap-1 text-sky-700 font-bold">
              <span className="w-2 h-2 rounded-full bg-sky-500"></span>
              <span className="font-semibold text-slate-700">Petrol:</span> ₹{pricing.PETROL.toFixed(2)}
            </div>
            <div className="h-3 w-px bg-slate-300"></div>
            <div className="flex items-center gap-1 text-amber-800 font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="font-semibold text-slate-700">Diesel:</span> ₹{pricing.DIESEL.toFixed(2)}
            </div>
            <div className="h-3 w-px bg-slate-300"></div>
            <div className="flex items-center gap-1 text-purple-700 font-bold">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              <span className="font-semibold text-slate-700">Oil:</span> ₹{pricing.OIL.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Center Live Duty & Clock */}
        <div className="hidden md:flex items-center gap-4">
          {activeDuty ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs text-emerald-800 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-extrabold text-slate-900">{activeDuty.shiftNumber}</span>
              <span className="text-emerald-700 font-medium font-mono-numbers">({activeDuty.cashierName})</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs text-slate-600 shadow-sm">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-semibold">No Active Shift</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl font-mono-numbers shadow-sm">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-bold text-slate-900">{time}</span>
          </div>
        </div>

        {/* Right Section: Sync & User Profile */}
        <div className="flex items-center gap-3">
          {/* Cloud Sync Status Pill */}
          <div className="flex items-center">
            {status === 'ONLINE' ? (
              <button
                onClick={handleManualSync}
                title="Cloud database online. Click to run instant full synchronization."
                className="flex items-center gap-1.5 text-xs bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-xl transition-all shadow-sm group"
              >
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-bold hidden sm:inline">Cloud Synced</span>
                <RefreshCw
                  className={`w-3 h-3 text-emerald-600 group-hover:rotate-180 transition-transform ${
                    isSyncingSpin ? 'animate-spin' : ''
                  }`}
                />
              </button>
            ) : status === 'SYNCING' ? (
              <div className="flex items-center gap-1.5 text-xs bg-sky-50 border border-sky-200 text-sky-800 px-3 py-1.5 rounded-xl shadow-sm">
                <RefreshCw className="w-3.5 h-3.5 text-sky-600 animate-spin" />
                <span className="font-bold">Syncing ({pendingCount})...</span>
              </div>
            ) : (
              <button
                onClick={handleManualSync}
                title="Offline mode. Local data safe in IndexedDB. Click to retry sync."
                className="flex items-center gap-1.5 text-xs bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-xl transition-all shadow-sm"
              >
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span className="font-bold">Offline ({pendingCount} pending)</span>
                <RefreshCw className="w-3 h-3 text-amber-600" />
              </button>
            )}
          </div>

          {/* User Profile & Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1.5 rounded-2xl hover:bg-slate-100 border border-slate-200 bg-white shadow-sm transition-all text-left"
            >
              {currentUser?.photoUrl ? (
                <img
                  src={currentUser.photoUrl}
                  alt={currentUser.fullName}
                  className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-black text-xs shadow-sm">
                  {currentUser?.fullName.charAt(0) || 'U'}
                </div>
              )}
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 truncate max-w-[130px]">
                    {currentUser?.fullName}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadgeColor(
                      currentUser?.role || ''
                    )}`}
                  >
                    {currentUser?.role}
                  </span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {/* Switch User Dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-3xl glass-panel shadow-2xl p-2.5 z-50 border border-slate-200 bg-white animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Active Station Session
                  </p>
                  <p className="text-xs text-slate-600">Sign in with credentials to change role</p>
                </div>
                <div className="py-1 space-y-1.5 max-h-60 overflow-y-auto">
                  {allUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`w-full flex items-center gap-2.5 p-2 rounded-2xl text-left transition-all ${
                        currentUser?.id === user.id
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-950'
                          : 'bg-slate-50 border border-slate-200 text-slate-800'
                      }`}
                    >
                      {user.photoUrl ? (
                        <img
                          src={user.photoUrl}
                          alt={user.fullName}
                          className="w-7 h-7 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-800 flex items-center justify-center text-xs font-black shadow-sm">
                          {user.fullName.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{user.fullName}</p>
                        <p className="text-[10px] text-slate-500 font-semibold">{user.role}</p>
                      </div>
                      {currentUser?.id === user.id ? (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Active
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-500 font-semibold">
                          Protected
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <button
                    onClick={() => {
                      logout();
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-2xl text-xs font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 transition-all border border-slate-300 shadow-sm"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    Switch User / Sign In Again
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 p-2 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
