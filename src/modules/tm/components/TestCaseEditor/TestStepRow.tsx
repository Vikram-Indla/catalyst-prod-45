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
        className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-lg border-2 border-dashed text-neutral-400 hover:text-neutral-600 hover:border-neutral-300 transition-colors"
        style={{ borderColor: '#e5e5e5' }}
      >
        <Plus className="h-4 w-4" />
        <span className="text-sm font-medium">Add Test Step</span>
      </button>
    );
  }

  return null;
}

export default TestStepRow;
