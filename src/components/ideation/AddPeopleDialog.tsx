import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, X, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAddGroupMember, useIdeaGroupMembers, useRemoveGroupMember } from '@/hooks/useIdeaGroupMembers';
import { Badge } from '@/components/ui/badge';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface AddPeopleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  role: 'admin' | 'contributor';
  title: string;
}

export function AddPeopleDialog({
  open,
  onOpenChange,
  groupId,
  role,
  title,
}: AddPeopleDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());

  const addMember = useAddGroupMember();
  const removeMember = useRemoveGroupMember();
  const { data: existingMembers } = useIdeaGroupMembers(groupId);

  // Fetch all users/profiles
  const { data: profiles, isLoading } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .order('full_name');

      if (error) throw error;
      return data as Profile[];
    },
  });

  // Get existing member IDs for this role
  const existingMemberIds = new Set(
    existingMembers
      ?.filter(m => m.role === role)
      .map(m => m.user_id) || []
  );

  // Initialize selected users from existing members when dialog opens
  useEffect(() => {
    if (open && existingMembers) {
      const memberIds = existingMembers
        .filter(m => m.role === role)
        .map(m => m.user_id);
      setSelectedUserIds(new Set(memberIds));
    }
  }, [open, existingMembers, role]);

  // Filter profiles by search
  const filteredProfiles = profiles?.filter(profile => {
    const searchLower = search.toLowerCase();
    const name = profile.full_name?.toLowerCase() || '';
    const email = profile.email?.toLowerCase() || '';
    return name.includes(searchLower) || email.includes(searchLower);
  }) || [];

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const handleSave = async () => {
    // Find users to add (in selectedUserIds but not in existing)
    const toAdd = Array.from(selectedUserIds).filter(id => !existingMemberIds.has(id));
    
    // Find users to remove (in existing but not in selectedUserIds)
    const toRemove = existingMembers
      ?.filter(m => m.role === role && !selectedUserIds.has(m.user_id))
      .map(m => m.id) || [];

    // Add new members
    for (const userId of toAdd) {
      await addMember.mutateAsync({ groupId, userId, role });
    }

    // Remove deselected members
    for (const memberId of toRemove) {
      await removeMember.mutateAsync({ memberId, groupId });
    }

    onOpenChange(false);
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearch('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Selected count */}
        <div className="text-sm text-muted-foreground">
          {selectedUserIds.size} selected
        </div>

        {/* User list */}
        <ScrollArea className="h-[300px] border rounded-md">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Loading users...
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredProfiles.map(profile => {
                const isSelected = selectedUserIds.has(profile.id);
                const isExisting = existingMemberIds.has(profile.id);
                
                return (
                  <div
                    key={profile.id}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${
                      isSelected ? 'bg-muted' : ''
                    }`}
                    onClick={() => toggleUser(profile.id)}
                  >
                    <Checkbox checked={isSelected} />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="bg-brand-gold/20 text-brand-gold text-xs">
                        {getInitials(profile.full_name, profile.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {profile.full_name || 'Unnamed User'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {profile.email}
                      </p>
                    </div>
                    {isExisting && (
                      <Badge variant="secondary" className="text-xs">
                        Current
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={addMember.isPending || removeMember.isPending}
            className="bg-brand-gold hover:bg-brand-gold-hover text-white"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
