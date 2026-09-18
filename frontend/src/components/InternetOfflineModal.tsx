import React, { useState, useEffect } from 'react';
import { useSync } from '../context/SyncContext';
import { WifiOff, RefreshCw, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import confetti from 'canvas-confetti';

export const InternetOfflineModal: React.FC = () => {
  const { triggerSync } = useSync();
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [justReconnected, setJustReconnected] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setJustReconnected(true);
        setWasOffline(false);
        setDismissed(false);
        triggerSync().catch(console.warn);
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.1 } });
        const timer = setTimeout(() => {
          setJustReconnected(false);
        }, 4000);
        return () => clearTimeout(timer);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setJustReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline, triggerSync]);

  const handleCheckConnection = async () => {
    setChecking(true);
    try {
      if (navigator.onLine) {
        setIsOnline(true);
        if (wasOffline) {
          setJustReconnected(true);
          setWasOffline(false);
          setDismissed(false);
          triggerSync().catch(console.warn);
          setTimeout(() => setJustReconnected(false), 3000);
        }
      }
    } finally {
      setTimeout(() => setChecking(false), 600);
    }
  };

  return (
    <>
      {/* Toast Notification when Reconnected */}
      {justReconnected && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
          <div className="flex items-center gap-3 bg-emerald-900/95 border-2 border-emerald-500 text-white px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-extrabold text-xs sm:text-sm text-emerald-200">Internet Connection Restored</p>
              <p className="text-[11px] text-emerald-300">Cloud synchronization is active.</p>
            </div>
          </div>
        </div>
      )}

      {/* Non-Blocking Offline Banner at Top of Screen */}
      {!isOnline && !dismissed && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600 text-white px-4 py-2.5 shadow-lg flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded-lg bg-black/20">
              <WifiOff className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold mr-1">Offline Mode:</span>
              <span className="text-amber-100 hidden sm:inline">
                You can continue working normally. Changes are safely saved locally and will sync when reconnected.
              </span>
              <span className="text-amber-100 sm:hidden">
                Local mode active. Data saved safely.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCheckConnection}
              disabled={checking}
              className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-[11px] flex items-center gap-1 transition-all"
            >
              <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Checking...' : 'Retry'}</span>
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-all"
              title="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mini Persistent Pill when Dismissed but Still Offline */}
      {!isOnline && dismissed && (
        <div
          onClick={() => setDismissed(false)}
          className="fixed bottom-4 right-4 z-[9999] bg-amber-600 text-white px-3 py-1.5 rounded-full shadow-lg border border-amber-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-amber-700 transition-all animate-pulse"
          title="Click to view offline status"
        >
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline (Local Saved)</span>
        </div>
      )}
    </>
  );
};
