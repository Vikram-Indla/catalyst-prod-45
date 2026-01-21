/**
 * Data Grid — Enterprise-density table with 45+ rows
 * Enforces CATALYST HIERARCHY CONTRACT via icons per scope
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Target, Flag, Zap, Package, BookOpen, CheckSquare, ExternalLink, MoreHorizontal, ChevronUp, ChevronDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { WorkItem, TYPE_CONFIG, PRIORITY_CONFIG, WorkItemType } from '../../types';
import { StatusDropdown } from './StatusDropdown';

interface DataGridProps {
  items: WorkItem[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onRowClick: (item: WorkItem) => void;
  onStatusChange: (id: string, status: WorkItem['status']) => void;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
}

// Catalyst V5 type icons per hierarchy
const TYPE_ICONS: Record<WorkItemType, React.ElementType> = { 
  objective: Target,
  strategic_initiative: Flag,
  epic: Zap, 
  feature: Package, 
  story: BookOpen, 
  subtask: CheckSquare 
};

export function DataGrid({
  items, selectedIds, onSelectionChange, onRowClick, onStatusChange, sortColumn, sortDirection, onSort,
}: DataGridProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const allSelected = items.length > 0 && items.every(i => selectedIds.has(i.id));

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(items.map(i => i.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full" role="grid">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800">
              <th className="w-9 px-3 py-2"><Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" /></th>
              <th className="w-10 px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Type</th>
              <th className="w-24 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-left cursor-pointer" onClick={() => onSort('key')}>
                <span className="flex items-center gap-1">Key <SortIcon column="key" /></span>
              </th>
              <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-left cursor-pointer" onClick={() => onSort('title')}>
                <span className="flex items-center gap-1">Summary <SortIcon column="title" /></span>
              </th>
              <th className="w-28 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-left">Status</th>
              <th className="w-12 px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-center">Pri</th>
              <th className="w-36 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-left cursor-pointer" onClick={() => onSort('assignee')}>
                <span className="flex items-center gap-1">Assignee <SortIcon column="assignee" /></span>
              </th>
              <th className="w-24 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-left">Sprint</th>
              <th className="w-24 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-left">Created</th>
              <th className="w-20 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const typeConfig = TYPE_CONFIG[item.type];
              const priorityConfig = PRIORITY_CONFIG[item.priority];
              const Icon = TYPE_ICONS[item.type];
              const isSelected = selectedIds.has(item.id);
              const isHovered = hoveredId === item.id;

              return (
                <tr
                  key={item.id}
                  onClick={() => onRowClick(item)}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={cn(
                    "border-t border-slate-100 dark:border-slate-700 cursor-pointer transition-colors",
                    isSelected ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}
                >
                  <td className="px-3 py-1.5" onClick={e => e.stopPropagation()}>
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleOne(item.id)} />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className={cn("w-5 h-5 rounded flex items-center justify-center", typeConfig.bgColor)}>
                      <Icon className={cn("w-3 h-3", typeConfig.textColor)} />
                    </div>
                  </td>
                  <td className="px-3 py-1.5">
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">{item.key}</span>
                  </td>
                  <td className="px-3 py-1.5">
                    <span className="text-xs text-slate-900 dark:text-slate-100 line-clamp-1">{item.title}</span>
                  </td>
                  <td className="px-3 py-1.5" onClick={e => e.stopPropagation()}>
                    <StatusDropdown value={item.status} onChange={(s) => onStatusChange(item.id, s)} />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <span className={cn("inline-flex w-5 h-5 items-center justify-center text-[10px] font-bold rounded", priorityConfig.bgColor, priorityConfig.textColor)}>
                      {priorityConfig.letter}
                    </span>
                  </td>
                  <td className="px-3 py-1.5">
                    {item.assignee ? (
                      <div className="flex items-center gap-2">
                        <div className={cn("w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] font-semibold text-white", item.assignee.color)}>
                          {item.assignee.initials}
                        </div>
                        <span className="text-xs text-slate-600 dark:text-slate-300">{item.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5"><span className="text-xs text-slate-400">{item.sprint}</span></td>
                  <td className="px-3 py-1.5"><span className="text-xs text-slate-400">{item.createdAt}</span></td>
                  <td className="px-2 py-1.5">
                    <div className={cn("flex items-center gap-1 transition-opacity", isHovered ? "opacity-100" : "opacity-0")}>
                      <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="View details">
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                      <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="More actions">
                        <MoreHorizontal className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
