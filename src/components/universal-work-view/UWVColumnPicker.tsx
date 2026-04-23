// @ts-nocheck
/**
 * UWVColumnPicker — popup with show/hide toggles for every column,
 * persisted via savePrefs().
 */

import React, { useState } from 'react';
import Popup from '@atlaskit/popup';
import { IconButton } from '@atlaskit/button/new';
import Button from '@atlaskit/button/new';
import Checkbox from '@atlaskit/checkbox';
import { token } from '@atlaskit/tokens';
import type { UWVColumn, UWVPrefs } from './uwv.types';

interface Props {
  columns: UWVColumn[];
  prefs: UWVPrefs;
  onSave: (next: UWVPrefs) => void;
}

// Inline grid icon — keeps the trigger a real Atlaskit IconButton.
function ColumnsIcon({ label }: { label?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-label={label} role="img">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="#42526E" strokeWidth="1.6" />
      <path d="M9 4v16M15 4v16" stroke="#42526E" strokeWidth="1.6" />
    </svg>
  );
}

export function UWVColumnPicker({ columns, prefs, onSave }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<UWVColumn[]>(columns);

  React.useEffect(() => {
    setDraft(columns);
  }, [columns]);

  const visible = draft.filter((c) => c.visible);
  const hidden = draft.filter((c) => !c.visible);

  const toggle = (fieldId: string) => {
    setDraft((d) =>
      d.map((c) => (c.fieldId === fieldId ? { ...c, visible: !c.visible } : c)),
    );
  };

  const apply = () => {
    onSave({
      ...prefs,
      columns: draft.map((c) => ({ fieldId: c.fieldId, width: c.width, visible: c.visible })),
    });
    setIsOpen(false);
  };

  return (
    <Popup
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      placement="bottom-end"
      content={() => (
        <div
          style={{
            width: 280,
            padding: 16,
            background: token('elevation.surface.overlay', '#FFFFFF'),
            border: '1px solid #DFE1E6',
            borderRadius: 6,
            boxShadow: '0 8px 24px rgba(9,30,66,0.16)',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#5E6C84',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: 8,
            }}
          >
            Visible columns
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {visible.map((c) => (
              <Checkbox
                key={c.fieldId}
                isChecked
                onChange={() => toggle(c.fieldId)}
                label={c.label}
              />
            ))}
          </div>

          {hidden.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#5E6C84',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  margin: '12px 0 8px',
                }}
              >
                Add column
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {hidden.map((c) => (
                  <Checkbox
                    key={c.fieldId}
                    isChecked={false}
                    onChange={() => toggle(c.fieldId)}
                    label={c.label}
                  />
                ))}
              </div>
            </>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              marginTop: 16,
              paddingTop: 12,
              borderTop: '1px solid #EBECF0',
            }}
          >
            <Button appearance="subtle" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={apply}>
              Apply
            </Button>
          </div>
        </div>
      )}
      trigger={(triggerProps) => (
        <IconButton
          {...triggerProps}
          icon={ColumnsIcon as any}
          label="Configure columns"
          appearance="subtle"
          onClick={() => setIsOpen((v) => !v)}
        />
      )}
    />
  );
}
