/**
 * LinkedWorkItemsHeader — collapsible section header.
 *
 * Mirrors the legacy `SectionBlock` header rhythm (chevron + title + count +
 * trailing action) but owns its own markup so the molecule is self-contained
 * and the toggle semantics match WAI-ARIA disclosure:
 *   - `aria-expanded` on the chevron button reflects current state
 *   - `aria-controls` points at the body region so assistive tech can link them
 *   - the + action trigger has an explicit aria-label
 *
 * No routing, no data — pure UI.
 */
import React from 'react';
import ChevronDownIcon from '@atlaskit/icon/utility/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/utility/chevron-right';
import AddIcon from '@atlaskit/icon/core/add';
import Tooltip from '@atlaskit/tooltip';

export interface LinkedWorkItemsHeaderProps {
  count: number;
  expanded: boolean;
  onToggle: () => void;
  onAdd?: () => void;
  canAdd?: boolean;
  bodyId: string;
}

export function LinkedWorkItemsHeader({
  count,
  expanded,
  onToggle,
  onAdd,
  canAdd = true,
  bodyId,
}: LinkedWorkItemsHeaderProps) {
  return (
    <div className="lwi-header">
      <div className="lwi-header__left">
        <Tooltip content={expanded ? 'Collapse' : 'Expand'} position="bottom">
          <button
            type="button"
            className="lwi-header__toggle"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={bodyId}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded
              ? <ChevronDownIcon label="" color="var(--ds-text-subtle, #505258)" />
              : <ChevronRightIcon label="" color="var(--ds-text-subtle, #505258)" />
            }
          </button>
        </Tooltip>
        <h2
          className="lwi-header__title"
          style={{ margin: 0, cursor: 'pointer' }}
          onClick={onToggle}
        >
          Linked work items
        </h2>
        {count > 0 && (
          <span className="lwi-header__count" aria-label={`${count} linked`}>
            {count}
          </span>
        )}
      </div>
      {/* Show the inline header "+ Add linked work item" button only when
          there ARE existing links. For the empty state the gray "Add linked
          work item" link is rendered BELOW the header by LinkedWorkItems
          (matching the SubtasksPanel "Add subtask" pattern). */}
      {expanded && count > 0 && canAdd && onAdd && (
        <button
          type="button"
          className="lwi-header__add"
          onClick={onAdd}
          aria-label="Add linked work item"
          title="Add linked work item"
        >
          <AddIcon size="small" label="" primaryColor="var(--ds-icon, #42526E)" />
          <span>Add linked work item</span>
        </button>
      )}
    </div>
  );
}
