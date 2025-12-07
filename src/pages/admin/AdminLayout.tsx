import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export function AdminLayout() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar 
        expanded={sidebarExpanded} 
        onToggle={() => setSidebarExpanded(!sidebarExpanded)} 
      />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
