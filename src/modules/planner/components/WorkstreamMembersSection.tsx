// ============================================================
// WORKSTREAM MEMBERS SECTION
// Enterprise-grade member management with multi-select and consistent avatars
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { X, Users, Check, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import type { PlannerTeam, PlannerUser, AVATAR_COLORS } from '../types';

// Consistent avatar colors that don't change
const STABLE_AVATAR_COLORS = [
  '#2563eb', '#0d9488', '#7c3aed', '#059669', '#d97706',
  '#dc2626', '#4f46e5', '#0891b2', '#be185d', '#65a30d',
];

// Generate consistent avatar color based on user ID
function getAvatarColor(userId: string): string {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return STABLE_AVATAR_COLORS[hash % STABLE_AVATAR_COLORS.length];
}

interface WorkstreamMembersSectionProps {
  workstream: PlannerTeam;
  users: PlannerUser[];
  onMembersChange: () => void;
}

interface WorkstreamMember {
  id: string;
  oderId: string;
  name: string;
  initials: string;
  role?: string;
}

export function WorkstreamMembersSection({ workstream, users, onMembersChange }: WorkstreamMembersSectionProps) {
  const [members, setMembers] = useState<WorkstreamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch current workstream members
  useEffect(() => {
    const fetchMembers = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('team_members')
          .select(`
            id,
            user_id,
            profiles:user_id (
              id,
              full_name
            )
          `)
          .eq('team_id', workstream.id);

        if (error) throw error;

        const fetchedMembers: WorkstreamMember[] = (data || []).map((m: any) => ({
          id: m.id,
          oderId: m.user_id,
          name: m.profiles?.full_name || 'Unknown User',
          initials: getInitials(m.profiles?.full_name || 'U'),
        }));

        setMembers(fetchedMembers);
      } catch (err) {
        console.error('Error fetching workstream members:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [workstream.id]);

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get users not already in the workstream
  const availableUsers = useMemo(() => {
    return users.filter(u => !members.some(m => m.oderId === u.id));
  }, [users, members]);

  // Filter available users by search
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return availableUsers;
    const query = searchQuery.toLowerCase();
    return availableUsers.filter(u => 
      u.name.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query)
    );
  }, [availableUsers, searchQuery]);

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAddMembers = async () => {
    if (selectedUserIds.length === 0) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('team_members')
        .insert(
          selectedUserIds.map(userId => ({
            team_id: workstream.id,
            user_id: userId,
          }))
        );

      if (error) throw error;

      // Add to local state
      const newMembers = selectedUserIds.map(userId => {
        const user = users.find(u => u.id === userId);
        return {
          id: `temp-${userId}`,
          oderId: userId,
          name: user?.name || 'Unknown',
          initials: user?.initials || 'U',
        };
      });
      setMembers(prev => [...prev, ...newMembers]);

      catalystToast.success(`${selectedUserIds.length} member(s) added successfully`);
      onMembersChange();
      setIsAddModalOpen(false);
      setSelectedUserIds([]);
      setSearchQuery('');
    } catch (err: any) {
      console.error('Error adding members:', err);
      catalystToast.error('Failed to add members');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      setMembers(prev => prev.filter(m => m.id !== memberId));
      catalystToast.success(`${memberName} removed from workstream`);
      onMembersChange();
    } catch (err) {
      console.error('Error removing member:', err);
      catalystToast.error('Failed to remove member');
    }
  };

  return (
    <div className="bg-surface-0 rounded-lg border border-border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-text-muted" />
          <h2 className="font-medium text-text-primary">Workstream Members</h2>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{members.length} members</Badge>
          {availableUsers.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAddModalOpen(true)}
              className="h-8"
            >
              Add Members
            </Button>
          )}
        </div>
      </div>

      {/* Members List */}
      {isLoading ? (
        <div className="text-sm text-text-muted py-4 text-center">Loading members...</div>
      ) : members.length === 0 ? (
        <div className="text-center py-8">
          <Users className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
          <p className="text-sm text-text-muted">No members yet</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Members
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 rounded-lg",
                "bg-surface-1 hover:bg-surface-2 transition-colors group"
              )}
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback 
                    className="text-xs text-white font-medium"
                    style={{ backgroundColor: getAvatarColor(member.oderId) }}
                  >
                    {member.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-text-primary">{member.name}</p>
                  {member.role && (
                    <p className="text-xs text-text-muted">{member.role}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleRemoveMember(member.id, member.name)}
                className="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                title="Remove member"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Members Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={(val) => {
        setIsAddModalOpen(val);
        if (!val) {
          setSelectedUserIds([]);
          setSearchQuery('');
        }
      }}>
        <DialogContent className="sm:max-w-[500px] max-h-[70vh] flex flex-col bg-background p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle className="text-lg font-semibold">Add Members</DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search */}
            <div className="px-6 py-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search members..."
                  className="pl-10 h-9"
                />
              </div>
              {selectedUserIds.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedUserIds.length} member(s) selected
                </p>
              )}
            </div>

            {/* User List */}
            <ScrollArea className="flex-1 px-6">
              <div className="py-2 space-y-1">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      {availableUsers.length === 0 
                        ? 'All users are already members' 
                        : 'No members found'
                      }
                    </p>
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelected = selectedUserIds.includes(user.id);
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleToggleUser(user.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
                          isSelected
                            ? "bg-blue-50 border border-blue-200"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0",
                          isSelected
                            ? "bg-blue-600 border-blue-600"
                            : "border-gray-300"
                        )}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback 
                            className="text-xs text-white font-medium"
                            style={{ backgroundColor: getAvatarColor(user.id) }}
                          >
                            {user.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {user.name}
                          </p>
                          {user.role && (
                            <p className="text-xs text-muted-foreground truncate">
                              {user.role}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-muted/20">
            <Button 
              variant="outline" 
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMembers}
              disabled={selectedUserIds.length === 0 || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? 'Adding...' : `Add ${selectedUserIds.length || ''} Member(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Alias for backward compatibility
export const TeamMembersSection = WorkstreamMembersSection;
