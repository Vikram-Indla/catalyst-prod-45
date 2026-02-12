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
import { CatyPanel } from '../caty/CatyPanel';
import { CatyFAB } from '../caty/CatyFAB';
import '@/styles/workhub.module.css';

export function WorkHubLayout() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [catyOpen, setCatyOpen] = useState(false);

  return (
    <div className="workhub-module flex h-full w-full">
      {/* Sidebar */}
      <WorkHubSidebar
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        catyOpen={catyOpen}
        onCatyToggle={() => setCatyOpen(!catyOpen)}
      />

      {/* Main Content Area */}
      <main
        className="flex-1 overflow-y-auto"
        style={{
          backgroundColor: 'var(--wh-bg)',
          padding: '24px',
        }}
      >
        <Outlet />
      </main>

      {/* Caty AI Panel */}
      <CatyPanel isOpen={catyOpen} onClose={() => setCatyOpen(false)} />

      {/* Caty FAB */}
      <CatyFAB isOpen={catyOpen} onClick={() => setCatyOpen(!catyOpen)} />
    </div>
  );
}
