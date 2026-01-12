/**
 * AuditLogViewer - View entity audit history
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Search, 
  Filter,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Play,
  UserPlus,
  Copy,
  Clock,
  History
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type AuditAction = 'create' | 'update' | 'delete' | 'execute' | 'assign' | 'clone';

export interface AuditLogEntry {
  id: string;
  projectId: string;
  entityType: string;
  entityId: string;
  entityKey?: string;
  action: AuditAction;
  actorId: string;
  actorName: string;
  actorAvatarUrl?: string;
  changes?: {
    field: string;
    oldValue?: string | number | boolean | null;
    newValue?: string | number | boolean | null;
  }[];
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface AuditLogViewerProps {
  entries: AuditLogEntry[];
  isLoading?: boolean;
  entityTypes?: string[];
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const actionConfig: Record<AuditAction, { icon: typeof Plus; label: string; color: string }> = {
  create: { icon: Plus, label: 'Created', color: 'text-green-500 bg-green-500/10' },
  update: { icon: Pencil, label: 'Updated', color: 'text-blue-500 bg-blue-500/10' },
  delete: { icon: Trash2, label: 'Deleted', color: 'text-red-500 bg-red-500/10' },
  execute: { icon: Play, label: 'Executed', color: 'text-purple-500 bg-purple-500/10' },
  assign: { icon: UserPlus, label: 'Assigned', color: 'text-amber-500 bg-amber-500/10' },
  clone: { icon: Copy, label: 'Cloned', color: 'text-cyan-500 bg-cyan-500/10' },
};

const entityTypeLabels: Record<string, string> = {
  test_case: 'Test Case',
  test_cycle: 'Test Cycle',
  test_run: 'Test Run',
  defect: 'Defect',
  test_set: 'Test Set',
  folder: 'Folder',
  template: 'Template',
};

export function AuditLogViewer({
  entries,
  isLoading = false,
  entityTypes = [],
  onLoadMore,
  hasMore = false,
}: AuditLogViewerProps) {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<AuditAction | 'all'>('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = !search || 
      entry.actorName.toLowerCase().includes(search.toLowerCase()) ||
      entry.entityKey?.toLowerCase().includes(search.toLowerCase());
    const matchesAction = actionFilter === 'all' || entry.action === actionFilter;
    const matchesEntityType = entityTypeFilter === 'all' || entry.entityType === entityTypeFilter;
    return matchesSearch && matchesAction && matchesEntityType;
  });

  // Group by date
  const groupedEntries = filteredEntries.reduce((acc, entry) => {
    const date = format(new Date(entry.createdAt), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, AuditLogEntry[]>);

  const sortedDates = Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a));

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-2 mb-3">
          <History className="h-5 w-5" />
          <h3 className="font-semibold">Audit Log</h3>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user or entity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={actionFilter} onValueChange={(v) => setActionFilter(v as AuditAction | 'all')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {Object.entries(actionConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {entityTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {entityTypeLabels[type] || type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No audit log entries found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedDates.map(date => (
                <div key={date}>
                  <div className="sticky top-0 bg-background z-10 py-2">
                    <Badge variant="outline" className="font-medium">
                      {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                    </Badge>
                  </div>
                  <div className="space-y-1 mt-2">
                    {groupedEntries[date].map(entry => (
                      <AuditLogItem key={entry.id} entry={entry} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {hasMore && (
            <div className="text-center pt-4">
              <Button variant="outline" onClick={onLoadMore} disabled={isLoading}>
                {isLoading ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function AuditLogItem({ entry }: { entry: AuditLogEntry }) {
  const [isOpen, setIsOpen] = useState(false);
  const config = actionConfig[entry.action];
  const Icon = config.icon;
  const hasDetails = entry.changes && entry.changes.length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        'border rounded-lg',
        isOpen && 'border-primary/30'
      )}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            {/* Action Icon */}
            <div className={cn('p-2 rounded-full shrink-0', config.color)}>
              <Icon className="h-4 w-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{entry.actorName}</span>
                <Badge variant="secondary" className="text-xs">
                  {config.label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {entityTypeLabels[entry.entityType] || entry.entityType}
                </span>
                {entry.entityKey && (
                  <Badge variant="outline" className="text-xs font-mono">
                    {entry.entityKey}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{format(new Date(entry.createdAt), 'h:mm a')}</span>
              </div>
            </div>

            {/* Expand */}
            {hasDetails && (
              <ChevronDown className={cn(
                'h-4 w-4 text-muted-foreground transition-transform',
                isOpen && 'rotate-180'
              )} />
            )}
          </div>
        </CollapsibleTrigger>

        {hasDetails && (
          <CollapsibleContent>
            <div className="px-3 pb-3 pt-0">
              <div className="border rounded bg-muted/30 p-3 space-y-2">
                <div className="text-xs font-medium text-muted-foreground mb-2">Changes</div>
                {entry.changes?.map((change, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <span className="font-medium min-w-[100px] capitalize">
                      {change.field.replace(/_/g, ' ')}:
                    </span>
                    <div className="flex-1">
                      {change.oldValue !== undefined && change.oldValue !== null && (
                        <span className="text-red-500 line-through mr-2">
                          {String(change.oldValue)}
                        </span>
                      )}
                      {change.newValue !== undefined && change.newValue !== null && (
                        <span className="text-green-500">
                          {String(change.newValue)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {entry.ipAddress && (
                <div className="text-xs text-muted-foreground mt-2">
                  IP: {entry.ipAddress}
                </div>
              )}
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}
