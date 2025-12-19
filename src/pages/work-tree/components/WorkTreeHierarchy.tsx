// ═══════════════════════════════════════════════════════════════════════════════
// WORK TREE HIERARCHY — Aligned with Catalyst OKR Objectives Table Pattern
// Uses the same structure, spacing, typography, and visual rhythm
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Shared presentational components from OKR module
import { OkrStatusPill } from '@/modules/okr-v2/components/shared/OkrStatusPill';
import { OkrProgressCell } from '@/modules/okr-v2/components/shared/OkrProgressCell';
import { OkrThemeDot } from '@/modules/okr-v2/components/shared/OkrThemeDot';

// ─────────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────────

interface WorkTreeHierarchyProps {
  view: string;
  data: any;
  isLoading: boolean;
  narrowToProgram: boolean;
  onItemClick?: (id: string, type: string) => void;
}

interface TreeNode {
  id: string;
  type: 'goal' | 'theme-group' | 'theme' | 'epic' | 'feature' | 'story' | 'task' | 'section';
  title: string;
  health?: 'green' | 'yellow' | 'red' | 'gray';
  status?: string;
  points?: number;
  itemCount?: number;
  progress?: number;
  themeName?: string;
  themeColor?: string;
  owner?: string;
  startDate?: string;
  endDate?: string;
  children?: TreeNode[];
  hasMultiplePrograms?: boolean;
  hasLinks?: boolean;
  hasDiscussions?: boolean;
  hasQuestions?: boolean;
  hasTags?: boolean;
}

// Column configuration matching OKR table pattern
const COLUMN_CONFIG: Record<string, { label: string; width: string }> = {
  type: { label: 'Type', width: '90px' },
  workItem: { label: 'Work Item', width: '340px' },
  theme: { label: 'Theme Name', width: '160px' },
  status: { label: 'Status', width: '100px' },
  progress: { label: 'Progress vs Plan', width: '180px' },
};

// Type badge styles matching OKR pattern
const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  'goal': { bg: 'bg-brand-primary/10', text: 'text-brand-primary', label: 'Goal' },
  'theme-group': { bg: 'bg-secondary-bronze/10', text: 'text-secondary-bronze', label: 'Theme Group' },
  'theme': { bg: 'bg-secondary-bronze/10', text: 'text-secondary-bronze', label: 'Theme' },
  'epic': { bg: 'bg-workitem-epic/10', text: 'text-workitem-epic', label: 'Epic' },
  'feature': { bg: 'bg-workitem-feature/10', text: 'text-workitem-feature', label: 'Feature' },
  'story': { bg: 'bg-workitem-story/10', text: 'text-workitem-story', label: 'Story' },
  'task': { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Task' },
  'section': { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Section' },
};

// Health to status mapping for the status pill
const HEALTH_TO_STATUS: Record<string, string> = {
  'green': 'on-track',
  'yellow': 'at-risk',
  'red': 'off-track',
  'gray': 'pending',
};

// Health dot colors (for the colored dot in work item column)
const HEALTH_DOT_COLORS: Record<string, string> = {
  'green': 'bg-secondary-green',
  'yellow': 'bg-secondary-bronze',
  'red': 'bg-destructive',
  'gray': 'bg-muted-foreground/50',
};

// ─────────────────────────────────────────────────────────────────────────────────
// TABLE ROW COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

interface WorkTreeRowProps {
  node: TreeNode;
  level: number;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onItemClick?: (id: string, type: string) => void;
}

function WorkTreeRowComponent({ node, level, expandedIds, onToggleExpand, onItemClick }: WorkTreeRowProps) {
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const indentPx = level * 24;

  // Get type styling
  const typeStyle = TYPE_STYLES[node.type] || TYPE_STYLES['task'];
  
  // Compute status from health or use provided status
  const displayStatus = node.status || HEALTH_TO_STATUS[node.health || 'gray'] || 'pending';
  
  // Health dot color
  const healthDotColor = HEALTH_DOT_COLORS[node.health || 'gray'] || HEALTH_DOT_COLORS['gray'];

  // Progress trend based on health
  const progressTrend = node.health === 'green' ? 'on-track' : 
                        node.health === 'yellow' ? 'at-risk' : 
                        node.health === 'red' ? 'off-track' : 'none';

  const handleRowClick = () => {
    if (node.type === 'epic' || node.type === 'feature') {
      onItemClick?.(node.id, node.type);
    }
  };

  return (
    <>
      <tr
        className={cn(
          'group cursor-pointer transition-colors hover:bg-muted/50 dark:hover:bg-muted/30 border-b border-border/40',
          level > 0 && 'bg-muted/20'
        )}
        onClick={handleRowClick}
      >
        {/* Type Column */}
        <td className="py-3 px-4" style={{ width: COLUMN_CONFIG.type.width }}>
          <span className={cn(
            "inline-flex items-center justify-center text-[10px] font-medium px-2 py-0.5 rounded whitespace-nowrap",
            typeStyle.bg,
            typeStyle.text
          )}>
            {typeStyle.label}
          </span>
        </td>

        {/* Work Item Column */}
        <td className="py-3 px-4" style={{ width: COLUMN_CONFIG.workItem.width }}>
          <div 
            className="flex items-center gap-2 min-w-0"
            style={{ paddingLeft: `${indentPx}px` }}
          >
            {/* Health dot (like theme dot in OKR table) */}
            <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", healthDotColor)} />
            
            {/* Expand/Collapse toggle */}
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(node.id);
                }}
                className="flex items-center justify-center w-5 h-5 text-muted-foreground hover:text-foreground flex-shrink-0"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : (
              <span className="w-5 flex-shrink-0" />
            )}
            
            {/* Title with tooltip */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={cn(
                    "text-sm truncate max-w-[260px]",
                    level === 0 && "font-semibold text-foreground",
                    level === 1 && "font-medium text-foreground",
                    level >= 2 && "text-muted-foreground"
                  )}>
                    {node.title}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-md bg-popover border border-border z-[400]">
                  <p>{node.title}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </td>

        {/* Theme Name Column */}
        <td className="py-3 px-4" style={{ width: COLUMN_CONFIG.theme.width }}>
          {node.themeName ? (
            <div className="flex items-center gap-2">
              {node.themeColor && (
                <OkrThemeDot color={node.themeColor} themeName={node.themeName} size="sm" />
              )}
              <span className="text-sm text-muted-foreground truncate">{node.themeName}</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </td>

        {/* Status Column */}
        <td className="py-3 px-4" style={{ width: COLUMN_CONFIG.status.width }}>
          <OkrStatusPill status={displayStatus} size="sm" />
        </td>

        {/* Progress Column */}
        <td className="py-3 px-4" style={{ width: COLUMN_CONFIG.progress.width }}>
          {node.progress != null ? (
            <OkrProgressCell 
              baseline={{
                actual: node.progress,
                expected: null,
                variance: null,
                trend: progressTrend as any,
              }}
              compact
            />
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </td>
      </tr>

      {/* Render children if expanded */}
      {isExpanded && hasChildren && node.children!.map((child) => (
        <WorkTreeRowComponent
          key={child.id}
          node={child}
          level={level + 1}
          expandedIds={expandedIds}
          onToggleExpand={onToggleExpand}
          onItemClick={onItemClick}
        />
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────────

export function WorkTreeHierarchy({ view, data, isLoading, narrowToProgram, onItemClick }: WorkTreeHierarchyProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const handleToggle = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const visibleColumns = useMemo(() => ['type', 'workItem', 'theme', 'status', 'progress'], []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted-foreground">Loading work tree...</div>
      </div>
    );
  }

  if (!data?.tree || data.tree.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted-foreground">No work items found</div>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {visibleColumns.map((colKey, idx) => (
            <TableHead 
              key={colKey}
              className={cn(
                "text-[11px] font-semibold uppercase tracking-wider",
                idx === visibleColumns.length - 1 ? "text-right" : "text-left"
              )}
              style={{ width: COLUMN_CONFIG[colKey]?.width || '100px' }}
            >
              {COLUMN_CONFIG[colKey]?.label || colKey}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>

      <TableBody>
        {data.tree.map((node: TreeNode) => (
          <WorkTreeRowComponent
            key={node.id}
            node={node}
            level={0}
            expandedIds={expandedIds}
            onToggleExpand={handleToggle}
            onItemClick={onItemClick}
          />
        ))}
      </TableBody>

      {/* Empty State (fallback) */}
      {data.tree.length === 0 && (
        <TableBody>
          <TableRow>
            <TableCell colSpan={visibleColumns.length} className="text-center py-12 text-muted-foreground text-sm">
              No work items found
            </TableCell>
          </TableRow>
        </TableBody>
      )}
    </Table>
  );
}
