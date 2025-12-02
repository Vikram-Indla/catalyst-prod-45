/**
 * CATALYST TESTS - Folder Action Menu
 * Dropdown menu with folder bulk operations
 */

import React, { useState } from 'react';
import { MoreVertical, FolderPlus, FolderOpen, ListPlus, CalendarPlus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { TestFolder } from '@/types/test-management';

interface FolderActionMenuProps {
  folder: TestFolder;
  onCreateSet: () => void;
  onAddToSet: () => void;
  onCreateCycle: () => void;
  onAddToCycle: () => void;
}

export const FolderActionMenu: React.FC<FolderActionMenuProps> = ({
  folder,
  onCreateSet,
  onAddToSet,
  onCreateCycle,
  onAddToCycle,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onCreateSet}>
          <FolderPlus className="mr-2 h-4 w-4" />
          Create Set
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAddToSet}>
          <ListPlus className="mr-2 h-4 w-4" />
          Add to Set
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCreateCycle}>
          <FolderOpen className="mr-2 h-4 w-4" />
          Create Cycle
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAddToCycle}>
          <CalendarPlus className="mr-2 h-4 w-4" />
          Add to Cycle
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
