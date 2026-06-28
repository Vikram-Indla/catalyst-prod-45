import React, { useState, useEffect } from 'react';
import Button from '@atlaskit/button/new';
import Tooltip from '@atlaskit/tooltip';
import EditIcon from '@atlaskit/icon/glyph/edit';
import TrashIcon from '@atlaskit/icon/glyph/trash';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import { STATUS_CATEGORY_COLORS, STATUS_CATEGORY_LABELS, type StatusCategory } from '@/constants/statusCategoryColors';
import type { WorkflowStatusWithTypes } from '@/hooks/useWorkflowStatuses';
import type { StatusConsumer } from '@/hooks/useStatusConsumers';

interface StatusRegistryTableProps {
  statuses: WorkflowStatusWithTypes[];
  consumersMap: Record<string, StatusConsumer[]>;
  searchQuery: string;
  onEdit: (status: WorkflowStatusWithTypes) => void;
  onDelete: (status: WorkflowStatusWithTypes) => void;
}

const CATEGORY_ORDER: StatusCategory[] = ['todo', 'in_progress', 'done'];

const CAT_HEADER_BG: Record<StatusCategory, string> = {
  todo:        'var(--ds-background-neutral-subtle)',
  in_progress: 'var(--ds-background-information-subtle)',
  done:        'var(--ds-background-success-subtle)',
};

const CAT_HEADER_COLOR: Record<StatusCategory, string> = {
  todo:        'var(--ds-text)',
  in_progress: 'var(--ds-text-information)',
  done:        'var(--ds-text-success)',
};

function DragDots() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" style={{ color: 'var(--ds-text-subtlest)', cursor: 'grab' }}>
      <circle cx="3" cy="2.5" r="1.1" /><circle cx="7" cy="2.5" r="1.1" />
      <circle cx="3" cy="7" r="1.1" /><circle cx="7" cy="7" r="1.1" />
      <circle cx="3" cy="11.5" r="1.1" /><circle cx="7" cy="11.5" r="1.1" />
    </svg>
  );
}

interface ConsumersCellProps {
  consumers: StatusConsumer[];
}

function ConsumersCell({ consumers }: ConsumersCellProps) {
  const [hovered, setHovered] = useState(false);
  if (consumers.length === 0) {
    return <span style={{ color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-200)' }}>—</span>;
  }
  const label = consumers.length === 1
    ? `${consumers[0].consumer}${consumers[0].detail ? ` (${consumers[0].detail})` : ''}`
    : `${consumers.length} consumers`;
  const tipLines = consumers.map((c) => c.detail ? `${c.consumer} (${c.detail})` : c.consumer);
  return (
    <span
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        style={{
          fontSize: 'var(--ds-font-size-300)',
          color: 'var(--ds-text-subtle)',
          borderBottom: '1px dashed var(--ds-border-bold)',
          paddingBottom: 1,
          cursor: 'default',
        }}
      >
        {label}
      </span>
      {hovered && (
        <span
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: 0,
            background: 'var(--ds-surface-overlay)',
            border: '1px solid var(--ds-border)',
            borderRadius: 4,
            boxShadow: 'var(--ds-shadow-overlay, 0 8px 28px rgba(9,30,66,0.25))',
            padding: '8px 12px',
            fontSize: 'var(--ds-font-size-200)',
            lineHeight: 1.6,
            whiteSpace: 'nowrap',
            color: 'var(--ds-text)',
            zIndex: 30,
            pointerEvents: 'none',
          }}
        >
          {tipLines.map((l, i) => (
            <span key={i} style={{ display: 'block' }}>{l}</span>
          ))}
        </span>
      )}
    </span>
  );
}

interface StatusRowProps {
  status: WorkflowStatusWithTypes;
  consumers: StatusConsumer[];
  onEdit: (s: WorkflowStatusWithTypes) => void;
  onDelete: (s: WorkflowStatusWithTypes) => void;
}

function TypeChips({ types }: { types: string[] }) {
  if (types.length === 0) {
    return (
      <span style={{
        display: 'inline-block', fontSize: 'var(--ds-font-size-100)', fontWeight: 500,
        border: '1px solid transparent', borderRadius: 3, padding: '1px 6px',
        background: 'var(--ds-background-neutral)',
        color: 'var(--ds-text-subtle)', whiteSpace: 'nowrap',
      }}>All types</span>
    );
  }
  const shown = types.slice(0, 2);
  const extra = types.slice(2);
  return (
    <span style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 4px', alignItems: 'center' }}>
      {shown.map((t) => (
        <span key={t} style={{
          display: 'inline-block', fontSize: 'var(--ds-font-size-100)', fontWeight: 500,
          border: '1px solid var(--ds-border)', borderRadius: 3,
          padding: '1px 6px', background: 'var(--ds-surface-sunken)',
          color: 'var(--ds-text-subtle)', whiteSpace: 'nowrap',
        }}>{t}</span>
      ))}
      {extra.length > 0 && (
        <Tooltip content={extra.join(', ')}>
          {(p) => (
            <span {...p} style={{
              display: 'inline-block', fontSize: 'var(--ds-font-size-100)', fontWeight: 500,
              border: '1px solid var(--ds-border)', borderRadius: 3,
              padding: '1px 6px', background: 'var(--ds-surface-sunken)',
              color: 'var(--ds-text-subtle)', whiteSpace: 'nowrap', cursor: 'default',
            }}>+{extra.length}</span>
          )}
        </Tooltip>
      )}
    </span>
  );
}

function StatusRow({ status, consumers, onEdit, onDelete }: StatusRowProps) {
  return (
    <tr style={{
      borderLeft: status.is_default ? '2px solid var(--ds-background-brand-bold)' : '2px solid transparent',
      background: 'var(--ds-surface)',
      transition: 'background 120ms ease',
    }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-surface-sunken, var(--ds-background-neutral-subtle))'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-surface)'; }}
    >
      {/* Status name */}
      <td style={{ fontSize: 'var(--ds-font-size-400)', padding: '0 12px', height: 40, borderBottom: '1px solid var(--ds-border)', verticalAlign: 'middle' }}>
        <button
          onClick={() => onEdit(status)}
          style={{
            fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: 'var(--ds-text)',
            padding: '2px 4px', marginLeft: -4, borderRadius: 3, background: 'none', border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--ds-link, var(--ds-link))';
            (e.currentTarget as HTMLElement).style.textDecoration = 'underline';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--ds-text)';
            (e.currentTarget as HTMLElement).style.textDecoration = 'none';
          }}
        >
          {status.name}
        </button>
      </td>

      {/* Color */}
      <td style={{ fontSize: 'var(--ds-font-size-400)', padding: '0 12px', height: 40, borderBottom: '1px solid var(--ds-border)', verticalAlign: 'middle' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 16, height: 16, borderRadius: 3, background: status.color, flexShrink: 0,
            border: '1px solid var(--ds-border)', display: 'inline-block', verticalAlign: 'middle',
          }} />
          <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle)', fontVariantNumeric: 'tabular-nums' }}>
            {status.color}
          </span>
        </span>
      </td>

      {/* Position */}
      <td style={{ fontSize: 'var(--ds-font-size-400)', padding: '0 12px', height: 40, borderBottom: '1px solid var(--ds-border)', verticalAlign: 'middle' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ds-text-subtle)' }}>
          <span title="Drag to reorder"><DragDots /></span>
          <span style={{ fontSize: 'var(--ds-font-size-300)' }}>{status.position}</span>
        </span>
      </td>

      {/* Default */}
      <td style={{ fontSize: 'var(--ds-font-size-400)', padding: '0 12px', height: 40, borderBottom: '1px solid var(--ds-border)', verticalAlign: 'middle' }}>
        {status.is_default && (
          <span style={{
            fontSize: 'var(--ds-font-size-100)', fontWeight: 500,
            color: 'var(--ds-text-brand)',
            background: 'var(--ds-background-selected)',
            borderRadius: 3, padding: '2px 6px', whiteSpace: 'nowrap',
          }}>
            Default
          </span>
        )}
      </td>

      {/* Available for */}
      <td style={{ fontSize: 'var(--ds-font-size-400)', padding: '0 12px', height: 40, borderBottom: '1px solid var(--ds-border)', verticalAlign: 'middle' }}>
        <TypeChips types={status.work_item_types} />
      </td>

      {/* Consumers */}
      <td style={{ fontSize: 'var(--ds-font-size-400)', padding: '0 12px', height: 40, borderBottom: '1px solid var(--ds-border)', verticalAlign: 'middle' }}>
        <ConsumersCell consumers={consumers} />
      </td>

      {/* Actions */}
      <td style={{ fontSize: 'var(--ds-font-size-400)', padding: '0 12px', height: 40, borderBottom: '1px solid var(--ds-border)', verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
          <Tooltip content="Edit status">
            {(p) => (
              <Button {...p} appearance="subtle" iconBefore={EditIcon} onClick={() => onEdit(status)} />
            )}
          </Tooltip>
          <Tooltip content={consumers.length > 0 ? `Used by ${consumers.length} consumer${consumers.length !== 1 ? 's' : ''}` : 'Delete status'}>
            {(p) => (
              <Button
                {...p}
                appearance="subtle"
                isDisabled={consumers.length > 0}
                iconBefore={TrashIcon}
                onClick={() => onDelete(status)}
              />
            )}
          </Tooltip>
        </div>
      </td>
    </tr>
  );
}

interface CategorySectionProps {
  category: StatusCategory;
  statuses: WorkflowStatusWithTypes[];
  consumersMap: Record<string, StatusConsumer[]>;
  onEdit: (s: WorkflowStatusWithTypes) => void;
  onDelete: (s: WorkflowStatusWithTypes) => void;
  defaultExpanded?: boolean;
}

function CategorySection({ category, statuses, consumersMap, onEdit, onDelete, defaultExpanded = true }: CategorySectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded]);
  const catColor = STATUS_CATEGORY_COLORS[category];
  const catLabel = STATUS_CATEGORY_LABELS[category];
  const headerBg = CAT_HEADER_BG[category];
  const headerColor = CAT_HEADER_COLOR[category];

  return (
    <div style={{ border: '1px solid var(--ds-border)', borderRadius: 4, marginBottom: 12, overflow: 'hidden', background: 'var(--ds-surface)' }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 16px', background: headerBg, border: 'none',
          cursor: 'pointer', textAlign: 'left', borderBottom: expanded ? '1px solid var(--ds-border)' : 'none',
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: catColor, flexShrink: 0 }} />
        <span style={{ fontSize: 'var(--ds-font-size-500)', fontWeight: 653, color: headerColor, flex: 1 }}>
          {catLabel}
        </span>
        <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: 'var(--ds-text-subtle)', marginRight: 8 }}>
          ({statuses.length})
        </span>
        <span style={{
          color: 'var(--ds-text-subtle)',
          transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
          transition: 'transform 180ms ease', display: 'flex',
        }}>
          <ChevronDownIcon label="" size="small" />
        </span>
      </button>

      {expanded && (
        <div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Status name', 'Color', 'Position', 'Default', 'Available for', 'Consumers', ''].map((h, i) => (
                  <th key={i} style={{
                    fontSize: 'var(--ds-font-size-200)', fontWeight: 653, color: 'var(--ds-text-subtle)',
                    textAlign: i === 6 ? 'right' : 'left', padding: '8px 12px',
                    borderBottom: '1px solid var(--ds-border)',
                    background: 'var(--ds-surface)',
                    width: i === 0 ? '21%' : i === 1 ? '12%' : i === 2 ? '8%' : i === 3 ? '8%' : i === 4 ? '20%' : i === 5 ? undefined : '80px',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {statuses.map((s) => (
                <StatusRow
                  key={s.id}
                  status={s}
                  consumers={consumersMap[s.id] ?? []}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
              {statuses.length === 0 && (
                <tr>
                  <td colSpan={7} style={{
                    padding: '12px 16px', fontSize: 'var(--ds-font-size-300)',
                    color: 'var(--ds-text-subtlest)', fontStyle: 'italic',
                  }}>
                    No statuses in this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function StatusRegistryTable({
  statuses, consumersMap, searchQuery, onEdit, onDelete,
}: StatusRegistryTableProps) {
  const query = searchQuery.trim().toLowerCase();
  const filtered = query
    ? statuses.filter((s) =>
        s.name.toLowerCase().includes(query) ||
        STATUS_CATEGORY_LABELS[s.category as StatusCategory]?.toLowerCase().includes(query) ||
        s.work_item_types.some((t) => t.toLowerCase().includes(query))
      )
    : statuses;

  const grouped = CATEGORY_ORDER.reduce<Record<StatusCategory, WorkflowStatusWithTypes[]>>(
    (acc, cat) => { acc[cat] = filtered.filter((s) => s.category === cat); return acc; },
    {} as Record<StatusCategory, WorkflowStatusWithTypes[]>
  );

  if (filtered.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--ds-text-subtlest)', fontSize: 'var(--ds-font-size-400)' }}>
        {searchQuery ? `No statuses match "${searchQuery}".` : 'No statuses found.'}
      </div>
    );
  }

  return (
    <div>
      {CATEGORY_ORDER.map((cat) => (
        <CategorySection
          key={cat}
          category={cat}
          statuses={grouped[cat] ?? []}
          consumersMap={consumersMap}
          onEdit={onEdit}
          onDelete={onDelete}
          defaultExpanded={!query || (grouped[cat] ?? []).length > 0}
        />
      ))}
    </div>
  );
}
