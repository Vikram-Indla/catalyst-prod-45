/**
 * EditableOwnerCell — Inline editable owner cell with dropdown picker
 * Used for Reporter and Business Owner fields
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
import { Tooltip } from '@/components/ads';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CatalystOwnerAvatar } from '@/components/ui/catalyst';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface EditableOwnerCellProps {
  name: string | null;
  requestId: string;
  fieldName: 'requestor' | 'business_owner';
  onSave: (requestId: string, fieldName: string, value: string | null) => Promise<void>;
  disabled?: boolean;
}

export function EditableOwnerCell({ name, requestId, fieldName, onSave, disabled = false }: EditableOwnerCellProps) {
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
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const filteredUsers = users.filter(u =>
    (u.full_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (u.email?.toLowerCase() || '').includes(search.toLowerCase())
  );

  const handleSelect = async (selectedName: string | null) => {
    if (disabled || isSaving) return;
    
    setIsSaving(true);
    try {
      await onSave(requestId, fieldName, selectedName);
      setOpen(false);
      setSearch('');
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

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
          <span className="text-sm text-muted-foreground italic">Unassigned</span>
        </div>
      );
    }
    
    return (
        <Tooltip content={<p className="font-medium">{name}</p>}>
          <div className="flex items-center gap-2 min-w-0">
            <CatalystOwnerAvatar name={name} size="sm" showTooltip={false} />
            <span className="text-sm text-foreground truncate max-w-[100px]">{name}</span>
          </div>
        </Tooltip>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1 -mx-2 -my-1 transition-colors cursor-pointer',
            'hover:bg-muted',
            open && 'bg-muted'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {name ? (
            <>
              <CatalystOwnerAvatar name={name} size="sm" showTooltip={false} />
              <span className="text-sm text-foreground truncate max-w-[100px]">{name}</span>
            </>
          ) : (
            <>
              <div className={cn(
                "w-7 h-7 rounded-full border-2 border-dashed flex items-center justify-center transition-colors",
                "border-muted-foreground/30 hover:border-brand-primary"
              )}>
                <Plus className="h-3 w-3 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Assign
              </span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 p-0 shadow-lg z-[100] bg-popover border-border"
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
          {name && (
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left hover:bg-muted"
              onClick={() => handleSelect(null)}
              disabled={isSaving}
            >
              <X className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Unassign</span>
            </button>
          )}
          
          {filteredUsers.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              No users found
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isSelected = name === user.full_name;
              
              return (
                <button
                  key={user.id}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left',
                    'hover:bg-muted',
                    isSelected && 'bg-muted'
                  )}
                  onClick={() => handleSelect(user.full_name)}
                  disabled={isSaving}
                >
                  <CatalystOwnerAvatar name={user.full_name || ''} size="sm" showTooltip={false} />
                  <div className="flex-1 min-w-0">
                    <div className="text-foreground truncate">{user.full_name || 'Unknown'}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 text-brand-primary flex-shrink-0" />
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