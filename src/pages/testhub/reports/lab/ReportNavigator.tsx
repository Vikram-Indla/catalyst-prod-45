import React from 'react';
import { REPORT_DEFS, REPORT_CATEGORIES, ReportDef, ReportStatus } from './reportDefinitions';

interface Props {
  selected: string;
  onSelect: (slug: string) => void;
}

const STATUS_COLOR: Record<ReportStatus, { bg: string; text: string }> = {
  ready: { bg: 'var(--ds-background-success)', text: 'var(--ds-text-success)' },
  partial: { bg: 'var(--ds-background-warning)', text: 'var(--ds-text-warning)' },
  'needs-data': { bg: 'var(--ds-background-danger)', text: 'var(--ds-text-danger)' },
};

const STATUS_LABEL: Record<ReportStatus, string> = {
  ready: 'Ready',
  partial: 'Partial',
  'needs-data': 'Needs Data',
};

function StatusPill({ status }: { status: ReportStatus }) {
  const { bg, text } = STATUS_COLOR[status];
  return (
    <span
      style={{
        fontSize: 'var(--ds-font-size-50)',
        fontWeight: 700,
        letterSpacing: '0.03em',
        padding: '1px 6px',
        borderRadius: 3,
        background: bg,
        color: text,
        flexShrink: 0,
        textTransform: 'uppercase',
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function NavItem({ def, selected, onSelect }: { def: ReportDef; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
        width: '100%',
        padding: '7px 12px',
        background: selected ? 'var(--ds-background-selected)' : 'transparent',
        border: 'none',
        borderLeft: selected ? '2px solid var(--ds-border-focused)' : '2px solid transparent',
        borderRadius: '0 4px 4px 0',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => {
        if (!selected) (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-background-neutral-subtle-hovered, var(--ds-background-neutral-subtle))';
      }}
      onMouseLeave={e => {
        if (!selected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      <span
        style={{
          fontSize: 'var(--ds-font-size-300)',
          fontWeight: selected ? 600 : 400,
          color: selected ? 'var(--ds-text-selected, var(--ds-text))' : 'var(--ds-text-subtle)',
          lineHeight: 1.3,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {def.label}
      </span>
      <StatusPill status={def.status} />
    </button>
  );
}

export default function ReportNavigator({ selected, onSelect }: Props) {
  return (
    <nav
      style={{
        width: 220,
        flexShrink: 0,
        background: 'var(--ds-surface)',
        borderRight: '1px solid var(--ds-border)',
        overflowY: 'auto',
        paddingBottom: 24,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '14px 16px 10px',
          fontSize: 'var(--ds-font-size-100)',
          fontWeight: 700,
          color: 'var(--ds-text-subtlest)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          borderBottom: '1px solid var(--ds-border)',
        }}
      >
        Reports
      </div>

      {REPORT_CATEGORIES.map(cat => {
        const defs = REPORT_DEFS.filter(d => d.category === cat);
        return (
          <div key={cat}>
            <div
              style={{
                padding: '10px 14px 4px',
                fontSize: 'var(--ds-font-size-50)',
                fontWeight: 700,
                color: 'var(--ds-text-subtlest)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {cat}
            </div>
            {defs.map(def => (
              <NavItem
                key={def.slug}
                def={def}
                selected={selected === def.slug}
                onSelect={() => onSelect(def.slug)}
              />
            ))}
          </div>
        );
      })}
    </nav>
  );
}
