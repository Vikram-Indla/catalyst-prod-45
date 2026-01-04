/**
 * Cycle Scope Table Component
 */

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Search, 
  Plus, 
  Play, 
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Circle,
  Loader2,
  Eye,
  Trash2,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { CycleScope, ScopeStatus } from '../../api/types';

interface CycleScopeTableProps {
  scope: CycleScope[];
  onExecute: (scopeId: string) => void;
  onAddCases: () => void;
  onAssign: (scopeIds: string[]) => void;
  onRemove: (scopeIds: string[]) => void;
  onViewRuns: (scopeId: string) => void;
  isReadOnly?: boolean;
}

const STATUS_CONFIG: Record<ScopeStatus, { 
  label: string; 
  icon: React.ElementType;
  className: string;
}> = {
  not_run: { 
    label: 'Not Run', 
    icon: Circle, 
    className: 'text-muted-foreground' 
  },
  in_progress: { 
    label: 'In Progress', 
    icon: Loader2, 
    className: 'text-info' 
  },
  passed: { 
    label: 'Passed', 
    icon: CheckCircle2, 
    className: 'text-success' 
  },
  failed: { 
    label: 'Failed', 
    icon: XCircle, 
    className: 'text-danger' 
  },
  blocked: { 
    label: 'Blocked', 
    icon: AlertTriangle, 
    className: 'text-warning' 
  },
};

export function CycleScopeTable({
  scope,
  onExecute,
  onAddCases,
  onAssign,
  onRemove,
  onViewRuns,
  isReadOnly = false,
}: CycleScopeTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Get unique assignees
  const assignees = Array.from(
    new Map(
      scope
        .filter(s => s.assigned_user)
        .map(s => [s.assigned_to!, s.assigned_user!])
    ).values()
  );

  // Filter scope
  const filteredScope = scope.filter(s => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!s.test_case?.title.toLowerCase().includes(q) && 
          !s.test_case?.case_key.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (statusFilter !== 'all' && s.current_status !== statusFilter) {
      return false;
    }
    if (assigneeFilter !== 'all') {
      if (assigneeFilter === 'unassigned' && s.assigned_to) return false;
      if (assigneeFilter !== 'unassigned' && s.assigned_to !== assigneeFilter) return false;
    }
    return true;
  });

  const toggleAll = () => {
    if (selectedIds.size === filteredScope.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredScope.map(s => s.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search cases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {assignees.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        {!isReadOnly && (
          <>
            <Button variant="outline" onClick={onAddCases}>
              <Plus className="h-4 w-4 mr-2" />
              Add Cases
            </Button>
            {selectedIds.size > 0 && (
              <Button 
                variant="outline"
                onClick={() => onAssign(Array.from(selectedIds))}
              >
                <Users className="h-4 w-4 mr-2" />
                Assign ({selectedIds.size})
              </Button>
            )}
          </>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {!isReadOnly && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedIds.size === filteredScope.length && filteredScope.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
              )}
              <TableHead className="w-24">Key</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-36">Assignee</TableHead>
              <TableHead className="w-24">Last Run</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredScope.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isReadOnly ? 6 : 7} className="text-center py-8 text-muted-foreground">
                  {scope.length === 0 
                    ? 'No test cases in scope. Add cases to get started.'
                    : 'No matching test cases found.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredScope.map((item) => {
                const statusConfig = STATUS_CONFIG[item.current_status];
                const StatusIcon = statusConfig.icon;
                const isSelected = selectedIds.has(item.id);
                
                return (
                  <TableRow key={item.id} className="group">
                    {!isReadOnly && (
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleOne(item.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <span className="font-mono text-sm text-primary">
                        {item.test_case?.case_key}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="line-clamp-1">{item.test_case?.title}</span>
                    </TableCell>
                    <TableCell>
                      <div className={cn('flex items-center gap-1.5', statusConfig.className)}>
                        <StatusIcon className="h-4 w-4" />
                        <span className="text-sm">{statusConfig.label}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.assigned_user ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={item.assigned_user.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {getInitials(item.assigned_user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate">
                            {item.assigned_user.full_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.updated_at && item.current_status !== 'not_run'
                        ? formatDistanceToNow(new Date(item.updated_at), { addSuffix: false })
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1"
                          onClick={() => onExecute(item.id)}
                        >
                          <Play className="h-3.5 w-3.5" />
                          Execute
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onViewRuns(item.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View runs
                            </DropdownMenuItem>
                            {!isReadOnly && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => onRemove([item.id])}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove from scope
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
