/**
 * WorkHubLayout — Main layout wrapper for all /projecthub/* routes
 * Sidebar is now rendered by CatalystShell (matching TestHub pattern).
 * This layout only handles the main content area.
 */

import { Outlet } from 'react-router-dom';
import '@/styles/workhub.module.css';

export function WorkHubLayout() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Outlet />
    </div>
  );
}
