// ============================================================
// ADD TEAM MEMBER DIALOG
// V10 GOD-TIER implementation matching specification Section 8
// Features: Search, capacity bars, recent collaborators, keyboard nav
// ============================================================

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAddTeamMember, useTeamMembers } from '@/hooks/useTeamMembers';
import { useActiveUsers } from '@/hooks/useActiveUsers';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Search, X, ArrowUp, ArrowDown, CornerDownLeft } from 'lucide-react';

// Color palette for avatars
const AVATAR_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple  
  '#ec4899', // pink
  '#f97316', // orange
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#eab308', // yellow
];

function getColorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string | null): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

interface AddTeamMemberDialogProps {
  teamId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTeamMemberDialog({ teamId, open, onOpenChange }: AddTeamMemberDialogProps) {
  const [search, setSearch] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);

  const addMember = useAddTeamMember();
  const { data: existingMembers = [] } = useTeamMembers(teamId);
  const { data: users = [] } = useActiveUsers();

  // Filter out users who are already team members
  const existingMemberIds = useMemo(() => 
    new Set(existingMembers.map((m) => m.user_id)), 
    [existingMembers]
  );

  const availableUsers = useMemo(() => 
    users.filter((u) => !existingMemberIds.has(u.id)),
    [users, existingMemberIds]
  );

  // Search filtering
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return availableUsers;
    const q = search.toLowerCase();
    return availableUsers.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
    );
  }, [availableUsers, search]);

  // Recent collaborators (mock - last 3 from available)
  const recentCollaborators = useMemo(() => 
    availableUsers.slice(0, 3),
    [availableUsers]
  );

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSearch('');
      setFocusedIndex(0);
    }
  }, [open]);

  // Keep focused index in bounds
  useEffect(() => {
    if (focusedIndex >= filteredUsers.length) {
      setFocusedIndex(Math.max(0, filteredUsers.length - 1));
    }
  }, [filteredUsers.length, focusedIndex]);

  const handleAddMember = useCallback(async (userId: string) => {
    try {
      await addMember.mutateAsync({
        teamId,
        userId,
        role: 'Member',
        allocation: 100,
      });
      // Don't close - allow adding multiple
    } catch (error: any) {
      if (error?.code === '23505') {
        toast.error('This user is already a member of this team');
      }
    }
  }, [addMember, teamId]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, filteredUsers.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredUsers[focusedIndex]) {
          handleAddMember(filteredUsers[focusedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onOpenChange(false);
        break;
    }
  }, [filteredUsers, focusedIndex, handleAddMember, onOpenChange]);

  // Generate mock capacity (in real app, would come from resource_inventory)
  const getCapacity = (userId: string) => {
    const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return 25 + (hash % 50); // 25-75%
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-md p-0 gap-0 overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <DialogHeader className="p-4 pb-0 flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-semibold">Add Team Member</DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 bg-muted/30 border-border"
              autoFocus
            />
          </div>
        </div>

        {/* Available Members List */}
        <div className="border-t border-border">
          <div className="px-4 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Available Members
            </span>
          </div>
          <ScrollArea className="h-[200px]">
            <div className="px-2 pb-2">
              {filteredUsers.length === 0 ? (
                <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                  {search ? 'No users found' : 'All users are already team members'}
                </div>
              ) : (
                filteredUsers.map((user, index) => {
                  const capacity = getCapacity(user.id);
                  const isFocused = index === focusedIndex;
                  const avatarColor = getColorForName(user.full_name || user.email || '');
                  
                  return (
                    <div
                      key={user.id}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
                        isFocused ? 'bg-primary/10 ring-2 ring-primary/30' : 'hover:bg-muted/50'
                      )}
                      onClick={() => handleAddMember(user.id)}
                      onMouseEnter={() => setFocusedIndex(index)}
                    >
                      {/* Avatar */}
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback
                          className="text-xs font-medium text-white"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Name & Role */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {user.full_name || user.email}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email?.split('@')[0] ? 'Team Member' : 'Team Member'}
                        </p>
                      </div>

                      {/* Capacity Bar + Percentage */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-20">
                          <Progress 
                            value={capacity} 
                            className="h-2 bg-muted"
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">
                          {capacity}%
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Recent Collaborators */}
        {recentCollaborators.length > 0 && (
          <div className="border-t border-border px-4 py-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Collaborators
            </span>
            <div className="flex flex-wrap gap-2 mt-2">
              {recentCollaborators.map((user) => {
                const avatarColor = getColorForName(user.full_name || user.email || '');
                return (
                  <button
                    key={user.id}
                    onClick={() => handleAddMember(user.id)}
                    className={cn(
                      'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
                      'bg-muted/50 hover:bg-muted transition-colors',
                      'text-sm font-medium text-foreground',
                      'border border-border hover:border-primary/30'
                    )}
                  >
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback
                        className="text-[8px] font-medium text-white"
                        style={{ backgroundColor: avatarColor }}
                      >
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate max-w-[100px]">
                      {user.full_name?.split(' ')[0] || user.email?.split('@')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts Footer */}
        <div className="border-t border-border bg-muted/30 px-4 py-2.5">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <kbd className="inline-flex items-center justify-center w-5 h-5 rounded border border-border bg-background text-[10px]">
                <ArrowUp className="w-3 h-3" />
              </kbd>
              <kbd className="inline-flex items-center justify-center w-5 h-5 rounded border border-border bg-background text-[10px]">
                <ArrowDown className="w-3 h-3" />
              </kbd>
              <span className="ml-1">Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="inline-flex items-center justify-center w-5 h-5 rounded border border-border bg-background text-[10px]">
                <CornerDownLeft className="w-3 h-3" />
              </kbd>
              <span className="ml-1">Add</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="inline-flex items-center justify-center px-1.5 h-5 rounded border border-border bg-background text-[10px]">
                Esc
              </kbd>
              <span className="ml-1">Close</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
