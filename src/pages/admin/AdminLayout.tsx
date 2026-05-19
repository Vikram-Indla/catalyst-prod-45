import { Outlet } from 'react-router-dom';

/**
 * AdminLayout — admin content surface ONLY.
 *
 * The admin sidebar is rendered by CatalystShell's sidebar slot for any
 * /admin/* route (see CatalystShell.tsx ~L471). This layout MUST NOT
 * render AdminSidebarV2 itself — doing so produces a double sidebar
 * (RCA 2026-05-19).
 *
 * Single source of truth for sidebar mounting: CatalystShell.
 * Single source of truth for /admin/* route registration: FullAppRoutes.
 */
export function AdminLayout() {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        height: '100%',
        overflowY: 'auto',
        background: '#FFFFFF',
      }}
    >
      <Outlet />
    </div>
  );
}
