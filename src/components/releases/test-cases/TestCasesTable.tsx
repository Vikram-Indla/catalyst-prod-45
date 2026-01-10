/**
 * TestCasesTable — Data table for list view of test cases
 */

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  Pencil,
  Copy,
  Play,
  FolderInput,
  UserPlus,
  Trash2,
  AlertTriangle,
  ArrowUp,
  Minus,
  ArrowDown,
  CheckCircle2,
  XCircle,
  Circle,
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
import { cn } from '@/lib/utils';

interface TestCasesTableProps {
  testCases: TestCase[];
  selectedIds: Set<string>;
  onSelectAll: (checked: boolean) => void;
  onSelectRow: (id: string, checked: boolean) => void;
  allSelected: boolean;
}

// Type badge variants
const typeStyles: Record<string, string> = {
  functional: 'bg-[#dbeafe] text-[#2563eb] border-[#93c5fd]',
  regression: 'bg-[#ede9fe] text-[#7c3aed] border-[#c4b5fd]',
  smoke: 'bg-[#ffedd5] text-[#c2410c] border-[#fdba74]',
  integration: 'bg-[#ccfbf1] text-[#0d9488] border-[#5eead4]',
  e2e: 'bg-[#e0e7ff] text-[#4338ca] border-[#a5b4fc]',
};

// Status badge variants
const statusVariants: Record<string, 'draft' | 'ready' | 'approved' | 'deprecated'> = {
  draft: 'draft',
  ready: 'ready',
  approved: 'approved',
  deprecated: 'deprecated',
};

// Avatar colors
const avatarColors: Record<string, string> = {
  blue: 'bg-[#dbeafe] text-[#2563eb]',
  green: 'bg-[#d1fae5] text-[#059669]',
  purple: 'bg-[#ede9fe] text-[#7c3aed]',
  orange: 'bg-[#ffedd5] text-[#c2410c]',
  teal: 'bg-[#ccfbf1] text-[#0d9488]',
  red: 'bg-[#fee2e2] text-[#dc2626]',
};

function PriorityIcon({ priority }: { priority: TestCase['priority'] }) {
  switch (priority) {
    case 'critical':
      return (
        <span className="flex items-center gap-1 text-[#dc2626]">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Critical</span>
        </span>
      );
    case 'high':
      return (
        <span className="flex items-center gap-1 text-[#ea580c]">
          <ArrowUp className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">High</span>
        </span>
      );
    case 'medium':
      return (
        <span className="flex items-center gap-1 text-[#ca8a04]">
          <Minus className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Medium</span>
        </span>
      );
    case 'low':
      return (
        <span className="flex items-center gap-1 text-muted-foreground">
          <ArrowDown className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Low</span>
        </span>
      );
  }
}

function LastRunBadge({ status }: { status: TestCase['lastRun'] }) {
  switch (status) {
    case 'passed':
      return (
        <Badge variant="passed" className="gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Passed
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="failed" className="gap-1">
          <XCircle className="w-3 h-3" />
          Failed
        </Badge>
      );
    case 'not_run':
      return (
        <Badge variant="not-run" className="gap-1">
          <Circle className="w-3 h-3" />
          Not Run
        </Badge>
      );
  }
}

export function TestCasesTable({ 
  testCases, 
  selectedIds, 
  onSelectAll, 
  onSelectRow,
  allSelected 
}: TestCasesTableProps) {
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
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 cursor-pointer hover:text-foreground">
                ID
                <ArrowUpDown className="w-3 h-3" />
              </span>
            </th>
            <th className="px-4 py-3 text-left">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Title
              </span>
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
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Priority
              </span>
            </th>
            <th className="px-4 py-3 text-left">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Status
              </span>
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
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Updated
              </span>
            </th>
            <th className="w-12 px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {testCases.map((tc, index) => (
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
                <span className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                  typeStyles[tc.type]
                )}>
                  {tc.type.charAt(0).toUpperCase() + tc.type.slice(1)}
                </span>
              </td>
              <td className="px-4 py-3">
                <PriorityIcon priority={tc.priority} />
              </td>
              <td className="px-4 py-3">
                <Badge variant={statusVariants[tc.status]}>
                  {tc.status.charAt(0).toUpperCase() + tc.status.slice(1)}
                </Badge>
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
                    <DropdownMenuItem>
                      <Eye className="w-4 h-4 mr-2" /> View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Pencil className="w-4 h-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Copy className="w-4 h-4 mr-2" /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Play className="w-4 h-4 mr-2" /> Execute
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <FolderInput className="w-4 h-4 mr-2" /> Move to Release
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <UserPlus className="w-4 h-4 mr-2" /> Reassign
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
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
