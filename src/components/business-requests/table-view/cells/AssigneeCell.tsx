/**
 * AssigneeCell — Inline editable assignee cell with dropdown picker
 * Single-click to open dropdown, search and select a user
 * Dark mode support (9.5 grade compliance)
 */

import { useState, useRef, useEffect } from 'react';
import { Plus, Search, X, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface AssigneeCellProps {
  name: string | null;
  requestId: string;
  onSave: (requestId: string, assignee: string | null) => Promise<void>;
  disabled?: boolean;
}

export function AssigneeCell({ name, requestId, onSave, disabled = false }: AssigneeCellProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch available users - only active (approved) users
  const { data: users = [] } = useQuery({
    queryKey: ['profiles-for-assignment-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('approval_status', 'APPROVED')
        .order('full_name');
      if (error) throw error;
      return (data || []) as Profile[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Focus search input when popover opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Filter users by search
  const filteredUsers = users.filter(u =>
    (u.full_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (u.email?.toLowerCase() || '').includes(search.toLowerCase())
  );

  const handleSelect = async (selectedName: string | null) => {
    if (disabled || isSaving) return;
    
    setIsSaving(true);
    try {
      await onSave(requestId, selectedName);
      setOpen(false);
      setSearch('');
    } catch (error) {
      console.error('Failed to save assignee:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const displayInitials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '';

  // Render unassigned state for disabled
  if (disabled) {
    if (!name) {
      return (
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-7 h-7 rounded-full border-2 border-dashed flex items-center justify-center",
            "border-gray-300 dark:border-gray-500"
          )}>
            <Plus className="h-3 w-3 text-gray-400 dark:text-gray-500" />
          </div>
          <span className="text-sm text-gray-400 dark:text-gray-500 italic">Unassigned</span>
        </div>
      );
    }
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 min-w-0">
              <div className={cn(
                "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
                "bg-[#2563eb]/20 text-[#1d4ed8]",
                "dark:bg-[#2563eb]/30 dark:text-[#60a5fa]"
              )}>
                <span className="text-[10px] font-semibold">{displayInitials}</span>
              </div>
              <span className="text-sm text-gray-900 dark:text-gray-100 truncate max-w-[100px]">{name}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="font-medium">{name}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1 -mx-2 -my-1 transition-colors cursor-pointer',
            'hover:bg-gray-100 dark:hover:bg-gray-700/50',
            open && 'bg-gray-100 dark:bg-gray-700/50'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {name ? (
            <>
              <div className={cn(
                "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
                "bg-[#2563eb]/20 text-[#1d4ed8]",
                "dark:bg-[#2563eb]/30 dark:text-[#60a5fa]"
              )}>
                <span className="text-[10px] font-semibold">{displayInitials}</span>
              </div>
              <span className="text-sm text-gray-900 dark:text-gray-100 truncate max-w-[100px]">{name}</span>
            </>
          ) : (
            <>
              <div className={cn(
                "w-7 h-7 rounded-full border-2 border-dashed flex items-center justify-center transition-colors",
                "border-gray-300 hover:border-[#2563eb]",
                "dark:border-gray-500 dark:hover:border-[#60a5fa]"
              )}>
                <Plus className="h-3 w-3 text-gray-400 dark:text-gray-500" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                Assign
              </span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className={cn(
          "w-64 p-0 shadow-lg z-50",
          "bg-white border-gray-200",
          "dark:bg-[#262626] dark:border-[#404040]"
        )}
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-2 border-b border-gray-200 dark:border-[#404040]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
            <Input
              ref={inputRef}
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                "pl-8 h-8 text-sm",
                "bg-white dark:bg-[#171717]",
                "border-gray-200 dark:border-[#404040]",
                "text-gray-900 dark:text-gray-100",
                "placeholder:text-gray-400 dark:placeholder:text-gray-500"
              )}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Escape') {
                  setOpen(false);
                  setSearch('');
                }
              }}
            />
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto py-1">
          {/* Unassign option */}
          {name && (
            <button
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left",
                "hover:bg-gray-100 dark:hover:bg-gray-700/50"
              )}
              onClick={() => handleSelect(null)}
              disabled={isSaving}
            >
              <X className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <span className="text-gray-500 dark:text-gray-400">Unassign</span>
            </button>
          )}
          
          {/* User list */}
          {filteredUsers.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No users found
            </div>
          ) : (
            filteredUsers.map((user) => {
              const initials = user.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
              const isSelected = name === user.full_name;
              
              return (
                <button
                  key={user.id}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left',
                    'hover:bg-gray-100 dark:hover:bg-gray-700/50',
                    isSelected && 'bg-gray-100 dark:bg-gray-700/50'
                  )}
                  onClick={() => handleSelect(user.full_name)}
                  disabled={isSaving}
                >
                  <div className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0",
                    "bg-[#2563eb]/20 text-[#1d4ed8]",
                    "dark:bg-[#2563eb]/30 dark:text-[#60a5fa]"
                  )}>
                    <span className="text-[10px] font-medium">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-900 dark:text-gray-100 truncate">{user.full_name || 'Unknown'}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{user.email}</div>
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 text-[#2563eb] dark:text-[#60a5fa] flex-shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
