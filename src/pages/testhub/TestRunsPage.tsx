/**
 * Test Runs Page — TestHub Module
 * Route: /testhub/runs
 */

import { Beaker } from 'lucide-react';

export default function TestRunsPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/10 p-8">
      <Beaker className="w-16 h-16 mb-4 opacity-30" />
      <h2 className="text-lg font-semibold mb-2 text-foreground">Test Runs</h2>
      <p className="text-sm text-center max-w-md">
        View and manage individual test run instances. Coming soon.
      </p>
    </div>
  );
}
