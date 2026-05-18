import React, { ReactNode } from 'react';
import { token } from '@atlaskit/tokens';

interface WidgetSettingsPanelProps {
  widgetId: string;
  onClose: () => void;
  children: ReactNode;
}

export function WidgetSettingsPanel({ onClose, children }: WidgetSettingsPanelProps) {
  return (
    <div
      data-testid="widget-settings-panel"
      style={{
        border: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, #DFE1E6)')}`,
        borderRadius: 6,
        background: token('color.background.neutral.subtle', '#FAFBFC'),
        padding: token('space.200', '16px'),
        display: 'flex',
        flexDirection: 'column',
        gap: token('space.150', '12px'),
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            color: token('color.text', 'var(--cp-text-primary, #172B4D)'),
          }}
        >
          Widget Settings
        </h3>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: token('color.text.subtlest', '#8993A4'),
            padding: 4,
            borderRadius: 4,
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Body — widget-specific controls passed as children */}
      <div>{children}</div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          aria-label="Save"
          onClick={onClose}
          style={{
            padding: `${token('space.075', '6px')} ${token('space.150', '12px')}`,
            background: token('color.background.brand.bold', '#0C66E4'),
            color: token('color.text.inverse', '#FFFFFF'),
            border: 'none',
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
}
