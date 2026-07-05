/**
 * DatabaseSurface — Notion-style database (CAT-DOCEX-DB-COEDIT-20260705-001
 * D2). View tabs across the top; the TABLE view rides the canonical
 * JiraTable (column resize/sort/keyboard nav come free). Cells render by
 * field type; text/number/url edit inline via JiraTable's commit contract.
 */
import { useMemo, useState } from 'react';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';
import { Lozenge } from '@/components/ads';
import { Input } from '@/components/ui/input';
import { Plus } from '@/lib/atlaskit-icons';
import {
  useDocexFields,
  useDocexRows,
  useDocexViews,
  useCreateDocexField,
  useCreateDocexRow,
  useUpdateDocexRowValues,
  useDeleteDocexRow,
  type DocexDatabase,
  type DocexField,
  type DocexRow,
  type DocexFieldType,
} from '@/hooks/useDocexDatabase';

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

  const addRow = () => {
    const maxPos = (rows ?? []).reduce((m, r) => Math.max(m, r.position), 0);
    createRow.mutate({ databaseId: database.id, position: maxPos + 1 });
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
      ) : (
        <p style={{ color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body)' }}>
          The {activeView.kind} view arrives in the next slice — the Table view has your data.
        </p>
      )}
    </div>
  );
}

export default DatabaseSurface;
