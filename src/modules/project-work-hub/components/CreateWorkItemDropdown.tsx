import React from 'react';
import { Plus, ChevronDown, Zap, Bookmark, CheckSquare, Bug, AlertTriangle } from 'lucide-react';
import { WorkItemType } from '../types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CreateWorkItemDropdownProps {
  onSelect: (type: WorkItemType) => void;
}

export const CreateWorkItemDropdown: React.FC<CreateWorkItemDropdownProps> = ({ onSelect }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-1" />
          Create
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onSelect('FEATURE')} className="gap-2">
          <Zap className="h-4 w-4 text-green-500" />
          Create Feature
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelect('STORY')} className="gap-2">
          <Bookmark className="h-4 w-4 text-green-500" />
          Create Story
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelect('SUBTASK')} className="gap-2">
          <CheckSquare className="h-4 w-4 text-blue-500" />
          Create Subtask
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Log Issue</DropdownMenuLabel>
        
        <DropdownMenuItem onClick={() => onSelect('DEFECT')} className="gap-2">
          <Bug className="h-4 w-4 text-red-500" />
          Log Defect
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelect('INCIDENT')} className="gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Log Incident
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
