import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AdminGuard } from '@/components/admin/AdminGuard';
import {
  useAllCustomFieldDefs,
  useCreateCustomField,
  useUpdateCustomField,
  useDeactivateCustomField,
  type CustomFieldDef,
} from '@/hooks/admin/useFieldLayouts';

const T = {
  surface:      'var(--ds-surface)',
  surfaceSunken:'var(--ds-surface-sunken)',
  text:         'var(--ds-text)',
  textSubtle:   'var(--ds-text-subtle)',
  textSubtlest: 'var(--ds-text-subtlest)',
  brand:        'var(--ds-link)',
  border:       'var(--ds-border)',
  borderSubtle: 'var(--ds-border-subtle)',
  bgNeutral:    'var(--ds-background-neutral)',
  bgHover:      'var(--ds-background-neutral-hovered)',
  danger:       'var(--ds-text-danger)',
  dangerBold:   'var(--ds-background-danger-bold)',
};

const ISSUE_TYPES = [
  'Story', 'Epic', 'Feature', 'Task', 'QA Bug',
  'Production Incident', 'Change Request', 'Business Gap', 'Sub-task',
];

const FIELD_TYPE_OPTIONS = [
  { value: 'text',             label: 'Short text' },
  { value: 'textarea',         label: 'Paragraph' },
  { value: 'number',           label: 'Number' },
  { value: 'date',             label: 'Date' },
  { value: 'datetime',         label: 'Date & time' },
  { value: 'select',           label: 'Select list (single choice)' },
  { value: 'multi_select',     label: 'Select list (multiple choices)' },
  { value: 'radio_buttons',    label: 'Radio buttons' },
  { value: 'checkbox',         label: 'Checkboxes' },
  { value: 'url',              label: 'URL' },
  { value: 'user_picker',      label: 'User picker (single)' },
  { value: 'labels',           label: 'Labels' },
  { value: 'cascading_select', label: 'Cascading select' },
  { value: 'boolean',          label: 'Yes/No (boolean)' },
];

const FIELD_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  FIELD_TYPE_OPTIONS.map(o => [o.value, o.label])
);

interface PortalMenuProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  children: React.ReactNode;
}
function PortalMenu({ isOpen, onClose, triggerRef, children }: PortalMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node))
        onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [isOpen, onClose, triggerRef]);
  if (!isOpen || !triggerRef.current) return null;
  const rect = triggerRef.current.getBoundingClientRect();
  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: 'fixed',
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 4,
        boxShadow: '0 8px 24px var(--ds-shadow-raised, rgba(9,30,66,0.2))',
        padding: '4px 0',
        minWidth: 160,
        zIndex: 9999,
      }}
    >
      {children}
    </div>,
    document.body
  );
}

interface MenuItem {
  label: string;
  danger?: boolean;
  onClick: () => void;
}
function RowMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={btnRef}
        role="button"
        aria-label="Field actions"
        onClick={() => setOpen(v => !v)}
        style={{
          border: 'none', background: 'transparent', cursor: 'pointer',
          padding: '4px 8px', borderRadius: 3, color: T.textSubtle,
          fontSize: 'var(--ds-font-size-600)', lineHeight: 1,
        }}
      >
        ⋯
      </button>
      <PortalMenu isOpen={open} onClose={() => setOpen(false)} triggerRef={btnRef}>
        {items.map(item => (
          <button
            key={item.label}
            role="menuitem"
            onClick={() => { setOpen(false); item.onClick(); }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '8px 16px', border: 'none', background: 'transparent',
              cursor: 'pointer', fontSize: 'var(--ds-font-size-400)',
              color: item.danger ? T.danger : T.text,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.bgNeutral; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            {item.label}
          </button>
        ))}
      </PortalMenu>
    </>
  );
}

interface FieldFormState {
  name: string;
  field_type: string;
  description: string;
  help_text: string;
  is_global: boolean;
  applicable_issue_types: string[];
  options_raw: string;
}

const EMPTY_FORM: FieldFormState = {
  name: '',
  field_type: 'text',
  description: '',
  help_text: '',
  is_global: false,
  applicable_issue_types: [],
  options_raw: '',
};

interface FieldDrawerProps {
  open: boolean;
  onClose: () => void;
  initial?: CustomFieldDef | null;
}
function FieldDrawer({ open, onClose, initial }: FieldDrawerProps) {
  const [form, setForm] = useState<FieldFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createFn = useCreateCustomField();
  const updateFn = useUpdateCustomField();

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name,
        field_type: initial.field_type,
        description: initial.description ?? '',
        help_text: initial.help_text ?? '',
        is_global: initial.is_global,
        applicable_issue_types: initial.applicable_issue_types ?? [],
        options_raw: initial.options_json ? JSON.stringify(initial.options_json, null, 2) : '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError(null);
  }, [open, initial]);

  const needsOptions = ['select', 'multi_select', 'radio_buttons', 'checkbox', 'cascading_select'].includes(form.field_type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      let options_json: unknown = undefined;
      if (needsOptions && form.options_raw.trim()) {
        try { options_json = JSON.parse(form.options_raw); }
        catch { setError('Options must be valid JSON.'); setSaving(false); return; }
      }
      if (initial) {
        await updateFn.mutateAsync({
          id: initial.id,
          name: form.name,
          description: form.description || null,
          help_text: form.help_text || null,
          is_global: form.is_global,
          applicable_issue_types: form.applicable_issue_types,
          options_json,
          is_active: true,
        });
      } else {
        await createFn.mutateAsync({
          name: form.name,
          field_type: form.field_type,
          description: form.description || null,
          help_text: form.help_text || null,
          is_global: form.is_global,
          applicable_issue_types: form.applicable_issue_types,
          options_json,
        });
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const toggleType = (t: string) => {
    setForm(f => ({
      ...f,
      applicable_issue_types: f.applicable_issue_types.includes(t)
        ? f.applicable_issue_types.filter(x => x !== t)
        : [...f.applicable_issue_types, t],
    }));
  };

  if (!open) return null;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex' }}>
      {/* Backdrop */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'var(--ds-shadow-raised, rgba(9,30,66,0.4))' }}
        onClick={onClose}
      />
      {/* Drawer panel */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0,
        width: 520, background: T.surface,
        boxShadow: '-4px 0 24px var(--ds-shadow-raised, rgba(9,30,66,0.15))',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px 16px',
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 'var(--ds-font-size-700)', fontWeight: 600, color: T.text }}>
              {initial ? 'Edit field' : 'Create field'}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 'var(--ds-font-size-400)', color: T.textSubtle }}>
              {initial
                ? 'Update the field definition.'
                : 'Custom fields can be added to any work item layout.'}
            </p>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 'var(--ds-font-size-700)', color: T.textSubtle, padding: 4 }} aria-label="Close">✕</button>
        </div>
        {/* Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{ padding: '8px 14px', background: 'var(--ds-background-danger)', borderRadius: 4, color: T.danger, fontSize: 'var(--ds-font-size-400)' }}>
              {error}
            </div>
          )}

          {/* Name */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.textSubtle }}>Name <span style={{ color: T.danger }}>*</span></span>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Customer priority"
              style={{
                padding: '8px 12px', fontSize: 'var(--ds-font-size-400)', color: T.text,
                border: `1px solid ${T.border}`, borderRadius: 4,
                background: T.surface, outline: 'none',
              }}
              autoFocus
            />
          </label>

          {/* Field type — only editable on create */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.textSubtle }}>Field type</span>
            <select
              value={form.field_type}
              disabled={!!initial}
              onChange={e => setForm(f => ({ ...f, field_type: e.target.value }))}
              style={{
                padding: '8px 12px', fontSize: 'var(--ds-font-size-400)', color: T.text,
                border: `1px solid ${T.border}`, borderRadius: 4,
                background: initial ? T.bgNeutral : T.surface,
                cursor: initial ? 'not-allowed' : 'default',
              }}
            >
              {FIELD_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {initial && (
              <span style={{ fontSize: 'var(--ds-font-size-100)', color: T.textSubtlest }}>Field type cannot be changed after creation.</span>
            )}
          </label>

          {/* Options (for select-type fields) */}
          {needsOptions && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.textSubtle }}>Options (JSON array)</span>
              <textarea
                value={form.options_raw}
                onChange={e => setForm(f => ({ ...f, options_raw: e.target.value }))}
                rows={4}
                placeholder={'["Option A", "Option B", "Option C"]'}
                style={{
                  padding: '8px 12px', fontSize: 'var(--ds-font-size-300)', color: T.text,
                  border: `1px solid ${T.border}`, borderRadius: 4,
                  background: T.surface, resize: 'vertical', fontFamily: 'var(--ds-font-family-code, monospace)',
                }}
              />
            </label>
          )}

          {/* Description */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.textSubtle }}>Description</span>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="What this field is used for"
              style={{
                padding: '8px 12px', fontSize: 'var(--ds-font-size-400)', color: T.text,
                border: `1px solid ${T.border}`, borderRadius: 4,
                background: T.surface, resize: 'vertical',
              }}
            />
          </label>

          {/* Help text */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.textSubtle }}>Help text</span>
            <input
              value={form.help_text}
              onChange={e => setForm(f => ({ ...f, help_text: e.target.value }))}
              placeholder="Shown as a tooltip on the field"
              style={{
                padding: '8px 12px', fontSize: 'var(--ds-font-size-400)', color: T.text,
                border: `1px solid ${T.border}`, borderRadius: 4,
                background: T.surface,
              }}
            />
          </label>

          {/* Global toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.is_global}
              onChange={e => setForm(f => ({ ...f, is_global: e.target.checked, applicable_issue_types: e.target.checked ? [] : f.applicable_issue_types }))}
            />
            <div>
              <span style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: T.text }}>Apply to all work item types</span>
              <p style={{ margin: '0px 0 0', fontSize: 'var(--ds-font-size-200)', color: T.textSubtle }}>When checked, this field can be added to any layout.</p>
            </div>
          </label>

          {/* Applicable issue types */}
          {!form.is_global && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: T.textSubtle }}>Applicable work item types</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ISSUE_TYPES.map(t => {
                  const checked = form.applicable_issue_types.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleType(t)}
                      style={{
                        padding: '4px 10px', fontSize: 'var(--ds-font-size-200)', borderRadius: 12,
                        border: `1px solid ${checked ? T.brand : T.border}`,
                        background: checked ? 'var(--ds-background-selected)' : T.surface,
                        color: checked ? T.brand : T.textSubtle,
                        cursor: 'pointer', fontWeight: checked ? 600 : 400,
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </form>
        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: `1px solid ${T.border}`,
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px', fontSize: 'var(--ds-font-size-400)', borderRadius: 4,
              border: `1px solid ${T.border}`, background: T.surface,
              color: T.text, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              padding: '8px 16px', fontSize: 'var(--ds-font-size-400)', borderRadius: 4,
              border: 'none', background: T.brand,
              color: 'var(--ds-text-inverse)', cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Create field'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function FieldRegistryPage() {
  const { data: fields = [], isLoading } = useAllCustomFieldDefs();
  const deactivate = useDeactivateCustomField();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CustomFieldDef | null>(null);
  const [searchQ, setSearchQ] = useState('');

  const filtered = fields.filter(f =>
    f.name.toLowerCase().includes(searchQ.toLowerCase()) ||
    (f.description ?? '').toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <AdminGuard>
      <FieldDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditTarget(null); }}
        initial={editTarget}
      />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 32px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 'var(--ds-font-size-800)', fontWeight: 653, color: T.text, lineHeight: '28px' }}>Fields</h1>
            <p style={{ margin: '4px 0 0', fontSize: 'var(--ds-font-size-400)', color: T.textSubtle }}>
              Custom fields extend work items beyond Jira system fields. Add them to layouts per work item type.
            </p>
          </div>
          <button
            onClick={() => { setEditTarget(null); setDrawerOpen(true); }}
            style={{
              padding: '8px 16px', fontSize: 'var(--ds-font-size-400)', fontWeight: 500, borderRadius: 4,
              border: 'none', background: T.brand, color: 'var(--ds-surface)', cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Create field
          </button>
        </div>

        {/* Search */}
        <div style={{ marginBottom: 16 }}>
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Search fields…"
            style={{
              width: '100%', maxWidth: 320, padding: '8px 12px', fontSize: 'var(--ds-font-size-400)',
              border: `1px solid ${T.border}`, borderRadius: 4,
              background: T.surface, color: T.text, boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Table */}
        <div style={{
          border: `1px solid ${T.border}`, borderRadius: 4,
          background: T.surface, overflow: 'hidden',
        }}>
          {/* Table head */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1.4fr 2fr 1fr 48px',
            padding: '8px 16px',
            borderBottom: `1.67px solid var(--ds-border-subtle, rgba(11,18,14,0.14))`,
            background: T.surfaceSunken,
          }}>
            {['Name', 'Field type', 'Applies to', 'Status', ''].map(h => (
              <span key={h} style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 653, color: T.textSubtle }}>{h}</span>
            ))}
          </div>

          {isLoading && (
            <div style={{ padding: 32, textAlign: 'center', color: T.textSubtle, fontSize: 'var(--ds-font-size-400)' }}>Loading…</div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: T.textSubtle, fontSize: 'var(--ds-font-size-400)' }}>
              {searchQ ? 'No fields match your search.' : 'No custom fields yet. Create one to get started.'}
            </div>
          )}

          {filtered.map((field, idx) => (
            <div
              key={field.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.4fr 2fr 1fr 48px',
                padding: '8px 16px',
                borderBottom: idx < filtered.length - 1 ? `1px solid ${T.borderSubtle}` : 'none',
                alignItems: 'center',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = T.surfaceSunken}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <div>
                <div style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: T.text }}>{field.name}</div>
                {field.description && (
                  <div style={{ fontSize: 'var(--ds-font-size-200)', color: T.textSubtlest, marginTop: 0 }}>{field.description}</div>
                )}
              </div>
              <span style={{ fontSize: 'var(--ds-font-size-400)', color: T.textSubtle }}>
                {FIELD_TYPE_LABEL[field.field_type] ?? field.field_type}
              </span>
              <span style={{ fontSize: 'var(--ds-font-size-200)', color: T.textSubtle }}>
                {field.is_global
                  ? 'All work item types'
                  : field.applicable_issue_types.length > 0
                    ? field.applicable_issue_types.join(', ')
                    : '—'}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 'var(--ds-font-size-100)', fontWeight: 600,
                color: field.is_active ? 'var(--ds-text-success)' : T.textSubtlest,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: field.is_active ? 'var(--ds-icon-success)' : T.textSubtlest,
                  display: 'inline-block',
                }} />
                {field.is_active ? 'Active' : 'Inactive'}
              </span>
              <RowMenu items={[
                {
                  label: 'Edit field',
                  onClick: () => { setEditTarget(field); setDrawerOpen(true); },
                },
                {
                  label: 'Deactivate',
                  danger: true,
                  onClick: () => {
                    if (confirm(`Deactivate "${field.name}"? It will be hidden from all layouts.`))
                      deactivate.mutate(field.id);
                  },
                },
              ]} />
            </div>
          ))}
        </div>

        <p style={{ marginTop: 16, fontSize: 'var(--ds-font-size-200)', color: T.textSubtlest }}>
          {filtered.length} field{filtered.length !== 1 ? 's' : ''} shown.
          {' '}To add a field to a work item's layout, go to{' '}
          <a href="/admin/fields/layout" style={{ color: T.brand }}>Field layouts</a>.
        </p>
      </div>
    </AdminGuard>
  );
}
