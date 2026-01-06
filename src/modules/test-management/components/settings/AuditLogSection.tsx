/**
 * Audit Log Section
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Download, Plus, Pencil, Trash2, LogIn, UserPlus, Link, Archive } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { AuditLogEntry, AuditAction } from '../../types/settings';

interface AuditLogSectionProps {
  entries: AuditLogEntry[];
  onFilterChange: (filters: { action?: AuditAction; entity_type?: string }) => void;
  isLoading?: boolean;
}

const actionIcons: Record<AuditAction, React.ReactNode> = {
  create: <Plus className="h-4 w-4" />,
  update: <Pencil className="h-4 w-4" />,
  delete: <Trash2 className="h-4 w-4" />,
  login: <LogIn className="h-4 w-4" />,
  logout: <LogIn className="h-4 w-4 rotate-180" />,
  invite: <UserPlus className="h-4 w-4" />,
  join: <UserPlus className="h-4 w-4" />,
  leave: <UserPlus className="h-4 w-4" />,
  archive: <Archive className="h-4 w-4" />,
  restore: <Archive className="h-4 w-4" />,
  export: <Download className="h-4 w-4" />,
  import: <Download className="h-4 w-4 rotate-180" />,
  connect: <Link className="h-4 w-4" />,
  disconnect: <Link className="h-4 w-4" />,
};

const actionColors: Record<AuditAction, string> = {
  create: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  update: 'bg-primary/10 text-primary',
  delete: 'bg-destructive/10 text-destructive',
  login: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  logout: 'bg-muted text-muted-foreground',
  invite: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  join: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  leave: 'bg-muted text-muted-foreground',
  archive: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  restore: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  export: 'bg-primary/10 text-primary',
  import: 'bg-primary/10 text-primary',
  connect: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  disconnect: 'bg-muted text-muted-foreground',
};

export function AuditLogSection({ entries, onFilterChange, isLoading }: AuditLogSectionProps) {
  const [search, setSearch] = React.useState('');

  const getActionMessage = (entry: AuditLogEntry) => {
    const user = entry.user_name || entry.user_email || 'Someone';
    const entity = entry.entity_name || entry.entity_type;

    switch (entry.action) {
      case 'create':
        return (
          <>
            <strong>{user}</strong> created {entry.entity_type}{' '}
            <strong>{entity}</strong>
          </>
        );
      case 'update':
        return (
          <>
            <strong>{user}</strong> updated {entry.entity_type}{' '}
            <strong>{entity}</strong>
          </>
        );
      case 'delete':
        return (
          <>
            <strong>{user}</strong> deleted {entry.entity_type}{' '}
            <strong>{entity}</strong>
          </>
        );
      case 'invite':
        return (
          <>
            <strong>{user}</strong> invited <strong>{entity}</strong> to the project
          </>
        );
      case 'join':
        return (
          <>
            <strong>{user}</strong> joined the project
          </>
        );
      case 'leave':
        return (
          <>
            <strong>{entity}</strong> left the project
          </>
        );
      default:
        return (
          <>
            <strong>{user}</strong> performed {entry.action} on {entry.entity_type}
          </>
        );
    }
  };

  const filteredEntries = entries.filter((entry) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      entry.user_name?.toLowerCase().includes(searchLower) ||
      entry.user_email?.toLowerCase().includes(searchLower) ||
      entry.entity_name?.toLowerCase().includes(searchLower) ||
      entry.entity_type.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <section className="bg-background border border-border rounded-xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-foreground">Audit Log</h2>
            <p className="text-sm text-muted-foreground">
              Track all changes and actions in this project
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-muted/30">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select onValueChange={(v) => onFilterChange({ action: v as AuditAction })}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              <SelectItem value="create">Create</SelectItem>
              <SelectItem value="update">Update</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
              <SelectItem value="invite">Invite</SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={(v) => onFilterChange({ entity_type: v })}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All entities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              <SelectItem value="test_case">Test Cases</SelectItem>
              <SelectItem value="test_cycle">Test Cycles</SelectItem>
              <SelectItem value="defect">Defects</SelectItem>
              <SelectItem value="member">Members</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Log Entries */}
        <div className="divide-y divide-border">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No audit log entries found</p>
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 px-6 py-4">
                <div
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                    actionColors[entry.action]
                  )}
                >
                  {actionIcons[entry.action]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{getActionMessage(entry)}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px] bg-muted">
                    {(entry.user_name || entry.user_email || '??')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
