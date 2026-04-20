/**
 * WorkBench views: Details drawer for work items
 * Updated for Owner type and removed Health
 */

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Lozenge, type LozengeAppearance } from '@/components/ads';
import { Button } from '@/components/ui/button';
import { WorkItem, ItemStatus } from './types';
import { ExternalLink, Calendar, User, Link2, X } from 'lucide-react';
import { format } from 'date-fns';

interface WorkbenchDetailsDrawerProps {
  item: WorkItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenFullDrawer?: (item: WorkItem) => void;
}

function getStatusAppearance(status: ItemStatus): LozengeAppearance {
  switch (status) {
    case 'Done': return 'success';
    case 'In Progress': return 'inprogress';
    case 'Backlog': return 'default';
    case 'Blocked': return 'removed';
    default: return 'default';
  }
}

function getTypeAppearance(_type: string): LozengeAppearance {
  // Work item type chips are structural identifiers — neutral grey.
  return 'default';
}

function getOwnerInitials(owner: { full_name: string } | null): string {
  if (!owner?.full_name) return '??';
  return owner.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
              <Lozenge appearance={getTypeAppearance(item.type)}>
                {item.type}
              </Lozenge>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <SheetTitle className="text-left mt-2">{item.title}</SheetTitle>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Status Row */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
              Status
            </label>
            <Lozenge appearance={getStatusAppearance(item.status)}>
              {item.status}
            </Lozenge>
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
                  {getOwnerInitials(item.owner)}
                </div>
                <span className="text-sm">{item.owner.full_name}</span>
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

          {/* Epic badges */}
          {item.type === 'epic' && (item.team || item.businessRequest || item.theme) && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                Linked Items
              </label>
              <div className="flex flex-wrap gap-2">
                {item.team && (
                  <Lozenge appearance="default">{item.team}</Lozenge>
                )}
                {item.businessRequest && (
                  <Lozenge appearance="inprogress">
                    BR {item.businessRequest.key}
                  </Lozenge>
                )}
                {item.theme && (
                  <Lozenge appearance="new">
                    {item.theme.name}
                  </Lozenge>
                )}
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
                    <Lozenge appearance={getTypeAppearance(child.type)}>
                      {child.type}
                    </Lozenge>
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
