import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';

const T = {
  border: 'var(--ds-border, #DCDFE4)',
  bgPage: 'var(--ds-background-accent-gray-subtlest, #F7F8F9)',
};

export function AdminLayout() {
  return (
    <div style={{ height: '100%', display: 'flex', background: T.bgPage }}>
      {/* Sidebar */}
      <div style={{
        width: '240px',
        background: 'var(--cp-bg-elevated, #ffffff)',
        borderRight: `1px solid ${T.border}`,
        overflowY: 'auto',
        padding: '12px 0',
      }}>
        <AdminSidebar />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        <Outlet />
      </div>
    </div>
  );
}
