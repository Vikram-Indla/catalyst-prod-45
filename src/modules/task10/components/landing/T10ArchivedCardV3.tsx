// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10ArchivedCardV3
// Purpose: Card for archived list in the Archived tab
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Archive, RotateCcw, Trash2 } from 'lucide-react';
import type { T10ListCardView } from '../../types/listCards';

interface T10ArchivedCardV3Props {
  list: T10ListCardView;
  onRestore: () => void;
  onDelete: () => void;
}

export function T10ArchivedCardV3({ list, onRestore, onDelete }: T10ArchivedCardV3Props) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const incompleteCount = (list.total_count || 0) - (list.completed_count || 0);

  return (
    <div className="t10-archived-card">
      {/* Left: Archive Icon */}
      <div className="t10-archived-card__icon">
        <Archive className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="t10-archived-card__content">
        <div className="t10-archived-card__header">
          <span className="t10-key-badge t10-key-badge--small t10-key-badge--muted">{list.key}</span>
          <span className="t10-archived-card__name">{list.name}</span>
        </div>
        <div className="t10-archived-card__meta">
          Archived {formatDate(list.archived_at || list.updated_at)}
          <span className="t10-archived-card__dot">·</span>
          <span>{list.past_weeks_count || 0} weeks</span>
        </div>
      </div>

      {/* Incomplete Badge */}
      {incompleteCount > 0 && (
        <span className="t10-status-badge t10-status-badge--danger">
          {incompleteCount} incomplete
        </span>
      )}

      {/* Actions */}
      <div className="t10-archived-card__actions">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRestore(); }}
          className="t10-archived-card__restore-btn"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restore
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="t10-archived-card__delete-btn"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
