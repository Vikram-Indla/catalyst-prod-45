import React from 'react';
import { getEpicChipColor } from '../../utils/backlog.utils';

interface ParentEpicChipProps {
  epicId: string;
  epicKey: string | null;
  epicName: string;
}

export const ParentEpicChip: React.FC<ParentEpicChipProps> = ({ epicId, epicKey, epicName }) => {
  const colors = getEpicChipColor(epicId);
  const label = epicKey ? `${epicKey} · ${epicName}` : epicName;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 20,
        padding: '0 6px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 500,
        maxWidth: 212,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
        border: `1px solid ${colors.border}`,
        background: colors.bg,
        color: colors.text,
      }}
      title={label}
    >
      {label}
    </span>
  );
};
