import { Outlet } from 'react-router-dom';
import { AdminSidebarV2 } from '@/components/admin/AdminSidebarV2';
import { AdminSidebarProvider, useAdminSidebar } from '@/contexts/AdminSidebarContext';

function AdminLayoutContent() {
  const { expanded, setExpanded } = useAdminSidebar();

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebarV2 
        expanded={expanded} 
        onToggle={() => setExpanded(!expanded)} 
      />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
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
