/**
 * Bulk Actions Toolbar
 * Floating toolbar for selected test cases
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Edit3,
  Trash2,
  X,
  MoreHorizontal,
  Copy,
  Tag,
  FolderInput,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BulkOperationType } from './BulkOperationsPanel';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onAction: (action: BulkOperationType | 'clear' | 'duplicate' | 'tag' | 'move') => void;
  className?: string;
}

export function BulkActionsToolbar({
  selectedCount,
  onAction,
  className = '',
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.2 }}
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 ${className}`}
      >
        <div className="flex items-center gap-2 px-4 py-2.5 bg-background border rounded-full shadow-lg">
          <Badge variant="secondary" className="font-mono">
            {selectedCount} selected
          </Badge>

          <div className="h-5 w-px bg-border mx-1" />

          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2"
            onClick={() => onAction('export')}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2"
            onClick={() => onAction('update')}
          >
            <Edit3 className="h-4 w-4" />
            Update
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2 text-destructive hover:text-destructive"
            onClick={() => onAction('delete')}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAction('duplicate')}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction('tag')}>
                <Tag className="h-4 w-4 mr-2" />
                Add Tags
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction('move')}>
                <FolderInput className="h-4 w-4 mr-2" />
                Move to Folder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAction('clear')}>
                <X className="h-4 w-4 mr-2" />
                Clear Selection
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-5 w-px bg-border mx-1" />

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onAction('clear')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
