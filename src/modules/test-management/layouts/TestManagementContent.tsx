/**
 * Test Management Content Layout
 * Simple content wrapper - sidebar is provided by CatalystShell via TestManagementSidebar
 */

import React from 'react';
import { Outlet } from 'react-router-dom';

export function TestManagementContent() {
  return (
    <div className="flex-1 h-full overflow-auto bg-surface-1">
      <Outlet />
    </div>
  );
}

export default TestManagementContent;
