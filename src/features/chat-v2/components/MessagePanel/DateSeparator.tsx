import React, { useRef, useState } from 'react';
import { ChevronDownIcon } from '../shared/Icon';
import { formatDateSeparator } from '../../lib/formatTimestamp';
import { JumpToDateMenu } from '../JumpToDate/JumpToDateMenu';
import { JumpToDateModal } from '../JumpToDate/JumpToDateModal';

interface DateSeparatorProps {
  iso: string;
  onJumpToDate?: (iso: string) => void;
  onJumpMostRecent?: () => void;
  onJumpBeginning?: () => void;
}

export function DateSeparator({
  iso,
  onJumpToDate,
  onJumpMostRecent,
  onJumpBeginning,
}: DateSeparatorProps) {
  const label = formatDateSeparator(iso);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div
      role="separator"
      aria-label={label}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        margin: '12px 0',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 24,
          right: 24,
          top: '50%',
          height: 1,
          background: 'var(--cv2-divider)',
        }}
      />
      <button
        ref={btnRef}
        type="button"
        onClick={() => setMenuOpen(true)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 12px',
          background: 'var(--cv2-bg-panel)',
          border: '1px solid var(--cv2-border)',
          borderRadius: 16,
          fontFamily: 'var(--cv2-font)',
          fontSize: 'var(--cv2-fs-date-sep)',
          fontWeight: 600,
          color: 'var(--cv2-text)',
          cursor: 'pointer',
        }}
      >
        {label}
        <ChevronDownIcon size={12} />
      </button>
      {menuOpen && (
        <JumpToDateMenu
          anchorRef={btnRef}
          onPickMostRecent={() => { setMenuOpen(false); onJumpMostRecent?.(); }}
          onPickBeginning={() => { setMenuOpen(false); onJumpBeginning?.(); }}
          onPickSpecific={() => { setMenuOpen(false); setModalOpen(true); }}
          onClose={() => setMenuOpen(false)}
        />
      )}
      {modalOpen && (
        <JumpToDateModal
          onCancel={() => setModalOpen(false)}
          onPick={iso => {
            setModalOpen(false);
            onJumpToDate?.(iso);
          }}
        />
      )}
    </div>
  );
}
