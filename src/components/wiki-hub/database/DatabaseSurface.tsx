/**
 * DatabaseSurface — Notion-style database (CAT-DOCEX-DB-COEDIT-20260705-001
 * D2). View tabs across the top; the TABLE view rides the canonical
 * JiraTable (column resize/sort/keyboard nav come free). Cells render by
 * field type; text/number/url edit inline via JiraTable's commit contract.
 */
import { useMemo, useState } from 'react';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';
import { DropdownMenu, Lozenge } from '@/components/ads';
import { Input } from '@/components/ui/input';
import { Plus, ChevronLeft, ChevronRight } from '@/lib/atlaskit-icons';
import { CalendarGrid } from '@/components/workhub/calendar/CalendarGrid';
import { toDateString } from '@/lib/workhub/calendarHelpers';
import type { CalendarEvent } from '@/types/workhub.types';
import {
  useDocexFields,
  useDocexRows,
  useDocexViews,
  useCreateDocexField,
  useCreateDocexRow,
  useCreateDocexView,
  useUpdateDocexRowValues,
  useDeleteDocexRow,
  type DocexDatabase,
  type DocexField,
  type DocexRow,
  type DocexFieldType,
  type DocexViewKind,
} from '@/hooks/useDocexDatabase';

const VIEW_KINDS: { kind: DocexViewKind; label: string }[] = [
  { kind: 'table', label: 'Table' },
  { kind: 'board', label: 'Board' },
  { kind: 'list', label: 'List' },
  { kind: 'gallery', label: 'Gallery' },
  { kind: 'calendar', label: 'Calendar' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const FIELD_TYPES: { value: DocexFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Select' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'url', label: 'URL' },
];

const CHOICE_APPEARANCE: Record<string, 'default' | 'inprogress' | 'success' | 'removed' | 'new' | 'moved'> = {
  default: 'default',
  inprogress: 'inprogress',
  success: 'success',
  danger: 'removed',
  new: 'new',
  moved: 'moved',
};

function CellValue({ field, row, commit }: { field: DocexField; row: DocexRow; commit: (v: unknown) => void }) {
  const raw = row.values?.[field.id];
  switch (field.type) {
    case 'checkbox':
      return (
        <input
          type="checkbox"
          checked={!!raw}
          aria-label={field.name}
          onChange={(e) => commit(e.target.checked)}
          style={{ accentColor: 'var(--ds-background-brand-bold)', width: 16, height: 16 }}
        />
      );
    case 'select': {
      const choice = (field.options.choices ?? []).find((c) => c.id === raw);
      return choice ? (
        <Lozenge appearance={CHOICE_APPEARANCE[choice.color ?? 'default'] ?? 'default'}>{choice.label}</Lozenge>
      ) : (
        <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>
      );
    }
    case 'date':
      return raw ? (
        <span>{new Date(String(raw)).toLocaleDateString()}</span>
      ) : (
        <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>
      );
    case 'url':
      return raw ? (
        <a href={String(raw)} target="_blank" rel="noreferrer" style={{ color: 'var(--ds-text-brand)' }}>
          {String(raw).replace(/^https?:\/\//, '').slice(0, 40)}
        </a>
      ) : (
        <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>
      );
    case 'number':
      return raw === undefined || raw === null || raw === '' ? (
        <span style={{ color: 'var(--ds-text-subtlest)' }}>—</span>
      ) : (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{String(raw)}</span>
      );
    default:
      return raw ? <span>{String(raw)}</span> : <span style={{ color: 'var(--ds-text-subtlest)' }}> </span>;
  }
}

/** Inline editor for text/number/url/date/select cells (Notion click-to-edit). */
function EditableCell({ field, row, onSave }: { field: DocexField; row: DocexRow; onSave: (v: unknown) => void }) {
  const [editing, setEditing] = useState(false);
  const raw = row.values?.[field.id];

  if (field.type === 'checkbox') {
    return <CellValue field={field} row={row} commit={onSave} />;
  }

  if (editing && field.type === 'select') {
    return (
      <select
        autoFocus
        defaultValue={String(raw ?? '')}
        aria-label={field.name}
        onBlur={() => setEditing(false)}
        onChange={(e) => {
          onSave(e.target.value || null);
          setEditing(false);
        }}
        style={{
          font: 'var(--ds-font-body)',
          background: 'var(--ds-surface)',
          color: 'var(--ds-text)',
          border: '1px solid var(--ds-border-focused)',
          borderRadius: 4,
          padding: '2px 4px',
        }}
      >
        <option value="">—</option>
        {(field.options.choices ?? []).map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
    );
  }

  if (editing) {
    return (
      <Input
        autoFocus
        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        defaultValue={field.type === 'date' && raw ? String(raw).slice(0, 10) : String(raw ?? '')}
        aria-label={field.name}
        onBlur={(e) => {
          const v = e.target.value;
          onSave(field.type === 'number' ? (v === '' ? null : Number(v)) : v || null);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') setEditing(false);
        }}
        style={{ height: 28, font: 'var(--ds-font-body)' }}
      />
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => e.key === 'Enter' && setEditing(true)}
      style={{ minHeight: 22, cursor: 'text', width: '100%' }}
    >
      <CellValue field={field} row={row} commit={onSave} />
    </div>
  );
}

/** First text field = the card/row title; falls back to the first field. */
function pickTitleField(fields: DocexField[]): DocexField | undefined {
  return fields.find((f) => f.type === 'text') ?? fields[0];
}
/** Group-by field for the board: config override, else first select field. */
function pickGroupField(fields: DocexField[], groupId?: string | null): DocexField | undefined {
  if (groupId) return fields.find((f) => f.id === groupId);
  return fields.find((f) => f.type === 'select');
}

const NO_GROUP = '__none__';

interface ViewProps {
  fields: DocexField[];
  rows: DocexRow[];
  groupFieldId?: string | null;
  onUpdate: (row: DocexRow, fieldId: string, value: unknown) => void;
  onAddRow: (seed?: Record<string, unknown>) => void;
}

/** Non-title fields shown as compact chips on a card/list item. */
function FieldChips({ fields, row }: { fields: DocexField[]; row: DocexRow }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
      {fields.map((f) => {
        const raw = row.values?.[f.id];
        if (raw === undefined || raw === null || raw === '') return null;
        return (
          <span key={f.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: 'var(--ds-text-subtlest)', font: 'var(--ds-font-body-small)' }}>{f.name}:</span>
            <span style={{ font: 'var(--ds-font-body-small)', color: 'var(--ds-text-subtle)' }}>
              <CellValue field={f} row={row} commit={() => {}} />
            </span>
          </span>
        );
      })}
    </div>
  );
}

function BoardView({ fields, rows, groupFieldId, onUpdate, onAddRow }: ViewProps) {
  const titleField = pickTitleField(fields);
  const groupField = pickGroupField(fields, groupFieldId);

  if (!groupField) {
    return (
      <p style={{ color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body)', padding: 16 }}>
        Add a Select field to group the board by status.
      </p>
    );
  }
  const choices = groupField.options.choices ?? [];
  const columns = [...choices, { id: NO_GROUP, label: `No ${groupField.name}`, color: 'default' }];
  const otherFields = fields.filter((f) => f.id !== titleField?.id && f.id !== groupField.id);

  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, alignItems: 'flex-start' }}>
      {columns.map((col) => {
        const colRows = rows.filter((r) => (r.values?.[groupField.id] ?? NO_GROUP) === col.id);
        return (
          <div
            key={col.id}
            style={{
              width: 280,
              flexShrink: 0,
              background: 'var(--ds-surface-sunken)',
              borderRadius: 8,
              padding: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px 8px' }}>
              {col.id === NO_GROUP ? (
                <span style={{ color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body-small)', fontWeight: 600 }}>
                  {col.label}
                </span>
              ) : (
                <Lozenge appearance={CHOICE_APPEARANCE[col.color ?? 'default'] ?? 'default'}>{col.label}</Lozenge>
              )}
              <span style={{ color: 'var(--ds-text-subtlest)', font: 'var(--ds-font-body-small)' }}>{colRows.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {colRows.map((r) => (
                <div
                  key={r.id}
                  style={{
                    background: 'var(--ds-surface-raised)',
                    border: '1px solid var(--ds-border)',
                    borderRadius: 8,
                    padding: 10,
                    boxShadow: 'var(--ds-shadow-raised)',
                  }}
                >
                  <div style={{ font: 'var(--ds-font-body)', fontWeight: 500, color: 'var(--ds-text)' }}>
                    {String(r.values?.[titleField?.id ?? ''] ?? 'Untitled')}
                  </div>
                  <FieldChips fields={otherFields} row={r} />
                  {/* Move between columns (click-to-move — reliable across the whole board). */}
                  <select
                    value={String(r.values?.[groupField.id] ?? '')}
                    aria-label={`${groupField.name} for card`}
                    onChange={(e) => onUpdate(r, groupField.id, e.target.value || null)}
                    style={{
                      marginTop: 8,
                      width: '100%',
                      font: 'var(--ds-font-body-small)',
                      background: 'var(--ds-surface)',
                      color: 'var(--ds-text-subtle)',
                      border: '1px solid var(--ds-border)',
                      borderRadius: 4,
                      padding: '2px 4px',
                    }}
                  >
                    <option value="">— {groupField.name}</option>
                    {choices.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              <button
                type="button"
                onClick={() => onAddRow(col.id === NO_GROUP ? undefined : { [groupField.id]: col.id })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--ds-text-subtle)',
                  font: 'var(--ds-font-body-small)',
                  cursor: 'pointer',
                  padding: '6px',
                }}
              >
                <Plus style={{ width: 13, height: 13 }} /> New
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({ fields, rows, onUpdate, onAddRow }: ViewProps) {
  const titleField = pickTitleField(fields);
  const otherFields = fields.filter((f) => f.id !== titleField?.id);
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map((r) => (
          <div
            key={r.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              borderBottom: '1px solid var(--ds-border)',
            }}
          >
            <span style={{ flex: 1, minWidth: 0, font: 'var(--ds-font-body)', fontWeight: 500, color: 'var(--ds-text)' }}>
              {String(r.values?.[titleField?.id ?? ''] ?? 'Untitled')}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              {otherFields.map((f) => (
                <EditableCell
                  key={f.id}
                  field={f}
                  row={r}
                  onSave={(v) => onUpdate(r, f.id, v)}
                />
              ))}
            </span>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onAddRow()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          width: '100%',
          marginTop: 4,
          padding: '8px 12px',
          border: 'none',
          background: 'transparent',
          color: 'var(--ds-text-subtle)',
          font: 'var(--ds-font-body)',
          cursor: 'pointer',
        }}
      >
        <Plus style={{ width: 14, height: 14 }} /> New row
      </button>
    </div>
  );
}

function GalleryView({ fields, rows, onAddRow }: ViewProps) {
  const titleField = pickTitleField(fields);
  const otherFields = fields.filter((f) => f.id !== titleField?.id);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
      {rows.map((r) => (
        <div
          key={r.id}
          style={{
            background: 'var(--ds-surface-raised)',
            border: '1px solid var(--ds-border)',
            borderRadius: 8,
            padding: 14,
            boxShadow: 'var(--ds-shadow-raised)',
            minHeight: 96,
          }}
        >
          <div style={{ font: 'var(--ds-font-body)', fontWeight: 600, color: 'var(--ds-text)' }}>
            {String(r.values?.[titleField?.id ?? ''] ?? 'Untitled')}
          </div>
          <FieldChips fields={otherFields} row={r} />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onAddRow()}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          minHeight: 96,
          border: '1px dashed var(--ds-border)',
          borderRadius: 8,
          background: 'transparent',
          color: 'var(--ds-text-subtle)',
          font: 'var(--ds-font-body)',
          cursor: 'pointer',
        }}
      >
        <Plus style={{ width: 14, height: 14 }} /> New card
      </button>
    </div>
  );
}

function CalendarView({ fields, rows, onAddRow }: ViewProps) {
  const titleField = pickTitleField(fields);
  const dateField = fields.find((f) => f.type === 'date');
  const today = new Date();
  const [ym, setYm] = useState<{ y: number; m: number }>({ y: today.getFullYear(), m: today.getMonth() });

  if (!dateField) {
    return (
      <p style={{ color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body)', padding: 16 }}>
        Add a Date field to place rows on the calendar.
      </p>
    );
  }

  const events: CalendarEvent[] = rows
    .map((r) => {
      const raw = r.values?.[dateField.id];
      if (!raw) return null;
      const dateStr = String(raw).slice(0, 10);
      return {
        entity_id: r.id,
        event_type: 'workitem' as const,
        event_title: String(r.values?.[titleField?.id ?? ''] ?? 'Untitled'),
        event_date: dateStr,
        event_status: '',
        event_color: '',
      };
    })
    .filter((e): e is CalendarEvent => e !== null);

  const shiftMonth = (delta: number) => {
    setYm((p) => {
      const d = new Date(p.y, p.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ font: 'var(--ds-font-heading-small)', color: 'var(--ds-text)' }}>
          {MONTH_NAMES[ym.m]} {ym.y}
        </span>
        <div style={{ flex: 1 }} />
        <button type="button" aria-label="Previous month" className="db-cal-nav" onClick={() => shiftMonth(-1)}>
          <ChevronLeft style={{ width: 16, height: 16 }} />
        </button>
        <button
          type="button"
          className="db-cal-nav"
          onClick={() => setYm({ y: today.getFullYear(), m: today.getMonth() })}
          style={{ width: 'auto', padding: '0 10px', font: 'var(--ds-font-body-small)' }}
        >
          Today
        </button>
        <button type="button" aria-label="Next month" className="db-cal-nav" onClick={() => shiftMonth(1)}>
          <ChevronRight style={{ width: 16, height: 16 }} />
        </button>
        <style>{`
          .db-cal-nav { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: 1px solid var(--ds-border); border-radius: 6px; background: var(--ds-surface); color: var(--ds-text-subtle); cursor: pointer; }
          .db-cal-nav:hover { background: var(--ds-background-neutral-subtle); }
        `}</style>
      </div>
      <CalendarGrid
        year={ym.y}
        month={ym.m}
        events={events}
        onDateClick={(dateStr) => onAddRow({ [dateField.id]: dateStr })}
        renderCell={(_date, dayEvents) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 2 }}>
            {dayEvents.map((ev) => (
              <span
                key={ev.entity_id}
                title={ev.event_title}
                style={{
                  background: 'var(--ds-background-selected)',
                  color: 'var(--ds-text-selected, var(--ds-text))',
                  borderRadius: 4,
                  padding: '1px 6px',
                  font: 'var(--ds-font-body-small)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {ev.event_title}
              </span>
            ))}
          </div>
        )}
      />
    </div>
  );
}

export function DatabaseSurface({ database }: { database: DocexDatabase }) {
  const { data: fields } = useDocexFields(database.id);
  const { data: rows, isLoading } = useDocexRows(database.id);
  const { data: views } = useDocexViews(database.id);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [addingField, setAddingField] = useState(false);
  const [newField, setNewField] = useState<{ name: string; type: DocexFieldType }>({ name: '', type: 'text' });

  const createRow = useCreateDocexRow();
  const updateValues = useUpdateDocexRowValues();
  const deleteRow = useDeleteDocexRow();
  const createField = useCreateDocexField();
  const createView = useCreateDocexView();

  const activeView = (views ?? []).find((v) => v.id === activeViewId) ?? (views ?? [])[0];

  const [sortKey, setSortKey] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  const sortedRows = useMemo(() => {
    const list = [...(rows ?? [])];
    if (!sortKey) return list;
    const dir = sortOrder === 'ASC' ? 1 : -1;
    return list.sort((a, b) => {
      const av = a.values?.[sortKey], bv = b.values?.[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return dir;
      if (bv == null) return -dir;
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir;
    });
  }, [rows, sortKey, sortOrder]);

  const columns: Column<DocexRow>[] = useMemo(
    () =>
      (fields ?? []).map((f, i) => ({
        id: f.id,
        label: f.name,
        sortable: true,
        flex: i === 0,
        width: i === 0 ? undefined : 18,
        accessor: (row: DocexRow) => row.values?.[f.id],
        cell: ({ row }: { row: DocexRow }) => (
          <EditableCell
            field={f}
            row={row}
            onSave={(v) =>
              updateValues.mutate({
                rowId: row.id,
                databaseId: database.id,
                values: { ...(row.values ?? {}), [f.id]: v },
              })
            }
          />
        ),
      })),
    [fields, database.id, updateValues],
  );

  const addRow = (seed?: Record<string, unknown>) => {
    const maxPos = (rows ?? []).reduce((m, r) => Math.max(m, r.position), 0);
    createRow.mutate({ databaseId: database.id, position: maxPos + 1, values: seed ?? {} });
  };
  const updateValue = (row: DocexRow, fieldId: string, value: unknown) =>
    updateValues.mutate({
      rowId: row.id,
      databaseId: database.id,
      values: { ...(row.values ?? {}), [fieldId]: value },
    });
  const addView = (kind: DocexViewKind) => {
    const label = VIEW_KINDS.find((v) => v.kind === kind)?.label ?? kind;
    createView.mutate(
      { databaseId: database.id, name: label, kind, position: (views ?? []).length },
      { onSuccess: (v) => setActiveViewId(v.id) },
    );
  };

  return (
    <div>
      {/* View tabs — Notion's database header */}
      <div
        role="tablist"
        aria-label="Database views"
        style={{ display: 'flex', alignItems: 'center', gap: 4, borderBottom: '1px solid var(--ds-border)', marginBottom: 12 }}
      >
        {(views ?? []).map((v) => {
          const active = v.id === activeView?.id;
          return (
            <button
              key={v.id}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setActiveViewId(v.id)}
              style={{
                border: 'none',
                background: 'transparent',
                padding: '8px 12px',
                font: 'var(--ds-font-body)',
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--ds-text)' : 'var(--ds-text-subtle)',
                borderBottom: active ? '2px solid var(--ds-border-focused)' : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              {v.name}
            </button>
          );
        })}
        <DropdownMenu
          aria-label="Add a view"
          placement="bottom-start"
          shouldRenderToParent={false}
          trigger={() => (
            <button
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                border: 'none',
                background: 'transparent',
                color: 'var(--ds-text-subtle)',
                font: 'var(--ds-font-body-small)',
                cursor: 'pointer',
                padding: '8px 8px',
              }}
            >
              <Plus style={{ width: 13, height: 13 }} /> View
            </button>
          )}
          groups={[
            {
              key: 'kinds',
              title: 'Add view',
              items: VIEW_KINDS.map((v) => ({ key: v.kind, label: v.label, onClick: () => addView(v.kind) })),
            },
          ]}
        />
        <div style={{ flex: 1 }} />
        {addingField ? (
          <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', paddingBottom: 4 }}>
            <Input
              autoFocus
              placeholder="Field name"
              value={newField.name}
              onChange={(e) => setNewField((p) => ({ ...p, name: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setAddingField(false);
                if (e.key === 'Enter' && newField.name.trim()) {
                  createField.mutate({
                    databaseId: database.id,
                    name: newField.name.trim(),
                    type: newField.type,
                    position: (fields ?? []).length,
                  });
                  setAddingField(false);
                  setNewField({ name: '', type: 'text' });
                }
              }}
              style={{ height: 30, width: 160 }}
            />
            <select
              value={newField.type}
              aria-label="Field type"
              onChange={(e) => setNewField((p) => ({ ...p, type: e.target.value as DocexFieldType }))}
              style={{
                font: 'var(--ds-font-body-small)',
                background: 'var(--ds-surface)',
                color: 'var(--ds-text)',
                border: '1px solid var(--ds-border)',
                borderRadius: 4,
                height: 30,
              }}
            >
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setAddingField(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              border: 'none',
              background: 'transparent',
              color: 'var(--ds-text-subtle)',
              font: 'var(--ds-font-body-small)',
              cursor: 'pointer',
              padding: '8px 8px',
            }}
          >
            <Plus style={{ width: 14, height: 14 }} /> Field
          </button>
        )}
      </div>

      {activeView?.kind === 'table' || !activeView ? (
        <>
          <JiraTable<DocexRow>
            columns={columns}
            data={sortedRows}
            getRowId={(r) => r.id}
            isLoading={isLoading}
            density="comfortable"
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSortChange={(key, order) => {
              setSortKey(key);
              setSortOrder(order);
            }}
            contextMenuActions={[
              {
                id: 'delete',
                label: 'Delete row',
                danger: true,
                onClick: (row: DocexRow) => deleteRow.mutate({ rowId: row.id, databaseId: database.id }),
              } as never,
            ]}
            emptyView={
              <p style={{ color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body)', padding: 24, margin: 0 }}>
                No rows yet — add the first one below.
              </p>
            }
          />
          <button
            type="button"
            onClick={addRow}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              width: '100%',
              marginTop: 4,
              padding: '8px 12px',
              border: 'none',
              borderRadius: 4,
              background: 'transparent',
              color: 'var(--ds-text-subtle)',
              font: 'var(--ds-font-body)',
              cursor: 'pointer',
            }}
          >
            <Plus style={{ width: 14, height: 14 }} /> New row
          </button>
        </>
      ) : activeView.kind === 'board' ? (
        <BoardView
          fields={fields ?? []}
          rows={sortedRows}
          groupFieldId={activeView.config?.group_by_field}
          onUpdate={updateValue}
          onAddRow={addRow}
        />
      ) : activeView.kind === 'list' ? (
        <ListView fields={fields ?? []} rows={sortedRows} onUpdate={updateValue} onAddRow={addRow} />
      ) : activeView.kind === 'gallery' ? (
        <GalleryView fields={fields ?? []} rows={sortedRows} onUpdate={updateValue} onAddRow={addRow} />
      ) : activeView.kind === 'calendar' ? (
        <CalendarView fields={fields ?? []} rows={sortedRows} onUpdate={updateValue} onAddRow={addRow} />
      ) : (
        <p style={{ color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body)' }}>
          The {activeView.kind} view arrives in the next slice — the Table view has your data.
        </p>
      )}
    </div>
  );
}

export default DatabaseSurface;
