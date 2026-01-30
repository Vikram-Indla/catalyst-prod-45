// ============================================================================
// MOLECULE: CommentComposer — Composer for activity comments
// ============================================================================

import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { COLORS } from '../colors';
import { Avatar } from '../atoms';

interface CommentComposerProps {
  onSubmit: (content: string) => void;
  userInitials?: string;
  userColor?: string;
}

export const CommentComposer: React.FC<CommentComposerProps> = ({
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
    <div style={{ display: 'flex', gap: '14px', marginTop: '24px' }}>
      {/* AVATAR — 40px */}
      <Avatar initials={userInitials} color={userColor} size="lg" />

      {/* INPUT WRAPPER */}
      <div
        style={{
          flex: 1,
          border: `1px solid ${COLORS.borderDefault}`,
          borderRadius: '14px',
          overflow: 'hidden'
        }}
      >
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment..."
          style={{
            width: '100%',
            minHeight: '90px',
            padding: '16px 18px',
            border: 'none',
            fontFamily: 'inherit',
            fontSize: '14px',
            lineHeight: 1.5,
            color: COLORS.textPrimary,
            resize: 'none',
            backgroundColor: 'transparent',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '12px 16px',
            backgroundColor: COLORS.surfacePage,
            borderTop: `1px solid ${COLORS.borderLight}`
          }}
        >
          <button
            onClick={handleSubmit}
            style={{
              width: '40px',
              height: '40px',
              backgroundColor: COLORS.accent,
              border: 'none',
              borderRadius: '50%',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentComposer;
