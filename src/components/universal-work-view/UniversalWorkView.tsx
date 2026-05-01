// @ts-nocheck
/**
 * UniversalWorkView — full-screen overlay (z-index 510) replicating Jira's
 * list view. Pulls data via useUWVData, renders UWVToolbar + UWVTable.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Spinner from '@atlaskit/spinner';
import { UWVToolbar } from './UWVToolbar';
import { UWVTable } from './UWVTable';
import { useUWVData } from './useUWVData';
import { useUWVPrefs } from './useUWVPrefs';
import { classifyType, type UWVGroupBy } from './uwv.utils';
import type { UWVParams, UWVSort } from './uwv.types';

interface Props {
  params: UWVParams;
  onClose: () => void;
}

export function UniversalWorkView({ params, onClose }: Props) {
  const [statusFilter, setStatusFilter] = useState<string[]>(params.status ?? []);
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<UWVSort[]>(
    params.dataType === 'overdue'
      ? [{ fieldId: 'dueDate', direction: 'asc' }]
      : [{ fieldId: 'key', direction: 'asc' }],
  );
  const [typeFilter, setTypeFilter] = useState<'all' | 'epic' | 'feature' | 'story' | 'bug' | 'task'>('all');
  const [groupBy, setGroupBy] = useState<UWVGroupBy>('none');

  const viewKey = `uwv:${params.project}:${[...params.hubSource].sort().join(',')}`;
  const { columns, savePrefs, prefs } = useUWVPrefs(viewKey);
  const visibleColumns = useMemo(() => {
    let cols = columns.filter((c) => c.visible);
    if (params.dataType === 'overdue' && !cols.find((c) => c.fieldId === 'dueDate')) {
      cols = [
        ...cols,
        {
          fieldId: 'dueDate',
          label: 'Due Date',
          width: 110,
          visible: true,
          sortable: true,
          type: 'date' as const,
        },
      ];
    }
    return cols;
  }, [columns, params.dataType]);

  const { data, fetchNextPage, hasNextPage, isFetching, isLoading } = useUWVData(
    params,
    statusFilter,
    sort,
  );

  const allItems = useMemo(() => {
    let raw = data?.pages.flatMap((p) => p.items) ?? [];
    if (assigneeFilter.length > 0) {
      raw = raw.filter((i) => assigneeFilter.includes(i.assigneeId ?? ''));
    }
    if (typeFilter !== 'all') {
      raw = raw.filter((i) => classifyType(i.issueType) === typeFilter);
    }
    if (!searchText.trim()) return raw;
    const t = searchText.toLowerCase();
    return raw.filter(
      (i) => i.key.toLowerCase().includes(t) || i.summary.toLowerCase().includes(t),
    );
  }, [data, searchText, assigneeFilter, typeFilter]);

  const totalCount = data?.pages[0]?.total ?? 0;

  const openDetail = useCallback(
    (key: string) => {
      const item = allItems.find((i) => i.key === key);
      if (item?.hubSource === 'projecthub') {
        window.history.pushState(
          {},
          '',
          `/project-hub/${params.project}/allwork?issue=${key}`,
        );
        // Trigger a navigation event so React Router picks it up.
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
      onClose();
    },
    [allItems, params.project, onClose],
  );

  // Global Escape close.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  // Lock body scroll while overlay is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const title = params.title ?? `${params.project} · Work items`;

  // Build filter summary chips from gadget-forwarded settings.
  const filterChips = useMemo(() => {
    const chips: { label: string; value: string }[] = [];
    if (params.dateLabel && (params.dateFrom || params.dateTo)) {
      chips.push({ label: 'Date', value: params.dateLabel });
    } else if (params.dateFrom || params.dateTo) {
      chips.push({ label: 'Date', value: `${params.dateFrom ?? '…'} – ${params.dateTo ?? '…'}` });
    }
    if (params.statusFilter?.length) chips.push({ label: 'Status', value: params.statusFilter.join(', ') });
    if (params.assigneeFilter?.length) chips.push({ label: 'Assignee', value: params.assigneeFilter.join(', ') });
    if (params.itemTypeFilter?.length) chips.push({ label: 'Type', value: params.itemTypeFilter.join(', ') });
    if (params.priorityFilter?.length) chips.push({ label: 'Priority', value: params.priorityFilter.join(', ') });
    if (params.releaseFilter?.length) chips.push({ label: 'Release', value: params.releaseFilter.join(', ') });
    return chips;
  }, [params]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 510,
        background: 'var(--ds-surface, var(--ds-surface, #FFFFFF))',
        display: 'flex',
        flexDirection: 'column',
        fontFamily:
          '"Atlassian Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <UWVToolbar
        title={title}
        filteredCount={allItems.length}
        totalCount={totalCount}
        searchText={searchText}
        onSearchChange={setSearchText}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        assigneeFilter={assigneeFilter}
        onAssigneeFilterChange={setAssigneeFilter}
        selectedIds={selectedIds}
        onSelectChange={setSelectedIds}
        allItems={allItems}
        columns={columns}
        prefs={prefs}
        onSavePrefs={savePrefs}
        project={params.project}
        onClose={onClose}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
      />

      {filterChips.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderBottom: '1px solid #E2E8F0',
            background: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F8FAFC))',
            fontSize: 12,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))', fontWeight: 600 }}>Filtered:</span>
          {filterChips.map((c) => (
            <span
              key={c.label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                background: 'var(--ds-surface, var(--ds-surface, #FFFFFF))',
                border: '1px solid #E2E8F0',
                borderRadius: 3,
                color: 'var(--ds-text, var(--ds-text, #0F172A))',
              }}
            >
              <span style={{ color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))' }}>{c.label}:</span>
              <span style={{ fontWeight: 500 }}>{c.value}</span>
            </span>
          ))}
        </div>
      )}

      {isLoading ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Spinner size="large" />
        </div>
      ) : (
        <UWVTable
          columns={visibleColumns}
          items={allItems}
          sort={sort}
          onSortChange={setSort}
          selectedIds={selectedIds}
          onSelectChange={setSelectedIds}
          onItemClick={openDetail}
          onLoadMore={() => {
            if (hasNextPage && !isFetching) fetchNextPage();
          }}
          density={prefs.density}
          isLoadingMore={isFetching}
          totalCount={totalCount}
          groupBy={groupBy}
        />
      )}
    </div>
  );
}
