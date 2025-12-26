import React from 'react';
import { ChevronDown, Check, LayoutList, User, Flag, Hash } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type GroupByOption = 'none' | 'status' | 'assignee' | 'priority' | 'storyPoints';

interface GroupByMenuProps {
  value: GroupByOption;
  onChange: (value: GroupByOption) => void;
}

const groupOptions: { id: GroupByOption; label: string; icon: React.ReactNode }[] = [
  { id: 'status', label: 'Status', icon: <LayoutList className="h-4 w-4" /> },
  { id: 'assignee', label: 'Assignee', icon: <User className="h-4 w-4" /> },
  { id: 'priority', label: 'Priority', icon: <Flag className="h-4 w-4" /> },
  { id: 'storyPoints', label: 'Story Points', icon: <Hash className="h-4 w-4" /> },
];

export function GroupByMenu({ value, onChange }: GroupByMenuProps) {
  const selectedOption = groupOptions.find(o => o.id === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "h-8 gap-1 text-[13px] hover:bg-muted font-normal",
            value !== 'none' ? "text-[#2563eb] bg-[#2563eb]/10 dark:text-[#60a5fa] dark:bg-[#3b82f6]/10" : "text-muted-foreground"
          )}
        >
          Group
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 bg-card border border-border shadow-lg rounded-md p-1">
        <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase">Group by</div>
        {groupOptions.map((option) => (
          <DropdownMenuItem
            key={option.id}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 text-[13px] text-foreground cursor-pointer hover:bg-muted rounded-md",
              value === option.id && "bg-[#2563eb]/10 dark:bg-[#3b82f6]/10"
            )}
            onClick={() => onChange(value === option.id ? 'none' : option.id)}
          >
            {option.icon}
            <span className="flex-1">{option.label}</span>
            {value === option.id && <Check className="h-4 w-4 text-[#2563eb] dark:text-[#60a5fa]" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
