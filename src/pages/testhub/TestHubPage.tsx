/**
 * TestHub Landing Page — Test Case Repository & Execution Hub
 * Route: /testhub/*
 * 
 * This is the main layout wrapper for TestHub module.
 * Uses TestHubSidebar for navigation with collapsible state.
 */

import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { TestHubSidebar } from '@/components/layout/TestHubSidebar';

export default function TestHubPage() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const location = useLocation();

  // Redirect /testhub to /testhub/dashboard
  if (location.pathname === '/testhub') {
    return <Navigate to="/testhub/dashboard" replace />;
  }

  return (
    <div className="flex h-full overflow-hidden">
      <TestHubSidebar 
        expanded={sidebarExpanded} 
        onToggle={() => setSidebarExpanded(!sidebarExpanded)} 
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
