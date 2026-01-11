/**
 * WorkItemsList — Main list view for work items
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useWorkItems, useProjectFeatures, useProjectReleases } from '@/hooks/useWorkItems';
import { WorkItemFilters } from '@/types/work-items';
import { WorkItemRow } from './WorkItemRow';
import { FilterBar } from './FilterBar';
import { KeyboardHintBar } from './KeyboardHintBar';
import { Loader2, Inbox } from 'lucide-react';

interface WorkItemsListProps {
  projectId: string;
  onItemClick?: (id: string) => void;
}

export function WorkItemsList({ projectId, onItemClick }: WorkItemsListProps) {
  const [filters, setFilters] = useState<WorkItemFilters>({
    type: 'all',
    status: 'all',
    assignee_id: 'all',
    feature_id: 'all',
    fixed_version_id: 'all',
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState(0);

  const { data: items = [], isLoading, error } = useWorkItems(projectId, filters);
  const { data: features = [] } = useProjectFeatures(projectId);
  const { data: releases = [] } = useProjectReleases(projectId);

  const handleFilterChange = useCallback((newFilters: Partial<WorkItemFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const handleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'j':
        case 'arrowdown':
          e.preventDefault();
          setFocusedIndex(prev => Math.min(prev + 1, items.length - 1));
          break;
        case 'k':
        case 'arrowup':
          e.preventDefault();
          setFocusedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'x':
          e.preventDefault();
          if (items[focusedIndex]) {
            handleSelect(items[focusedIndex].id);
          }
          break;
        case 'enter':
          e.preventDefault();
          if (items[focusedIndex]) {
            onItemClick?.(items[focusedIndex].id);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, focusedIndex, handleSelect, onItemClick]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-danger">
        Error loading work items
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        totalCount={items.length}
        filteredCount={items.length}
        releases={releases}
        features={features}
      />

      <div className="flex-1 overflow-y-auto pb-10">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-text-3">
            <Inbox className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No work items found</p>
            <p className="text-sm">Create your first story, task, or defect</p>
          </div>
        ) : (
          items.map((item, index) => (
            <React.Fragment key={item.id}>
              <WorkItemRow
                item={item}
                isSelected={selectedIds.has(item.id)}
                isFocused={index === focusedIndex}
                onSelect={handleSelect}
                onClick={onItemClick}
              />
              {/* Render subtasks */}
              {item.subtasks?.map(subtask => (
                <WorkItemRow
                  key={subtask.id}
                  item={subtask as any}
                  isSubtask
                  isSelected={selectedIds.has(subtask.id)}
                  onSelect={handleSelect}
                  onClick={onItemClick}
                />
              ))}
            </React.Fragment>
          ))
        )}
      </div>

      <KeyboardHintBar />
    </div>
  );
}

export default WorkItemsList;
