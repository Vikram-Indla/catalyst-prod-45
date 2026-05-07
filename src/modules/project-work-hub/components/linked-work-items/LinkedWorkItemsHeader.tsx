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
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import AddIcon from '@atlaskit/icon/core/add';

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
      <button
        type="button"
        className="lwi-header__toggle"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={bodyId}
      >
        {expanded
          ? <ChevronDownIcon size="small" label="" primaryColor="var(--ds-icon-subtle, #505258)" />
          : <ChevronRightIcon size="small" label="" primaryColor="var(--ds-icon-subtle, #505258)" />
        }
        <span className="lwi-header__title">Linked work items</span>
        <span className="lwi-header__count" aria-label={`${count} linked`}>
          {count}
        </span>
      </button>
      {expanded && canAdd && onAdd && (
        <button
          type="button"
          className="lwi-header__add"
          onClick={onAdd}
          aria-label="Add linked work item"
          title="Add linked work item"
        >
          <AddIcon size="small" label="" primaryColor="var(--ds-icon, #42526E)" />
          <span>Add a child issue</span>
        </button>
      )}
    </div>
  );
}
