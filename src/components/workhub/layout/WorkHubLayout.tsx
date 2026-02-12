/**
 * WorkHubLayout — Main layout wrapper for all /projecthub/* routes
 * - Collapsible sidebar using SidebarBase pattern (matches Enterprise)
 * - Top nav already provided by Catalyst shell
 * - Main content area with padding
 * - Caty AI panel (380px right, toggle via sidebar or FAB)
 */

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { WorkHubSidebar } from './WorkHubSidebar';
import '@/styles/workhub.module.css';

export function WorkHubLayout() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  return (
    <div className="workhub-module flex h-full w-full">
      {/* Sidebar */}
      <WorkHubSidebar
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
      />

      {/* Main Content Area */}
      <main
        className="flex-1 overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--wh-bg)',
          padding: '24px',
        }}
      >
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
