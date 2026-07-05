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
  /** Section title. Defaults to "Linked work items"; the Dependencies section
   *  reuses this exact header with title="Dependencies". */
  title?: string;
  /** Add-action label + aria/title. Defaults to "Add linked work item". */
  addLabel?: string;
}

export function LinkedWorkItemsHeader({
  count,
  expanded,
  onToggle,
  onAdd,
  canAdd = true,
  bodyId,
  title = 'Linked work items',
  addLabel = 'Add linked work item',
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
              ? <ChevronDownIcon label="" color="var(--ds-text-subtle)" />
              : <ChevronRightIcon label="" color="var(--ds-text-subtle)" />
            }
          </button>
        </Tooltip>
        <h2
          onClick={onToggle}
          style={{ margin: 0, padding: '0 4px', fontSize: 16, fontWeight: 600, lineHeight: '20px', color: 'var(--ds-text)', cursor: 'pointer' }}
        >
          {title}
        </h2>
        {count > 0 && (
          <span className="lwi-header__count" aria-label={`${count} ${title.toLowerCase()}`}>
            {count}
          </span>
        )}
      </div>
      {/* Show the inline header "+ Add …" button only when there ARE existing
          items. For the empty state the gray add link is rendered BELOW the
          header by the section (matching the SubtasksPanel "Add subtask" pattern). */}
      {expanded && count > 0 && canAdd && onAdd && (
        <button
          type="button"
          className="lwi-header__add"
          onClick={onAdd}
          aria-label={addLabel}
          title={addLabel}
        >
          <AddIcon size="small" label="" primaryColor="var(--ds-icon)" />
          <span>{addLabel}</span>
        </button>
      )}
    </div>
  );
}
