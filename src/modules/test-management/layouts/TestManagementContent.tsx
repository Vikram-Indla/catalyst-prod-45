/**
 * Test Management Content Layout
 * Simple content wrapper - sidebar is provided by CatalystShell via TestManagementSidebar
 */

import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';

const getTMTitle = (pathname: string) => {
  if (pathname.startsWith('/tests/my-work')) return 'My Work';
  if (pathname.startsWith('/tests/cases')) return 'Test Cases';
  if (pathname.startsWith('/tests/cycles/')) return 'Cycle Details';
  if (pathname.startsWith('/tests/cycles')) return 'Test Cycles';
  if (pathname.startsWith('/tests/defects')) return 'Defects';
  if (pathname.startsWith('/tests/reports')) return 'Reports';
  if (pathname.startsWith('/tests/settings')) return 'Settings';
  return 'Tests';
};

export function TestManagementContent() {
  const location = useLocation();
  const title = getTMTitle(location.pathname);

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-surface-1">
      {/* Module header row (52px) — aligns divider with left sidebar */}
      <header
        className="flex items-center"
        style={{
          height: '52px',
          borderBottom: '1px solid var(--divider)',
        }}
      >
        <div className="px-6">
          <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
        </div>
      </header>

      {/* Page content scroll region */}
      <div className="flex-1 min-h-0 overflow-auto p-6">
        <Outlet />
      </div>
    </div>
  );
}

export default TestManagementContent;
