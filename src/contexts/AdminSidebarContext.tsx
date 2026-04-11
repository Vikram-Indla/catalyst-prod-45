import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

interface AdminSidebarContextType {
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  collapse: () => void;
}

const AdminSidebarContext = createContext<AdminSidebarContextType | undefined>(undefined);

export function AdminSidebarProvider({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(true);

  const collapse = useCallback(() => setExpanded(false), []);

  const value = useMemo(() => ({ expanded, setExpanded, collapse }), [expanded, collapse]);

  return (
    <AdminSidebarContext.Provider value={value}>
      {children}
    </AdminSidebarContext.Provider>
  );
}

export function useAdminSidebar() {
  const context = useContext(AdminSidebarContext);
  if (context === undefined) {
    throw new Error('useAdminSidebar must be used within an AdminSidebarProvider');
  }
  return context;
}
