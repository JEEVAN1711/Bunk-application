import React, { createContext, useContext, useState, useEffect } from 'react';
import { syncEngine, SyncState } from '../sync/syncEngine';

interface SyncContextType {
  status: SyncState;
  pendingCount: number;
  triggerSync: () => Promise<void>;
  isOnline: boolean;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<SyncState>(navigator.onLine ? 'ONLINE' : 'OFFLINE');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = syncEngine.subscribe((newStatus, count) => {
      setStatus(newStatus);
      setPendingCount(count);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const triggerSync = async () => {
    await syncEngine.triggerSync();
  };

  return (
    <SyncContext.Provider
      value={{
        status,
        pendingCount,
        triggerSync,
        isOnline
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used within a SyncProvider');
  return context;
};
