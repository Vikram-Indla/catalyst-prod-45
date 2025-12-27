import { create } from 'zustand';

interface EFDStore {
  currentSessionId: string | null;
  isSaving: boolean;
  lastSaved: Date | null;
  
  setCurrentSessionId: (id: string | null) => void;
  setIsSaving: (saving: boolean) => void;
  setLastSaved: (date: Date | null) => void;
}

export const useEFDStore = create<EFDStore>((set) => ({
  currentSessionId: null,
  isSaving: false,
  lastSaved: null,
  
  setCurrentSessionId: (id) => set({ currentSessionId: id }),
  setIsSaving: (saving) => set({ isSaving: saving }),
  setLastSaved: (date) => set({ lastSaved: date }),
}));
