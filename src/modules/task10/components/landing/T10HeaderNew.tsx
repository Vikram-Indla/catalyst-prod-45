// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10HeaderNew
// Purpose: Minimal Linear-inspired header with logo + action button (NO avatar)
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Plus } from 'lucide-react';

interface T10HeaderNewProps {
  onNewList: () => void;
}

export function T10HeaderNew({ onNewList }: T10HeaderNewProps) {
  return (
    <header className="t10-header-minimal">
      {/* Logo: Text only */}
      <div className="t10-logo-minimal">
        <span className="t10-logo-text-minimal">Task</span>
      </div>

      {/* Action: Short label "+ New" */}
      <button
        type="button"
        className="t10-btn-new"
        onClick={onNewList}
      >
        <Plus size={14} />
        New
      </button>
    </header>
  );
}

export default T10HeaderNew;
