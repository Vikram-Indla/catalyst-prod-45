// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10ListsContainerNew
// Purpose: Linear-inspired grid container for list cards
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { T10ListCardMinimal } from './T10ListCardMinimal';
import { T10EmptyState } from './T10EmptyState';
import type { T10ListSummary } from '../../types';

interface T10ListsContainerNewProps {
  lists: T10ListSummary[];
  isLoading: boolean;
  onRename: (list: T10ListSummary) => void;
  onDelete: (list: T10ListSummary) => void;
  onCreateList: () => void;
}

export function T10ListsContainerNew({ 
  lists, 
  isLoading, 
  onRename, 
  onDelete,
  onCreateList,
}: T10ListsContainerNewProps) {
  // Loading skeleton
  if (isLoading) {
    return (
      <div className="t10-cards-list">
        {[1, 2, 3].map(i => (
          <div key={i} className="t10-skeleton-card-minimal" />
        ))}
      </div>
    );
  }

  // Empty state
  if (!lists || lists.length === 0) {
    return <T10EmptyState onCreateList={onCreateList} />;
  }

  // List cards
  return (
    <div className="t10-cards-list">
      {lists.map(list => (
        <T10ListCardMinimal
          key={list.id}
          list={list}
          onRename={() => onRename(list)}
          onDelete={() => onDelete(list)}
        />
      ))}
    </div>
  );
}

export default T10ListsContainerNew;
