/**
 * Assignee Select - Inline assignee editor
 */

import React, { useState } from 'react';
import { ChevronDown, Search, UserMinus, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CATALYST_V5 } from '@/lib/catalyst-colors';
import type { TeamMemberOption } from '@/types/assignment-table.types';

interface AssigneeSelectProps {
  value: string | null;
  assigneeName: string | null;
  teamMembers: TeamMemberOption[];
  onChange: (value: string | null) => void;
}

export function AssigneeSelect({ value, assigneeName, teamMembers, onChange }: AssigneeSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredMembers = teamMembers.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (memberId: string | null) => {
    onChange(memberId);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 group text-left">
          {value && assigneeName ? (
            <>
              <Avatar className="h-6 w-6">
                <AvatarFallback 
                  className="text-[10px] text-white"
                  style={{ backgroundColor: CATALYST_V5.primary }}
                >
                  {assigneeName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm" style={{ color: CATALYST_V5.slate[700] }}>
                {assigneeName}
              </span>
            </>
          ) : (
            <span className="text-sm" style={{ color: CATALYST_V5.slate[400] }}>
              Unassigned
            </span>
          )}
          <ChevronDown 
            className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" 
            style={{ color: CATALYST_V5.slate[400] }}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0">
        {/* Search */}
        <div className="p-2 border-b">
          <div className="relative">
            <Search 
              className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5" 
              style={{ color: CATALYST_V5.slate[400] }}
            />
            <Input
              placeholder="Search team..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 text-xs pl-7"
            />
          </div>
        </div>
        
        {/* Options */}
        <div 
          className="max-h-48 overflow-y-auto py-1 overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
          onWheelCapture={(e) => e.stopPropagation()}
        >
          {/* Unassign option */}
          <button
            onClick={() => handleSelect(null)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-slate-50 transition-colors",
              !value && "bg-slate-50"
            )}
          >
            <UserMinus className="h-4 w-4" style={{ color: CATALYST_V5.slate[400] }} />
            <span style={{ color: CATALYST_V5.slate[500] }}>Unassign</span>
            {!value && (
              <Check className="h-4 w-4 ml-auto" style={{ color: CATALYST_V5.primary }} />
            )}
          </button>
          
          <div className="h-px bg-slate-100 my-1" />
          
          {/* Team members */}
          {filteredMembers.map(member => (
            <button
              key={member.id}
              onClick={() => handleSelect(member.id)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-slate-50 transition-colors",
                value === member.id && "bg-slate-50"
              )}
            >
              <Avatar className="h-5 w-5">
                {member.avatar ? (
                  <AvatarImage src={member.avatar} />
                ) : (
                  <AvatarFallback 
                    className="text-[9px] text-white"
                    style={{ backgroundColor: CATALYST_V5.primary }}
                  >
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                )}
              </Avatar>
              <span className="flex-1 text-left" style={{ color: CATALYST_V5.slate[700] }}>
                {member.name}
              </span>
              <span className="text-xs" style={{ color: CATALYST_V5.slate[400] }}>
                {member.workload}
              </span>
              {value === member.id && (
                <Check className="h-4 w-4" style={{ color: CATALYST_V5.primary }} />
              )}
            </button>
          ))}
          
          {filteredMembers.length === 0 && (
            <div className="px-2 py-4 text-center text-xs" style={{ color: CATALYST_V5.slate[400] }}>
              No team members found
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
