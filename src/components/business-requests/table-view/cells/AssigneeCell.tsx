/**
 * AssigneeCell — Inline editable assignee cell with dropdown picker
 * Single-click to open dropdown, search and select a user
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

  // Fetch available users
  const { data: users = [] } = useQuery({
    queryKey: ['profiles-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
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

  if (disabled) {
    if (!name) {
      return (
        <div className="flex items-center gap-2">
          <div className="w-[30px] h-[30px] rounded-full border-2 border-dashed border-[var(--industry-border-default)] flex items-center justify-center">
            <Plus className="h-3 w-3 text-[var(--industry-text-disabled)]" />
          </div>
          <span className="text-[13px] text-[var(--industry-text-disabled)]">Assign</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2">
        <div className="w-[30px] h-[30px] rounded-full bg-[hsl(var(--secondary-olive))]/12 flex items-center justify-center">
          <span className="text-[10px] font-semibold text-[hsl(var(--secondary-olive))]">
            {displayInitials}
          </span>
        </div>
        <span className="text-[13px] font-medium text-foreground truncate max-w-[100px]">{name}</span>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1 -mx-2 -my-1 hover:bg-muted/80 transition-colors cursor-pointer',
            open && 'bg-muted'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {name ? (
            <>
              <div className="w-[30px] h-[30px] rounded-full bg-[hsl(var(--secondary-olive))]/12 flex items-center justify-center">
                <span className="text-[10px] font-semibold text-[hsl(var(--secondary-olive))]">
                  {displayInitials}
                </span>
              </div>
              <span className="text-[13px] font-medium text-foreground truncate max-w-[100px]">{name}</span>
            </>
          ) : (
            <>
              <div className="w-[30px] h-[30px] rounded-full border-2 border-dashed border-[var(--industry-border-default)] hover:border-[var(--brand-gold)] flex items-center justify-center transition-colors">
                <Plus className="h-3 w-3 text-[var(--industry-text-disabled)]" />
              </div>
              <span className="text-[13px] text-[var(--industry-text-muted)] hover:text-foreground transition-colors">Assign</span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 p-0 bg-popover border border-border shadow-lg z-50"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm bg-background"
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
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
              onClick={() => handleSelect(null)}
              disabled={isSaving}
            >
              <X className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Unassign</span>
            </button>
          )}
          
          {/* User list */}
          {filteredUsers.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
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
                    'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left',
                    isSelected && 'bg-muted'
                  )}
                  onClick={() => handleSelect(user.full_name)}
                  disabled={isSaving}
                >
                  <div className="h-6 w-6 rounded-full bg-[hsl(var(--secondary-olive))]/12 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-medium text-[hsl(var(--secondary-olive))]">
                      {initials}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-foreground truncate">{user.full_name || 'Unknown'}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 text-[var(--brand-gold)] flex-shrink-0" />
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
