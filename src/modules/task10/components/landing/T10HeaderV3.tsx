// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10HeaderV3
// Purpose: /taskhub/task10 header matching Workstreams/Boards page header
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Plus } from 'lucide-react';

interface T10HeaderV3Props {
  onNewList: () => void;
  listCount?: number;
  activeWeekCount?: number;
}

export function T10HeaderV3({
  onNewList,
  listCount = 0,
  activeWeekCount = 0,
}: T10HeaderV3Props) {
  return (
    <div
      className="-mx-6 -mt-8 mb-6"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        backgroundColor: 'var(--t10-bg-card)',
        borderBottom: '1px solid var(--t10-border-default)',
      }}
    >
      <div>
        <div className="t10-logo-minimal">
          <span className="t10-logo-text-minimal">Priorities</span>
        </div>
        <p
          style={{
            fontSize: '0.875rem',
            lineHeight: '1.25rem',
            color: 'var(--t10-text-tertiary)',
            margin: 0,
          }}
        >
          {listCount} {listCount === 1 ? 'list' : 'lists'} • {activeWeekCount} active{' '}
          {activeWeekCount === 1 ? 'week' : 'weeks'}
        </p>
      </div>

      <button
        type="button"
        onClick={onNewList}
        className="t10-btn-new"
        style={{ boxShadow: '0 1px 3px rgba(37, 99, 235, 0.35)' }}
      >
        <Plus size={16} />
        New List
      </button>
    </div>
  );
}

export default T10HeaderV3;
