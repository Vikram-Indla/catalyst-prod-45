/**
 * Test Management Content Layout
 * Simple content wrapper - sidebar is provided by CatalystShell via TestManagementSidebar
 * 
 * CATALYST CONTRACT: Breadcrumb-only title format (TM / PageName)
 */

import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';

interface BreadcrumbTitle {
  parent: string;
  current: string;
}

const getTMBreadcrumb = (pathname: string): BreadcrumbTitle | null => {
  const parent = 'TM';
  
  if (pathname.startsWith('/tests/command-center')) return { parent, current: 'Command Center' };
  if (pathname.startsWith('/tests/cases')) return { parent, current: 'Test Cases' };
  if (pathname.startsWith('/tests/my-work')) return { parent, current: 'My Work' };
  if (pathname.startsWith('/tests/cycles/')) return { parent, current: 'Cycle Details' };
  if (pathname.startsWith('/tests/cycles')) return { parent, current: 'Test Cycles' };
  if (pathname.startsWith('/tests/defects')) return { parent, current: 'Defects' };
  if (pathname.startsWith('/tests/reports')) return { parent, current: 'Reports' };
  if (pathname.startsWith('/tests/settings')) return { parent, current: 'Settings' };
  return { parent, current: 'Command Center' };
};

export function TestManagementContent() {
  const location = useLocation();
  const breadcrumb = getTMBreadcrumb(location.pathname);

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-surface-1">
      {/* Breadcrumb title row (52px) — Catalyst Contract: PARENT / CURRENT format */}
      {breadcrumb && (
        <header
          className="flex items-center border-b"
          style={{
            height: '52px',
            borderColor: 'var(--divider, hsl(var(--border)))',
          }}
        >
          <div className="px-6">
            <h1 className="text-lg font-semibold text-text-primary">
              <span className="text-muted-foreground">{breadcrumb.parent}</span>
              <span className="text-muted-foreground mx-2">/</span>
              <span>{breadcrumb.current}</span>
            </h1>
          </div>
        </header>
      )}

      {/* Page content scroll region */}
      <div className={`flex-1 min-h-0 overflow-auto ${breadcrumb ? '' : ''}`}>
        <Outlet />
      </div>
    </div>
  );
}

export default TestManagementContent;
