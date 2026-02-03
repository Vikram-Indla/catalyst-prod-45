// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10ListsContainer
// Purpose: Grid container for list cards with empty state and loading skeleton
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Inbox } from 'lucide-react';
import { T10ListCardNew } from './T10ListCardNew';
import type { T10List } from '../../types';

interface T10ListsContainerProps {
  lists: T10List[] | undefined;
  isLoading: boolean;
  onRename: (list: T10List) => void;
  onDelete: (list: T10List) => void;
}

export function T10ListsContainer({ lists, isLoading, onRename, onDelete }: T10ListsContainerProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="t10-lists-section">
        <div className="t10-lists-header">
          <h2 className="t10-lists-title">Your Lists</h2>
        </div>
        <div className="t10-lists-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="t10-skeleton t10-skeleton-card" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!lists || lists.length === 0) {
    return (
      <div className="t10-lists-section">
        <div className="t10-lists-header">
          <h2 className="t10-lists-title">Your Lists</h2>
        </div>
        <div className="t10-lists-empty">
          <Inbox className="t10-lists-empty-icon" size={48} />
          <h3 className="t10-lists-empty-title">No lists yet</h3>
          <p className="t10-lists-empty-text">
            Create your first list to start tracking your weekly priorities
          </p>
        </div>
      </div>
    );
  }

  // Lists grid
  return (
    <div className="t10-lists-section">
      <div className="t10-lists-header">
        <h2 className="t10-lists-title">Your Lists</h2>
        <span className="t10-lists-count">{lists.length} list{lists.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="t10-lists-grid">
        {lists.map((list) => (
          <T10ListCardNew
            key={list.id}
            list={list}
            onRename={() => onRename(list)}
            onDelete={() => onDelete(list)}
          />
        ))}
      </div>
    </div>
  );
}

export default T10ListsContainer;
