/**
 * Mock Data Generator Header
 */

import { Database, Sparkles } from 'lucide-react';

export function MockDataHeader() {
  return (
    <div className="border-b border-border bg-card px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Database className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            Mock Data Generator
            <Sparkles className="h-4 w-4 text-amber-500" />
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate, load, and clean demo data safely
          </p>
        </div>
      </div>
    </div>
  );
}
