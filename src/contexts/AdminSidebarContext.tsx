import { createContext, useContext, useState, ReactNode } from 'react';

interface AdminSidebarContextType {
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  collapse: () => void;
}

const AdminSidebarContext = createContext<AdminSidebarContextType | undefined>(undefined);

export function AdminSidebarProvider({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(true);

  const collapse = () => setExpanded(false);

  return (
    <AdminSidebarContext.Provider value={{ expanded, setExpanded, collapse }}>
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
