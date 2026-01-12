/**
 * TestCasesTable — Data table for list view of test cases
 * Features: Selection, sorting, row actions, reusable badges
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  UserPlus,
  Trash2,
  ListChecks,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { TestCase } from '@/data/testCasesData';
import { TypeBadge, PriorityBadge, StatusBadge, LastRunBadge } from './badges';
import { cn } from '@/lib/utils';

interface TestCasesTableProps {
  testCases: TestCase[];
  selectedIds: Set<string>;
  onSelectAll: (checked: boolean) => void;
  onSelectRow: (id: string, checked: boolean) => void;
  allSelected: boolean;
}

// Avatar colors
const avatarColors: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  purple: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
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
  allSelected 
}: TestCasesTableProps) {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleRowAction = (action: string, tc: TestCase) => {
    switch (action) {
      case 'view':
        navigate(`/releases/test-cases/${tc.id}`);
        break;
      case 'edit':
        navigate(`/releases/test-cases/${tc.id}?edit=true`);
        break;
      case 'duplicate':
        toast.success(`Test case ${tc.id} duplicated`);
        break;
      case 'execute':
        toast.success(`Starting execution for ${tc.id}...`);
        break;
      case 'move':
        toast.info('Move to Release dialog coming soon');
        break;
      case 'reassign':
        toast.info('Reassign dialog coming soon');
        break;
      case 'delete':
        toast.error(`Test case ${tc.id} deleted`);
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
    <div className="bg-background border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className="w-10 px-4 py-3">
              <Checkbox 
                checked={allSelected}
                onCheckedChange={onSelectAll}
              />
            </th>
            <th className="px-4 py-3 text-left">
              <button 
                onClick={() => handleSort('id')}
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 hover:text-foreground transition-colors"
              >
                ID
                <SortIcon field="id" currentField={sortField} direction={sortDir} />
              </button>
            </th>
            <th className="px-4 py-3 text-left">
              <button 
                onClick={() => handleSort('title')}
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 hover:text-foreground transition-colors"
              >
                Title
                <SortIcon field="title" currentField={sortField} direction={sortDir} />
              </button>
            </th>
            <th className="px-4 py-3 text-left">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Release
              </span>
            </th>
            <th className="px-4 py-3 text-left">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Type
              </span>
            </th>
            <th className="px-4 py-3 text-left">
              <button 
                onClick={() => handleSort('priority')}
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 hover:text-foreground transition-colors"
              >
                Priority
                <SortIcon field="priority" currentField={sortField} direction={sortDir} />
              </button>
            </th>
            <th className="px-4 py-3 text-left">
              <button 
                onClick={() => handleSort('status')}
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 hover:text-foreground transition-colors"
              >
                Status
                <SortIcon field="status" currentField={sortField} direction={sortDir} />
              </button>
            </th>
            <th className="px-4 py-3 text-center">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Steps
              </span>
            </th>
            <th className="px-4 py-3 text-left">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Last Run
              </span>
            </th>
            <th className="px-4 py-3 text-left">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Assignee
              </span>
            </th>
            <th className="px-4 py-3 text-left">
              <button 
                onClick={() => handleSort('updated')}
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 hover:text-foreground transition-colors"
              >
                Updated
                <SortIcon field="updated" currentField={sortField} direction={sortDir} />
              </button>
            </th>
            <th className="w-12 px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {sortedCases.map((tc, index) => (
            <motion.tr
              key={tc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={cn(
                "hover:bg-muted/30 cursor-pointer transition-colors",
                selectedIds.has(tc.id) && "bg-primary/5"
              )}
            >
              <td className="px-4 py-3">
                <Checkbox 
                  checked={selectedIds.has(tc.id)}
                  onCheckedChange={(checked) => onSelectRow(tc.id, !!checked)}
                />
              </td>
              <td className="px-4 py-3">
                <Link 
                  to={`/releases/test-cases/${tc.id}`}
                  className="text-sm font-mono text-primary font-medium hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {tc.id}
                </Link>
              </td>
              <td className="px-4 py-3 max-w-xs">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-sm text-foreground font-medium truncate block">
                      {tc.title}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-sm">
                    {tc.title}
                  </TooltipContent>
                </Tooltip>
              </td>
              <td className="px-4 py-3">
                <Badge variant="secondary" className="font-mono text-xs">
                  {tc.release}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <TypeBadge type={tc.type} />
              </td>
              <td className="px-4 py-3">
                <PriorityBadge priority={tc.priority} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={tc.status} />
              </td>
              <td className="px-4 py-3 text-center">
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <ListChecks className="w-3.5 h-3.5" />
                  {tc.steps}
                </span>
              </td>
              <td className="px-4 py-3">
                <LastRunBadge status={tc.lastRun} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className={cn("text-xs font-medium", avatarColors[tc.assignee.color])}>
                      {tc.assignee.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">{tc.assignee.name}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="text-sm text-muted-foreground">{tc.updated}</span>
              </td>
              <td className="px-4 py-3">
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
                    <DropdownMenuItem onClick={() => handleRowAction('execute', tc)}>
                      <Play className="w-4 h-4 mr-2" /> Execute
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleRowAction('move', tc)}>
                      <FolderInput className="w-4 h-4 mr-2" /> Move to Release
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleRowAction('reassign', tc)}>
                      <UserPlus className="w-4 h-4 mr-2" /> Reassign
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => handleRowAction('delete', tc)}>
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
