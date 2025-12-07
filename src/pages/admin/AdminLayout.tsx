import { Outlet } from 'react-router-dom';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminSidebarProvider, useAdminSidebar } from '@/contexts/AdminSidebarContext';

function AdminLayoutContent() {
  const { expanded, setExpanded } = useAdminSidebar();

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar 
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
