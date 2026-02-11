/**
 * ResourceDetail — Resource detail drawer placeholder
 */

import { Users } from 'lucide-react';

export function ResourceDetail() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ backgroundColor: 'var(--wh-primary-light)' }}
      >
        <Users
          className="w-8 h-8"
          style={{ color: 'var(--wh-primary)' }}
        />
      </div>
      <h2
        className="text-xl font-bold mb-2"
        style={{ color: 'var(--wh-text-primary)' }}
      >
        Resource Details
      </h2>
      <p style={{ color: 'var(--wh-text-secondary)' }}>Coming in Phase 6</p>
    </div>
  );
}
