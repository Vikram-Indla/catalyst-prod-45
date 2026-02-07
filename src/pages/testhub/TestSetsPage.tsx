/**
 * Test Sets Page — TestHub Module
 * Route: /testhub/test-sets
 */

import { Layers } from 'lucide-react';

export default function TestSetsPage() {
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="flex items-center gap-3 mb-6">
        <Layers className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">Test Sets</h1>
      </div>
      <div className="bg-muted/30 border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">Test Sets management coming soon.</p>
      </div>
    </div>
  );
}
