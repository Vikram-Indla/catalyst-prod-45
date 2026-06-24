/**
 * EditableSectionName — "Give this section a name" inline editor.
 *
 * States:
 *   - Idle:    bold title + edit pencil icon + chevron (toggles body visibility)
 *   - Editing: text field + check ✓ (disabled when empty) + cross ×
 *
 * Body shows either a placeholder or the saved description-like text.
 * The body chevron right=collapsed / down=expanded.
 */
import React, { useEffect, useRef, useState } from 'react';
import EditIcon from '@atlaskit/icon/core/edit';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import CheckIcon from '@atlaskit/icon/glyph/check';
import CrossIcon from '@atlaskit/icon/glyph/cross';

interface Props {
  name: string;
  onNameChange: (name: string) => void | Promise<void>;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  children: React.ReactNode;
}

const TEXT = 'var(--ds-text, #292A2E)';
const SUBTLE = 'var(--ds-text-subtle, #6B778C)';
const BORDER = 'var(--ds-border, #DFE1E6)';
const BLUE = 'var(--ds-border-selected, #1868DB)';

export function EditableSectionName({
  name,
  onNameChange,
  collapsed,
  onToggleCollapsed,
  children,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { setDraft(name); }, [name]);

  const startEdit = () => { setDraft(name || ''); setEditing(true); };
  const cancel = () => { setDraft(name); setEditing(false); };
  const save = async () => {
    const v = draft.trim();
    if (!v) return;
    await onNameChange(v);
    setEditing(false);
  };

  const iconBtn = (active: boolean): React.CSSProperties => ({
    all: 'unset',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 3,
    border: `1px solid ${BORDER}`,
    background: 'var(--ds-surface, #FFFFFF)',
    color: active ? TEXT : SUBTLE,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {editing ? (
          <>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); save(); }
                if (e.key === 'Escape') { e.preventDefault(); cancel(); }
              }}
              placeholder="Give this section a name"
              style={{
                flex: 1,
                maxWidth: 320,
                height: 28,
                padding: '0 8px',
                fontSize: 14,
                fontWeight: 600,
                color: TEXT,
                border: `1px solid ${BLUE}`,
                borderRadius: 3,
                outline: 'none',
                background: 'var(--ds-surface, #FFFFFF)',
                boxShadow: '0 0 0 1px rgba(24,104,219,0.2)',
              }}
            />
            <button
              type="button"
              aria-label="Save"
              disabled={!draft.trim()}
              onClick={save}
              style={{
                ...iconBtn(!!draft.trim()),
                opacity: draft.trim() ? 1 : 0.5,
                cursor: draft.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              <CheckIcon label="" size="small" />
            </button>
            <button
              type="button"
              aria-label="Cancel"
              onClick={cancel}
              style={iconBtn(true)}
            >
              <CrossIcon label="" size="small" />
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>
              {name || 'Give this section a name'}
            </span>
            <button
              type="button"
              aria-label="Edit name"
              onClick={startEdit}
              style={{ all: 'unset', cursor: 'pointer', color: SUBTLE, display: 'inline-flex', padding: 4 }}
            >
              <EditIcon label="" />
            </button>
            <button
              type="button"
              aria-label={collapsed ? 'Expand' : 'Collapse'}
              onClick={onToggleCollapsed}
              style={{ all: 'unset', cursor: 'pointer', color: SUBTLE, display: 'inline-flex', padding: 4 }}
            >
              {collapsed ? <ChevronRightIcon label="" size="large" /> : <ChevronDownIcon label="" size="large" />}
            </button>
          </>
        )}
      </div>
      {!collapsed && (
        <div style={{ marginLeft: -20 }}>{children}</div>
      )}
    </div>
  );
}
