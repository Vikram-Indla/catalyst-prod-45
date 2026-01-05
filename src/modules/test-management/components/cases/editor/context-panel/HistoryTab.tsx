/**
 * History Tab Component
 * Activity timeline and version history
 */

import React from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  History,
  User,
  Edit3,
  Plus,
  Trash2,
  ArrowRight,
  RefreshCw,
  Link2,
  MessageSquare,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type HistoryAction = 
  | 'created' 
  | 'updated' 
  | 'status_changed' 
  | 'assigned' 
  | 'step_added' 
  | 'step_updated' 
  | 'step_removed' 
  | 'linked' 
  | 'unlinked' 
  | 'commented' 
  | 'version_created';

interface HistoryEntry {
  id: string;
  action: HistoryAction;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  performedBy: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  performedAt: string;
}

interface HistoryTabProps {
  entries?: HistoryEntry[];
  versions?: { version: number; createdAt: string; notes?: string }[];
  onViewVersion?: (version: number) => void;
  onRestoreVersion?: (version: number) => void;
}

const ACTION_CONFIG: Record<HistoryAction, { icon: React.ReactNode; label: string; color: string }> = {
  created: { icon: <Plus className="h-3 w-3" />, label: 'Created', color: 'bg-success/10 text-success' },
  updated: { icon: <Edit3 className="h-3 w-3" />, label: 'Updated', color: 'bg-primary/10 text-primary' },
  status_changed: { icon: <RefreshCw className="h-3 w-3" />, label: 'Status changed', color: 'bg-warning/10 text-warning' },
  assigned: { icon: <User className="h-3 w-3" />, label: 'Assigned', color: 'bg-primary/10 text-primary' },
  step_added: { icon: <Plus className="h-3 w-3" />, label: 'Step added', color: 'bg-success/10 text-success' },
  step_updated: { icon: <Edit3 className="h-3 w-3" />, label: 'Step updated', color: 'bg-primary/10 text-primary' },
  step_removed: { icon: <Trash2 className="h-3 w-3" />, label: 'Step removed', color: 'bg-destructive/10 text-destructive' },
  linked: { icon: <Link2 className="h-3 w-3" />, label: 'Linked', color: 'bg-primary/10 text-primary' },
  unlinked: { icon: <Link2 className="h-3 w-3" />, label: 'Unlinked', color: 'bg-muted text-muted-foreground' },
  commented: { icon: <MessageSquare className="h-3 w-3" />, label: 'Commented', color: 'bg-primary/10 text-primary' },
  version_created: { icon: <History className="h-3 w-3" />, label: 'Version created', color: 'bg-purple-100 text-purple-600' },
};

function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function HistoryTab({
  entries = [],
  versions = [],
  onViewVersion,
  onRestoreVersion,
}: HistoryTabProps) {
  return (
    <div className="space-y-5">
      {/* Version History */}
      {versions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Versions
            </h3>
          </div>
          
          <div className="space-y-1.5">
            {versions.slice(0, 5).map((version, index) => (
              <div
                key={version.version}
                className={cn(
                  'flex items-center justify-between p-2.5 rounded-lg border',
                  index === 0 
                    ? 'bg-primary/5 border-primary/20' 
                    : 'bg-muted/30 border-border hover:bg-muted/50'
                )}
              >
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={index === 0 ? 'default' : 'outline'} 
                    className="text-[10px] font-bold"
                  >
                    v{version.version}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => onViewVersion?.(version.version)}
                  >
                    View
                  </Button>
                  {index !== 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px] text-primary"
                      onClick={() => onRestoreVersion?.(version.version)}
                    >
                      Restore
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Activity
          </h3>
        </div>
        
        {entries.length > 0 ? (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[15px] top-6 bottom-6 w-px bg-border" />
            
            <div className="space-y-3">
              {entries.map((entry) => {
                const config = ACTION_CONFIG[entry.action] || ACTION_CONFIG.updated;
                
                return (
                  <div key={entry.id} className="relative flex gap-3">
                    {/* Icon */}
                    <div className={cn(
                      'relative z-10 flex items-center justify-center w-[30px] h-[30px] rounded-full border-2 border-background shrink-0',
                      config.color
                    )}>
                      {config.icon}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[12px] font-medium text-foreground">
                          {entry.performedBy.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {config.label.toLowerCase()}
                        </span>
                        {entry.fieldName && (
                          <span className="text-[11px] text-muted-foreground">
                            {entry.fieldName}
                          </span>
                        )}
                      </div>
                      
                      {/* Value change */}
                      {entry.oldValue && entry.newValue && (
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="text-muted-foreground line-through">{entry.oldValue}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-foreground font-medium">{entry.newValue}</span>
                        </div>
                      )}
                      
                      {/* Timestamp */}
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {format(new Date(entry.performedAt), 'MMM d, yyyy · h:mm a')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-[12px]">No activity yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
