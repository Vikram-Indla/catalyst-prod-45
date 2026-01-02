/**
 * DrillDownDialog Component
 * Shows detailed list of activity items when clicking a cell
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  FileText, 
  Bug, 
  CheckSquare, 
  Clock,
  ExternalLink,
  Loader2,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ActivityItem, ActivityType } from '../../hooks/useUserActivity';

interface DrillDownDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: ActivityItem[];
  isLoading: boolean;
  params: {
    userId: string;
    userName: string;
    activityType: ActivityType;
    startDate: string;
    endDate: string;
    projectId?: string;
  } | null;
}

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  case_created: 'Cases Created',
  case_updated: 'Cases Updated',
  case_automated: 'Cases Automated',
  case_assigned: 'Cases Assigned',
  run_executed: 'Runs Executed',
  effort_logged: 'Effort Logged',
  defect_discovered: 'Defects Discovered',
};

function getEntityIcon(entityType: string) {
  switch (entityType) {
    case 'test_case':
      return <FileText className="h-4 w-4 text-accent-primary" />;
    case 'defect':
      return <Bug className="h-4 w-4 text-status-error" />;
    case 'test_run':
    case 'test_execution':
      return <CheckSquare className="h-4 w-4 text-status-success" />;
    default:
      return <Clock className="h-4 w-4 text-text-tertiary" />;
  }
}

function getEntityRoute(entityType: string, entityId: string, projectId?: string): string | null {
  const base = projectId ? `/projects/${projectId}` : '';
  
  switch (entityType) {
    case 'test_case':
      return `${base}/tests/cases/${entityId}`;
    case 'defect':
      return `${base}/defects/${entityId}`;
    case 'test_run':
    case 'test_execution':
      return `${base}/tests/executions`;
    default:
      return null;
  }
}

export function DrillDownDialog({
  isOpen,
  onClose,
  items,
  isLoading,
  params,
}: DrillDownDialogProps) {
  const navigate = useNavigate();

  if (!params) return null;

  const handleItemClick = (item: ActivityItem) => {
    const route = getEntityRoute(item.entityType, item.entityId, params.projectId);
    if (route) {
      onClose();
      navigate(route);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-surface-1 border-border-default">
        <DialogHeader className="border-b border-border-default pb-4">
          <DialogTitle className="text-text-primary flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span>{ACTIVITY_TYPE_LABELS[params.activityType]}</span>
              <span className="text-sm font-normal text-text-tertiary">
                {params.userName} • {params.startDate} to {params.endDate}
              </span>
            </div>
            <Badge variant="secondary">{items.length} items</Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-text-tertiary mb-4" />
              <p className="text-text-tertiary">No items found</p>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {items.map((item) => {
                const route = getEntityRoute(item.entityType, item.entityId, params.projectId);
                
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border border-border-default bg-surface-2',
                      route && 'hover:bg-surface-hover cursor-pointer transition-colors'
                    )}
                    onClick={() => route && handleItemClick(item)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {getEntityIcon(item.entityType)}
                      <div className="min-w-0">
                        <p className="text-text-primary font-medium truncate max-w-[400px]">
                          {item.entityTitle}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          {item.entityType.replace('_', ' ')} • {format(new Date(item.createdAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                    {route && (
                      <ExternalLink className="h-4 w-4 text-text-tertiary shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t border-border-default">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
