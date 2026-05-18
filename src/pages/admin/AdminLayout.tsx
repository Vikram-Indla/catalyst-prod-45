import { Outlet } from 'react-router-dom';
import { AdminSidebarV2 } from '@/components/admin/AdminSidebarV2';

/**
 * AdminLayout — Jira admin parity (probed 2026-05-19).
 *
 * Two-column shell: 240px Jira-style sidebar + white main content surface.
 * The sidebar (AdminSidebarV2) owns its own border-right; this layout
 * intentionally has no inner padding around either column so leaf pages
 * can manage their own page padding (Jira-style 24-32px) just like
 * Atlassian's settings surfaces.
 */
export function AdminLayout() {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        background: '#FFFFFF',
      }}
    >
      <AdminSidebarV2 expanded={true} onToggle={() => {}} />

      {/* Main content surface */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          overflowY: 'auto',
          background: '#FFFFFF',
        }}
      >
        <Outlet />
      </div>
    </div>
  );
}
