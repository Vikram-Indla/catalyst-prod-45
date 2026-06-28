import React, { useState } from 'react';
import Button from '@atlaskit/button/standard-button';
import { FORMULA_EXPLANATIONS } from './reportDefinitions';

interface Props {
  reportSlug: string;
}

export default function ReportFormulaDrawer({ reportSlug }: Props) {
  const [open, setOpen] = useState(false);
  const explanation = FORMULA_EXPLANATIONS[reportSlug];
  if (!explanation) return null;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <Button appearance="subtle" onClick={() => setOpen(v => !v)}>
        {open ? 'Hide formula ↑' : 'Show formula ↓'}
      </Button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '48%',
            right: 0,
            marginTop: 4,
            width: 340,
            background: 'var(--ds-surface-raised)',
            border: '1px solid var(--ds-border)',
            borderRadius: 6,
            padding: '12px 16px',
            boxShadow: 'var(--ds-shadow-overlay)',
            zIndex: 100,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 'var(--ds-font-size-200)',
              fontWeight: 700,
              color: 'var(--ds-text-subtlest)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            How this is calculated
          </p>
          <p style={{ margin: 0, fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text)', lineHeight: 1.6 }}>
            {explanation}
          </p>
          <p
            style={{
              margin: '8px 0 0',
              fontSize: 'var(--ds-font-size-100)',
              color: 'var(--ds-text-subtlest)',
              fontStyle: 'italic',
            }}
          >
            Based on current filter scope and seeded data in lab mode.
          </p>
        </div>
      )}
    </div>
  );
}
