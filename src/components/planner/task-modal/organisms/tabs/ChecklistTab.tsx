// ============================================================================
// ORGANISM: ChecklistTab — Checklist tab content
// ============================================================================

import React from 'react';
import { COLORS } from '../../colors';
import { ProgressBar } from '../../atoms';
import { ChecklistItem, AddItemInput } from '../../molecules';
import { ChecklistItem as ChecklistItemType } from '../../types';

interface ChecklistTabProps {
  items: ChecklistItemType[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (text: string) => void;
}

export const ChecklistTab: React.FC<ChecklistTabProps> = ({
  items,
  onToggle,
  onDelete,
  onAdd
}) => {
  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div>
      {/* PROGRESS HEADER */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '14px', color: COLORS.textMuted }}>
            {completedCount} of {totalCount} complete ({progressPercent}%)
          </span>
          <ProgressBar percent={progressPercent} />
        </div>
      </div>

      {/* CHECKLIST ITEMS */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '20px'
        }}
      >
        {items.map((item) => (
          <ChecklistItem
            key={item.id}
            id={item.id}
            text={item.text}
            completed={item.completed}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* ADD ITEM INPUT */}
      <AddItemInput
        placeholder="Add checklist item..."
        onAdd={onAdd}
      />
    </div>
  );
};

export default ChecklistTab;
