import React, { useState } from 'react';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import Tooltip from '@atlaskit/tooltip';
import TrashIcon from '@atlaskit/icon/glyph/trash';
import AddIcon from '@atlaskit/icon/glyph/add';
import type { TypeStatus, Transition } from '@/hooks/useTypeWorkflow';

interface TransitionGroupProps {
  fromStatus: TypeStatus | null;
  isGlobal: boolean;
  transitions: Transition[];
  allTypeStatuses: TypeStatus[];
  onDeleteTransition: (id: string, isGlobal: boolean) => void;
  onAddTransition: (fromStatusId: string | null, toStatusId: string) => void;
}

export function TransitionGroup({
  fromStatus,
  isGlobal,
  transitions,
  allTypeStatuses,
  onDeleteTransition,
  onAddTransition,
}: TransitionGroupProps) {
  const [showPicker, setShowPicker] = useState(false);

  const existingToIds = new Set(transitions.map((t) => t.to_status_id));
  const available = allTypeStatuses.filter(
    (s) => !existingToIds.has(s.id) && (!fromStatus || s.id !== fromStatus.id)
  );

  const fromStatusId = fromStatus ? fromStatus.id : null;

  return (
    <div
      style={{
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
      }}
    >
      {/* Group header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: 'var(--ds-background-neutral-subtle, #F7F8F9)',
          borderBottom: transitions.length > 0 ? '1px solid var(--ds-border, #DFE1E6)' : 'none',
        }}
      >
        {isGlobal ? (
          <>
            <Lozenge appearance="moved">Global · all types</Lozenge>
            <span style={{ fontSize: 13, color: 'var(--ds-text-subtle, #42526E)' }}>
              From any status
            </span>
          </>
        ) : fromStatus ? (
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ds-text, #172B4D)' }}>
            From <strong>{fromStatus.name}</strong>
          </span>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--ds-text-subtle, #42526E)' }}>From any status</span>
        )}
      </div>

      {/* Transitions list */}
      {transitions.map((t) => {
        const toStatus = allTypeStatuses.find((s) => s.id === t.to_status_id);
        const isGlobalTransition = t.work_item_type === null || t.from_status_id === null;
        return (
          <div
            key={t.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              borderBottom: '1px solid var(--ds-border, #DFE1E6)',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--ds-text, #172B4D)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--ds-text-subtlest, #6B778C)' }}>→</span>
              {toStatus?.name ?? t.to_status_id}
            </span>
            <Tooltip
              content={
                isGlobalTransition
                  ? 'This global rule affects all 7 work item types. Deleting it removes the transition everywhere.'
                  : 'Remove transition'
              }
            >
              {(p) => (
                <Button
                  {...p}
                  appearance="subtle"
                  iconBefore={TrashIcon}
                  onClick={() => onDeleteTransition(t.id, isGlobalTransition)}
                />
              )}
            </Tooltip>
          </div>
        );
      })}

      {/* Add transition */}
      <div style={{ padding: '6px 12px' }}>
        {showPicker ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {available.length === 0 ? (
              <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)' }}>
                All available statuses already have transitions from here.
              </span>
            ) : (
              available.map((s) => (
                <Button
                  key={s.id}
                  appearance="subtle"
                  onClick={() => {
                    onAddTransition(fromStatusId, s.id);
                    setShowPicker(false);
                  }}
                >
                  {s.name}
                </Button>
              ))
            )}
            <Button appearance="subtle" onClick={() => setShowPicker(false)}>Cancel</Button>
          </div>
        ) : (
          <Button
            appearance="subtle"
            iconBefore={AddIcon}
            onClick={() => setShowPicker(true)}
          >
            Add transition
          </Button>
        )}
      </div>
    </div>
  );
}
