import { Outlet } from 'react-router-dom';
import { AdminSidebarV2 } from '@/components/admin/AdminSidebarV2';
import { AdminSidebarProvider, useAdminSidebar } from '@/contexts/AdminSidebarContext';
import { CatalystHeader } from '@/components/ja/CatalystHeader';

function AdminLayoutContent() {
  const { expanded, setExpanded } = useAdminSidebar();

  return (
    <div className="flex flex-col h-screen bg-background">
      <CatalystHeader />
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebarV2 
          expanded={expanded} 
          onToggle={() => setExpanded(!expanded)} 
        />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AdminLayout() {
  return (
    <AdminSidebarProvider>
      <AdminLayoutContent />
    </AdminSidebarProvider>
  );
}
