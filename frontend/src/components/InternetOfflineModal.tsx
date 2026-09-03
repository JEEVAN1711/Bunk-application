import React, { useState, useEffect } from 'react';
import { useSync } from '../context/SyncContext';
import { WifiOff, Wifi, RefreshCw, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';

export const InternetOfflineModal: React.FC = () => {
  const { isOnline, triggerSync } = useSync();
  const [onlineState, setOnlineState] = useState<boolean>(navigator.onLine);
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [justReconnected, setJustReconnected] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(false);
  const [offlineSince, setOfflineSince] = useState<Date | null>(null);

  // Test real internet reachability (probes external public endpoints instead of localhost)
  const probeRealInternet = async (): Promise<boolean> => {
    if (!navigator.onLine) return false;
    try {
      // Fetch public lightweight icon with no-cors and cache busting
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      await fetch(`https://www.google.com/favicon.ico?_=${Date.now()}`, {
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return true;
    } catch {
      // Secondary probe fallback
      try {
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 3500);
        await fetch(`https://cloudflare.com/cdn-cgi/trace?_=${Date.now()}`, {
          mode: 'no-cors',
          cache: 'no-store',
          signal: controller2.signal
        });
        clearTimeout(timeoutId2);
        return true;
      } catch {
        return false;
      }
    }
  };

  // Monitor network online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      const reachable = await probeRealInternet();
      if (reachable) {
        setOnlineState(true);
        if (wasOffline) {
          setJustReconnected(true);
          triggerSync().catch(console.warn);
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
          const timer = setTimeout(() => {
            setJustReconnected(false);
            setWasOffline(false);
            setOfflineSince(null);
          }, 3000);
          return () => clearTimeout(timer);
        }
      } else {
        setOnlineState(false);
        setWasOffline(true);
        if (!offlineSince) setOfflineSince(new Date());
      }
    };

    const handleOffline = () => {
      setOnlineState(false);
      setWasOffline(true);
      setJustReconnected(false);
      setOfflineSince(new Date());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) {
      handleOffline();
    } else {
      probeRealInternet().then(reachable => {
        if (!reachable) handleOffline();
      });
    }

    // Periodic heartbeat every 2.5 seconds to detect cable/wifi disconnects immediately
    const interval = setInterval(async () => {
      if (!navigator.onLine) {
        setOnlineState(false);
        setWasOffline(true);
        if (!offlineSince) setOfflineSince(new Date());
        return;
      }

      const reachable = await probeRealInternet();
      if (!reachable) {
        setOnlineState(false);
        setWasOffline(true);
        if (!offlineSince) setOfflineSince(new Date());
      } else if (!onlineState) {
        setOnlineState(true);
        setJustReconnected(true);
        triggerSync().catch(console.warn);
        confetti({ particleCount: 40, spread: 60 });
        setTimeout(() => {
          setJustReconnected(false);
          setWasOffline(false);
          setOfflineSince(null);
        }, 2500);
      }
    }, 2500);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [wasOffline, onlineState, offlineSince, triggerSync]);

  const handleManualCheck = async () => {
    setChecking(true);
    try {
      const reachable = await probeRealInternet();
      if (reachable) {
        setOnlineState(true);
        setJustReconnected(true);
        triggerSync().catch(console.warn);
        confetti({ particleCount: 50, spread: 70 });
        setTimeout(() => {
          setJustReconnected(false);
          setWasOffline(false);
          setOfflineSince(null);
        }, 2500);
      } else {
        setOnlineState(false);
        setWasOffline(true);
        if (!offlineSince) setOfflineSince(new Date());
      }
    } finally {
      setTimeout(() => setChecking(false), 800);
    }
  };

  const isActuallyOffline = !onlineState || !isOnline;

  return (
    <>
      {/* Toast Notification when Reconnected */}
      {justReconnected && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[10000] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 bg-emerald-950/95 border-2 border-emerald-500 text-white px-6 py-3.5 rounded-2xl shadow-2xl shadow-emerald-900/50 backdrop-blur-md">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce" />
            </div>
            <div>
              <p className="font-extrabold text-sm text-emerald-200">Internet Connection Restored!</p>
              <p className="text-xs text-emerald-400/90 font-medium">
                You can now use all features of the application normally.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Blocking Modal when Disconnected */}
      {isActuallyOffline && !justReconnected && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none animate-in fade-in duration-200"
          style={{ touchAction: 'none' }}
        >
          {/* Modal Container */}
          <div className="w-full max-w-md bg-slate-900 border-2 border-rose-500/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-rose-950/80 relative z-10 text-center space-y-6 animate-in zoom-in-95 duration-200">
            {/* Animated Radar WiFi-Off Icon */}
            <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 bg-rose-500/20 rounded-full animate-ping pointer-events-none"></div>
              <div className="absolute -inset-2 bg-rose-500/10 rounded-full animate-pulse pointer-events-none"></div>
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-600 to-red-700 text-white flex items-center justify-center shadow-lg shadow-rose-900/60 border border-rose-400">
                <WifiOff className="w-10 h-10 animate-pulse" />
              </div>
            </div>

            {/* Heading & Notice */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/90 text-rose-300 border border-rose-700 text-[11px] font-extrabold uppercase tracking-wider">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Internet Disconnected</span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                No Internet Connection
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                The internet has been disconnected. You will be able to use and operate this page once your internet connection is restored.
              </p>
            </div>

            {/* Status Information Box */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5 text-left text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Network Status:</span>
                <span className="font-bold text-rose-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  Offline / Disconnected
                </span>
              </div>
              {offlineSince && (
                <div className="flex items-center justify-between text-slate-400">
                  <span>Disconnected At:</span>
                  <span className="font-mono text-slate-300 font-semibold">
                    {offlineSince.toLocaleTimeString()}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Please check your Wi-Fi, Ethernet, or mobile hotspot connection. The screen will automatically unblock once connected.
                </span>
              </div>
            </div>

            {/* Retry Action */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleManualCheck}
                disabled={checking}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 disabled:opacity-50 text-white font-extrabold text-sm transition-all shadow-lg shadow-rose-950/60 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                <span>{checking ? 'Checking Connection...' : 'Check Connection Again'}</span>
              </button>
              <p className="text-[11px] text-slate-500 font-medium">
                Auto-reconnecting every few seconds in background...
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
