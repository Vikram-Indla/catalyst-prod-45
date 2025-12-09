import { createContext, useContext, ReactNode } from 'react';
import { StrategicSnapshot } from '@/hooks/useStrategicSnapshots';

interface SnapshotContextValue {
  currentSnapshot: StrategicSnapshot | null;
  isReadOnly: boolean;
  isArchived: boolean;
  isActive: boolean;
  isDraft: boolean;
}

const SnapshotContext = createContext<SnapshotContextValue>({
  currentSnapshot: null,
  isReadOnly: false,
  isArchived: false,
  isActive: false,
  isDraft: false,
});

interface SnapshotProviderProps {
  snapshot: StrategicSnapshot | null;
  children: ReactNode;
}

export function SnapshotProvider({ snapshot, children }: SnapshotProviderProps) {
  const isArchived = snapshot?.status === 'ARCHIVED';
  const isActive = snapshot?.status === 'ACTIVE';
  const isDraft = snapshot?.status === 'DRAFT';
  const isReadOnly = isArchived;

  return (
    <SnapshotContext.Provider value={{
      currentSnapshot: snapshot,
      isReadOnly,
      isArchived,
      isActive,
      isDraft,
    }}>
      {children}
    </SnapshotContext.Provider>
  );
}

export function useSnapshotContext() {
  return useContext(SnapshotContext);
}

export function useIsSnapshotReadOnly() {
  const { isReadOnly } = useSnapshotContext();
  return isReadOnly;
}
