/**
 * Program Work Tree - Enhanced Table View
 * Features: Stats bar, Expand/Collapse All, Density toggle, Column visibility
 * NO Health column per requirements
 */

import React, { useState, useMemo } from 'react';
import { WorkItem, ItemStatus, ColumnConfig, DEFAULT_COLUMNS, DensityMode, WorkTreeCounts, Owner } from '../types';
import { ChevronRight, ChevronDown, MoreHorizontal, Link2, Zap, AlignLeft, ListTodo, ChevronsUpDown, ChevronsDownUp, Columns, Copy, Eye, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

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

// Type badge component
function TypeBadge({ type }: { type: string }) {
  const config: Record<string, { Icon: LucideIcon; bgClass: string; textClass: string }> = {
    epic: { Icon: Zap, bgClass: 'bg-workitem-epic/15', textClass: 'text-workitem-epic' },
    feature: { Icon: Zap, bgClass: 'bg-workitem-feature/15', textClass: 'text-workitem-feature' },
    story: { Icon: AlignLeft, bgClass: 'bg-workitem-story/15', textClass: 'text-workitem-story' },
    subtask: { Icon: ListTodo, bgClass: 'bg-muted', textClass: 'text-muted-foreground' },
  };
  const { Icon, bgClass, textClass } = config[type] || config.story;

  return (
    <span className={cn('inline-flex items-center justify-center w-6 h-6 rounded-md flex-shrink-0', bgClass, textClass)}>
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}

// Status badge
function StatusBadge({ status }: { status: ItemStatus }) {
  const styles: Record<ItemStatus, string> = {
    'Backlog': 'bg-muted text-muted-foreground border-border',
    'In Progress': 'bg-brand-gold/15 text-brand-gold border-brand-gold/30',
    'Done': 'bg-secondary-green/15 text-secondary-green border-secondary-green/30',
    'Blocked': 'bg-destructive/15 text-destructive border-destructive/30',
  };
  
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border", styles[status])}>
      {status}
    </span>
  );
}

// Owner avatar
function OwnerAvatar({ owner }: { owner: Owner | null | undefined }) {
  if (!owner) return <span className="text-muted-foreground/50 text-xs">—</span>;
  
  const initials = getOwnerInitials(owner);
  const firstName = owner.full_name?.split(' ')[0] || '';
  
  return (
    <div className="flex items-center gap-2">
      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-secondary-bronze to-brand-primary flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0">
        {initials}
      </div>
      <span className="text-xs truncate max-w-[80px]">{firstName}</span>
    </div>
  );
}

// Progress bar
function ProgressBar({ progress }: { progress: number }) {
  const colorClass = progress >= 100 ? 'bg-secondary-green' : progress > 0 ? 'bg-brand-gold' : 'bg-muted-foreground/30';
  
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", colorClass)} style={{ width: `${progress}%` }} />
      </div>
      <span className="text-[11px] text-muted-foreground w-8 text-right tabular-nums font-medium">{progress}%</span>
    </div>
  );
}

// Stats bar component
function StatsBar({ counts, overallProgress }: { counts: WorkTreeCounts; overallProgress: number }) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border">
      <div className="flex items-center gap-6 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-workitem-epic" />
          <span className="text-muted-foreground">Epics:</span>
          <span className="font-semibold">{counts.epics}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-workitem-feature" />
          <span className="text-muted-foreground">Features:</span>
          <span className="font-semibold">{counts.features}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-workitem-story" />
          <span className="text-muted-foreground">Stories:</span>
          <span className="font-semibold">{counts.stories}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-muted-foreground" />
          <span className="text-muted-foreground">Subtasks:</span>
          <span className="font-semibold">{counts.subtasks}</span>
        </span>
      </div>
      <div className="text-xs">
        <span className="text-muted-foreground">Overall:</span>
        <span className="font-semibold text-brand-primary ml-1">{overallProgress}%</span>
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
  const rowHeight = density === 'comfortable' ? 'py-3' : 'py-2';
  
  const isVisible = (colId: string) => columns.find(c => c.id === colId)?.visible ?? true;

  const handleCopyKey = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.key);
    toast.success('Key copied to clipboard');
  };

  return (
    <>
      <tr 
        className={cn("border-b border-border/40 hover:bg-muted/40 cursor-pointer transition-colors group", depth === 0 && 'bg-surface-tinted')}
        onClick={() => onItemClick(item)}
      >
        {/* Work Item */}
        <td className={cn("px-3", rowHeight)}>
          <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
            {hasChildren ? (
              <button onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }} className="p-0.5 hover:bg-muted rounded flex-shrink-0">
                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </button>
            ) : (
              <span className="w-5 flex-shrink-0" />
            )}
            {depth > 0 && <div className="w-px h-4 bg-border/60 -ml-2 mr-0 flex-shrink-0" />}
            <TypeBadge type={item.type} />
            <span className="font-mono text-[11px] text-muted-foreground flex-shrink-0">{item.key}</span>
            <span className={cn("text-sm truncate", depth === 0 ? "font-semibold" : depth === 1 ? "font-medium" : "text-muted-foreground")}>{item.title}</span>
            {/* Epic badges */}
            {item.type === 'epic' && (
              <div className="flex items-center gap-1.5 ml-2">
                {item.team && <Badge variant="outline" className="text-[10px] py-0 px-1.5">{item.team}</Badge>}
                {item.businessRequest && <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-blue-500/10 text-blue-600 border-blue-500/30">BR {item.businessRequest.key}</Badge>}
              </div>
            )}
          </div>
        </td>
        {isVisible('status') && <td className={cn("px-3", rowHeight)}><StatusBadge status={item.status} /></td>}
        {isVisible('progress') && <td className={cn("px-3", rowHeight)}><ProgressBar progress={item.progress} /></td>}
        {isVisible('owner') && <td className={cn("px-3", rowHeight)}><OwnerAvatar owner={item.owner} /></td>}
        {isVisible('targetDate') && (
          <td className={cn("px-3", rowHeight)}>
            {item.endDate ? <span className="text-xs font-medium">{format(new Date(item.endDate), 'dd MMM')}</span> : <span className="text-muted-foreground/50 text-xs italic">No date</span>}
          </td>
        )}
        {isVisible('dependencies') && (
          <td className={cn("px-3", rowHeight)}>
            {item.dependencyCount > 0 ? <Badge variant="outline" className="text-[10px] py-0">{item.dependencyCount}</Badge> : <span className="text-muted-foreground/50 text-xs">—</span>}
          </td>
        )}
        {isVisible('actions') && (
          <td className={cn("px-2 w-10", rowHeight)}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onItemClick(item)}><Eye className="h-3.5 w-3.5 mr-2" />View Details</DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyKey}><Copy className="h-3.5 w-3.5 mr-2" />Copy Key</DropdownMenuItem>
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
      {/* Stats bar */}
      <StatsBar counts={counts} overallProgress={overallProgress} />
      
      {/* Table toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={collapseAll} className="h-7 px-2 text-xs"><ChevronsUpDown className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" onClick={expandAll} className="h-7 px-2 text-xs"><ChevronsDownUp className="h-3.5 w-3.5" /></Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 p-0.5 rounded bg-muted border border-border">
            <button onClick={() => setDensity('comfortable')} className={cn("px-2.5 py-1 text-xs rounded transition-colors", density === 'comfortable' ? 'bg-background shadow-sm' : 'text-muted-foreground')}>Comfortable</button>
            <button onClick={() => setDensity('compact')} className={cn("px-2.5 py-1 text-xs rounded transition-colors", density === 'compact' ? 'bg-background shadow-sm' : 'text-muted-foreground')}>Compact</button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1"><Columns className="h-3.5 w-3.5" />Columns</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {columns.filter(c => !c.required).map(col => (
                <DropdownMenuCheckboxItem key={col.id} checked={col.visible} onCheckedChange={() => toggleColumn(col.id)}>{col.label}</DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-1 p-3">
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/60 border-b border-border">
                <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Work Item</th>
                {isVisible('status') && <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-[100px]">Status</th>}
                {isVisible('progress') && <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-[140px]">Progress</th>}
                {isVisible('owner') && <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-[120px]">Owner</th>}
                {isVisible('targetDate') && <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-[100px]">Target Date</th>}
                {isVisible('dependencies') && <th className="py-3 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-[60px]">Deps</th>}
                {isVisible('actions') && <th className="py-3 px-2 w-10"></th>}
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
