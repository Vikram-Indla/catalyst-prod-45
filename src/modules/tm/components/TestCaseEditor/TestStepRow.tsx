/**
 * Test Step Row - For adding/editing test steps
 */

import React from 'react';
import { Plus } from 'lucide-react';

interface TestStepRowProps {
  isEmpty?: boolean;
  onAdd?: () => void;
}

export function TestStepRow({ isEmpty = true, onAdd }: TestStepRowProps) {
  if (isEmpty) {
    return (
      <button
        onClick={onAdd}
        className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-lg border-2 border-dashed text-[var(--text-4)] hover:text-[var(--text-2)] hover:border-[var(--text-4)] transition-colors"
        style={{ borderColor: 'var(--stroke-1)', borderRadius: '8px', transitionDuration: '150ms' }}
      >
        <Plus className="h-4 w-4" />
        <span className="text-sm font-medium">Add Test Step</span>
      </button>
    );
  }

  return null;
}

export default TestStepRow;
