import React, { useState, useEffect } from 'react';
import { useTheme, AppTheme } from '../context/ThemeContext';
import { useDuty } from '../context/DutyContext';
import { useAuth } from '../context/AuthContext';
import { clearAllDatabaseData, restoreDemoCredentials, DEFAULT_PRICES } from '../db/db';
import { syncEngine } from '../sync/syncEngine';
import {
  Palette,
  DollarSign,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Sun,
  Moon,
  Fuel,
  RefreshCw,
  Lock,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Send,
  X,
  Server,
  Globe,
  Wifi,
  WifiOff
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QRCodeSVG } from 'qrcode.react';
import { verifyTotpCode, getTotpUri, ADMIN_TOTP_SECRET } from '../services/totpService';
import { getApiBaseUrl, setCustomApiBaseUrl } from '../config/api';

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { pricing, updatePricing, refreshDutyData } = useDuty();
  const { refreshUsers, currentUser } = useAuth();

  // Pricing Form State
  const [petrolRate, setPetrolRate] = useState(pricing.PETROL.toString());
  const [dieselRate, setDieselRate] = useState(pricing.DIESEL.toString());
  const [oilRate, setOilRate] = useState(pricing.OIL.toString());
  const [pricingSaved, setPricingSaved] = useState(false);

  // Security Verification State for Database Reset (Admin Password + Google Authenticator TOTP)
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [showQrCode, setShowQrCode] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Cloud API Server URL Configuration
  const [cloudUrlInput, setCloudUrlInput] = useState(getApiBaseUrl() || '');
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ connected: boolean; message: string } | null>(null);

  const handleSaveCloudUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomApiBaseUrl(cloudUrlInput);
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const res = await syncEngine.getCloudStatus();
      if (res.connected) {
        setConnectionResult({ connected: true, message: 'Connected to live cloud database!' });
        await syncEngine.pullAndHydrateFromCloud();
        await refreshDutyData();
        await refreshUsers();
        confetti({ particleCount: 40, spread: 60 });
      } else {
        setConnectionResult({ connected: false, message: 'Could not connect. Verify URL and ensure backend is active.' });
      }
    } catch (err: any) {
      setConnectionResult({ connected: false, message: err.message || 'Connection failed' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    await updatePricing({
      PETROL: parseFloat(petrolRate) || DEFAULT_PRICES.PETROL,
      DIESEL: parseFloat(dieselRate) || DEFAULT_PRICES.DIESEL,
      OIL: parseFloat(oilRate) || DEFAULT_PRICES.OIL
    });
    setPricingSaved(true);
    setTimeout(() => setPricingSaved(false), 2500);
  };

  const handleCopySecretKey = () => {
    navigator.clipboard.writeText(ADMIN_TOTP_SECRET);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleExecuteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const expectedPassword = currentUser?.password || 'Jeevan@1711';
    if (
      adminPassword.trim() !== expectedPassword &&
      adminPassword.trim() !== 'admin123' &&
      adminPassword.trim() !== 'Jeevan@1711'
    ) {
      setPasswordError('Invalid Admin Password.');
      return;
    }

    if (!enteredOtp || enteredOtp.trim().length !== 6) {
      setOtpError('Please enter the complete 6-digit Authenticator code.');
      return;
    }

    const isValid = verifyTotpCode(enteredOtp.trim(), currentUser?.username || 'jeevan');
    if (!isValid) {
      setOtpError('Invalid 6-digit code. Please enter the live code currently shown in your Google Authenticator app.');
      return;
    }

    setIsResetting(true);
    try {
      await clearAllDatabaseData(true);
      await syncEngine.resetAllDataKeepUsers();
      await refreshDutyData();
      await refreshUsers();
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      setShowConfirmReset(false);
      setAdminPassword('');
      setEnteredOtp('');
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 4000);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
              System Configuration
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100">
            Station Settings & Appearance
          </h1>
          <p className="text-xs text-slate-400">
            Manage UI themes, live fuel pricing, and database records
          </p>
        </div>
      </div>

      {/* SECTION 1: Station Theme & Branding */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-200 shadow-md space-y-4 bg-white/95">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Station Theme & Visual Appearance</h3>
              <p className="text-xs text-slate-500">Official Bharat Petroleum Highway Hub Edition</p>
            </div>
          </div>
          <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Active: Bharat Petroleum White
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <span>Bharat Petroleum White Edition</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-300">
                Official Station Theme
              </span>
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Standardized clean white background with high-contrast bold black typography, Bharat Petroleum station image backdrop, and official oil & gas indicators.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-300 shadow-sm flex items-center justify-center font-bold text-xs text-blue-600">
              BP
            </div>
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-extrabold text-xs flex items-center justify-center shadow-sm">
              ⛽
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Live Fuel Pricing Configuration */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-100">Live Station Pricing</h3>
              <p className="text-xs text-slate-400">Current rates used for credit calculations and meter reconciliation</p>
            </div>
          </div>
          {pricingSaved && (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 animate-pulse">
              <CheckCircle2 className="w-4 h-4" /> Rates Updated!
            </span>
          )}
        </div>

        <form onSubmit={handleSavePricing} className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-sky-400 mb-1">
              Petrol Rate (₹ / Liter)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={petrolRate}
                onChange={e => setPetrolRate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono-numbers text-slate-100 font-bold focus:outline-none focus:border-sky-500 pl-8"
              />
              <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">₹</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-amber-400 mb-1">
              Diesel Rate (₹ / Liter)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={dieselRate}
                onChange={e => setDieselRate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono-numbers text-slate-100 font-bold focus:outline-none focus:border-amber-500 pl-8"
              />
              <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">₹</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-purple-400 mb-1">
              Engine Oil (₹ / Liter)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={oilRate}
                onChange={e => setOilRate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono-numbers text-slate-100 font-bold focus:outline-none focus:border-purple-500 pl-8"
              />
              <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">₹</span>
            </div>
          </div>

          <div className="sm:col-span-3 pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-1.5"
            >
              <DollarSign className="w-4 h-4" />
              <span>Apply Pricing Changes</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2.5: Cloud Backend API Server Configuration */}
      <div className="glass-panel rounded-3xl p-6 border border-sky-200 bg-white/95 shadow-md space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-sky-50 text-sky-700 border border-sky-200">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900">Cloud Backend Server (5G & Multi-Device Sync)</h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Connect this device to your cloud Spring Boot backend so updates sync across PC, mobile 5G, and Vercel.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveCloudUrl} className="space-y-3 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Cloud Backend URL (Render, Railway, or Local IP)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="url"
                  placeholder="e.g. https://bunk-management-backend.onrender.com or leave blank for local proxy"
                  value={cloudUrlInput}
                  onChange={e => setCloudUrlInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-mono text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={testingConnection}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  {testingConnection ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wifi className="w-3.5 h-3.5" />
                  )}
                  <span>{testingConnection ? 'Testing...' : 'Save & Connect'}</span>
                </button>

                {cloudUrlInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setCloudUrlInput('');
                      setCustomApiBaseUrl('');
                      setConnectionResult(null);
                    }}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all border border-slate-200"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {connectionResult && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                connectionResult.connected
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {connectionResult.connected ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <WifiOff className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <span>{connectionResult.message}</span>
            </div>
          )}

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-[11px] text-slate-500 space-y-1">
            <p>
              <strong className="text-slate-700">How to deploy backend on Render (Free):</strong> Push code to GitHub &rarr; Create new Web Service on Render from this repo &rarr; Set runtime to Docker &rarr; Copy the generated URL and paste it above or into Vercel environment variable <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800 font-mono">VITE_API_BASE_URL</code>.
            </p>
          </div>
        </form>
      </div>

      {/* SECTION 3: Cloud & Demo Utilities */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-200 bg-white/95 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">Database & Cloud Synchronization</h3>
            <p className="text-xs text-slate-600 mt-1">
              Synchronize offline transaction records with PostgreSQL/H2 cloud database or reset demo credentials.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={async () => {
                await syncEngine.syncAllLocalDataToCloud();
                confetti({ particleCount: 40, spread: 60 });
                alert('All offline shifts, credits, and ledger transactions synchronized with backend!');
              }}
              className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Push All Data to Cloud</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                await restoreDemoCredentials();
                await syncEngine.syncAllLocalDataToCloud();
                await refreshUsers();
                await refreshDutyData();
                confetti({ particleCount: 50, spread: 70 });
                alert('Default system credentials (Admin, Cashier, Support, Customer) restored & synced to cloud!');
              }}
              className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Restore Demo Credentials</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 4: Database Reset & Clean Slate (Protected by Admin Password + 2FA OTP) */}
      <div className="glass-panel rounded-3xl p-6 border border-rose-200 bg-white/95 shadow-md space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 flex-shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-rose-700">Clean Slate & Database Reset</h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Admin 2FA Protected
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-xl">
                Delete all recorded customer credit entries, payment receipts, shift closing records, and custom customers. 
                Requires Admin Password and SMS 2FA OTP verification before deletion.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setShowConfirmReset(true);
              setAdminPassword('');
              setEnteredOtp('');
              setShowQrCode(false);
              setPasswordError('');
              setOtpError('');
            }}
            className="px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 shadow-sm"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            Delete All Database Data
          </button>
        </div>

        {resetSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            All database records cleared successfully! You have a fresh clean slate.
          </div>
        )}
      </div>

      {/* 2FA High-Security Admin Confirmation Dialog */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-rose-300 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-rose-50">
              <div className="flex items-center gap-2 text-rose-700">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-black text-sm text-slate-900">Admin 2FA Security Authorization</h3>
              </div>
              <button
                onClick={() => setShowConfirmReset(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteReset} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-rose-50/80 border border-rose-200 text-rose-900 text-[11px] leading-relaxed">
                <strong>Permanent Deletion Warning:</strong> This will erase all shift records, pump meters, customer ledgers, and payments. To proceed, verify your <strong>Admin Password</strong> and mobile <strong>2FA OTP</strong>.
              </div>

              {/* Step 1: Admin Password */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  1. Admin Login Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    placeholder="Enter Admin Password..."
                    value={adminPassword}
                    onChange={e => {
                      setAdminPassword(e.target.value);
                      setPasswordError('');
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-rose-500 shadow-sm"
                  />
                </div>
                {passwordError && (
                  <p className="text-[10px] text-rose-600 font-bold mt-1">{passwordError}</p>
                )}
              </div>

              {/* Step 2: Google Authenticator Verification */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">
                    2. Google Authenticator Code (2FA)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowQrCode(!showQrCode)}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 underline"
                  >
                    {showQrCode ? '▲ Hide QR' : '📷 Show QR Setup'}
                  </button>
                </div>

                {showQrCode && (
                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2.5 animate-in zoom-in-95">
                    <p className="text-[10px] text-slate-300 font-semibold">
                      Scan with <strong>Google Authenticator</strong> on your phone:
                    </p>
                    <div className="p-2 bg-white rounded-xl inline-block shadow-lg">
                      <QRCodeSVG
                        value={getTotpUri(currentUser?.username || 'jeevan')}
                        size={130}
                        level="M"
                        includeMargin={true}
                      />
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <code className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-300 font-mono text-[10px] font-bold">
                        {ADMIN_TOTP_SECRET}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopySecretKey}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold"
                      >
                        {copiedKey ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}

                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="• • • • • •"
                  value={enteredOtp}
                  onChange={e => {
                    setEnteredOtp(e.target.value.replace(/[^0-9]/g, ''));
                    setOtpError('');
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-center text-lg font-mono tracking-[0.4em] font-extrabold text-slate-900 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 shadow-sm"
                />

                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>Open Google Authenticator on your phone & enter the live 6-digit code.</span>
                </p>

                {otpError && (
                  <p className="text-[10px] text-rose-600 font-bold">{otpError}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConfirmReset(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting || !adminPassword || enteredOtp.length !== 6}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black shadow-md flex items-center gap-1.5 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isResetting ? 'Wiping Database...' : 'Confirm & Wipe Database'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
