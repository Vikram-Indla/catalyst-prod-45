/**
 * TestCasesTable — Data table for list view of test cases
 * Features: Selection, sorting, row actions, reusable badges
 * 
 * Stage D: Fully wired — No placeholder data, real actions only
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Eye,
  Pencil,
  Copy,
  Play,
  FolderInput,
  Trash2,
  ListChecks,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TestCase } from '@/types/test-cases';
import { TypeBadge, PriorityBadge, StatusBadge, LastRunBadge } from './badges';
import { cn } from '@/lib/utils';
import { useCloneTestCase, useDeleteTestCase } from '@/hooks/test-management';

interface TestCasesTableProps {
  testCases: TestCase[];
  selectedIds: Set<string>;
  onSelectAll: (checked: boolean) => void;
  onSelectRow: (id: string, checked: boolean) => void;
  allSelected: boolean;
  onRowClick?: (testCase: TestCase) => void;
  onEdit?: (testCase: TestCase) => void;
  onMoveToFolder?: (testCase: TestCase) => void;
  projectId?: string;
}

// Avatar colors
const avatarColors: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  purple: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

type SortField = 'id' | 'title' | 'priority' | 'status' | 'updated';
type SortDir = 'asc' | 'desc';

function SortIcon({ field, currentField, direction }: { field: SortField; currentField: SortField | null; direction: SortDir }) {
  if (currentField !== field) {
    return <ArrowUpDown className="w-3 h-3 opacity-50" />;
  }
  return direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
}

export function TestCasesTable({ 
  testCases, 
  selectedIds, 
  onSelectAll, 
  onSelectRow,
  allSelected,
  onRowClick,
  onEdit,
  onMoveToFolder,
  projectId,
}: TestCasesTableProps) {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  
  // Real mutations
  const cloneMutation = useCloneTestCase();
  const deleteMutation = useDeleteTestCase();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleRowAction = (action: string, tc: TestCase) => {
    const caseId = tc.id;
    const resolvedProjectId = projectId || '';
    
    switch (action) {
      case 'view':
        navigate(`/testhub/repository?view=${caseId}`);
        break;
      case 'edit':
        if (onEdit) {
          onEdit(tc);
        } else {
          navigate(`/testhub/repository?view=${caseId}&edit=true`);
        }
        break;
      case 'duplicate':
        if (resolvedProjectId) {
          cloneMutation.mutate({ id: caseId, project_id: resolvedProjectId });
        } else {
          toast.error('Cannot duplicate: No project context');
        }
        break;
      case 'move':
        if (onMoveToFolder) {
          onMoveToFolder(tc);
        } else {
          toast.info('Move to folder: Open from parent component');
        }
        break;
      case 'delete':
        if (resolvedProjectId) {
          deleteMutation.mutate({ id: caseId, project_id: resolvedProjectId });
        } else {
          toast.error('Cannot delete: No project context');
        }
        break;
    }
  };

  // Sort test cases
  const sortedCases = [...testCases].sort((a, b) => {
    if (!sortField) return 0;
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortField) {
      case 'id':
        return a.id.localeCompare(b.id) * dir;
      case 'title':
        return a.title.localeCompare(b.title) * dir;
      case 'priority': {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return (order[a.priority] - order[b.priority]) * dir;
      }
      case 'status': {
        const order = { draft: 0, ready: 1, approved: 2, deprecated: 3 };
        return (order[a.status] - order[b.status]) * dir;
      }
      case 'updated':
        return a.updated.localeCompare(b.updated) * dir;
      default:
        return 0;
    }
  });

  return (
    <div className="bg-background border rounded-lg overflow-x-auto">
      <table className="w-full min-w-[1200px]">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className="w-12 px-3 py-3">
              <Checkbox 
                checked={allSelected}
                onCheckedChange={onSelectAll}
              />
            </th>
            <th className="w-28 px-3 py-3 text-left">
              <button 
                onClick={() => handleSort('id')}
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 hover:text-foreground transition-colors"
              >
                ID
                <SortIcon field="id" currentField={sortField} direction={sortDir} />
              </button>
            </th>
            <th className="min-w-[220px] px-3 py-3 text-left">
              <button 
                onClick={() => handleSort('title')}
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 hover:text-foreground transition-colors"
              >
                Title
                <SortIcon field="title" currentField={sortField} direction={sortDir} />
              </button>
            </th>
            <th className="w-32 px-3 py-3 text-left">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Release
              </span>
            </th>
            <th className="w-40 px-3 py-3 text-left">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Folder
              </span>
            </th>
            <th className="w-28 px-3 py-3 text-left">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Type
              </span>
            </th>
            <th className="w-28 px-3 py-3 text-left">
              <button 
                onClick={() => handleSort('priority')}
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 hover:text-foreground transition-colors"
              >
                Priority
                <SortIcon field="priority" currentField={sortField} direction={sortDir} />
              </button>
            </th>
            <th className="w-28 px-3 py-3 text-left">
              <button 
                onClick={() => handleSort('status')}
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 hover:text-foreground transition-colors"
              >
                Status
                <SortIcon field="status" currentField={sortField} direction={sortDir} />
              </button>
            </th>
            <th className="w-16 px-3 py-3 text-center">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Steps
              </span>
            </th>
            <th className="w-24 px-3 py-3 text-left">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Last Run
              </span>
            </th>
            <th className="w-32 px-3 py-3 text-left">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Assignee
              </span>
            </th>
            <th className="w-28 px-3 py-3 text-left">
              <button 
                onClick={() => handleSort('updated')}
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 hover:text-foreground transition-colors"
              >
                Updated
                <SortIcon field="updated" currentField={sortField} direction={sortDir} />
              </button>
            </th>
            <th className="w-12 px-3 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {sortedCases.map((tc) => (
            <tr
              key={tc.id}
              className={cn(
                "hover:bg-muted/30 cursor-grab active:cursor-grabbing transition-colors",
                selectedIds.has(tc.id) && "bg-primary/5"
              )}
              draggable
              onDragStart={(e: React.DragEvent<HTMLTableRowElement>) => {
                const testCaseId = tc.id;
                e.dataTransfer.setData('text/plain', testCaseId);
                e.dataTransfer.setData('text', testCaseId);
                e.dataTransfer.setData('application/json', JSON.stringify({
                  id: testCaseId,
                  displayId: tc.key || tc.id,
                  title: tc.title,
                }));
                e.dataTransfer.effectAllowed = 'move';
                e.currentTarget.classList.add('opacity-50');
              }}
              onDragEnd={(e: React.DragEvent<HTMLTableRowElement>) => {
                e.currentTarget.classList.remove('opacity-50');
              }}
              onClick={() => onRowClick?.(tc)}
            >
              <td className="w-12 px-3 py-3" onClick={(e) => e.stopPropagation()}>
                <Checkbox 
                  checked={selectedIds.has(tc.id)}
                  onCheckedChange={(checked) => onSelectRow(tc.id, !!checked)}
                />
              </td>
              <td className="w-28 px-3 py-3">
                <Link 
                  to={`/releases/test-cases/${tc.id}`}
                  className="text-sm font-mono text-primary font-medium hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {tc.key || tc.id}
                </Link>
              </td>
              <td className="min-w-[220px] px-3 py-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-sm text-foreground truncate block max-w-[300px]">
                      {tc.title}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-sm">
                    {tc.title}
                  </TooltipContent>
                </Tooltip>
              </td>
              <td className="w-32 px-3 py-3">
                <span className={cn(
                  "text-sm truncate block max-w-[120px]",
                  tc.release === 'Unassigned' ? "text-muted-foreground italic" : "text-foreground"
                )}>
                  {tc.release}
                </span>
              </td>
              <td className="w-40 px-3 py-3">
                {tc.folderPath ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm text-muted-foreground truncate block max-w-[150px]">
                        {tc.folderPath}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-sm">
                      {tc.folderPath}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </td>
              <td className="w-28 px-3 py-3">
                <TypeBadge type={tc.type} />
              </td>
              <td className="w-28 px-3 py-3">
                <PriorityBadge priority={tc.priority} />
              </td>
              <td className="w-28 px-3 py-3">
                <StatusBadge status={tc.status} />
              </td>
              <td className="w-16 px-3 py-3 text-center">
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <ListChecks className="w-3.5 h-3.5" />
                  {tc.steps}
                </span>
              </td>
              <td className="w-24 px-3 py-3">
                <LastRunBadge status={tc.lastRun} />
              </td>
              <td className="w-32 px-3 py-3">
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className={cn("text-xs font-medium", avatarColors[tc.assignee.color] || avatarColors.gray)}>
                      {tc.assignee.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground truncate max-w-[80px]">{tc.assignee.name}</span>
                </div>
              </td>
              <td className="w-28 px-3 py-3">
                <span className="text-sm text-muted-foreground">{tc.updated}</span>
              </td>
              <td className="w-12 px-3 py-3" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => handleRowAction('view', tc)}>
                      <Eye className="w-4 h-4 mr-2" /> View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleRowAction('edit', tc)}>
                      <Pencil className="w-4 h-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleRowAction('duplicate', tc)}>
                      <Copy className="w-4 h-4 mr-2" /> Duplicate
                    </DropdownMenuItem>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
                          <Play className="w-4 h-4 mr-2" /> Execute
                        </DropdownMenuItem>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p className="text-xs">Execution module not enabled yet</p>
                      </TooltipContent>
                    </Tooltip>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleRowAction('move', tc)}>
                      <FolderInput className="w-4 h-4 mr-2" /> Move to Folder
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => handleRowAction('delete', tc)}>
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
