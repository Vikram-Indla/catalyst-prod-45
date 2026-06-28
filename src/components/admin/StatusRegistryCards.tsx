import React from 'react';
import Lozenge from '@atlaskit/lozenge';
import Button from '@atlaskit/button/new';
import Tooltip from '@atlaskit/tooltip';
import EditIcon from '@atlaskit/icon/glyph/edit';
import TrashIcon from '@atlaskit/icon/glyph/trash';
import { STATUS_CATEGORY_COLORS, STATUS_CATEGORY_LABELS, type StatusCategory } from '@/constants/statusCategoryColors';
import type { WorkflowStatusWithTypes } from '@/hooks/useWorkflowStatuses';
import type { StatusConsumer } from '@/hooks/useStatusConsumers';

interface StatusRegistryCardsProps {
  statuses: WorkflowStatusWithTypes[];
  consumersMap: Record<string, StatusConsumer[]>;
  searchQuery: string;
  onEdit: (status: WorkflowStatusWithTypes) => void;
  onDelete: (status: WorkflowStatusWithTypes) => void;
}

function categoryLozengeAppearance(cat: StatusCategory) {
  switch (cat) {
    case 'in_progress': return 'inprogress';
    case 'done':        return 'success';
    default:            return 'default';
  }
}

function StatusCard({
  status,
  consumers,
  onEdit,
  onDelete,
}: {
  status: WorkflowStatusWithTypes;
  consumers: StatusConsumer[];
  onEdit: (s: WorkflowStatusWithTypes) => void;
  onDelete: (s: WorkflowStatusWithTypes) => void;
}) {
  const catColor = STATUS_CATEGORY_COLORS[status.category as StatusCategory];

  return (
    <div
      style={{
        border: '1px solid var(--ds-border)',
        borderTop: `3px solid ${catColor}`,
        borderRadius: 4,
        padding: 12,
        background: status.is_default ? 'var(--ds-background-selected)' : 'var(--ds-surface)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span
            aria-hidden
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: status.color,
              display: 'inline-block',
              border: '1px solid var(--ds-border)',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ds-text)' }}>
            {status.name}
          </span>
          {status.is_default && (
            <Lozenge appearance="inprogress" isBold>Default</Lozenge>
          )}
        </div>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <Tooltip content="Edit status">
            {(p) => (
              <Button
                {...p}
                appearance="subtle"
                iconBefore={EditIcon}
                onClick={() => onEdit(status)}
              />
            )}
          </Tooltip>
          <Tooltip content={consumers.length > 0 ? `Used by ${consumers.length} consumer${consumers.length !== 1 ? 's' : ''}` : 'Delete'}>
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
      </div>

      {/* Category */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest)', minWidth: 70 }}>Category</span>
        <Lozenge appearance={categoryLozengeAppearance(status.category as StatusCategory)}>
          {STATUS_CATEGORY_LABELS[status.category as StatusCategory]}
        </Lozenge>
      </div>

      {/* Types */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--ds-text-subtlest)', minWidth: 70, paddingTop: 2 }}>For</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {status.work_item_types.length === 0 ? (
            <Lozenge appearance="default">All types</Lozenge>
          ) : (
            status.work_item_types.map((t) => <Lozenge key={t} appearance="default">{t}</Lozenge>)
          )}
        </div>
      </div>

      {/* Consumers */}
      {consumers.length > 0 && (
        <div style={{ fontSize: 11, color: 'var(--ds-text-subtle)' }}>
          Used by {consumers.length} consumer{consumers.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

export function StatusRegistryCards({
  statuses,
  consumersMap,
  searchQuery,
  onEdit,
  onDelete,
}: StatusRegistryCardsProps) {
  const query = searchQuery.trim().toLowerCase();

  const filtered = query
    ? statuses.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          STATUS_CATEGORY_LABELS[s.category as StatusCategory]?.toLowerCase().includes(query) ||
          s.work_item_types.some((t) => t.toLowerCase().includes(query))
      )
    : statuses;

  if (filtered.length === 0) {
    return (
      <div
        style={{
          padding: 32,
          textAlign: 'center',
          color: 'var(--ds-text-subtlest)',
          fontSize: 14,
        }}
      >
        {searchQuery ? `No statuses match "${searchQuery}".` : 'No statuses found.'}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 12,
      }}
    >
      {filtered.map((status) => (
        <StatusCard
          key={status.id}
          status={status}
          consumers={consumersMap[status.id] ?? []}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
