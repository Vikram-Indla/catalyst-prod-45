/**
 * WorkHubLayout — Main layout wrapper for all /projecthub/* routes
 * - Collapsible sidebar using SidebarBase pattern (matches Enterprise)
 * - Top nav already provided by Catalyst shell
 * - Main content area with padding
 * - Caty AI panel (380px right, toggle via sidebar or FAB)
 */

import { Outlet } from 'react-router-dom';
import { WorkHubSidebar } from './WorkHubSidebar';
import { useCatalystContext } from '@/contexts/CatalystContext';
import '@/styles/workhub.module.css';

export function WorkHubLayout() {
  const { sidebarExpanded, setSidebarExpanded } = useCatalystContext();

  return (
    <div className="workhub-module flex h-full w-full">
      {/* Sidebar */}
      <WorkHubSidebar
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(prev => !prev)}
      />

      {/* Main Content Area */}
      <main
        className="flex-1 overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--wh-bg)',
        }}
      >
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
