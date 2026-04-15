/**
 * ViewSettingsPanel — Popover from ••• button on Kanban toolbar
 * Sections: Top toggles, Fields, Swimlanes
 * NOCTURNE Geist compliant
 */
import { useRef, useEffect, useCallback } from 'react';
import type { KanbanThemeTokens } from './kanban-tokens';
import type { KanbanViewSettings, VisibleFields } from '@/hooks/useKanbanViewSettings';

interface ViewSettingsPanelProps {
  settings: KanbanViewSettings;
  onUpdate: (partial: Partial<KanbanViewSettings>) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onClose: () => void;
  tk: KanbanThemeTokens;
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
        background: checked ? '#36B37E' : tk.chipBg,
        position: 'relative', cursor: 'pointer', flexShrink: 0,
        transition: 'background 150ms',
        display: 'flex', alignItems: 'center',
      }}
    >
      <span style={{
        width: 16, height: 16, borderRadius: '50%',
        background: '#FFFFFF',
        position: 'absolute',
        left: checked ? 18 : 2,
        transition: 'left 150ms',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

/* ── Row ── */
function ToggleRow({ label, checked, onChange, tk }: { label: string; checked: boolean; onChange: (v: boolean) => void; tk: KanbanThemeTokens }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: '6px 0' }}>
      <span style={{ fontSize: 13, color: tk.textSecondary, fontFamily: "'Inter', sans-serif" }}>{label}</span>
      <Toggle checked={checked} onChange={onChange} tk={tk} />
    </div>
  );
}

/* ── Section Header ── */
function SectionHeader({ title, tk }: { title: string; tk: KanbanThemeTokens }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      color: tk.textMuted, letterSpacing: '0.06em',
      padding: '10px 0 4px',
      fontFamily: "'Sora', sans-serif",
    }}>
      {title}
    </div>
  );
}

/* ── Divider ── */
function Divider({ tk }: { tk: KanbanThemeTokens }) {
  return <div style={{ height: 1, background: tk.borderSubtle, margin: '4px 0' }} />;
}

export function ViewSettingsPanel({ settings, onUpdate, onExpandAll, onCollapseAll, onClose, tk }: ViewSettingsPanelProps) {
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
    { key: 'cardCover', label: 'Card cover' },
    { key: 'workType', label: 'Work type' },
    { key: 'workItemKey', label: 'Work item key' },
    { key: 'epic', label: 'Epic' },
    { key: 'linkedWorkItems', label: 'Linked work items' },
    { key: 'priority', label: 'Priority' },
    { key: 'assignee', label: 'Assignee' },
    { key: 'fixVersions', label: 'Fix versions' },
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
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header */}
      <div style={{
        fontSize: 14, fontWeight: 600, color: tk.textPrimary,
        fontFamily: "'Sora', sans-serif", marginBottom: 4,
      }}>
        View settings
      </div>

      <Divider tk={tk} />

      {/* Top toggles */}
      <ToggleRow label="Open work items in sidebar" checked={settings.openInSidebar} onChange={v => onUpdate({ openInSidebar: v })} tk={tk} />
      <ToggleRow label="Quick filters" checked={settings.showQuickFilters} onChange={v => onUpdate({ showQuickFilters: v })} tk={tk} />
      <ToggleRow label="Work suggestions" checked={settings.showWorkSuggestions} onChange={v => onUpdate({ showWorkSuggestions: v })} tk={tk} />

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

      <Divider tk={tk} />

      {/* Swimlanes section */}
      <SectionHeader title="Swimlanes" tk={tk} />
      <div className="flex items-center gap-4" style={{ padding: '6px 0 4px' }}>
        <button
          onClick={onExpandAll}
          style={{
            fontSize: 13, color: tk.selectedAccent, background: 'none',
            border: 'none', cursor: 'pointer', fontWeight: 500, padding: 0,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Expand all
        </button>
        <button
          onClick={onCollapseAll}
          style={{
            fontSize: 13, color: tk.selectedAccent, background: 'none',
            border: 'none', cursor: 'pointer', fontWeight: 500, padding: 0,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Collapse all
        </button>
      </div>
    </div>
  );
}
