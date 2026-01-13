// ============================================================
// WORKSTREAM MEMBERS SECTION
// Manage workstream members with add/remove functionality
// ============================================================

import { useState, useEffect } from 'react';
import { Plus, X, UserPlus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import type { PlannerTeam, PlannerUser } from '../types';

interface WorkstreamMembersSectionProps {
  workstream: PlannerTeam;
  users: PlannerUser[];
  onMembersChange: () => void;
}

interface WorkstreamMember {
  id: string;
  userId: string;
  name: string;
  initials: string;
  role?: string;
}

export function WorkstreamMembersSection({ workstream, users, onMembersChange }: WorkstreamMembersSectionProps) {
  const [members, setMembers] = useState<WorkstreamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

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
          userId: m.user_id,
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
  const availableUsers = users.filter(
    u => !members.some(m => m.userId === u.id)
  );

  const handleAddMember = async (userId: string) => {
    if (!userId) return;
    
    setIsAdding(true);
    try {
      const { error } = await supabase
        .from('team_members')
        .insert({
          team_id: workstream.id,
          user_id: userId,
        });

      if (error) throw error;

      const user = users.find(u => u.id === userId);
      if (user) {
        setMembers(prev => [...prev, {
          id: Date.now().toString(), // Temporary ID until refresh
          userId: user.id,
          name: user.name,
          initials: user.initials,
        }]);
      }

      catalystToast.success('Member added successfully');
      onMembersChange();
    } catch (err: any) {
      if (err?.code === '23505') {
        catalystToast.warning('This user is already a workstream member');
      } else {
        console.error('Error adding member:', err);
        catalystToast.error('Failed to add member');
      }
    } finally {
      setIsAdding(false);
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
        <Badge variant="secondary">{members.length} members</Badge>
      </div>

      {/* Add Member Dropdown */}
      <div className="mb-4">
        {availableUsers.length > 0 ? (
          <Select onValueChange={handleAddMember} value="" disabled={isAdding}>
            <SelectTrigger className="h-10 w-full">
              <div className="flex items-center gap-2 text-text-muted">
                <UserPlus className="w-4 h-4" />
                <span>Add workstream member...</span>
              </div>
            </SelectTrigger>
            <SelectContent 
              position="popper" 
              sideOffset={4}
              className="bg-popover z-[9999]"
              align="start"
            >
              {availableUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {user.initials}
                    </div>
                    <span>{user.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm text-text-muted">
            {members.length > 0 ? 'All users are already members of this workstream' : 'No users available to add'}
          </p>
        )}
      </div>

      {/* Members List */}
      {isLoading ? (
        <div className="text-sm text-text-muted py-4 text-center">Loading members...</div>
      ) : members.length === 0 ? (
        <div className="text-center py-8">
          <Users className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
          <p className="text-sm text-text-muted">No members yet</p>
          <p className="text-xs text-text-muted mt-1">Add workstream members using the dropdown above</p>
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
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                  style={{ backgroundColor: workstream.color }}
                >
                  {member.initials}
                </div>
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
    </div>
  );
}

// Alias for backward compatibility
export const TeamMembersSection = WorkstreamMembersSection;
