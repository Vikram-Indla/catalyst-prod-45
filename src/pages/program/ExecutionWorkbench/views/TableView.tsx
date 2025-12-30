/**
 * Program Work Tree - Enhanced Table View
 * Features: Compact stats bar, Expand/Collapse All, Density toggle, Column visibility
 * Optimized spacing and visibility per design spec
 */

import React, { useState, useMemo } from 'react';
import { WorkItem, ItemStatus, ColumnConfig, DEFAULT_COLUMNS, DensityMode, WorkTreeCounts, Owner } from '../types';
import { ChevronRight, ChevronDown, MoreHorizontal, ChevronsUpDown, ChevronsDownUp, Columns, Copy, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CatalystOwnerAvatar } from '@/components/ui/catalyst';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { WorkItemIcon } from '@/components/ja/icons/WorkItemIcon';

interface TableViewProps {
  items: WorkItem[];
  onItemClick: (item: WorkItem) => void;
  counts: WorkTreeCounts;
  overallProgress: number;
}

// Helper to get owner initials
function getOwnerInitials(owner: Owner | null | undefined): string {
  if (!owner?.full_name) return '??';
  return owner.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// Status badge - compact
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

interface TableRowProps {
  item: WorkItem;
  depth: number;
  onItemClick: (item: WorkItem) => void;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  columns: ColumnConfig[];
  density: DensityMode;
}

function TableRow({ item, depth, onItemClick, expandedIds, toggleExpand, columns, density }: TableRowProps) {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedIds.has(item.id);
  // Compact row heights: comfortable=44px, compact=36px
  const rowClass = density === 'comfortable' ? 'h-11' : 'h-9';
  
  const isVisible = (colId: string) => columns.find(c => c.id === colId)?.visible ?? true;

  const handleCopyKey = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.key);
    toast.success('Key copied to clipboard');
  };

  return (
    <>
      <tr 
        className={cn(rowClass, "border-b border-border/40 hover:bg-muted/40 cursor-pointer transition-colors group", depth === 0 && 'bg-surface-tinted')}
        onClick={() => onItemClick(item)}
      >
        {/* Work Item - tighter layout */}
        <td className="px-3 py-0">
          <div className="flex items-center gap-1.5" style={{ paddingLeft: `${depth * 16}px` }}>
            {hasChildren ? (
              <button onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }} className="w-5 h-5 flex items-center justify-center hover:bg-muted rounded flex-shrink-0">
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-foreground/50" /> : <ChevronRight className="h-3.5 w-3.5 text-foreground/50" />}
              </button>
            ) : (
              <span className="w-5 flex-shrink-0" />
            )}
            {depth > 0 && <div className="w-px h-3 bg-border/60 -ml-1.5 mr-0 flex-shrink-0" />}
            <WorkItemIcon type={item.type === 'subtask' ? 'task' : item.type} size={18} hideTooltip />
            <span className="font-mono text-[10px] text-foreground/50 flex-shrink-0">{item.key}</span>
            <span className={cn("text-[13px] truncate", depth === 0 ? "font-semibold text-foreground" : depth === 1 ? "font-medium text-foreground" : "text-foreground/70")}>{item.title}</span>
            {/* Epic badges */}
            {item.type === 'epic' && (
              <div className="flex items-center gap-1 ml-1.5">
                {item.team && <Badge variant="outline" className="text-[9px] py-0 px-1 h-4">{item.team}</Badge>}
                {item.businessRequest && <Badge variant="outline" className="text-[9px] py-0 px-1 h-4 bg-blue-500/10 text-blue-600 border-blue-500/30">BR {item.businessRequest.key}</Badge>}
              </div>
            )}
          </div>
        </td>
        {isVisible('status') && <td className="px-3 py-0"><StatusBadge status={item.status} /></td>}
        {isVisible('progress') && <td className="px-3 py-0"><ProgressBar progress={item.progress} /></td>}
        {isVisible('owner') && <td className="px-3 py-0"><OwnerAvatar owner={item.owner} /></td>}
        {isVisible('targetDate') && (
          <td className="px-3 py-0">
            {item.endDate ? <span className="text-[11px] font-medium text-foreground">{format(new Date(item.endDate), 'dd MMM')}</span> : <span className="text-foreground/40 text-[11px]">No date</span>}
          </td>
        )}
        {isVisible('dependencies') && (
          <td className="px-3 py-0">
            {item.dependencyCount > 0 ? <Badge variant="outline" className="text-[9px] py-0 h-4">{item.dependencyCount}</Badge> : <span className="text-foreground/40 text-[11px]">—</span>}
          </td>
        )}
        {isVisible('actions') && (
          <td className="px-2 py-0 w-8">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-0.5 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="h-3.5 w-3.5 text-foreground/50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36 bg-popover">
                <DropdownMenuItem onClick={() => onItemClick(item)} className="text-xs"><Eye className="h-3 w-3 mr-1.5" />View Details</DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyKey} className="text-xs"><Copy className="h-3 w-3 mr-1.5" />Copy Key</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </td>
        )}
      </tr>
      {hasChildren && isExpanded && item.children!.map(child => (
        <TableRow key={child.id} item={child} depth={depth + 1} onItemClick={onItemClick} expandedIds={expandedIds} toggleExpand={toggleExpand} columns={columns} density={density} />
      ))}
    </>
  );
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
          <table className="w-full">
            <thead>
              <tr className="h-9 bg-muted/50 border-b border-border">
                <th className="px-3 text-left text-[11px] font-semibold uppercase tracking-wide text-foreground/70">Work Item</th>
                {isVisible('status') && <th className="px-3 text-left text-[11px] font-semibold uppercase tracking-wide text-foreground/70 w-24">Status</th>}
                {isVisible('progress') && <th className="px-3 text-left text-[11px] font-semibold uppercase tracking-wide text-foreground/70 w-28">Progress</th>}
                {isVisible('owner') && <th className="px-3 text-left text-[11px] font-semibold uppercase tracking-wide text-foreground/70 w-28">Owner</th>}
                {isVisible('targetDate') && <th className="px-3 text-left text-[11px] font-semibold uppercase tracking-wide text-foreground/70 w-24">Target Date</th>}
                {isVisible('dependencies') && <th className="px-3 text-left text-[11px] font-semibold uppercase tracking-wide text-foreground/70 w-14">Deps</th>}
                {isVisible('actions') && <th className="px-2 w-8"></th>}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <TableRow key={item.id} item={item} depth={0} onItemClick={onItemClick} expandedIds={expandedIds} toggleExpand={toggleExpand} columns={columns} density={density} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
