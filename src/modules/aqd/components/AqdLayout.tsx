// AQD Layout with Taskhub Sidebar
import React, { useState } from 'react';
import { PlannerSidebar } from '@/modules/planner/components/PlannerSidebar';

interface AqdLayoutProps {
  children: React.ReactNode;
}

export function AqdLayout({ children }: AqdLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-full min-h-0" style={{ backgroundColor: 'var(--bg, #f8fafc)' }}>
      <PlannerSidebar
        expanded={!sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="flex-1 min-w-0 overflow-auto">
        {children}
      </div>
    </div>
  );
}
