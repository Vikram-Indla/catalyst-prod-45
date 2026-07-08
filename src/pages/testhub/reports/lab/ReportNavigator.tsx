import React from 'react';
import Lozenge from '@atlaskit/lozenge';
import Tooltip from '@atlaskit/tooltip';
import { Trash2 } from '@/lib/atlaskit-icons';
import { REPORT_DEFS, REPORT_CATEGORIES, ReportDef, ReportStatus } from './reportDefinitions';

/** Registry-driven entry (Reports hub, CAT-REPORTS-HUB-20260703-001 S1.2). */
export interface NavigatorEntry {
  slug: string;
  label: string;
  category: string;
  /** true => small DEMO lozenge; wired entries get no badge */
  demo?: boolean;
}

/** Saved view entry (Phase 3 Task C — tm_saved_reports). */
export interface SavedNavEntry {
  id: string;
  name: string;
  /** true when shared by another user (delete hidden — RLS would reject it). */
  shared?: boolean;
  /** true when the current user owns the row (may delete). */
  ownedByMe?: boolean;
}

interface Props {
  selected: string;
  onSelect: (slug: string) => void;
  /** When provided, renders these instead of the Lab REPORT_DEFS. */
  entries?: NavigatorEntry[];
  /** Category order for `entries` grouping. */
  categories?: readonly string[];
  /** Saved views rendered in a "Saved" section at the top (Phase 3 Task C). */
  saved?: SavedNavEntry[];
  onSelectSaved?: (id: string) => void;
  onDeleteSaved?: (id: string) => void;
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
        fontSize: 'var(--ds-font-size-200)',
        fontWeight: 700,
        letterSpacing: '0.03em',
        padding: '0px 6px',
        borderRadius: 3,
        background: bg,
        color: text,
        flexShrink: 0,
              }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function NavItem({ label, badge, selected, onSelect }: { label: string; badge: React.ReactNode; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 4,
        width: '100%',
        padding: '8px 12px',
        background: selected ? 'var(--ds-background-selected)' : 'transparent',
        border: 'none',
        borderLeft: selected ? '1px solid var(--ds-border-focused)' : '1px solid transparent',
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
        {label}
      </span>
      {badge}
    </button>
  );
}

export default function ReportNavigator({ selected, onSelect, entries, categories, saved, onSelectSaved, onDeleteSaved }: Props) {
  const groups: { category: string; items: { slug: string; label: string; badge: React.ReactNode }[] }[] = entries
    ? (categories ?? [...new Set(entries.map(e => e.category))]).map(cat => ({
        category: cat,
        items: entries
          .filter(e => e.category === cat)
          .map(e => ({
            slug: e.slug,
            label: e.label,
            badge: e.demo ? <Lozenge appearance="moved">DEMO</Lozenge> : null,
          })),
      }))
    : REPORT_CATEGORIES.map(cat => ({
        category: cat,
        items: REPORT_DEFS.filter(d => d.category === cat).map((def: ReportDef) => ({
          slug: def.slug,
          label: def.label,
          badge: <StatusPill status={def.status} />,
        })),
      }));

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
          padding: '12px 16px 10px',
          fontSize: 'var(--ds-font-size-100)',
          fontWeight: 700,
          color: 'var(--ds-text-subtlest)',
          letterSpacing: '0.06em',
                    borderBottom: '1px solid var(--ds-border)',
        }}
      >
        Reports
      </div>

      {/* Saved views (Phase 3 Task C) — top of the navigator */}
      {saved && saved.length > 0 && (
        <div>
          <div
            style={{
              padding: 'var(--ds-space-100) var(--ds-space-150) var(--ds-space-050)',
              fontSize: 'var(--ds-font-size-200)',
              fontWeight: 700,
              color: 'var(--ds-text-subtlest)',
              letterSpacing: '0.08em',
            }}
          >
            {/* literal caps to match sibling section headers without the banned text-transform */}
            SAVED
          </div>
          {saved.map(view => (
            <div key={view.id} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <NavItem
                  label={view.name}
                  badge={view.shared ? <Lozenge appearance="new">SHARED</Lozenge> : null}
                  selected={false}
                  onSelect={() => onSelectSaved?.(view.id)}
                />
              </div>
              {view.ownedByMe && onDeleteSaved && (
                <Tooltip content="Delete saved view">
                  <button
                    type="button"
                    aria-label={`Delete saved view ${view.name}`}
                    onClick={() => onDeleteSaved(view.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      padding: 'var(--ds-space-050) var(--ds-space-100) var(--ds-space-050) var(--ds-space-025)',
                      color: 'var(--ds-icon-subtle)',
                      flexShrink: 0,
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </Tooltip>
              )}
            </div>
          ))}
        </div>
      )}

      {groups.filter(g => g.items.length > 0).map(group => (
        <div key={group.category}>
          <div
            style={{
              padding: '8px 14px 4px',
              fontSize: 'var(--ds-font-size-200)',
              fontWeight: 700,
              color: 'var(--ds-text-subtlest)',
              letterSpacing: '0.08em',
                          }}
          >
            {group.category}
          </div>
          {group.items.map(item => (
            <NavItem
              key={item.slug}
              label={item.label}
              badge={item.badge}
              selected={selected === item.slug}
              onSelect={() => onSelect(item.slug)}
            />
          ))}
        </div>
      ))}
    </nav>
  );
}
