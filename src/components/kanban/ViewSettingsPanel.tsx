/**
 * ViewSettingsPanel — Popover from ••• button on Kanban toolbar
 * Sections: Top toggles, Fields, Swimlanes, Density (V2, optional)
 * ADS dark compliant
 */
import { useRef, useEffect, useCallback } from 'react';
import type { KanbanThemeTokens, KanbanDensity } from './kanban-tokens';
import type { KanbanViewSettings, VisibleFields, CardColorMode, QuickFilterKey } from '@/hooks/useKanbanViewSettings';
import { ALL_QUICK_FILTERS } from '@/hooks/useKanbanViewSettings';

interface ViewSettingsPanelProps {
  settings: KanbanViewSettings;
  onUpdate: (partial: Partial<KanbanViewSettings>) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onClose: () => void;
  tk: KanbanThemeTokens;
  /** V2 (ENABLE_KANBAN_V2): if both provided, shows the Density section. */
  density?: KanbanDensity;
  onDensityChange?: (d: KanbanDensity) => void;
  /** False when groupBy==='none' — hides the Swimlanes section entirely */
  hasSwimlanes?: boolean;
  /** Expand all button disabled when every swimlane is already open */
  canExpandAll?: boolean;
  /** Collapse all button disabled when every swimlane is already closed */
  canCollapseAll?: boolean;
}

/* ── Custom Toggle Switch ── */
function Toggle({ checked, onChange, tk }: { checked: boolean; onChange: (v: boolean) => void; tk: KanbanThemeTokens }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 36, height: 20, borderRadius: 10, border: 'none',
        background: checked ? 'var(--ds-background-success-bold)' : tk.chipBg,
        position: 'relative', cursor: 'pointer', flexShrink: 0,
        transition: 'background 150ms',
        display: 'flex', alignItems: 'center',
      }}
    >
      <span style={{
        width: 16, height: 16, borderRadius: '50%',
        background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
        position: 'absolute',
        left: checked ? 18 : 2,
        transition: 'left 150ms',
        boxShadow: '0 1px 3px var(--ds-shadow-raised)',
      }} />
    </button>
  );
}

/* ── Row ── */
function ToggleRow({ label, checked, onChange, tk }: { label: string; checked: boolean; onChange: (v: boolean) => void; tk: KanbanThemeTokens }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: '8px 0' }}>
      <span style={{ fontSize: 'var(--ds-font-size-400)', color: tk.textSecondary, fontFamily: 'var(--cp-font-body)' }}>{label}</span>
      <Toggle checked={checked} onChange={onChange} tk={tk} />
    </div>
  );
}

/* ── Section Header ── */
function SectionHeader({ title, tk }: { title: string; tk: KanbanThemeTokens }) {
  return (
    <div style={{
      fontSize: 'var(--ds-font-size-100)', fontWeight: 700, textTransform: 'uppercase',
      color: tk.textMuted, letterSpacing: '0.06em',
      padding: '8px 0 4px',
      fontFamily: 'var(--cp-font-heading)',
    }}>
      {title}
    </div>
  );
}

/* ── Divider ── */
function Divider({ tk }: { tk: KanbanThemeTokens }) {
  return <div style={{ height: 1, background: tk.borderSubtle, margin: '4px 0' }} />;
}

export function ViewSettingsPanel({
  settings, onUpdate, onExpandAll, onCollapseAll, onClose, tk,
  density, onDensityChange,
  hasSwimlanes = true,
  canExpandAll = true,
  canCollapseAll = true,
}: ViewSettingsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const updateField = useCallback((field: keyof VisibleFields, value: boolean) => {
    onUpdate({ visibleFields: { ...settings.visibleFields, [field]: value } });
  }, [onUpdate, settings.visibleFields]);

  const FIELD_LABELS: { key: keyof VisibleFields; label: string }[] = [
    { key: 'workType', label: 'Work type' },
    { key: 'workItemKey', label: 'Work item key' },
    { key: 'epic', label: 'Epic' },
    { key: 'linkedWorkItems', label: 'Linked work items' },
    { key: 'priority', label: 'Priority' },
    { key: 'assignee', label: 'Assignee' },
    { key: 'sprintRelease', label: 'Sprint/Iteration' },
  ];

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="View settings"
      tabIndex={-1}
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: 4,
        width: 320,
        background: tk.surfaceBg,
        border: `1px solid ${tk.border}`,
        borderRadius: 8,
        padding: '12px 16px',
        zIndex: 50,
        boxShadow: tk.cardDragShadow,
        fontFamily: 'var(--cp-font-body)',
      }}
    >
      {/* Header */}
      <div style={{
        fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: tk.textPrimary,
        fontFamily: 'var(--cp-font-heading)', marginBottom: 4,
      }}>
        View settings
      </div>

      <Divider tk={tk} />

      {/* Fields section */}
      <SectionHeader title="Fields" tk={tk} />
      {FIELD_LABELS.map(({ key, label }) => (
        <ToggleRow
          key={key}
          label={label}
          checked={settings.visibleFields[key]}
          onChange={v => updateField(key, v)}
          tk={tk}
        />
      ))}

      {/* Density section — V2 only (only rendered when density + onDensityChange provided) */}
      {density && onDensityChange && (
        <>
          <Divider tk={tk} />
          <SectionHeader title="Density" tk={tk} />
          <div
            role="radiogroup"
            aria-label="Card density"
            style={{ display: 'flex', gap: 8, padding: '4px 0 4px' }}
          >
            {(['compact', 'dense', 'comfortable'] as const).map((d) => {
              const selected = density === d;
              return (
                <button
                  key={d}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onDensityChange(d)}
                  style={{
                    flex: 1,
                    height: 28,
                    padding: '0 8px',
                    fontSize: 'var(--ds-font-size-200)',
                    fontWeight: selected ? 600 : 500,
                    color: selected ? 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' : tk.textSecondary,
                    background: selected ? tk.selectedAccent : tk.chipBg,
                    border: `1px solid ${selected ? tk.selectedAccent : tk.border}`,
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontFamily: 'var(--cp-font-body)',
                    textTransform: 'capitalize',
                    transition: 'background 120ms ease, color 120ms ease',
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </>
      )}

      <Divider tk={tk} />

      {/* Quick Filters section — Jira parity: Board config → Quick Filters */}
      <SectionHeader title="Quick filters" tk={tk} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '4px 0' }}>
        {ALL_QUICK_FILTERS.map(({ key, label }) => {
          const enabled = (settings.enabledQuickFilters ?? []).includes(key as QuickFilterKey);
          const toggle = () => {
            const next = enabled
              ? (settings.enabledQuickFilters ?? []).filter(k => k !== key)
              : [...(settings.enabledQuickFilters ?? []), key as QuickFilterKey];
            onUpdate({ enabledQuickFilters: next });
          };
          return (
            <ToggleRow key={key} label={label} checked={enabled} onChange={toggle} tk={tk} />
          );
        })}
      </div>

      <Divider tk={tk} />

      {/* Card colors section — Jira parity: Board config → Card colors */}
      <SectionHeader title="Card colors" tk={tk} />
      <div role="radiogroup" aria-label="Card color rule" style={{ display: 'flex', gap: 8, padding: '4px 0 4px' }}>
        {([
          { value: 'none',      label: 'None' },
          { value: 'priority',  label: 'Priority' },
          { value: 'issueType', label: 'Issue type' },
        ] as { value: CardColorMode; label: string }[]).map(({ value, label }) => {
          const active = (settings.cardColorMode ?? 'none') === value;
          return (
            <button
              key={value}
              role="radio"
              aria-checked={active}
              onClick={() => onUpdate({ cardColorMode: value })}
              style={{
                flex: 1, height: 28, padding: '0 8px',
                fontSize: 'var(--ds-font-size-200)', fontWeight: active ? 600 : 500,
                color: active ? 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' : tk.textSecondary,
                background: active ? tk.selectedAccent : tk.chipBg,
                border: `1px solid ${active ? tk.selectedAccent : tk.border}`,
                borderRadius: 4, cursor: 'pointer',
                fontFamily: 'var(--cp-font-body)',
                transition: 'background 120ms ease, color 120ms ease',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Swimlanes section — hidden when groupBy==='none' (no swimlanes) */}
      {hasSwimlanes && (
        <>
          <Divider tk={tk} />
          <SectionHeader title="Swimlanes" tk={tk} />
          <div className="flex items-center gap-4" style={{ padding: '4px 0 4px' }}>
            <button
              onClick={canExpandAll ? onExpandAll : undefined}
              disabled={!canExpandAll}
              style={{
                fontSize: 'var(--ds-font-size-300)',
                color: canExpandAll ? tk.selectedAccent : tk.textMuted,
                background: 'none',
                border: 'none',
                cursor: canExpandAll ? 'pointer' : 'default',
                fontWeight: 500,
                padding: 0,
                fontFamily: 'var(--cp-font-body)',
                opacity: canExpandAll ? 1 : 0.45,
                transition: 'opacity 120ms ease, color 120ms ease',
              }}
            >
              Expand all
            </button>
            <button
              onClick={canCollapseAll ? onCollapseAll : undefined}
              disabled={!canCollapseAll}
              style={{
                fontSize: 'var(--ds-font-size-300)',
                color: canCollapseAll ? tk.selectedAccent : tk.textMuted,
                background: 'none',
                border: 'none',
                cursor: canCollapseAll ? 'pointer' : 'default',
                fontWeight: 500,
                padding: 0,
                fontFamily: 'var(--cp-font-body)',
                opacity: canCollapseAll ? 1 : 0.45,
                transition: 'opacity 120ms ease, color 120ms ease',
              }}
            >
              Collapse all
            </button>
          </div>
        </>
      )}
    </div>
  );
}
