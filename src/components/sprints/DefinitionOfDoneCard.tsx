/**
 * DefinitionOfDoneCard (CAT-SPRINTS-NATIVE-20260702-002 S2.1b).
 *
 * Per-work-item-type "done" status for a sprint (D-004). Scoped to the types
 * actually present in the sprint (ph_issues.sprint_id FK — D-002). The done
 * status per type is picked from that type's REAL live status catalog
 * (useWorkflowStatuses) — never a hardcoded default. Verified live: type
 * "done" statuses are inconsistent across types (e.g. Story's terminal
 * status is "In Production", not "Done") — guessing would be factually
 * wrong for some types (CLAUDE.md zero-assumption rule).
 */
import React, { useState } from 'react';
import Lozenge from '@atlaskit/lozenge';
import Select from '@atlaskit/select';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import { useWorkflowStatuses } from '@/components/workhub/create-story/useCreateStory';
import {
  useSprintItemTypes,
  useSprintDod,
  useSetSprintDod,
  useRemoveSprintDod,
} from '@/hooks/useSprintDod';

const BORDER = 'var(--ds-border)';
const TEXT = 'var(--ds-text)';
const SUBTLE = 'var(--ds-text-subtle)';
const SUBTLEST = 'var(--ds-text-subtlest)';
const HOVER_BG = 'var(--ds-background-neutral-subtle-hovered)';

const CATEGORY_APPEARANCE: Record<string, 'default' | 'inprogress' | 'success'> = {
  todo: 'default',
  in_progress: 'inprogress',
  done: 'success',
};

interface StatusOption {
  label: string;
  value: string;
}

function DoneStatusPicker({
  workItemType,
  onChange,
}: {
  workItemType: string;
  onChange: (status: string) => void;
}) {
  const { data: options, isLoading } = useWorkflowStatuses(workItemType);
  const selectOptions: StatusOption[] = (options ?? []).map((o) => ({ label: o.label, value: o.value }));

  return (
    <div style={{ minWidth: 180 }}>
      <Select<StatusOption>
        inputId={`dod-status-${workItemType}`}
        options={selectOptions}
        value={null}
        onChange={(opt) => opt && onChange(opt.value)}
        placeholder="Select done status"
        isLoading={isLoading}
        isSearchable={false}
        spacing="compact"
      />
    </div>
  );
}

export function DefinitionOfDoneCard({ sprintId }: { sprintId: string }) {
  const { data: itemTypes } = useSprintItemTypes(sprintId);
  const { data: dodRows } = useSprintDod(sprintId);
  const setDod = useSetSprintDod(sprintId);
  const removeDod = useRemoveSprintDod(sprintId);
  const [hoveredType, setHoveredType] = useState<string | null>(null);

  const dodByType = new Map((dodRows ?? []).map((r) => [r.work_item_type, r]));

  return (
    <div
      style={{
        border: `1px solid ${BORDER}`,
        borderRadius: 6,
        padding: 16,
        background: 'var(--ds-surface)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <span style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 700, color: TEXT }}>
        Definition of Done
      </span>

      {!itemTypes || itemTypes.length === 0 ? (
        <span style={{ fontSize: 'var(--ds-font-size-400)', color: SUBTLE }}>
          Add work items to this sprint to configure Definition of Done per type.
        </span>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {itemTypes.map((type) => {
            const row = dodByType.get(type);
            return (
              <div
                key={type}
                onMouseEnter={() => setHoveredType(type)}
                onMouseLeave={() => setHoveredType(null)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
              >
                <span style={{ fontSize: 'var(--ds-font-size-300)', color: SUBTLE, minWidth: 0, flex: '0 0 auto' }}>
                  {type}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {row ? (
                    <>
                      <Lozenge appearance={CATEGORY_APPEARANCE.done} isBold={false}>
                        {row.done_status.toUpperCase()}
                      </Lozenge>
                      {hoveredType === type && (
                        <button
                          type="button"
                          aria-label={`Remove Definition of Done for ${type}`}
                          onClick={() => removeDod.mutate(row.id)}
                          style={{
                            all: 'unset', cursor: 'pointer', display: 'inline-flex',
                            alignItems: 'center', justifyContent: 'center',
                            width: 20, height: 20, borderRadius: 3, color: SUBTLEST,
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = HOVER_BG; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          <CrossIcon label="" size="small" />
                        </button>
                      )}
                    </>
                  ) : (
                    <DoneStatusPicker
                      workItemType={type}
                      onChange={(status) => setDod.mutate({ workItemType: type, doneStatus: status })}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
