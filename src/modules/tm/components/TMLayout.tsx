/**
 * TM Layout - Main layout wrapper for Test Management module
 * Contains Sidebar + TopBar + Content area
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { TMSidebar } from './TMSidebar';

export function TMLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-1)]">
      {/* Sidebar - Fixed 220px */}
      <TMSidebar />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}

export default TMLayout;
