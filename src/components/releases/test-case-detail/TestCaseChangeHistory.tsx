/**
 * Test Case Change History Component
 * Shows audit log entries (field changes, not execution runs)
 */

import { motion } from 'framer-motion';
import { 
  History,
  Clock,
  User,
  Edit,
  Plus,
  Trash2,
  Copy,
  Play,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useTestCaseAuditLog, type AuditLogEntry } from '@/hooks/test-management/useTestCaseAuditLog';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';

interface TestCaseChangeHistoryProps {
  testCaseId: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getActionIcon(action: string) {
  switch (action) {
    case 'create': return Plus;
    case 'update': return Edit;
    case 'delete': return Trash2;
    case 'clone': return Copy;
    case 'execute': return Play;
    case 'assign': return User;
    default: return Edit;
  }
}

function getActionColor(action: string): string {
  switch (action) {
    case 'create': return 'text-green-600 bg-green-50';
    case 'delete': return 'text-red-600 bg-red-50';
    case 'clone': return 'text-purple-600 bg-purple-50';
    case 'execute': return 'text-blue-600 bg-blue-50';
    default: return 'text-gray-600 bg-gray-50';
  }
}

function formatFieldName(field: string): string {
  const fieldMap: Record<string, string> = {
    title: 'Title',
    description: 'Description',
    objective: 'Objective',
    preconditions: 'Preconditions',
    postconditions: 'Postconditions',
    status: 'Status',
    priority_id: 'Priority',
    case_type_id: 'Type',
    assigned_to: 'Assignee',
    folder_id: 'Folder',
    release_id: 'Release',
    steps: 'Steps',
    tags: 'Tags',
    labels: 'Labels',
  };
  return fieldMap[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'None';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 50);
  return String(value).slice(0, 100);
}

function ChangeEntry({ entry }: { entry: AuditLogEntry }) {
  const ActionIcon = getActionIcon(entry.action);
  const actionColor = getActionColor(entry.action);
  
  const renderChangeDescription = () => {
    if (!entry.changes || Object.keys(entry.changes).length === 0) {
      return (
        <span className="text-muted-foreground">
          {entry.action === 'create' ? 'Created test case' : 
           entry.action === 'clone' ? 'Cloned test case' :
           entry.action === 'delete' ? 'Deleted test case' :
           'Made changes'}
        </span>
      );
    }

    return (
      <div className="space-y-1">
        {Object.entries(entry.changes).map(([field, change]) => (
          <div key={field} className="flex items-center gap-1.5 text-sm flex-wrap">
            <span className="text-muted-foreground">Changed</span>
            <Badge variant="outline" className="text-xs font-normal px-1.5 py-0">
              {formatFieldName(field)}
            </Badge>
            {change.from !== null && change.from !== undefined && (
              <>
                <span className="text-muted-foreground">from</span>
                <span className="text-foreground/70 font-mono text-xs bg-muted px-1 rounded">
                  {formatValue(change.from)}
                </span>
              </>
            )}
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
            <span className="text-foreground font-mono text-xs bg-muted px-1 rounded">
              {formatValue(change.to)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors"
    >
      {/* Action Icon */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        actionColor
      )}>
        <ActionIcon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Avatar className="h-5 w-5">
            {entry.actor_avatar && (
              <AvatarImage src={entry.actor_avatar} alt={entry.actor_name} />
            )}
            <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">
              {getInitials(entry.actor_name)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-sm">{entry.actor_name}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
          </span>
        </div>

        {renderChangeDescription()}
      </div>
    </motion.div>
  );
}

function groupByDate(entries: AuditLogEntry[]): Map<string, AuditLogEntry[]> {
  const groups = new Map<string, AuditLogEntry[]>();
  
  entries.forEach(entry => {
    const date = new Date(entry.created_at);
    let label: string;
    
    if (isToday(date)) {
      label = 'Today';
    } else if (isYesterday(date)) {
      label = 'Yesterday';
    } else {
      label = format(date, 'MMMM d, yyyy');
    }
    
    const existing = groups.get(label) || [];
    groups.set(label, [...existing, entry]);
  });
  
  return groups;
}

export function TestCaseChangeHistory({ testCaseId }: TestCaseChangeHistoryProps) {
  const { data: entries = [], isLoading, error } = useTestCaseAuditLog(testCaseId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 border border-dashed border-destructive/50 rounded-lg bg-destructive/5">
        <History className="w-12 h-12 mx-auto text-destructive/50 mb-4" />
        <p className="text-destructive mb-2">Failed to load change history</p>
        <p className="text-sm text-muted-foreground">Please try refreshing the page</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-lg bg-muted/30">
        <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-2">No changes recorded yet</p>
        <p className="text-sm text-muted-foreground">
          Changes to this test case will appear here automatically.
        </p>
      </div>
    );
  }

  const groupedEntries = groupByDate(entries);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <h4 className="font-medium text-foreground">Change History</h4>
        </div>
        <Badge variant="outline" className="text-xs">
          {entries.length} change{entries.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Grouped Entries */}
      {Array.from(groupedEntries.entries()).map(([dateLabel, dateEntries]) => (
        <div key={dateLabel}>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {dateLabel}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          
          <div className="space-y-1">
            {dateEntries.map((entry) => (
              <ChangeEntry key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
