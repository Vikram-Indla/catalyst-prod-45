/**
 * CreateButton — Trigger for new issue modal (F1.7)
 *
 * Primary action button that opens the create-issue modal.
 */
import React, { memo } from 'react';

export interface CreateButtonProps {
  onClick: () => void;
}

export const CreateButton = memo(function CreateButton({
  onClick,
}: CreateButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 12px',
        backgroundColor: 'var(--ds-link, #0C66E4)',
        color: 'var(--ds-text-inverse, #FFFFFF)',
        border: 'none',
        borderRadius: '3px',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'background-color 150ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#0044A3';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--ds-link, #0C66E4)';
      }}
    >
      Create issue
    </button>
  );
});
