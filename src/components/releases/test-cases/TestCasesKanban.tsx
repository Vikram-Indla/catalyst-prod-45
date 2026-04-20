/**
 * TestCasesKanban — Kanban board view for test cases by status
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MoreHorizontal, 
  Plus, 
  GripVertical,
  Eye,
  Play,
  Pencil,
  ListChecks,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Lozenge } from '@/components/ads';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TestCase } from '@/types/test-cases';
import { PriorityBadge, TypeBadge, LastRunBadge } from './badges';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TestCasesKanbanProps {
  testCases: TestCase[];
  onCardClick?: (testCase: TestCase) => void;
}

type KanbanStatus = 'draft' | 'ready' | 'approved' | 'deprecated';

const statusColumns: { key: KanbanStatus; label: string; color: string }[] = [
  { key: 'draft', label: 'Draft', color: 'bg-slate-500' },
  { key: 'ready', label: 'Ready', color: 'bg-blue-500' },
  { key: 'approved', label: 'Approved', color: 'bg-green-500' },
  { key: 'deprecated', label: 'Deprecated', color: 'bg-orange-500' },
];

const avatarColors: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  purple: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

interface KanbanCardProps {
  testCase: TestCase;
  onClick?: () => void;
}

function KanbanCard({ testCase, onClick }: KanbanCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.01 }}
      className="group bg-card border rounded-lg p-3 cursor-pointer hover:shadow-md transition-all"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-mono text-primary font-medium">
          {testCase.id}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick?.(); }}>
              <Eye className="w-4 h-4 mr-2" /> View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toast.info('Edit coming soon'); }}>
              <Pencil className="w-4 h-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toast.success(`Executing ${testCase.id}...`); }}>
              <Play className="w-4 h-4 mr-2" /> Execute
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Title */}
      <h4 className="text-sm font-medium text-foreground line-clamp-2 mb-3">
        {testCase.title}
      </h4>
      
      {/* Tags Row */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <TypeBadge type={testCase.type} size="sm" />
        <PriorityBadge priority={testCase.priority} size="sm" />
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <ListChecks className="w-3.5 h-3.5" />
                <span>{testCase.steps}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {testCase.steps} test steps
            </TooltipContent>
          </Tooltip>
          <LastRunBadge status={testCase.lastRun} size="sm" />
        </div>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Avatar className="w-6 h-6">
              <AvatarFallback className={cn("text-[10px] font-medium", avatarColors[testCase.assignee.color])}>
                {testCase.assignee.avatar}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {testCase.assignee.name}
          </TooltipContent>
        </Tooltip>
      </div>
    </motion.div>
  );
}

interface KanbanColumnProps {
  status: KanbanStatus;
  label: string;
  color: string;
  testCases: TestCase[];
  onCardClick?: (testCase: TestCase) => void;
}

function KanbanColumn({ status, label, color, testCases, onCardClick }: KanbanColumnProps) {
  return (
    <div className="flex flex-col min-w-[300px] max-w-[300px] bg-muted/30 rounded-xl">
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <div className={cn("w-2.5 h-2.5 rounded-full", color)} />
          <h3 className="font-semibold text-sm">{label}</h3>
          <Lozenge appearance="default">{testCases.length}</Lozenge>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Cards Container */}
      <ScrollArea className="flex-1 px-3 py-3">
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {testCases.map((tc) => (
              <KanbanCard 
                key={tc.id} 
                testCase={tc} 
                onClick={() => onCardClick?.(tc)}
              />
            ))}
          </AnimatePresence>
          
          {testCases.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
                <ListChecks className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No test cases</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export function TestCasesKanban({ testCases, onCardClick }: TestCasesKanbanProps) {
  // Group test cases by status
  const groupedTestCases = statusColumns.reduce((acc, col) => {
    acc[col.key] = testCases.filter(tc => tc.status === col.key);
    return acc;
  }, {} as Record<KanbanStatus, TestCase[]>);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-320px)]">
      {statusColumns.map((col) => (
        <KanbanColumn
          key={col.key}
          status={col.key}
          label={col.label}
          color={col.color}
          testCases={groupedTestCases[col.key] || []}
          onCardClick={onCardClick}
        />
      ))}
    </div>
  );
}
