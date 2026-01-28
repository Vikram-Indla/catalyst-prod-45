// ============================================================
// WORKSTREAMS V10 LIST VIEW
// Table with sortable columns, row selection, and j/k navigation
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { Edit, MoreHorizontal, List, Archive, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HealthBadge } from './HealthBadge';
import type { WorkstreamDataV10 } from './types';
import { motion } from 'framer-motion';

interface ListViewProps {
  workstreams: WorkstreamDataV10[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onWorkstreamClick: (workstream: WorkstreamDataV10) => void;
  onEdit: (id: string) => void;
  onViewTasks: (id: string) => void;
  onArchive: (id: string) => void;
  onRequestAccess: (id: string) => void;
}

type SortKey = 'name' | 'lead' | 'health' | 'tasks' | 'overdue';
type SortDirection = 'asc' | 'desc';

const COLUMNS = [
  { key: 'name' as SortKey, label: 'Name', width: '2fr', sortable: true },
  { key: 'lead' as SortKey, label: 'Lead', width: '1.5fr', sortable: true },
  { key: 'health' as SortKey, label: 'Health', width: '120px', sortable: true },
  { key: 'tasks' as SortKey, label: 'Tasks', width: '80px', sortable: true, centered: true },
  { key: 'overdue' as SortKey, label: 'Overdue', width: '80px', sortable: true, centered: true },
  { key: null, label: '', width: '50px', sortable: false },
];

export function ListView({
  workstreams,
  selectedIds,
  onSelectionChange,
  onWorkstreamClick,
  onEdit,
  onViewTasks,
  onArchive,
  onRequestAccess,
}: ListViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const tableRef = useRef<HTMLDivElement>(null);

  // Sort workstreams
  const sortedWorkstreams = [...workstreams].sort((a, b) => {
    let comparison = 0;
    
    switch (sortKey) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'lead':
        comparison = (a.lead?.full_name || 'ZZZ').localeCompare(b.lead?.full_name || 'ZZZ');
        break;
      case 'health':
        const healthOrder = { critical: 0, 'at-risk': 1, healthy: 2, locked: 3 };
        comparison = healthOrder[a.health] - healthOrder[b.health];
        break;
      case 'tasks':
        comparison = a.task_count - b.task_count;
        break;
      case 'overdue':
        comparison = a.overdue_count - b.overdue_count;
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // j/k keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if focus is in the table area
      if (!tableRef.current?.contains(document.activeElement) && 
          document.activeElement?.tagName !== 'BODY') {
        return;
      }

      switch (e.key) {
        case 'j':
          e.preventDefault();
          setFocusedIndex(prev => Math.min(prev + 1, sortedWorkstreams.length - 1));
          break;
        case 'k':
          e.preventDefault();
          setFocusedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          if (focusedIndex >= 0 && focusedIndex < sortedWorkstreams.length) {
            e.preventDefault();
            onWorkstreamClick(sortedWorkstreams[focusedIndex]);
          }
          break;
        case 'x':
          if (focusedIndex >= 0 && focusedIndex < sortedWorkstreams.length) {
            e.preventDefault();
            const ws = sortedWorkstreams[focusedIndex];
            const newSet = new Set(selectedIds);
            if (newSet.has(ws.id)) {
              newSet.delete(ws.id);
            } else {
              newSet.add(ws.id);
            }
            onSelectionChange(newSet);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, sortedWorkstreams, selectedIds, onSelectionChange, onWorkstreamClick]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === workstreams.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(workstreams.map(w => w.id)));
    }
  };

  const handleSelectRow = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    onSelectionChange(newSet);
  };

  return (
    <div 
      ref={tableRef}
      className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
      role="table"
      aria-label="Workstreams list"
    >
      {/* Header */}
      <div 
        className="flex items-center gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700"
        role="row"
      >
        <div className="w-[40px]" role="columnheader">
          <Checkbox
            checked={selectedIds.size === workstreams.length && workstreams.length > 0}
            onCheckedChange={handleSelectAll}
            aria-label="Select all workstreams"
          />
        </div>
        
        {COLUMNS.map((col, i) => (
          <div
            key={col.label || i}
            className={cn(
              'text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide',
              col.centered && 'text-center',
              col.sortable && 'cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 select-none'
            )}
            style={{ flex: col.width.includes('fr') ? col.width.replace('fr', '') : undefined, width: col.width.includes('px') ? col.width : undefined }}
            onClick={() => col.sortable && col.key && handleSort(col.key)}
            role="columnheader"
            aria-sort={col.key === sortKey ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
          >
            {col.label}
            {col.key === sortKey && (
              <span className="ml-1" aria-hidden="true">
                {sortDirection === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div role="rowgroup">
        {sortedWorkstreams.map((ws, index) => (
          <WorkstreamRow
            key={ws.id}
            workstream={ws}
            isSelected={selectedIds.has(ws.id)}
            isFocused={focusedIndex === index}
            onSelect={() => handleSelectRow(ws.id)}
            onClick={() => onWorkstreamClick(ws)}
            onEdit={() => onEdit(ws.id)}
            onViewTasks={() => onViewTasks(ws.id)}
            onArchive={() => onArchive(ws.id)}
            onRequestAccess={() => onRequestAccess(ws.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface WorkstreamRowProps {
  workstream: WorkstreamDataV10;
  isSelected: boolean;
  isFocused: boolean;
  onSelect: () => void;
  onClick: () => void;
  onEdit: () => void;
  onViewTasks: () => void;
  onArchive: () => void;
  onRequestAccess: () => void;
}

function WorkstreamRow({
  workstream,
  isSelected,
  isFocused,
  onSelect,
  onClick,
  onEdit,
  onViewTasks,
  onArchive,
  onRequestAccess,
}: WorkstreamRowProps) {
  const isLocked = workstream.isLocked;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'flex items-center gap-4 px-4 py-3 border-b border-slate-100 dark:border-slate-800',
        'transition-colors cursor-pointer group',
        isSelected && 'bg-blue-50 dark:bg-blue-900/20',
        isFocused && 'ring-2 ring-inset ring-blue-500',
        isLocked && 'opacity-60',
        !isSelected && !isFocused && 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
      )}
      onClick={onClick}
      role="row"
      aria-selected={isSelected}
      tabIndex={0}
    >
      {/* Checkbox */}
      <div className="w-[40px]" role="cell" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          aria-label={`Select ${workstream.name}`}
        />
      </div>

      {/* Name */}
      <div className="flex items-center gap-3 flex-[2]" role="cell">
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: workstream.color }}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <div className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
            {workstream.name}
          </div>
          <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
            {workstream.code}
          </div>
        </div>
      </div>

      {/* Lead */}
      <div className="flex items-center gap-2 flex-[1.5]" role="cell">
        {workstream.lead ? (
          <>
            <Avatar className="w-7 h-7">
              <AvatarImage src={workstream.lead.avatar_url || undefined} />
              <AvatarFallback 
                style={{ backgroundColor: workstream.lead.color }}
                className="text-white text-xs font-medium"
              >
                {workstream.lead.initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
              {workstream.lead.full_name}
            </span>
          </>
        ) : (
          <span className="text-sm text-slate-400 dark:text-slate-500">Unassigned</span>
        )}
      </div>

      {/* Health */}
      <div className="w-[120px]" role="cell">
        <HealthBadge 
          health={workstream.health} 
          trend={workstream.healthTrend}
          size="sm"
        />
      </div>

      {/* Tasks */}
      <div className="w-[80px] text-center" role="cell">
        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {workstream.task_count}
        </span>
      </div>

      {/* Overdue */}
      <div className="w-[80px] text-center" role="cell">
        <span className={cn(
          'text-sm font-medium',
          workstream.overdue_count > 0 
            ? 'text-red-600 dark:text-red-400' 
            : 'text-slate-900 dark:text-slate-100'
        )}>
          {workstream.overdue_count}
        </span>
      </div>

      {/* Actions */}
      <div className="w-[50px]" role="cell" onClick={(e) => e.stopPropagation()}>
        {isLocked ? (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs opacity-0 group-hover:opacity-100"
            onClick={onRequestAccess}
          >
            Request
          </Button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'w-8 h-8 rounded-md flex items-center justify-center',
                  'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300',
                  'hover:bg-slate-100 dark:hover:bg-slate-700',
                  'opacity-0 group-hover:opacity-100 transition-opacity'
                )}
                aria-label="More actions"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={onViewTasks}>
                <List className="w-4 h-4 mr-2" />
                View Tasks
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onArchive} className="text-red-600">
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </motion.div>
  );
}
