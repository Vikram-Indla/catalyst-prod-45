/**
 * Module 3B-2: Bulk actions bar for multi-select operations
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ChevronsUp, 
  ChevronsDown, 
  Trash2, 
  X,
  ChevronDown,
  AlertTriangle,
  ArrowUp,
  Minus,
  ArrowDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PriorityLevel } from '../../types/queue-management';

interface BulkActionsBarProps {
  selectedCount: number;
  onMoveToTop: () => void;
  onMoveToBottom: () => void;
  onChangePriority: (priority: PriorityLevel) => void;
  onRemove: () => void;
  onClearSelection: () => void;
  className?: string;
}

const priorityOptions: { value: PriorityLevel; label: string; icon: React.ReactNode }[] = [
  { value: 'critical', label: 'Critical', icon: <AlertTriangle className="h-4 w-4" /> },
  { value: 'high', label: 'High', icon: <ArrowUp className="h-4 w-4" /> },
  { value: 'medium', label: 'Medium', icon: <Minus className="h-4 w-4" /> },
  { value: 'low', label: 'Low', icon: <ArrowDown className="h-4 w-4" /> },
];

export function BulkActionsBar({
  selectedCount,
  onMoveToTop,
  onMoveToBottom,
  onChangePriority,
  onRemove,
  onClearSelection,
  className,
}: BulkActionsBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={cn(
            'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
            'flex items-center gap-2 p-2 rounded-lg',
            'bg-card border border-border shadow-lg',
            className
          )}
        >
          {/* Selection Count */}
          <div className="px-3 py-1.5 rounded-md bg-primary/10 text-primary">
            <span className="font-semibold">{selectedCount}</span>
            <span className="ml-1 text-sm">selected</span>
          </div>

          <div className="w-px h-8 bg-border" />

          {/* Move to Top */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onMoveToTop}
            className="gap-2"
          >
            <ChevronsUp className="h-4 w-4" />
            <span className="hidden sm:inline">Move to Top</span>
          </Button>

          {/* Move to Bottom */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onMoveToBottom}
            className="gap-2"
          >
            <ChevronsDown className="h-4 w-4" />
            <span className="hidden sm:inline">Move to Bottom</span>
          </Button>

          <div className="w-px h-8 bg-border" />

          {/* Change Priority */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                Set Priority
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {priorityOptions.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => onChangePriority(opt.value)}
                  className="gap-2"
                >
                  {opt.icon}
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-8 bg-border" />

          {/* Remove */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Remove</span>
          </Button>

          <div className="w-px h-8 bg-border" />

          {/* Clear Selection */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearSelection}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
