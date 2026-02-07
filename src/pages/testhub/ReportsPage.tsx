/**
 * Reports Page — TestHub Module
 * Route: /testhub/reports
 */

import { BarChart3 } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">Reports</h1>
      </div>
      <div className="bg-muted/30 border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">Reports and analytics coming soon.</p>
      </div>
    </div>
  );
}
