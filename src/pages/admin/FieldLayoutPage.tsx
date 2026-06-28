import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import {
  useAllFieldLayouts,
  useCustomFieldDefs,
  useSaveLayout,
  useAddFieldToLayout,
  type FieldLayoutRow,
  type FieldSection,
} from '@/hooks/admin/useFieldLayouts';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const T = {
  surface:       'var(--ds-surface)',
  surfaceSunken: 'var(--ds-surface-sunken)',
  surfaceOverlay:'var(--ds-surface-overlay)',
  text:          'var(--ds-text)',
  textSubtle:    'var(--ds-text-subtle)',
  textSubtlest:  'var(--ds-text-subtlest)',
  brand:         'var(--ds-link)',
  border:        'var(--ds-border)',
  borderSubtle:  'var(--ds-border-subtle)',
  bgNeutral:     'var(--ds-background-neutral)',
  bgHover:       'var(--ds-background-neutral-hovered)',
  bgSelected:    'var(--ds-background-selected)',
  danger:        'var(--ds-text-danger)',
};

const ISSUE_TYPES = [
  'Story', 'Epic', 'Feature', 'Task', 'QA Bug',
  'Production Incident', 'Change Request', 'Business Gap', 'Sub-task',
];

// ------------------------------------------------------------------
// Per-field ⋯ actions menu (portal-based, no @atlaskit/dropdown-menu)
// ------------------------------------------------------------------
interface FieldMenuProps {
  field: FieldLayoutRow;
  sectionFields: FieldLayoutRow[];
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveToSection: (section: FieldSection) => void;
  onRemove: () => void;
}

function FieldMenu({ field, sectionFields, onMoveUp, onMoveDown, onMoveToSection, onRemove }: FieldMenuProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  if (!open || !btnRef.current) {
    return (
      <button
        ref={btnRef}
        aria-label="Field options"
        onClick={() => setOpen(true)}
        style={{
          border: 'none', background: 'transparent', cursor: 'pointer',
          padding: '4px 6px', borderRadius: 3,
          color: T.textSubtle, fontSize: 'var(--ds-font-size-600)', lineHeight: 1,
          opacity: 0,
        }}
        className="field-row-menu-btn"
      >
        ⋯
      </button>
    );
  }

  const rect = btnRef.current.getBoundingClientRect();
  const idx = sectionFields.findIndex(f => f.id === field.id);
  const canMoveUp = idx > 0 && !field.is_pinned;
  const canMoveDown = idx < sectionFields.length - 1 && !field.is_pinned;
  const otherSection: FieldSection = field.section === 'description' ? 'context' : 'description';

  return (
    <>
      <button
        ref={btnRef}
        aria-label="Field options"
        onClick={() => setOpen(false)}
        style={{
          border: 'none', background: T.bgNeutral, cursor: 'pointer',
          padding: '4px 6px', borderRadius: 3,
          color: T.textSubtle, fontSize: 'var(--ds-font-size-600)', lineHeight: 1,
        }}
      >
        ⋯
      </button>
      {createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: 'fixed',
            top: rect.bottom + 4,
            right: window.innerWidth - rect.right,
            background: T.surfaceOverlay,
            border: `1px solid ${T.border}`,
            borderRadius: 4,
            boxShadow: '0 8px 24px var(--ds-shadow-raised, rgba(9,30,66,0.2))',
            padding: '4px 0',
            minWidth: 220,
            zIndex: 9999,
          }}
        >
          {/* Reorder within section */}
          <div style={{ padding: '4px 16px 4px', fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.textSubtlest, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Reorder within section
          </div>
          {[
            { label: 'Move to top', disabled: idx === 0 || field.is_pinned, fn: () => { onMoveUp(); onMoveUp(); onMoveUp(); onMoveUp(); onMoveUp(); onMoveUp(); onMoveUp(); onMoveUp(); onMoveUp(); onMoveUp(); } },
            { label: 'Move up', disabled: !canMoveUp, fn: onMoveUp },
            { label: 'Move down', disabled: !canMoveDown, fn: onMoveDown },
            { label: 'Move to bottom', disabled: idx === sectionFields.length - 1 || field.is_pinned, fn: () => { onMoveDown(); onMoveDown(); onMoveDown(); onMoveDown(); onMoveDown(); onMoveDown(); onMoveDown(); onMoveDown(); onMoveDown(); onMoveDown(); } },
          ].map(item => (
            <button
              key={item.label}
              role="menuitem"
              disabled={item.disabled}
              onClick={() => { setOpen(false); item.fn(); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 16px 8px 24px', border: 'none', background: 'transparent',
                cursor: item.disabled ? 'default' : 'pointer',
                fontSize: 'var(--ds-font-size-400)', color: item.disabled ? T.textSubtlest : T.text,
              }}
              onMouseEnter={e => { if (!item.disabled) (e.currentTarget as HTMLElement).style.background = T.bgNeutral; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {item.label}
            </button>
          ))}

          <div style={{ margin: '4px 0', borderTop: `1px solid ${T.borderSubtle}` }} />
          <div style={{ padding: '4px 16px 4px', fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.textSubtlest, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Move to section
          </div>
          <button
            role="menuitem"
            disabled={field.is_pinned}
            onClick={() => { setOpen(false); onMoveToSection(otherSection); }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '8px 16px 8px 24px', border: 'none', background: 'transparent',
              cursor: field.is_pinned ? 'default' : 'pointer',
              fontSize: 'var(--ds-font-size-400)', color: field.is_pinned ? T.textSubtlest : T.text,
            }}
            onMouseEnter={e => { if (!field.is_pinned) (e.currentTarget as HTMLElement).style.background = T.bgNeutral; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            {otherSection === 'context' ? 'Context fields' : 'Description fields'}
          </button>
          <button
            role="menuitem"
            disabled={field.is_pinned || field.is_required}
            onClick={() => { setOpen(false); onMoveToSection('hidden'); }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '8px 16px 8px 24px', border: 'none', background: 'transparent',
              cursor: (field.is_pinned || field.is_required) ? 'default' : 'pointer',
              fontSize: 'var(--ds-font-size-400)', color: (field.is_pinned || field.is_required) ? T.textSubtlest : T.text,
            }}
            onMouseEnter={e => { if (!field.is_pinned && !field.is_required) (e.currentTarget as HTMLElement).style.background = T.bgNeutral; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            Hide when empty
          </button>

          <div style={{ margin: '4px 0', borderTop: `1px solid ${T.borderSubtle}` }} />
          <button
            role="menuitem"
            disabled={field.is_pinned || field.is_required}
            onClick={() => { setOpen(false); onRemove(); }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '8px 16px', border: 'none', background: 'transparent',
              cursor: (field.is_pinned || field.is_required) ? 'default' : 'pointer',
              fontSize: 'var(--ds-font-size-400)', color: (field.is_pinned || field.is_required) ? T.textSubtlest : T.danger,
            }}
            onMouseEnter={e => { if (!field.is_pinned && !field.is_required) (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-danger-hovered, var(--ds-background-danger))'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            Remove field
          </button>
        </div>,
        document.body
      )}
    </>
  );
}

// ------------------------------------------------------------------
// One field row
// ------------------------------------------------------------------
interface FieldRowProps {
  field: FieldLayoutRow;
  sectionFields: FieldLayoutRow[];
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveToSection: (s: FieldSection) => void;
  onRemove: () => void;
}

function FieldRow({ field, sectionFields, onMoveUp, onMoveDown, onMoveToSection, onRemove }: FieldRowProps) {
  return (
    <div
      className="field-row"
      style={{
        display: 'flex', alignItems: 'center',
        padding: '8px 12px',
        borderBottom: `1px solid ${T.borderSubtle}`,
        gap: 8, cursor: 'default',
        background: T.surface,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = T.surfaceSunken;
        const btn = (e.currentTarget as HTMLElement).querySelector<HTMLElement>('.field-row-menu-btn');
        if (btn) btn.style.opacity = '1';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = T.surface;
        const btn = (e.currentTarget as HTMLElement).querySelector<HTMLElement>('.field-row-menu-btn');
        if (btn) btn.style.opacity = '0';
      }}
    >
      {/* Drag affordance (visual only — Jira parity) */}
      <div style={{ color: T.textSubtlest, fontSize: 'var(--ds-font-size-200)', cursor: 'grab', userSelect: 'none', flexShrink: 0 }}>⠿</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          fontSize: 'var(--ds-font-size-400)', color: field.is_pinned ? T.text : T.text,
          fontWeight: field.is_required ? 600 : 400,
        }}>
          {field.field_label}
          {field.is_required && <span style={{ color: T.danger, marginLeft: 0 }}>*</span>}
          {field.is_pinned && (
            <span style={{
              marginLeft: 4, fontSize: 'var(--ds-font-size-50)', padding: '0px 5px',
              background: T.bgNeutral, borderRadius: 3,
              color: T.textSubtlest, verticalAlign: 'middle',
            }}>
              pinned
            </span>
          )}
        </span>
        <span style={{ marginLeft: 8, fontSize: 'var(--ds-font-size-200)', color: T.textSubtlest }}>
          {field.field_type}
          {!field.is_system_field && (
            <span style={{
              marginLeft: 4, fontSize: 'var(--ds-font-size-50)', padding: '0px 5px',
              background: 'var(--ds-background-information)',
              borderRadius: 3, color: T.brand,
            }}>
              custom
            </span>
          )}
        </span>
      </div>

      <FieldMenu
        field={field}
        sectionFields={sectionFields}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onMoveToSection={onMoveToSection}
        onRemove={onRemove}
      />
    </div>
  );
}

// ------------------------------------------------------------------
// Section box
// ------------------------------------------------------------------
interface LayoutSectionProps {
  title: string;
  description: string;
  fields: FieldLayoutRow[];
  allFields: FieldLayoutRow[];
  section: FieldSection;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onMoveToSection: (id: string, s: FieldSection) => void;
  onRemove: (id: string) => void;
}

function LayoutSection({
  title, description, fields, allFields, section,
  onMoveUp, onMoveDown, onMoveToSection, onRemove,
}: LayoutSectionProps) {
  return (
    <div style={{
      border: `1px solid ${T.border}`,
      borderRadius: 4,
      background: T.surface,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 16px',
        background: T.surfaceSunken,
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: T.text }}>{title}</div>
        <div style={{ fontSize: 'var(--ds-font-size-200)', color: T.textSubtle, marginTop: 0 }}>{description}</div>
      </div>
      {fields.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: T.textSubtlest, fontSize: 'var(--ds-font-size-300)' }}>
          No fields in this section. Add fields from the panel on the right.
        </div>
      ) : (
        fields.map(f => (
          <FieldRow
            key={f.id}
            field={f}
            sectionFields={fields}
            onMoveUp={() => onMoveUp(f.id)}
            onMoveDown={() => onMoveDown(f.id)}
            onMoveToSection={s => onMoveToSection(f.id, s)}
            onRemove={() => onRemove(f.id)}
          />
        ))
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Available fields panel
// ------------------------------------------------------------------
interface AvailableFieldsPanelProps {
  allLayoutFields: FieldLayoutRow[];
  customFields: ReturnType<typeof useCustomFieldDefs>['data'];
  issueType: string;
  onAdd: (fieldKey: string, fieldLabel: string, fieldType: string, customFieldDefId?: string) => void;
}

function AvailableFieldsPanel({ allLayoutFields, customFields = [], issueType, onAdd }: AvailableFieldsPanelProps) {
  const visibleKeys = new Set(
    allLayoutFields.filter(f => f.section !== 'hidden').map(f => f.field_key)
  );

  const hiddenSystemFields = allLayoutFields.filter(f => f.section === 'hidden');
  const eligibleCustomFields = customFields.filter(cf => {
    const alreadyInLayout = allLayoutFields.some(l => l.custom_field_def_id === cf.id && l.section !== 'hidden');
    if (alreadyInLayout) return false;
    if (cf.is_global) return true;
    return cf.applicable_issue_types.includes(issueType);
  });

  const hasAvailable = hiddenSystemFields.length > 0 || eligibleCustomFields.length > 0;

  return (
    <div style={{
      border: `1px solid ${T.border}`,
      borderRadius: 4,
      background: T.surface,
      position: 'sticky',
      top: 16,
    }}>
      <div style={{
        padding: '12px 16px',
        background: T.surfaceSunken,
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: T.text }}>Available fields</div>
        <div style={{ fontSize: 'var(--ds-font-size-200)', color: T.textSubtle, marginTop: 0 }}>
          Click to add to description or context section.
        </div>
      </div>

      {!hasAvailable && (
        <div style={{ padding: 16, fontSize: 'var(--ds-font-size-300)', color: T.textSubtlest, textAlign: 'center' }}>
          All applicable fields are already in the layout.
        </div>
      )}

      {hiddenSystemFields.length > 0 && (
        <div>
          <div style={{ padding: '8px 16px 4px', fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.textSubtlest, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            System fields
          </div>
          {hiddenSystemFields.map(f => (
            <div
              key={f.id}
              style={{
                padding: '8px 16px', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'space-between',
                borderBottom: `1px solid ${T.borderSubtle}`,
              }}
              onClick={() => onAdd(f.field_key, f.field_label, f.field_type)}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.surfaceSunken}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <div>
                <div style={{ fontSize: 'var(--ds-font-size-300)', color: T.text }}>{f.field_label}</div>
                <div style={{ fontSize: 'var(--ds-font-size-100)', color: T.textSubtlest }}>{f.field_type}</div>
              </div>
              <span style={{ fontSize: 'var(--ds-font-size-600)', color: T.brand, lineHeight: 1 }}>+</span>
            </div>
          ))}
        </div>
      )}

      {eligibleCustomFields.length > 0 && (
        <div>
          <div style={{ padding: '8px 16px 4px', fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.textSubtlest, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Custom fields
          </div>
          {eligibleCustomFields.map(cf => (
            <div
              key={cf.id}
              style={{
                padding: '8px 16px', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'space-between',
                borderBottom: `1px solid ${T.borderSubtle}`,
              }}
              onClick={() => onAdd(`custom_${cf.id}`, cf.name, cf.field_type, cf.id)}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.surfaceSunken}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <div>
                <div style={{ fontSize: 'var(--ds-font-size-300)', color: T.text }}>
                  {cf.name}
                  <span style={{ marginLeft: 4, fontSize: 'var(--ds-font-size-50)', padding: '0px 5px', background: 'var(--ds-background-information)', borderRadius: 3, color: T.brand }}>custom</span>
                </div>
                <div style={{ fontSize: 'var(--ds-font-size-100)', color: T.textSubtlest }}>{cf.field_type}</div>
              </div>
              <span style={{ fontSize: 'var(--ds-font-size-600)', color: T.brand, lineHeight: 1 }}>+</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Main page
// ------------------------------------------------------------------
export default function FieldLayoutPage() {
  const [selectedType, setSelectedType] = useState<string>('Story');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Local working copy of the layout (so Save/Discard works)
  const [localRows, setLocalRows] = useState<FieldLayoutRow[]>([]);

  const { data: masterRows = [], isLoading } = useAllFieldLayouts(selectedType);
  const { data: customFields = [] } = useCustomFieldDefs();
  const saveLayout = useSaveLayout();
  const addField = useAddFieldToLayout();

  // Jira projects for the project selector
  const { data: projects = [] } = useQuery({
    queryKey: ['ph_jira_projects_list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_jira_projects')
        .select('key, name')
        .order('name');
      return data ?? [];
    },
  });

  // Sync local state from DB fetch
  useEffect(() => {
    setLocalRows(masterRows);
    setDirty(false);
  }, [masterRows, selectedType]);

  const descriptionFields = localRows.filter(r => r.section === 'description').sort((a, b) => a.position - b.position);
  const contextFields = localRows.filter(r => r.section === 'context').sort((a, b) => a.position - b.position);

  const swap = useCallback((section: FieldSection, idxA: number, idxB: number) => {
    setLocalRows(prev => {
      const next = [...prev];
      const sectionRows = next.filter(r => r.section === section).sort((a, b) => a.position - b.position);
      if (idxA < 0 || idxB >= sectionRows.length) return prev;
      // Swap positions
      const posA = sectionRows[idxA].position;
      const posB = sectionRows[idxB].position;
      const rowA = next.find(r => r.id === sectionRows[idxA].id)!;
      const rowB = next.find(r => r.id === sectionRows[idxB].id)!;
      rowA.position = posB;
      rowB.position = posA;
      return next;
    });
    setDirty(true);
  }, []);

  const handleMoveUp = useCallback((id: string) => {
    const row = localRows.find(r => r.id === id);
    if (!row) return;
    const sectionRows = localRows.filter(r => r.section === row.section).sort((a, b) => a.position - b.position);
    const idx = sectionRows.findIndex(r => r.id === id);
    if (idx <= 0 || row.is_pinned) return;
    swap(row.section, idx - 1, idx);
  }, [localRows, swap]);

  const handleMoveDown = useCallback((id: string) => {
    const row = localRows.find(r => r.id === id);
    if (!row) return;
    const sectionRows = localRows.filter(r => r.section === row.section).sort((a, b) => a.position - b.position);
    const idx = sectionRows.findIndex(r => r.id === id);
    if (idx >= sectionRows.length - 1 || row.is_pinned) return;
    swap(row.section, idx, idx + 1);
  }, [localRows, swap]);

  const handleMoveToSection = useCallback((id: string, section: FieldSection) => {
    setLocalRows(prev => {
      const next = prev.map(r => {
        if (r.id !== id) return r;
        const sectionRows = prev.filter(x => x.section === section);
        const maxPos = sectionRows.length > 0 ? Math.max(...sectionRows.map(x => x.position)) + 1 : 0;
        return { ...r, section, position: maxPos };
      });
      return next;
    });
    setDirty(true);
  }, []);

  const handleRemove = useCallback((id: string) => {
    handleMoveToSection(id, 'hidden');
  }, [handleMoveToSection]);

  const handleAddField = useCallback(async (fieldKey: string, fieldLabel: string, fieldType: string, customFieldDefId?: string) => {
    // If field already exists in layout (but hidden), just move to context
    const existing = localRows.find(r => r.field_key === fieldKey);
    if (existing) {
      handleMoveToSection(existing.id, 'context');
      return;
    }
    // Otherwise insert via API immediately
    const contextRows = localRows.filter(r => r.section === 'context');
    const maxPos = contextRows.length > 0 ? Math.max(...contextRows.map(x => x.position)) + 1 : 10;
    try {
      await supabase.from('catalyst_field_layouts').insert({
        issue_type: selectedType,
        project_key: selectedProject,
        section: 'context',
        field_key: fieldKey,
        field_label: fieldLabel,
        field_type: fieldType,
        position: maxPos,
        is_system_field: !customFieldDefId,
        custom_field_def_id: customFieldDefId ?? null,
      });
      // Refetch is handled by query invalidation
      setDirty(false);
    } catch { /* ignore */ }
  }, [localRows, selectedType, selectedProject, handleMoveToSection]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveLayout.mutateAsync({
        issueType: selectedType,
        projectKey: selectedProject,
        rows: localRows.map(r => ({ id: r.id, section: r.section, position: r.position })),
      });
      setDirty(false);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setLocalRows(masterRows);
    setDirty(false);
  };

  return (
    <AdminGuard>
      <style>{`
        .field-row:hover .field-row-menu-btn { opacity: 1 !important; }
      `}</style>

      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{
          padding: '16px 32px 0',
          background: T.surface,
          borderBottom: `1px solid ${T.border}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 'var(--ds-font-size-800)', fontWeight: 653, color: T.text, lineHeight: '28px' }}>Field layouts</h1>
              <p style={{ margin: '4px 0 0', fontSize: 'var(--ds-font-size-400)', color: T.textSubtle }}>
                Manage which fields appear on work items and how they're arranged. Master layouts apply to all projects unless a project override exists.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingBottom: 16 }}>
              {dirty && (
                <button
                  onClick={handleDiscard}
                  style={{
                    padding: '8px 16px', fontSize: 'var(--ds-font-size-400)', borderRadius: 4,
                    border: `1px solid ${T.border}`, background: T.surface,
                    color: T.text, cursor: 'pointer',
                  }}
                >
                  Discard
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!dirty || saving}
                style={{
                  padding: '8px 16px', fontSize: 'var(--ds-font-size-400)', borderRadius: 4, fontWeight: 500,
                  border: 'none', background: dirty ? T.brand : T.bgNeutral,
                  color: dirty ? 'var(--ds-text-inverse)' : T.textSubtle,
                  cursor: (!dirty || saving) ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>

          {/* Work item type tabs */}
          <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
            {ISSUE_TYPES.map(t => {
              const active = t === selectedType;
              return (
                <button
                  key={t}
                  onClick={() => {
                    if (dirty && !confirm('Discard unsaved changes?')) return;
                    setSelectedType(t);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '8px 16px', border: 'none', background: 'transparent',
                    cursor: 'pointer', fontSize: 'var(--ds-font-size-400)',
                    color: active ? T.brand : T.textSubtle,
                    fontWeight: active ? 600 : 400,
                    borderBottom: active ? `2px solid ${T.brand}` : '2px solid transparent',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  <JiraIssueTypeIcon type={t as never} size={16} />
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
          {/* Project selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 'var(--ds-font-size-400)', color: T.textSubtle, fontWeight: 500 }}>Layout for:</span>
            <select
              value={selectedProject ?? ''}
              onChange={e => {
                if (dirty && !confirm('Discard unsaved changes?')) return;
                setSelectedProject(e.target.value || null);
              }}
              style={{
                padding: '4px 12px', fontSize: 'var(--ds-font-size-400)', color: T.text,
                border: `1px solid ${T.border}`, borderRadius: 4,
                background: T.surface, cursor: 'pointer',
              }}
            >
              <option value="">Master layout (applies to all projects)</option>
              {projects.map(p => (
                <option key={p.key} value={p.key}>{p.name} ({p.key})</option>
              ))}
            </select>
            {selectedProject && (
              <span style={{
                fontSize: 'var(--ds-font-size-200)', padding: '0px 8px',
                background: 'var(--ds-background-information)',
                border: `1px solid var(--ds-border-information)`,
                borderRadius: 12, color: T.brand,
              }}>
                Project override — inherits from master for any unset fields
              </span>
            )}
          </div>

          {saveError && (
            <div style={{
              marginBottom: 16, padding: '8px 14px',
              background: 'var(--ds-background-danger)',
              borderRadius: 4, color: T.danger, fontSize: 'var(--ds-font-size-400)',
            }}>
              {saveError}
            </div>
          )}

          {isLoading ? (
            <div style={{ padding: 32, textAlign: 'center', color: T.textSubtle }}>Loading layout…</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 280px', gap: 16, alignItems: 'start' }}>
              {/* Description section */}
              <LayoutSection
                title="Description fields"
                description="Shown in the main body of the work item (left side)"
                section="description"
                fields={descriptionFields}
                allFields={localRows}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onMoveToSection={handleMoveToSection}
                onRemove={handleRemove}
              />

              {/* Context section */}
              <LayoutSection
                title="Context fields"
                description="Shown in the right sidebar (metadata panel)"
                section="context"
                fields={contextFields}
                allFields={localRows}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onMoveToSection={handleMoveToSection}
                onRemove={handleRemove}
              />

              {/* Available fields panel */}
              <AvailableFieldsPanel
                allLayoutFields={localRows}
                customFields={customFields}
                issueType={selectedType}
                onAdd={handleAddField}
              />
            </div>
          )}

          {/* Hidden fields summary */}
          {!isLoading && localRows.filter(r => r.section === 'hidden').length > 0 && (
            <div style={{
              marginTop: 16, padding: '12px 16px',
              background: T.surfaceSunken,
              border: `1px solid ${T.border}`,
              borderRadius: 4,
            }}>
              <span style={{ fontSize: 'var(--ds-font-size-300)', color: T.textSubtle, fontWeight: 500 }}>
                Hidden / not shown ({localRows.filter(r => r.section === 'hidden').length}):
              </span>
              {' '}
              <span style={{ fontSize: 'var(--ds-font-size-300)', color: T.textSubtlest }}>
                {localRows.filter(r => r.section === 'hidden').map(r => r.field_label).join(', ')}
              </span>
              <span style={{ fontSize: 'var(--ds-font-size-200)', color: T.textSubtlest, marginLeft: 8 }}>
                — these fields are available in the panel above to re-add.
              </span>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
