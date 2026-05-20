/**
 * TestHub Landing Page — Test Case Repository & Execution Hub
 * Route: /testhub/*
 * 
 * This is the main layout wrapper for TestHub module.
 * Sidebar is handled by CatalystShell to avoid duplicate sidebars.
 */

import { Outlet, Navigate, useLocation } from 'react-router-dom';

export default function TestHubPage() {
  const location = useLocation();

  // Redirect /testhub to /testhub/dashboard
  if (location.pathname === '/testhub') {
    return <Navigate to="/testhub/dashboard" replace />;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Outlet />
    </div>
  );
}
