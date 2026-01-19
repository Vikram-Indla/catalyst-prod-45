/**
 * InlineUserPicker — Inline user selection for Assignee column
 * 
 * Features:
 * - Click to edit activation
 * - Searchable user dropdown
 * - Optimistic update with rollback on error
 * - Keyboard navigation (Esc to cancel)
 * - Real-time sync with admin/users (APPROVED status only)
 */

import { useState, useRef, useEffect } from 'react';
import { Search, X, User } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useActiveUsers } from '@/hooks/useActiveUsers';
import type { IncidentUserProfile } from '@/types/incident';

interface InlineUserPickerProps {
  value: IncidentUserProfile | null | undefined;
  onSave: (userId: string | null) => Promise<void>;
  disabled?: boolean;
  textSize?: string;
}

export function InlineUserPicker({
  value,
  onSave,
  disabled = false,
  textSize = 'text-[12px]',
}: InlineUserPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch APPROVED users with real-time sync
  const { data: activeUsers = [] } = useActiveUsers();
  
  // Transform to IncidentUserProfile format
  const users: IncidentUserProfile[] = activeUsers.map(u => ({
    id: u.id,
    full_name: u.full_name || u.email || 'Unknown',
    email: u.email || '',
    avatar_initials: (u.full_name || u.email || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
    incident_role: 'user' as const,
    has_veto_power: false,
  }));

  // Focus search input when popover opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Filter users by search
  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = async (userId: string | null) => {
    if (disabled || isSaving) return;
    
    setIsSaving(true);
    try {
      await onSave(userId);
      setOpen(false);
      setSearch('');
    } catch {
      // Error handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  if (disabled) {
    return (
      <div className={cn(textSize, 'flex items-center justify-center gap-2 text-muted-foreground cursor-not-allowed')}>
        {value ? (
          <>
<div className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 bg-primary">
              <span className="text-[10px] font-medium text-primary-foreground">
                {value.avatar_initials || value.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
              </span>
            </div>
            <span className="truncate">{value.full_name}</span>
          </>
        ) : (
          <span className="italic text-muted-foreground">Unassigned</span>
        )}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'w-full flex items-center justify-center gap-2 rounded px-1 py-0.5 hover:bg-muted/80 transition-colors cursor-pointer',
            textSize
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {value ? (
            <>
              <div className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 bg-primary">
                <span className="text-[10px] font-medium text-primary-foreground">
                  {value.avatar_initials || value.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                </span>
              </div>
              <span className="text-foreground truncate">{value.full_name}</span>
            </>
          ) : (
            <span className="text-muted-foreground italic">Unassigned</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 p-0 bg-[var(--surface-1)] border-[var(--border-color)]"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-2 border-b border-[var(--divider)]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-3)]" />
            <Input
              ref={inputRef}
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setOpen(false);
                  setSearch('');
                }
              }}
            />
          </div>
        </div>
        <div 
          className="max-h-60 overflow-y-auto py-1 overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
          onWheelCapture={(e) => e.stopPropagation()}
        >
          {/* Unassign option */}
          {value && (
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--surface-2)] transition-colors text-left"
              onClick={() => handleSelect(null)}
              disabled={isSaving}
            >
              <X className="h-4 w-4 text-[var(--text-3)]" />
              <span className="text-[var(--text-2)]">Unassign</span>
            </button>
          )}
          
          {/* User list */}
          {filteredUsers.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-[var(--text-3)]">
              No users found
            </div>
          ) : (
            filteredUsers.map((user) => (
              <button
                key={user.id}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--surface-2)] transition-colors text-left',
                  value?.id === user.id && 'bg-[var(--surface-2)]'
                )}
                onClick={() => handleSelect(user.id)}
                disabled={isSaving}
              >
                <div className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 bg-primary">
                  <span className="text-[10px] font-medium text-primary-foreground">
                    {user.avatar_initials || user.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-foreground truncate">{user.full_name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
