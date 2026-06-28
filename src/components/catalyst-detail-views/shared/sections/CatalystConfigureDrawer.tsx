/**
 * CatalystConfigureDrawer — "Configure issue layout" drawer.
 *
 * Jira parity: clicking "Configure" in the right-rail footer opens a
 * drawer listing all pinnable sidebar fields. Pinned fields surface in
 * a "Pinned fields" group at the top of the sidebar (above Details).
 *
 * Persistence: localStorage keyed by issueType so each type can have
 * its own pin set.  No backend schema needed — this is a UI-only pref.
 */
import React, { useCallback } from 'react';
import Drawer from '@atlaskit/drawer';
import { token } from '@atlaskit/tokens';

// ── Available fields ─────────────────────────────────────────────────────────
/** Each entry describes one pinnable sidebar field. */
export interface PinnableField {
  id: string;
  label: string;
  /** Issue types for which this field should be hidden from the list
   *  (because the field is already forced-visible or irrelevant). */
  hiddenFor?: string[];
}

export const PINNABLE_FIELDS: PinnableField[] = [
  { id: 'assignee',    label: 'Assignee' },
  { id: 'reporter',    label: 'Reporter' },
  { id: 'priority',    label: 'Priority', hiddenFor: ['Sub-task', 'Defect', 'Production Incident'] },
  { id: 'labels',      label: 'Labels' },
  { id: 'sprintRelease', label: 'Sprint/Iteration', hiddenFor: ['Epic'] },
];

// ── Persistence helpers ───────────────────────────────────────────────────────
const STORAGE_KEY = 'catalyst_sidebar_pinned_fields';

export function loadPinnedFields(issueType: string): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as Record<string, string[]>;
    return all[issueType] ?? [];
  } catch {
    return [];
  }
}

export function savePinnedFields(issueType: string, ids: string[]): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    all[issueType] = ids;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // non-fatal — ignore write errors
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
interface CatalystConfigureDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  issueType: string;
  pinnedFields: string[];
  onPinnedFieldsChange: (ids: string[]) => void;
}

export function CatalystConfigureDrawer({
  isOpen,
  onClose,
  issueType,
  pinnedFields,
  onPinnedFieldsChange,
}: CatalystConfigureDrawerProps) {

  const visibleFields = PINNABLE_FIELDS.filter(
    (f) => !f.hiddenFor?.includes(issueType),
  );

  const togglePin = useCallback((id: string) => {
    const next = pinnedFields.includes(id)
      ? pinnedFields.filter((x) => x !== id)
      : [...pinnedFields, id];
    onPinnedFieldsChange(next);
    savePinnedFields(issueType, next);
  }, [pinnedFields, issueType, onPinnedFieldsChange]);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      width="narrow"
      label="Configure issue layout"
    >
      <div style={{ padding: '0 24px 24px' }}>
        {/* Header */}
        <div style={{
          paddingBottom: 16,
          marginBottom: 16,
          borderBottom: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
        }}>
          <h2 style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 600,
            color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))'),
            lineHeight: '24px',
          }}>
            Configure issue layout
          </h2>
          <p style={{
            margin: '8px 0 0',
            fontSize: 14,
            color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)'),
            lineHeight: '20px',
          }}>
            Pin fields to make them easier to find in the right sidebar.
          </p>
        </div>

        {/* Pinned fields section */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'),
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 8,
          }}>
            Pinned fields
          </div>

          {pinnedFields.length === 0 ? (
            <div style={{
              padding: '12px 16px',
              background: token('color.background.neutral', 'var(--ds-background-neutral-subtle, #F4F5F7)'),
              borderRadius: 4,
              fontSize: 14,
              color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'),
              textAlign: 'center',
            }}>
              No pinned fields yet — pin a field below to show it at the top of the sidebar.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {pinnedFields.map((id) => {
                const field = PINNABLE_FIELDS.find((f) => f.id === id);
                if (!field) return null;
                return (
                  <FieldConfigRow
                    key={id}
                    label={field.label}
                    isPinned
                    onToggle={() => togglePin(id)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Available to pin */}
        <div>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'),
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 8,
          }}>
            Available to pin
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {visibleFields.filter((f) => !pinnedFields.includes(f.id)).map((field) => (
              <FieldConfigRow
                key={field.id}
                label={field.label}
                isPinned={false}
                onToggle={() => togglePin(field.id)}
              />
            ))}
            {visibleFields.filter((f) => !pinnedFields.includes(f.id)).length === 0 && (
              <div style={{
                padding: '12px 16px',
                background: token('color.background.neutral', 'var(--ds-background-neutral-subtle, #F4F5F7)'),
                borderRadius: 4,
                fontSize: 14,
                color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'),
                textAlign: 'center',
              }}>
                All available fields are pinned.
              </div>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}

// ── Row atom ─────────────────────────────────────────────────────────────────
function FieldConfigRow({
  label,
  isPinned,
  onToggle,
}: {
  label: string;
  isPinned: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        borderRadius: 4,
        background: token('color.background.neutral', 'var(--ds-background-neutral-subtle, #F4F5F7)'),
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.neutral.hovered', 'var(--ds-border, #DFE1E6)'); }}
      onMouseLeave={(e) => { e.currentTarget.style.background = token('color.background.neutral', 'var(--ds-background-neutral-subtle, var(--ds-background-neutral-subtle, #F4F5F7))'); }}
    >
      <span style={{
        fontSize: 14,
        color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))'),
        fontWeight: 400,
      }}>
        {label}
      </span>
      <button
        type="button"
        onClick={onToggle}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          height: 28,
          padding: '0 10px',
          border: `1px solid ${isPinned ? token('color.border.brand', 'var(--cp-primary-60, #0052CC)') : token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
          borderRadius: 3,
          background: isPinned ? token('color.background.brand.bold', 'var(--cp-primary-60, #0052CC)') : 'transparent',
          color: isPinned ? 'var(--ds-text-inverse, #FFFFFF)' : token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))'),
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'all 0.1s',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          if (!isPinned) e.currentTarget.style.background = token('color.background.neutral.hovered', 'var(--ds-border, #DFE1E6)');
        }}
        onMouseLeave={(e) => {
          if (!isPinned) e.currentTarget.style.background = 'transparent';
        }}
      >
        {isPinned ? '📌 Pinned' : '+ Pin'}
      </button>
    </div>
  );
}
