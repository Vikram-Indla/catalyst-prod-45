/**
 * GroupedWorkList — Grouped work item list (F1.16)
 *
 * Groups items by status and renders with collapsible headers.
 */
import React, { memo, useState, useMemo } from 'react';
import { GroupHeader } from './GroupHeader';
import { WorkListItem } from './WorkListItem';
import { WorkListEmptyState } from './WorkListStates';

export interface GroupedWorkListProps {
  items: Array<{
    id: string;
    key: string;
    summary: string;
    issueType: string;
    status: string;
  }>;
  selectedKey: string | null;
  onSelectItem: (key: string) => void;
}

export const GroupedWorkList = memo(function GroupedWorkList({
  items,
  selectedKey,
  onSelectItem,
}: GroupedWorkListProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const groupedItems = useMemo(() => {
    const groups = new Map<string, typeof items>();
    items.forEach((item) => {
      const status = item.status || 'Unknown';
      if (!groups.has(status)) {
        groups.set(status, []);
      }
      groups.get(status)!.push(item);
    });
    return groups;
  }, [items]);

  const toggleGroupCollapse = (status: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  if (items.length === 0) {
    return <WorkListEmptyState />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {Array.from(groupedItems.entries()).map(([status, groupItems]) => {
        const isCollapsed = collapsedGroups.has(status);
        return (
          <div key={status}>
            <GroupHeader
              label={status}
              count={groupItems.length}
              isCollapsed={isCollapsed}
              onToggle={() => toggleGroupCollapse(status)}
            />
            {!isCollapsed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {groupItems.map((item) => (
                  <WorkListItem
                    key={item.key}
                    item={item}
                    isSelected={item.key === selectedKey}
                    onSelect={onSelectItem}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});
