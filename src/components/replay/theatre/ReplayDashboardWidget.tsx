import React, { useState } from 'react';
import Button from '@atlaskit/button';
import { ReplayTheatreOverlay } from './ReplayTheatreOverlay';
import { SEED_BR_SCRIPT, SEED_EPIC_SCRIPT, SEED_RELEASE_SCRIPT } from '@/lib/replay/theatre/seedData';
import type { TheatreScript } from '@/lib/replay/theatre/theatreTypes';

interface ReplayDashboardWidgetProps {
  mode: 'product' | 'project' | 'release';
  projectKey?: string;
  productKey?: string;
}

function getScript(mode: 'product' | 'project' | 'release'): TheatreScript {
  if (mode === 'product') return SEED_BR_SCRIPT;
  if (mode === 'release') return SEED_RELEASE_SCRIPT;
  return SEED_EPIC_SCRIPT;
}

function getDescription(mode: 'product' | 'project' | 'release'): string {
  if (mode === 'product') return 'Watch the lifecycle of this business request unfold — from intake through delivery, with regressions and contributors revealed in sequence.';
  if (mode === 'release') return 'See how work items flowed through this release — sprints, scope changes, and the final delivery map.';
  return 'Step through the complete lifecycle of this epic and its child stories, with status transitions and handovers narrated in real time.';
}

export function ReplayDashboardWidget({ mode }: ReplayDashboardWidgetProps) {
  const [open, setOpen] = useState(false);
  const script = getScript(mode);

  return (
    <>
      <div
        style={{
          background: 'var(--ds-surface, #FFFFFF)',
          border: '1px solid var(--ds-border, #DFE1E6)',
          borderRadius: 8,
          padding: 20,
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text, #172B4D)', fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif" }}>
            ▶ Replay
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 20,
              background: 'var(--ds-background-success, #E3FCEF)',
              color: 'var(--ds-text-success, #006644)',
              fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif",
            }}
          >
            Live
          </span>
        </div>

        {/* Item key + title */}
        <div style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#2E63D5', fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif" }}>
            {script.rootKey}
          </span>
          {' '}
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ds-text, #172B4D)', fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif" }}>
            {script.rootTitle}
          </span>
        </div>

        {/* Description */}
        <p style={{ fontSize: 12, color: 'var(--ds-text-subtle, #42526E)', margin: '0 0 12px', lineHeight: 1.5, fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif" }}>
          {getDescription(mode)}
        </p>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          {[
            { label: 'Items', value: script.characters.length },
            { label: 'Days', value: script.stats.totalDays },
            { label: 'Regressions', value: script.stats.regressions + script.stats.boomerangs },
            { label: 'Handovers', value: script.stats.handovers },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center' as const }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ds-text, #172B4D)', fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif" }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--ds-text-subtlest, #6B778C)', fontFamily: "'Atlassian Sans', ui-sans-serif, system-ui, sans-serif" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Open button */}
        <Button appearance="primary" onClick={() => setOpen(true)}>
          Open Replay
        </Button>
      </div>

      {open && (
        <ReplayTheatreOverlay script={script} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
