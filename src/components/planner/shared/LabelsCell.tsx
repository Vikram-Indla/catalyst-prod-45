// ============================================================================
// SHARED: LabelsCell — Labels column cell for tables
// ============================================================================

import React, { useState } from 'react';
import { Label } from '../task-modal/types/labels';
import { LabelBadge } from '../task-modal/molecules/LabelBadge';

interface LabelsCellProps {
  labels: Label[];
  maxVisible?: number;
}

export const LabelsCell: React.FC<LabelsCellProps> = ({ 
  labels, 
  maxVisible = 2 
}) => {
  const [showAll, setShowAll] = useState(false);

  if (!labels || labels.length === 0) {
    return (
      <span style={{ color: '#94a3b8', fontSize: '13px' }}>—</span>
    );
  }

  const visibleLabels = showAll ? labels : labels.slice(0, maxVisible);
  const hiddenCount = labels.length - maxVisible;

  return (
    <div 
      style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '4px', 
        alignItems: 'center' 
      }}
      onMouseEnter={() => setShowAll(true)}
      onMouseLeave={() => setShowAll(false)}
    >
      {visibleLabels.map(label => (
        <LabelBadge key={label.id} label={label} size="sm" />
      ))}
      
      {!showAll && hiddenCount > 0 && (
        <span
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: '#64748b',
            backgroundColor: '#f1f5f9',
            padding: '2px 6px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          +{hiddenCount}
        </span>
      )}
    </div>
  );
};

export default LabelsCell;
