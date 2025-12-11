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
            "h-8 gap-1 text-[13px] hover:bg-[#F4F5F7] font-normal",
            value !== 'none' ? "text-[#0052CC] bg-[#E9F2FF]" : "text-[#42526E]"
          )}
        >
          Group
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 bg-white border border-[#DFE1E6] shadow-lg rounded-[3px] p-1">
        <div className="px-2 py-1 text-[11px] font-semibold text-[#6B778C] uppercase">Group by</div>
        {groupOptions.map((option) => (
          <DropdownMenuItem
            key={option.id}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 text-[13px] text-[#172B4D] cursor-pointer hover:bg-[#F4F5F7] rounded-[3px]",
              value === option.id && "bg-[#E9F2FF]"
            )}
            onClick={() => onChange(value === option.id ? 'none' : option.id)}
          >
            {option.icon}
            <span className="flex-1">{option.label}</span>
            {value === option.id && <Check className="h-4 w-4 text-[#0052CC]" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
