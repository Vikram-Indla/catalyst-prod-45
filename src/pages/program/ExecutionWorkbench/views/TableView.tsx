/**
 * Program Work Tree - Enhanced Table View
 * Features: Compact stats bar, Expand/Collapse All, Density toggle, Column visibility
 * Optimized spacing and visibility per design spec
 *
 * Migrated to canonical JiraTable (hand-rolled <table> banned per CLAUDE.md).
 * Hierarchy (Epic → Feature → Story → Subtask) is expressed via JiraTable's
 * getRowDepth / getRowHasChildren / expandedRowIds / onToggleRowExpanded —
 * the tree is flattened to the currently-visible rows and JiraTable renders
 * indentation + chevron itself.
 */

import React, { useState, useMemo } from 'react';
import { WorkItem, ItemStatus, ColumnConfig, DEFAULT_COLUMNS, DensityMode, WorkTreeCounts, Owner } from '../types';
import { MoreHorizontal, ChevronsUpDown, ChevronsDownUp, Columns, Copy, Eye } from '@/lib/atlaskit-icons';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Lozenge } from '@/components/ads';
import { Button } from '@/components/ui/button';
import { CatalystOwnerAvatar } from '@/components/ui/catalyst';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { catalystToast } from '@/lib/catalystToast';
import { WorkItemIcon } from '@/components/ja/icons/WorkItemIcon';
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable/types';

interface TableViewProps {
  items: WorkItem[];
  onItemClick: (item: WorkItem) => void;
  counts: WorkTreeCounts;
  overallProgress: number;
}

// Status badge - compact (unchanged visual behavior, kept local — this is a
// domain-specific 4-state pill, not the interactive StatusLozengeDropdown).
function StatusBadge({ status }: { status: ItemStatus }) {
  const styles: Record<ItemStatus, string> = {
    'Backlog': 'bg-muted text-foreground/70 border-border',
    'In Progress': 'bg-brand-gold/15 text-brand-gold border-brand-gold/30',
    'Done': 'bg-secondary-green/15 text-secondary-green border-secondary-green/30',
    'Blocked': 'bg-destructive/15 text-destructive border-destructive/30',
  };

  return (
    <span className={cn("inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium border", styles[status])}>
      {status}
    </span>
  );
}

// Owner avatar - uses canonical component
function OwnerAvatar({ owner }: { owner: Owner | null | undefined }) {
  if (!owner) return <span className="text-foreground/40 text-[11px]">—</span>;

  const firstName = owner.full_name?.split(' ')[0] || '';

  return (
    <div className="flex items-center gap-1.5">
      <CatalystOwnerAvatar name={owner.full_name} size="sm" showTooltip={false} />
      <span className="text-[11px] truncate max-w-[70px]">{firstName}</span>
    </div>
  );
}

// Progress bar - compact
function ProgressBar({ progress }: { progress: number }) {
  const colorClass = progress >= 100 ? 'bg-secondary-green' : progress > 0 ? 'bg-brand-gold' : 'bg-muted-foreground/30';

  return (
    <div className="flex items-center gap-1.5 min-w-[80px]">
      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", colorClass)} style={{ width: `${progress}%` }} />
      </div>
      <span className="text-[10px] text-foreground/60 w-7 text-right tabular-nums font-medium">{progress}%</span>
    </div>
  );
}

// Compact inline stats bar - 28px height
function StatsBar({ counts, overallProgress }: { counts: WorkTreeCounts; overallProgress: number }) {
  return (
    <div className="flex items-center h-7 px-4 bg-muted/40 border-b border-border text-[11px]">
      <div className="flex items-center gap-4">
        <span className="text-foreground/60">
          Epics: <span className="font-semibold text-foreground">{counts.epics}</span>
        </span>
        <span className="text-foreground/60">
          Features: <span className="font-semibold text-foreground">{counts.features}</span>
        </span>
        <span className="text-foreground/60">
          Stories: <span className="font-semibold text-foreground">{counts.stories}</span>
        </span>
        <span className="text-foreground/60">
          Subtasks: <span className="font-semibold text-foreground">{counts.subtasks}</span>
        </span>
      </div>
      <div className="ml-auto text-foreground/60">
        Overall: <span className="font-semibold text-brand-primary">{overallProgress}%</span>
      </div>
    </div>
  );
}

// Flattened row = original WorkItem + computed depth. JiraTable renders the
// tree from this flat, visibility-filtered list (children hidden unless
// their parent chain is fully expanded).
interface FlatRow {
  item: WorkItem;
  depth: number;
}

function flattenVisible(items: WorkItem[], expandedIds: Set<string>, depth = 0): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const item of items) {
    rows.push({ item, depth });
    const hasChildren = !!item.children && item.children.length > 0;
    if (hasChildren && expandedIds.has(item.id)) {
      rows.push(...flattenVisible(item.children!, expandedIds, depth + 1));
    }
  }
  return rows;
}

export function TableView({ items, onItemClick, counts, overallProgress }: TableViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [density, setDensity] = useState<DensityMode>('comfortable');
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);

  // Collect all IDs for expand all
  const allIds = useMemo(() => {
    const ids: string[] = [];
    const collect = (items: WorkItem[]) => {
      items.forEach(item => {
        if (item.children?.length) {
          ids.push(item.id);
          collect(item.children);
        }
      });
    };
    collect(items);
    return ids;
  }, [items]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedIds(new Set(allIds));
  const collapseAll = () => setExpandedIds(new Set());

  const toggleColumn = (colId: string) => {
    setColumns(prev => prev.map(c => c.id === colId && !c.required ? { ...c, visible: !c.visible } : c));
  };

  const isVisible = (colId: string) => columns.find(c => c.id === colId)?.visible ?? true;

  const flatRows = useMemo(() => flattenVisible(items, expandedIds), [items, expandedIds]);

  const handleCopyKey = (item: WorkItem) => {
    navigator.clipboard.writeText(item.key);
    catalystToast.success('Key copied to clipboard');
  };

  const tableColumns = useMemo<Column<FlatRow>[]>(() => {
    const cols: Column<FlatRow>[] = [
      {
        id: 'workItem',
        label: 'Work Item',
        flex: true,
        alwaysVisible: true,
        cell: ({ row }) => {
          const { item } = row;
          return (
            <div className="flex items-center gap-1.5">
              <WorkItemIcon type={item.type === 'subtask' ? 'task' : item.type} size={18} hideTooltip />
              <span className="font-mono text-[10px] text-foreground/50 flex-shrink-0">{item.key}</span>
              <span
                className={cn(
                  "text-[13px] truncate",
                  row.depth === 0 ? "font-semibold text-foreground" : row.depth === 1 ? "font-medium text-foreground" : "text-foreground/70"
                )}
              >
                {item.title}
              </span>
              {item.type === 'epic' && (
                <div className="flex items-center gap-1 ml-1.5">
                  {item.team && <Lozenge appearance="default">{item.team}</Lozenge>}
                  {item.businessRequest && <Lozenge appearance="inprogress">BR {item.businessRequest.key}</Lozenge>}
                </div>
              )}
            </div>
          );
        },
      },
    ];

    if (isVisible('status')) {
      cols.push({
        id: 'status',
        label: 'Status',
        width: 12,
        cell: ({ row }) => <StatusBadge status={row.item.status} />,
      });
    }
    if (isVisible('progress')) {
      cols.push({
        id: 'progress',
        label: 'Progress',
        width: 14,
        cell: ({ row }) => <ProgressBar progress={row.item.progress} />,
      });
    }
    if (isVisible('owner')) {
      cols.push({
        id: 'owner',
        label: 'Owner',
        width: 14,
        cell: ({ row }) => <OwnerAvatar owner={row.item.owner} />,
      });
    }
    if (isVisible('targetDate')) {
      cols.push({
        id: 'targetDate',
        label: 'Target Date',
        width: 12,
        cell: ({ row }) =>
          row.item.endDate ? (
            <span className="text-[11px] font-medium text-foreground">{format(new Date(row.item.endDate), 'dd MMM')}</span>
          ) : (
            <span className="text-foreground/40 text-[11px]">No date</span>
          ),
      });
    }
    if (isVisible('dependencies')) {
      cols.push({
        id: 'dependencies',
        label: 'Deps',
        width: 7,
        cell: ({ row }) =>
          row.item.dependencyCount > 0 ? (
            <Lozenge appearance="default">{row.item.dependencyCount}</Lozenge>
          ) : (
            <span className="text-foreground/40 text-[11px]">—</span>
          ),
      });
    }
    if (isVisible('actions')) {
      cols.push({
        id: 'actions',
        label: '',
        width: 4,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-0.5 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5 text-foreground/50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 bg-popover">
              <DropdownMenuItem onClick={() => onItemClick(row.item)} className="text-xs">
                <Eye className="h-3 w-3 mr-1.5" />View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCopyKey(row.item)} className="text-xs">
                <Copy className="h-3 w-3 mr-1.5" />Copy Key
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      });
    }

    return cols;
  }, [columns, onItemClick]);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Compact stats bar - 28px */}
      <StatsBar counts={counts} overallProgress={overallProgress} />

      {/* Table toolbar - tight spacing */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-border bg-card/50">
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" onClick={collapseAll} className="h-7 w-7">
            <ChevronsUpDown className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={expandAll} className="h-7 w-7">
            <ChevronsDownUp className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 rounded bg-muted border border-border">
            <button
              onClick={() => setDensity('comfortable')}
              className={cn("px-2 py-0.5 text-[11px] rounded transition-colors", density === 'comfortable' ? 'bg-background shadow-sm text-foreground' : 'text-foreground/60')}
            >
              Comfortable
            </button>
            <button
              onClick={() => setDensity('compact')}
              className={cn("px-2 py-0.5 text-[11px] rounded transition-colors", density === 'compact' ? 'bg-background shadow-sm text-foreground' : 'text-foreground/60')}
            >
              Compact
            </button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] gap-1">
                <Columns className="h-3 w-3" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              {columns.filter(c => !c.required).map(col => (
                <DropdownMenuCheckboxItem key={col.id} checked={col.visible} onCheckedChange={() => toggleColumn(col.id)} className="text-xs">
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table - reduced padding */}
      <div className="overflow-auto flex-1 p-2">
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <JiraTable<FlatRow>
            columns={tableColumns}
            data={flatRows}
            getRowId={(row) => row.item.id}
            getRowDepth={(row) => row.depth}
            getRowHasChildren={(row) => !!row.item.children && row.item.children.length > 0}
            expandedRowIds={expandedIds}
            onToggleRowExpanded={(rowId) => toggleExpand(rowId)}
            onRowClick={(row) => onItemClick(row.item)}
            density={density}
            showRowCount={false}
            ariaLabel="Program execution work tree"
          />
        </div>
      </div>
    </div>
  );
}
