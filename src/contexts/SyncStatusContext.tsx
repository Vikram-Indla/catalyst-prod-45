import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline';

interface SyncStatusContextValue {
  status: SyncStatus;
  pendingChanges: number;
  lastSyncedAt: Date | null;
  setSyncing: () => void;
  setSynced: () => void;
  setError: (message: string) => void;
  setOffline: () => void;
  errorMessage: string | null;
}

const SyncStatusContext = createContext<SyncStatusContextValue | null>(null);

export function SyncStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SyncStatus>('synced');
  const [pendingChanges, setPendingChanges] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const setSyncing = useCallback(() => {
    setStatus('syncing');
    setPendingChanges(prev => prev + 1);
  }, []);
  
  const setSynced = useCallback(() => {
    setPendingChanges(prev => {
      const newCount = Math.max(0, prev - 1);
      if (newCount === 0) {
        setStatus('synced');
        setLastSyncedAt(new Date());
      }
      return newCount;
    });
    setErrorMessage(null);
  }, []);
  
  const setError = useCallback((message: string) => {
    setStatus('error');
    setErrorMessage(message);
  }, []);
  
  const setOffline = useCallback(() => {
    setStatus('offline');
  }, []);
  
  const value = useMemo(() => ({
    status,
    pendingChanges,
    lastSyncedAt,
    setSyncing,
    setSynced,
    setError,
    setOffline,
    errorMessage,
  }), [status, pendingChanges, lastSyncedAt, setSyncing, setSynced, setError, setOffline, errorMessage]);

  return (
    <SyncStatusContext.Provider value={value}>
      {children}
    </SyncStatusContext.Provider>
  );
}

export function useSyncStatus() {
  const context = useContext(SyncStatusContext);
  if (!context) {
    throw new Error('useSyncStatus must be used within SyncStatusProvider');
  }
  return context;
}
