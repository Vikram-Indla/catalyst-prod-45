import React from 'react';

interface DraftsAndSentHeaderProps {
  /** When true, the "Edit" / "Done" + "Delete" buttons render in place
   *  of the title. Drafts tab only. */
  showEditAction: boolean;
  inEditMode: boolean;
  selectedCount: number;
  onToggleEdit: () => void;
  onDelete: () => void;
  onDone: () => void;
}

export function DraftsAndSentHeader({
  showEditAction,
  inEditMode,
  selectedCount,
  onToggleEdit,
  onDelete,
  onDone,
}: DraftsAndSentHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px 6px',
      }}
    >
      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--cv2-font)',
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--cv2-text)',
          letterSpacing: '-0.01em',
        }}
      >
        Drafts &amp; sent
      </h2>
      {showEditAction && !inEditMode && (
        <button
          type="button"
          onClick={onToggleEdit}
          style={editBtnStyle}
          aria-label="Edit drafts"
        >
          <PencilGlyph />
          Edit
        </button>
      )}
      {showEditAction && inEditMode && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={onDelete}
            disabled={selectedCount === 0}
            style={selectedCount === 0 ? deleteBtnDisabledStyle : deleteBtnActiveStyle}
            aria-label="Delete selected drafts"
          >
            Delete
          </button>
          <button type="button" onClick={onDone} style={doneBtnStyle} aria-label="Exit edit mode">
            Done
          </button>
        </div>
      )}
    </div>
  );
}

const editBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 10px',
  border: '1px solid var(--cv2-border)',
  borderRadius: 6,
  background: 'transparent',
  color: 'var(--cv2-text)',
  fontFamily: 'var(--cv2-font)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};

const doneBtnStyle: React.CSSProperties = {
  padding: '6px 14px',
  border: '1px solid var(--cv2-border)',
  borderRadius: 6,
  background: 'transparent',
  color: 'var(--cv2-text)',
  fontFamily: 'var(--cv2-font)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};

const deleteBtnActiveStyle: React.CSSProperties = {
  padding: '6px 14px',
  border: '1px solid var(--cv2-danger, #E01E5A)',
  borderRadius: 6,
  background: 'var(--cv2-danger, #E01E5A)',
  color: 'var(--ds-text-inverse, #FFFFFF)',
  fontFamily: 'var(--cv2-font)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};

const deleteBtnDisabledStyle: React.CSSProperties = {
  padding: '6px 14px',
  border: '1px solid var(--cv2-border)',
  borderRadius: 6,
  background: 'transparent',
  color: 'var(--cv2-text-muted)',
  fontFamily: 'var(--cv2-font)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'not-allowed',
};

function PencilGlyph() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  );
}
