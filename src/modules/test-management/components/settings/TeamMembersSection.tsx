/**
 * Team Members Section
 */

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MoreHorizontal, Mail, UserMinus, RefreshCw, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { ProjectMember, MemberRole } from '../../types/settings';

interface TeamMembersSectionProps {
  members: ProjectMember[];
  onUpdateMember: (memberId: string, role: MemberRole) => void;
  onRemoveMember: (memberId: string) => void;
  onResendInvite: (memberId: string) => void;
  isLoading?: boolean;
}

const roleColors: Record<MemberRole, string> = {
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  lead: 'bg-primary/10 text-primary',
  member: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  viewer: 'bg-muted text-muted-foreground',
};

const roleIcons: Record<MemberRole, string> = {
  admin: '👑',
  lead: '⭐',
  member: '👤',
  viewer: '👁',
};

export function TeamMembersSection({
  members,
  onUpdateMember,
  onRemoveMember,
  onResendInvite,
  isLoading,
}: TeamMembersSectionProps) {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <div className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 rounded-full bg-teal-500 shadow-[0_0_0_2px_hsl(var(--teal-100))]" />
            <span className="text-muted-foreground">Active</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">Pending</span>
          </div>
        );
      case 'inactive':
        return (
          <div className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 rounded-full bg-muted-foreground" />
            <span className="text-muted-foreground">Inactive</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <section className="bg-background border border-border rounded-xl">
      <div className="flex items-center justify-between px-6 py-5 border-b border-border">
        <div>
          <h2 className="text-base font-semibold text-foreground">Project Members</h2>
          <p className="text-sm text-muted-foreground">
            {members.length} member{members.length !== 1 ? 's' : ''} in this project
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export List
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Member</TableHead>
            <TableHead className="font-semibold">Role</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Last Active</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                No team members yet. Invite someone to get started.
              </TableCell>
            </TableRow>
          ) : (
            members.map((member) => (
              <TableRow key={member.id} className="hover:bg-muted/30">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={member.profile?.avatar_url || ''} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {getInitials(member.profile?.full_name || null, member.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">
                        {member.profile?.full_name || member.email || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.profile?.email || member.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={cn('gap-1', roleColors[member.role])}>
                    <span>{roleIcons[member.role]}</span>
                    <span className="capitalize">{member.role}</span>
                  </Badge>
                </TableCell>
                <TableCell>{getStatusBadge(member.status)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {member.last_active_at
                    ? formatDistanceToNow(new Date(member.last_active_at), { addSuffix: true })
                    : member.status === 'pending'
                    ? 'Never'
                    : '—'}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onUpdateMember(member.id, 'admin')}>
                        Set as Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUpdateMember(member.id, 'lead')}>
                        Set as Lead
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUpdateMember(member.id, 'member')}>
                        Set as Member
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUpdateMember(member.id, 'viewer')}>
                        Set as Viewer
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {member.status === 'pending' && (
                        <DropdownMenuItem onClick={() => onResendInvite(member.id)}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Resend Invitation
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onRemoveMember(member.id)}
                      >
                        <UserMinus className="h-4 w-4 mr-2" />
                        Remove Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </section>
  );
}
