/**
 * Team Members Section - Matches Catalyst V5 reference design
 * Shows Project Members table + Pending Invitations + Role Permissions matrix
 */

import React, { useState, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Edit, MoreHorizontal, Trash2, X, Mail, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { ProjectMember, MemberRole, ProjectRole } from '../../types/settings';

interface TeamMembersSectionProps {
  members: ProjectMember[];
  roles?: ProjectRole[];
  onUpdateMember: (memberId: string, role: MemberRole) => void;
  onRemoveMember: (memberId: string) => void;
  onResendInvite: (memberId: string) => void;
  onCancelInvite?: (memberId: string) => void;
  isLoading?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

const roleStyles: Record<MemberRole, { bg: string; text: string; icon: string }> = {
  admin: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', icon: '👑' },
  lead: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', icon: '⭐' },
  member: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400', icon: '👤' },
  viewer: { bg: 'bg-muted', text: 'text-muted-foreground', icon: '👁' },
};

type OnlineStatus = 'online' | 'away' | 'offline';

const statusStyles: Record<OnlineStatus, { dot: string; label: string }> = {
  online: { dot: 'bg-teal-500 shadow-[0_0_0_2px_hsl(var(--teal-100))]', label: 'Online' },
  away: { dot: 'bg-amber-500', label: 'Away' },
  offline: { dot: 'bg-muted-foreground/40', label: 'Offline' },
};

// Helper to get random avatar color based on name
const getAvatarGradient = (name: string) => {
  const gradients = [
    'from-blue-500 to-blue-700',
    'from-teal-500 to-teal-700',
    'from-purple-500 to-purple-700',
    'from-orange-500 to-orange-700',
    'from-pink-500 to-pink-700',
  ];
  const index = name.charCodeAt(0) % gradients.length;
  return `bg-gradient-to-br ${gradients[index]}`;
};

export function TeamMembersSection({
  members,
  roles,
  onUpdateMember,
  onRemoveMember,
  onResendInvite,
  onCancelInvite,
  isLoading,
  searchQuery = '',
  onSearchChange,
}: TeamMembersSectionProps) {
  const [localSearch, setLocalSearch] = useState('');
  const search = searchQuery || localSearch;

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || '??';
  };

  const getOnlineStatus = (member: ProjectMember): OnlineStatus => {
    if (!member.last_active_at) return 'offline';
    const lastActive = new Date(member.last_active_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastActive.getTime()) / 1000 / 60;
    if (diffMinutes < 5) return 'online';
    if (diffMinutes < 30) return 'away';
    return 'offline';
  };

  const { activeMembers, pendingMembers } = useMemo(() => {
    const filtered = members.filter((m) => {
      const nameMatch = m.profile?.full_name?.toLowerCase().includes(search.toLowerCase());
      const emailMatch = (m.profile?.email || m.email || '').toLowerCase().includes(search.toLowerCase());
      return nameMatch || emailMatch || !search;
    });
    return {
      activeMembers: filtered.filter((m) => m.status === 'active'),
      pendingMembers: filtered.filter((m) => m.status === 'pending'),
    };
  }, [members, search]);

  const handleSearchChange = (value: string) => {
    if (onSearchChange) {
      onSearchChange(value);
    } else {
      setLocalSearch(value);
    }
  };

  const RoleBadge = ({ role }: { role: MemberRole }) => {
    const style = roleStyles[role];
    return (
      <span className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold',
        style.bg, style.text
      )}>
        <span>{style.icon}</span>
        <span className="capitalize">{role}</span>
      </span>
    );
  };

  const StatusIndicator = ({ status }: { status: OnlineStatus }) => {
    const style = statusStyles[status];
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className={cn('h-2 w-2 rounded-full', style.dot)} />
        <span className="text-muted-foreground">{style.label}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Project Members Section */}
      <section className="bg-background border border-border rounded-xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/50">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Project Members</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeMembers.length} member{activeMembers.length !== 1 ? 's' : ''} in Catalyst TM Project
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 shadow-sm">
            <Download className="h-3.5 w-3.5" />
            Export List
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Member</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Role</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Last Active</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No team members yet. Invite someone to get started.
                </TableCell>
              </TableRow>
            ) : (
              activeMembers.map((member) => {
                const onlineStatus = getOnlineStatus(member);
                const name = member.profile?.full_name || member.email || 'Unknown';
                const isAdmin = member.role === 'admin';

                return (
                  <TableRow key={member.id} className="hover:bg-muted/30">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={member.profile?.avatar_url || ''} />
                          <AvatarFallback className={cn(
                            'text-white text-xs font-semibold',
                            getAvatarGradient(name)
                          )}>
                            {getInitials(member.profile?.full_name || null, member.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-[13px] text-foreground">{name}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.profile?.email || member.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={member.role} />
                    </TableCell>
                    <TableCell>
                      <StatusIndicator status={onlineStatus} />
                    </TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">
                      {member.last_active_at
                        ? formatDistanceToNow(new Date(member.last_active_at), { addSuffix: false })
                            .replace('about ', '')
                            .replace('less than a minute', 'Just now')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 border-border/50"
                          title="Edit"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        {isAdmin ? (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 border-border/50"
                            title="More"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                            title="Remove"
                            onClick={() => onRemoveMember(member.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </section>

      {/* Pending Invitations Section */}
      {pendingMembers.length > 0 && (
        <section className="bg-background border border-border rounded-xl">
          <div className="flex items-center justify-between px-6 py-5 border-b border-border/50">
            <div>
              <h2 className="text-[15px] font-semibold text-foreground">Pending Invitations</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {pendingMembers.length} invitation{pendingMembers.length !== 1 ? 's' : ''} awaiting response
              </p>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Role</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Invited By</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sent</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingMembers.map((member) => (
                <TableRow key={member.id} className="hover:bg-muted/30">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-[13px] text-foreground">{member.email}</p>
                        <p className="text-xs text-muted-foreground">Pending acceptance</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={member.role} />
                  </TableCell>
                  <TableCell className="text-[13px] text-muted-foreground">
                    {member.invited_by_profile?.full_name || 'Unknown'}
                  </TableCell>
                  <TableCell className="text-[13px] text-muted-foreground">
                    {member.invited_at
                      ? formatDistanceToNow(new Date(member.invited_at), { addSuffix: true })
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs px-3"
                        onClick={() => onResendInvite(member.id)}
                      >
                        Resend
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                        title="Cancel Invitation"
                        onClick={() => onCancelInvite ? onCancelInvite(member.id) : onRemoveMember(member.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      {/* Role Permissions Matrix */}
      <section className="bg-background border border-border rounded-xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/50">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Role Permissions</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Define what each role can do in this project
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 shadow-sm">
            Create Role
          </Button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-[1fr_80px_80px_80px_80px] gap-0">
            {/* Header */}
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-3 border-b border-border">
              Permission
            </div>
            {(['Admin', 'Lead', 'Member', 'Viewer'] as const).map((role) => (
              <div
                key={role}
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-3 border-b border-border text-center"
              >
                {role}
              </div>
            ))}

            {/* Permission rows */}
            {[
              { permission: 'Manage project settings', admin: true, lead: false, member: false, viewer: false },
              { permission: 'Invite team members', admin: true, lead: true, member: false, viewer: false },
              { permission: 'Create test cases', admin: true, lead: true, member: true, viewer: false },
              { permission: 'Execute test runs', admin: true, lead: true, member: true, viewer: false },
              { permission: 'Log defects', admin: true, lead: true, member: true, viewer: false },
              { permission: 'View reports', admin: true, lead: true, member: true, viewer: true },
              { permission: 'Export data', admin: true, lead: true, member: 'partial', viewer: false },
              { permission: 'Delete content', admin: true, lead: 'partial', member: false, viewer: false },
            ].map((row, i) => (
              <React.Fragment key={row.permission}>
                <div className="py-3 text-[13px] text-foreground border-b border-border/50">
                  {row.permission}
                </div>
                {(['admin', 'lead', 'member', 'viewer'] as const).map((roleKey) => {
                  const value = row[roleKey];
                  return (
                    <div key={roleKey} className="py-3 text-center border-b border-border/50">
                      {value === true ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 text-sm font-semibold">
                          ✓
                        </span>
                      ) : value === 'partial' ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-sm font-semibold">
                          ◐
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-sm">
                          –
                        </span>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
