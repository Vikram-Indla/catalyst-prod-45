import React from 'react';
import {
  BoldIcon,
  ItalicIcon,
  LinkIcon,
  ListBulletIcon,
  ListOrderedIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from '../shared/Icon';

export type FormatAction = 'bold' | 'italic' | 'underline' | 'strike' | 'link' | 'ol' | 'ul';

interface ComposerToolbarProps {
  onFormat: (action: FormatAction) => void;
  activeFormats?: Partial<Record<FormatAction, boolean>>;
}

const GROUPS: Array<Array<{ id: FormatAction; label: string; icon: React.ReactNode; shortcut?: string }>> = [
  [
    { id: 'bold', label: 'Bold', icon: <BoldIcon size={14} />, shortcut: '⌘B' },
    { id: 'italic', label: 'Italic', icon: <ItalicIcon size={14} />, shortcut: '⌘I' },
    { id: 'underline', label: 'Underline', icon: <UnderlineIcon size={14} />, shortcut: '⌘U' },
    { id: 'strike', label: 'Strikethrough', icon: <StrikethroughIcon size={14} />, shortcut: '⌘⇧X' },
  ],
  [
    { id: 'link', label: 'Link', icon: <LinkIcon size={14} />, shortcut: '⌘K' },
    { id: 'ol', label: 'Ordered list', icon: <ListOrderedIcon size={14} /> },
    { id: 'ul', label: 'Bullet list', icon: <ListBulletIcon size={14} /> },
  ],
];

export function ComposerToolbar({ onFormat, activeFormats = {} }: ComposerToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '6px 8px',
        borderBottom: '1px solid var(--cv2-divider)',
      }}
    >
      {GROUPS.map((group, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && (
            <span
              aria-hidden="true"
              style={{
                width: 1,
                height: 16,
                background: 'var(--cv2-border-strong)',
                margin: '0 4px',
              }}
            />
          )}
          {group.map(btn => (
            <ToolbarBtn
              key={btn.id}
              label={`${btn.label}${btn.shortcut ? ` (${btn.shortcut})` : ''}`}
              active={!!activeFormats[btn.id]}
              onClick={() => onFormat(btn.id)}
            >
              {btn.icon}
            </ToolbarBtn>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

function ToolbarBtn({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      style={{
        width: 26,
        height: 26,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: active ? 'var(--cv2-bg-row-active)' : 'transparent',
        color: active ? 'var(--cv2-text-strong)' : 'var(--cv2-text-subtle)',
        border: 'none',
        borderRadius: 'var(--cv2-radius-sm)',
        cursor: 'pointer',
        transition: 'background var(--cv2-transition-fast), color var(--cv2-transition-fast)',
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
          (e.currentTarget as HTMLElement).style.color = 'var(--cv2-text-strong)';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.color = 'var(--cv2-text-subtle)';
        }
      }}
    >
      {children}
    </button>
  );
}
