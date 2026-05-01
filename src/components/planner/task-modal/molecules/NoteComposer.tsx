// ============================================================================
// MOLECULE: NoteComposer — Composer for adding notes
// ============================================================================

import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { COLORS } from '../colors';
import { Avatar } from '../atoms';

interface NoteComposerProps {
  onSubmit: (content: string) => void;
  userInitials?: string;
  userColor?: string;
}

export const NoteComposer: React.FC<NoteComposerProps> = ({
  onSubmit,
  userInitials = 'U',
  userColor = COLORS.accent
}) => {
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSubmit(content.trim());
    setContent('');
  };

  return (
    <div
      style={{
        border: `1px solid ${COLORS.borderDefault}`,
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '24px'
      }}
    >
      {/* BODY */}
      <div style={{ display: 'flex', gap: '14px', padding: '18px' }}>
        <Avatar initials={userInitials} color={userColor} size="md" />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note for the team..."
          style={{
            flex: 1,
            minHeight: '70px',
            border: 'none',
            fontFamily: 'inherit',
            fontSize: '14px',
            lineHeight: 1.5,
            color: COLORS.textPrimary,
            resize: 'none',
            backgroundColor: 'transparent',
            outline: 'none'
          }}
        />
      </div>

      {/* FOOTER */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '14px 18px',
          backgroundColor: COLORS.surfacePage,
          borderTop: `1px solid ${COLORS.borderLight}`
        }}
      >
        <button
          onClick={handleSubmit}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            backgroundColor: COLORS.accent,
            color: 'var(--ds-surface, var(--ds-surface, #ffffff))',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit'
          }}
        >
          <Send size={16} />
          Add Note
        </button>
      </div>
    </div>
  );
};

export default NoteComposer;
