/**
 * TestHub Dashboard Page
 * Route: /testhub/dashboard
 */

import { LayoutDashboard } from 'lucide-react';

export default function TestHubDashboardPage() {
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="flex items-center gap-3 mb-6">
        <LayoutDashboard className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">TestHub Dashboard</h1>
      </div>
      <div className="bg-muted/30 border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">Dashboard metrics and overview coming soon.</p>
      </div>
    </div>
  );
}
