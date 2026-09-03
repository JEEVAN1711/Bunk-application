import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { restoreDemoCredentials, DEFAULT_USERS, db } from '../../db/db';
import { syncEngine } from '../../sync/syncEngine';
import { User, Customer } from '../../types';
import {
  Fuel,
  Lock,
  UserCheck,
  ShieldCheck,
  ChevronRight,
  User as UserIcon,
  KeyRound,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Smartphone,
  ArrowLeft,
  ShieldAlert,
  Eye,
  EyeOff
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { QRCodeSVG } from 'qrcode.react';
import { getTotpUri, ADMIN_TOTP_SECRET, verifyTotpCode } from '../../services/totpService';

export const LoginPage: React.FC = () => {
  const { validateUser, completeLogin, refreshUsers } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  const [step, setStep] = useState<'CREDENTIALS' | 'OTP'>('CREDENTIALS');
  const [pendingAdmin, setPendingAdmin] = useState<User | null>(null);
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [showQrCode, setShowQrCode] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [customerList, setCustomerList] = useState<Customer[]>([]);

  const loadCustomers = async () => {
    const custs = await db.customers.toArray();
    setCustomerList(custs);
  };

  const handleClearAllCustomers = async () => {
    if (confirm('Permanently delete all test customer records from cloud & browser storage?')) {
      await syncEngine.clearAllCustomersFromCloudAndLocal();
      setCustomerList([]);
      confetti({ particleCount: 40, spread: 60 });
    }
  };

  useEffect(() => {
    loadCustomers();
    const interval = setInterval(loadCustomers, 3000);
    return () => clearInterval(interval);
  }, []);

  const staffAccounts = [
    {
      role: 'ADMIN',
      title: 'Admin / Owner',
      username: 'jeevan',
      name: 'Jeevan',
      badge: 'bg-amber-50 text-amber-800 border-amber-300',
      icon: '👑'
    },
    {
      role: 'CASHIER',
      title: 'Cashier (Mani)',
      username: 'manishanker',
      name: 'Manishanker',
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      icon: '⛽'
    },
    {
      role: 'CASHIER',
      title: 'Cashier (Selvam)',
      username: 'selvam',
      name: 'Selvam',
      badge: 'bg-teal-50 text-teal-800 border-teal-300',
      icon: '⛽'
    }
  ];

  const handleSendAdminOtp = (user: User) => {
    setPendingAdmin(user);
    setStep('OTP');
    setEnteredOtp('');
    setError('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const user = await validateUser(username, password);
      if (!user) {
        setError('Invalid username or password. Please verify and try again.');
        return;
      }

      if (user.role === 'ADMIN') {
        // Admin requires Google/Microsoft Authenticator 2FA
        handleSendAdminOtp(user);
      } else {
        // Staff/Customer direct sign in
        completeLogin(user);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteredOtp || enteredOtp.length < 6) {
      setError('Please enter the complete 6-digit code from Google Authenticator.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const isValid = verifyTotpCode(enteredOtp, pendingAdmin?.username || 'jeevan');
      if (isValid && pendingAdmin) {
        confetti({ particleCount: 70, spread: 80 });
        completeLogin(pendingAdmin);
      } else {
        setError('Invalid 6-digit code. Please enter the current code shown in your Google Authenticator app.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecretKey = () => {
    navigator.clipboard.writeText(ADMIN_TOTP_SECRET);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleRestoreCredentials = async () => {
    setRestoring(true);
    try {
      await restoreDemoCredentials();
      await syncEngine.syncAllLocalDataToCloud();
      await refreshUsers();
      setRestoreSuccess(true);
      confetti({ particleCount: 50, spread: 60 });
      setTimeout(() => setRestoreSuccess(false), 3000);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#080c14] relative overflow-y-auto py-10">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl relative z-10 space-y-5 animate-in fade-in zoom-in-95">
        {/* Station Image Banner */}
        <div className="text-center space-y-2">
          <div className="relative h-24 w-full rounded-2xl overflow-hidden mb-2 border border-slate-700/80 shadow-inner group">
            <img
              src="/assets/bunk_bg.jpg"
              alt="Bharat Petroleum Bunk"
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex items-end justify-between p-2.5">
              <span className="text-[10px] font-extrabold text-amber-300 flex items-center gap-1 drop-shadow">
                <Fuel className="w-3.5 h-3.5 text-emerald-400" />
                Bharat Petroleum Edition
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700">
                2FA & Cloud Ready
              </span>
            </div>
          </div>

          <h2 className="font-extrabold text-xl text-slate-100">
            {step === 'OTP' ? 'Admin 2FA Authenticator' : 'BUNK PRO Sign In'}
          </h2>
          <p className="text-xs text-slate-400">
            {step === 'OTP'
              ? 'Enter the 6-digit code from Google / Microsoft Authenticator app on your phone'
              : 'Authenticate with your account username and password'}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-600 text-rose-300 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        {restoreSuccess && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-xs font-semibold text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Default demo credentials restored & synced to cloud!</span>
          </div>
        )}

        {step === 'CREDENTIALS' ? (
          <>
            {/* Quick Role Selector */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              {/* Staff Accounts */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Station Staff Accounts:</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Admin & Cashiers</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {staffAccounts.map(demo => {
                    const defaultAcc = DEFAULT_USERS.find(u => u.username.toLowerCase() === demo.username.toLowerCase());
                    return (
                      <button
                        key={demo.username}
                        type="button"
                        onClick={() => {
                          setUsername(demo.username);
                          if (defaultAcc?.password) {
                            setPassword(defaultAcc.password);
                          }
                          setError('');
                        }}
                        className={`p-2 rounded-xl border text-left transition-all group flex flex-col justify-between ${
                          username === demo.username
                            ? 'bg-slate-800/90 border-emerald-500 shadow-md ring-1 ring-emerald-500/40'
                            : 'bg-slate-950 hover:bg-slate-800/80 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1 truncate">
                            <span>{demo.icon}</span>
                            <span className="truncate">{demo.title}</span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-slate-400">
                          <span className="font-mono text-emerald-400 font-semibold">@{demo.username}</span>
                          <span className={`px-1 py-0.2 rounded text-[7px] font-bold border ${demo.badge}`}>
                            {demo.role}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Registered Customer Accounts (Added Manually by Admin) */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                    <span>🚛</span>
                    <span>Registered Customer Portals:</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">
                      {customerList.length > 0 ? `${customerList.length} Customer(s)` : '0 Registered'}
                    </span>
                    {customerList.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllCustomers}
                        className="text-[10px] text-rose-400 hover:text-rose-300 font-bold hover:underline"
                        title="Delete all test customer records from local storage"
                      >
                        (Clear All)
                      </button>
                    )}
                  </div>
                </div>

                {customerList.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
                    {customerList.map(cust => {
                      const custLoginUser = cust.phoneNumber.replace(/\D/g, '') || cust.name.toLowerCase().replace(/\s+/g, '');
                      return (
                        <button
                          key={cust.id}
                          type="button"
                          onClick={() => {
                            setUsername(cust.phoneNumber);
                            setPassword('Customer@123');
                            setError('');
                          }}
                          className={`p-2 rounded-xl border text-left transition-all flex items-center justify-between ${
                            username === cust.phoneNumber || username === custLoginUser
                              ? 'bg-sky-950/80 border-sky-500 shadow-md ring-1 ring-sky-500/40'
                              : 'bg-slate-950 hover:bg-slate-800/80 border-slate-800'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <p className="text-[11px] font-bold text-slate-200 truncate flex items-center gap-1">
                              <span>🏢</span>
                              <span className="truncate">{cust.name}</span>
                            </p>
                            <p className="text-[9px] font-mono text-sky-400">
                              {cust.phoneNumber}
                            </p>
                          </div>
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-sky-900/60 text-sky-300 border border-sky-700 whitespace-nowrap">
                            Passbook
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center">
                    <p className="text-[10px] text-slate-400">
                      No customers registered yet. Once added in <strong>Admin $\rightarrow$ Staff & Customer Management</strong>, customer names will appear here.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-300 uppercase tracking-wider text-[10px] mb-1.5">
                  Account Username
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Enter username (e.g. jeevan or admin)"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                    Account Password
                  </label>
                  {username && DEFAULT_USERS.find(u => u.username.toLowerCase() === username.toLowerCase())?.password && (
                    <button
                      type="button"
                      onClick={() => {
                        const def = DEFAULT_USERS.find(u => u.username.toLowerCase() === username.toLowerCase());
                        if (def?.password) setPassword(def.password);
                      }}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 hover:underline"
                    >
                      <Sparkles className="w-3 h-3" />
                      Auto-fill password
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold text-xs transition-all shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{loading ? 'Verifying...' : 'Sign In With Credentials'}</span>
              </button>
            </form>
          </>
        ) : (
          /* Google / Microsoft Authenticator TOTP Form for Admin */
          <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs animate-in fade-in">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/40">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-100">
                Google / Microsoft Authenticator (2FA)
              </h3>
              <p className="text-slate-400 text-xs">
                Open Google Authenticator on your phone and enter the live 6-digit code for <strong>{pendingAdmin?.fullName}</strong>
              </p>
            </div>

            {/* QR Code & Mobile 1-Tap Setup Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 text-center space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  Authenticator Setup
                </span>
                <button
                  type="button"
                  onClick={() => setShowQrCode(!showQrCode)}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-200"
                >
                  {showQrCode ? 'Collapse QR' : 'Expand QR'}
                </button>
              </div>

              {/* High Contrast QR Code Display */}
              <div className="p-4 bg-white rounded-2xl inline-block shadow-2xl border-4 border-emerald-500/20">
                <QRCodeSVG
                  value={getTotpUri(pendingAdmin?.username || 'jeevan')}
                  size={180}
                  level="M"
                  includeMargin={true}
                />
              </div>

              {/* 1-Tap Mobile App Link (For users logging in on mobile phone) */}
              <div className="space-y-2">
                <a
                  href={getTotpUri(pendingAdmin?.username || 'jeevan')}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Tap to Open in Google Authenticator</span>
                </a>

                {/* Manual Secret Key */}
                <div className="flex items-center justify-center gap-2 pt-1">
                  <span className="text-[10px] text-slate-400">Manual Key:</span>
                  <code className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-amber-300 font-mono text-[11px] font-bold">
                    {ADMIN_TOTP_SECRET}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopySecretKey}
                    className="px-2.5 py-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 text-[10px] font-bold"
                  >
                    {copiedKey ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-300 uppercase tracking-wider text-[10px] mb-1.5 text-center">
                Enter 6-Digit Authenticator Code
              </label>
              <input
                type="text"
                maxLength={6}
                autoFocus
                required
                placeholder="• • • • • •"
                value={enteredOtp}
                onChange={e => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center tracking-[0.5em] font-mono font-extrabold text-2xl bg-slate-950 border border-emerald-500/60 rounded-xl py-3 text-emerald-300 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            <button
              type="submit"
              disabled={enteredOtp.length !== 6 || loading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold text-xs transition-all shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loading ? 'Verifying...' : 'Verify Code & Access Admin Portal'}</span>
            </button>

            <div className="flex items-center justify-center pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setStep('CREDENTIALS');
                  setError('');
                }}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Login Screen</span>
              </button>
            </div>
          </form>
        )}

        {/* Quick Account Switcher & Reset Helper */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <p className="text-[10px] text-slate-500">Need demo accounts restored?</p>
          <button
            type="button"
            onClick={handleRestoreCredentials}
            disabled={restoring}
            className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 hover:underline disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${restoring ? 'animate-spin' : ''}`} />
            <span>{restoring ? 'Restoring...' : 'Restore Default Accounts'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};


