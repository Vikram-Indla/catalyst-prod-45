/**
 * Resource360Page — Resource utilization placeholder
 */

import { Users } from 'lucide-react';

export function Resource360Page() {
  return (
    <div className="min-h-screen">
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <div className="text-center max-w-2xl">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: 'var(--wh-primary-light)' }}
          >
            <Users
              className="w-10 h-10"
              style={{ color: 'var(--wh-primary)' }}
            />
          </div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{
              fontFamily: 'var(--wh-font-display)',
              color: 'var(--wh-text-primary)',
            }}
          >
            Resource 360
          </h1>
          <p className="text-base mb-8" style={{ color: 'var(--wh-text-secondary)' }}>
            Team workload, utilization, and assignment overview
          </p>
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border"
            style={{
              backgroundColor: 'var(--wh-warning-light)',
              borderColor: 'var(--wh-warning)',
              color: 'var(--wh-warning)',
            }}
          >
            <span className="text-sm font-medium">Coming in Phase 6</span>
          </div>
        </div>
      </div>
    </div>
  );
}
