/**
 * WorkBench views: Table/Gantt/Roadmap/Board/Swimlane
 * 
 * Details drawer for work items (Epic/Feature/Story)
 */

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WorkItem, HealthStatus, ItemStatus } from './types';
import { ExternalLink, Calendar, User, TrendingUp, Link2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface WorkbenchDetailsDrawerProps {
  item: WorkItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenFullDrawer?: (item: WorkItem) => void;
}

function getHealthColor(health: HealthStatus): string {
  switch (health) {
    case 'On Track': return 'bg-secondary-green/20 text-secondary-green border-secondary-green/30';
    case 'At Risk': return 'bg-brand-gold/20 text-brand-gold border-brand-gold/30';
    case 'Blocked': return 'bg-destructive/20 text-destructive border-destructive/30';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getStatusColor(status: ItemStatus): string {
  switch (status) {
    case 'Done': return 'bg-secondary-green/20 text-secondary-green border-secondary-green/30';
    case 'In Progress': return 'bg-brand-gold/20 text-brand-gold border-brand-gold/30';
    case 'To Do': return 'bg-muted text-muted-foreground border-border';
    case 'Blocked': return 'bg-destructive/20 text-destructive border-destructive/30';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'epic': return 'bg-brand-primary/20 text-brand-primary border-brand-primary/30';
    case 'feature': return 'bg-secondary-bronze/20 text-secondary-bronze border-secondary-bronze/30';
    case 'story': return 'bg-brand-gold/20 text-brand-gold border-brand-gold/30';
    default: return 'bg-muted text-muted-foreground';
  }
}

export function WorkbenchDetailsDrawer({ item, open, onOpenChange, onOpenFullDrawer }: WorkbenchDetailsDrawerProps) {
  if (!item) return null;

  const canOpenFullDrawer = item.type === 'epic' || item.type === 'feature';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        className="w-[480px] sm:max-w-[480px] overflow-y-auto"
        hideClose
      >
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-brand-gold">{item.key}</span>
              <Badge variant="outline" className={cn("text-xs capitalize", getTypeColor(item.type))}>
                {item.type}
              </Badge>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <SheetTitle className="text-left mt-2">{item.title}</SheetTitle>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Status & Health Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                Status
              </label>
              <Badge variant="outline" className={cn("text-xs", getStatusColor(item.status))}>
                {item.status}
              </Badge>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                Health
              </label>
              <Badge variant="outline" className={cn("text-xs", getHealthColor(item.health))}>
                {item.health}
              </Badge>
            </div>
          </div>

          {/* Progress */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
              Progress
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand-primary transition-all"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <span className="text-sm font-medium">{item.progress}%</span>
            </div>
          </div>

          {/* Owner */}
          {item.owner && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                <User className="h-3 w-3 inline mr-1" />
                Owner
              </label>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-brand-primary/20 text-brand-primary flex items-center justify-center text-xs font-semibold">
                  {item.ownerInitials || item.owner.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                <span className="text-sm">{item.owner}</span>
              </div>
            </div>
          )}

          {/* Dates */}
          {(item.startDate || item.endDate) && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                <Calendar className="h-3 w-3 inline mr-1" />
                Dates
              </label>
              <div className="text-sm">
                {item.startDate && format(new Date(item.startDate), 'MMM d, yyyy')}
                {item.startDate && item.endDate && ' → '}
                {item.endDate && format(new Date(item.endDate), 'MMM d, yyyy')}
                {!item.startDate && !item.endDate && <span className="text-muted-foreground">No dates set</span>}
              </div>
            </div>
          )}

          {/* Project */}
          {item.projectName && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                <Link2 className="h-3 w-3 inline mr-1" />
                Linked Project
              </label>
              <div className="text-sm">{item.projectName}</div>
            </div>
          )}

          {/* Dependencies */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
              Dependencies
            </label>
            <div className="text-sm">
              {item.dependencyCount > 0 ? (
                <span>{item.dependencyCount} dependencies</span>
              ) : (
                <span className="text-muted-foreground">No dependencies</span>
              )}
            </div>
            {/* TODO: List actual dependencies when dependency model is integrated */}
          </div>

          {/* Children summary */}
          {item.children && item.children.length > 0 && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                Children ({item.children.length})
              </label>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {item.children.map(child => (
                  <div 
                    key={child.id}
                    className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50"
                  >
                    <Badge variant="outline" className={cn("text-[10px] capitalize", getTypeColor(child.type))}>
                      {child.type}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground">{child.key}</span>
                    <span className="truncate flex-1">{child.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-border pt-4 mt-auto">
          <Button 
            variant="outline" 
            className="w-full gap-2"
            onClick={() => canOpenFullDrawer && onOpenFullDrawer?.(item)}
            disabled={!canOpenFullDrawer}
          >
            <ExternalLink className="h-4 w-4" />
            Open Item
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
