// ════════════════════════════════════════════════════════════════════════════
// ACCESS TAB - Manage space members
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { Plus, Search, MoreHorizontal, UserMinus } from 'lucide-react';
import { useSpaceMembers, useRemoveMember, useUpdateMember } from '@/hooks/spaces';
import { useSpaceStore } from '@/stores/spaceStore';
import { UserAvatar } from '../../shared/UserAvatar';
import { MemberRoleBadge } from '../../shared/MemberRoleBadge';
import { MEMBER_ROLE_CONFIG } from '@/lib/space-constants';
import type { MemberRole } from '@/types/spaces';

interface AccessTabProps {
  spaceId: string;
}

export function AccessTab({ spaceId }: AccessTabProps) {
  const [search, setSearch] = useState('');
  const { openAddMemberModal } = useSpaceStore();
  const { data: members = [], isLoading } = useSpaceMembers(spaceId);
  const removeMember = useRemoveMember();
  const updateMember = useUpdateMember();

  const filteredMembers = members.filter(
    (m) =>
      m.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.user_email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleRoleChange = (userId: string, role: MemberRole) => {
    updateMember.mutate({ spaceId, userId, input: { role } });
  };

  const handleRemove = (userId: string) => {
    if (confirm('Are you sure you want to remove this member?')) {
      removeMember.mutate({ spaceId, userId });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-md animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium text-foreground">Team Members</h3>
          <p className="text-sm text-muted-foreground">
            {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openAddMemberModal}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>

      {/* Members List */}
      <div className="space-y-2">
        {filteredMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {search ? 'No members found' : 'No members yet'}
          </div>
        ) : (
          filteredMembers.map((member) => (
            <div
              key={member.user_id}
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={member.user_name}
                  email={member.user_email}
                  avatarUrl={member.user_avatar_url}
                  size="md"
                />
                <div>
                  <div className="font-medium text-sm text-foreground">
                    {member.user_name || 'Unknown User'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {member.user_email}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={member.role}
                  onChange={(e) =>
                    handleRoleChange(member.user_id, e.target.value as MemberRole)
                  }
                  className="px-2 py-1 bg-background border border-border rounded text-xs cursor-pointer focus:border-primary focus:outline-none"
                >
                  {Object.entries(MEMBER_ROLE_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => handleRemove(member.user_id)}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                  title="Remove member"
                >
                  <UserMinus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
