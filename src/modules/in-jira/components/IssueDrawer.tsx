/**
 * Issue Drawer Component
 * Right-side slide-out panel for viewing/editing issue details
 * Two-panel layout: content (left) + details (right)
 */

import React from 'react';
import { 
  X, 
  ExternalLink, 
  MoreHorizontal, 
  MessageSquare,
  Paperclip,
  Link2,
  GitBranch,
  Clock,
  User,
  Tag,
  Calendar,
  Flag,
  Layers
} from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useInJira } from '../context/InJiraContext';
import { cn } from '@/lib/utils';

// Priority icon colors
const PRIORITY_COLORS: Record<string, string> = {
  highest: 'text-red-600',
  high: 'text-orange-500',
  medium: 'text-yellow-500',
  low: 'text-green-500',
  lowest: 'text-blue-400',
};

// Status category colors
const STATUS_COLORS: Record<string, string> = {
  'to-do': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'in-progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  'done': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
};

export function IssueDrawer() {
  const { isDrawerOpen, selectedIssue, closeIssueDrawer } = useInJira();

  // Keyboard shortcut to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        closeIssueDrawer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, closeIssueDrawer]);

  if (!selectedIssue) {
    return (
      <Sheet open={isDrawerOpen} onOpenChange={() => closeIssueDrawer()}>
        <SheetContent side="right" className="w-full sm:max-w-4xl p-0">
          <div className="h-full flex items-center justify-center text-text-tertiary">
            No issue selected
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isDrawerOpen} onOpenChange={() => closeIssueDrawer()}>
      <SheetContent side="right" className="w-full sm:max-w-4xl p-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-surface-1">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-accent-primary">
              {selectedIssue.key}
            </span>
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs font-medium",
                STATUS_COLORS[selectedIssue.statusCategory]
              )}
            >
              {selectedIssue.status}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeIssueDrawer}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Two-panel content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel - Main content */}
          <div className="flex-1 min-w-0 border-r border-border-default">
            <ScrollArea className="h-full">
              <div className="p-6">
                {/* Summary/Title */}
                <h2 className="text-lg font-semibold text-text-primary mb-4">
                  {selectedIssue.summary}
                </h2>

                {/* Description */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-text-secondary mb-2">Description</h3>
                  <div className="text-sm text-text-secondary prose prose-sm max-w-none">
                    {selectedIssue.description || (
                      <span className="text-text-tertiary italic">No description provided</span>
                    )}
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Tabs for Activity, Comments, etc */}
                <Tabs defaultValue="comments" className="w-full">
                  <TabsList className="w-full justify-start h-10 bg-transparent border-b border-border-default rounded-none p-0">
                    <TabsTrigger 
                      value="comments" 
                      className="flex items-center gap-1.5 px-3 py-2 data-[state=active]:border-b-2 data-[state=active]:border-accent-primary rounded-none"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Comments
                    </TabsTrigger>
                    <TabsTrigger 
                      value="history" 
                      className="flex items-center gap-1.5 px-3 py-2 data-[state=active]:border-b-2 data-[state=active]:border-accent-primary rounded-none"
                    >
                      <Clock className="h-4 w-4" />
                      History
                    </TabsTrigger>
                    <TabsTrigger 
                      value="links" 
                      className="flex items-center gap-1.5 px-3 py-2 data-[state=active]:border-b-2 data-[state=active]:border-accent-primary rounded-none"
                    >
                      <Link2 className="h-4 w-4" />
                      Links
                    </TabsTrigger>
                    <TabsTrigger 
                      value="attachments" 
                      className="flex items-center gap-1.5 px-3 py-2 data-[state=active]:border-b-2 data-[state=active]:border-accent-primary rounded-none"
                    >
                      <Paperclip className="h-4 w-4" />
                      Attachments
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="comments" className="mt-4">
                    <div className="text-sm text-text-tertiary text-center py-8">
                      No comments yet. Be the first to comment.
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="mt-4">
                    <div className="text-sm text-text-tertiary text-center py-8">
                      No activity recorded yet.
                    </div>
                  </TabsContent>

                  <TabsContent value="links" className="mt-4">
                    <div className="text-sm text-text-tertiary text-center py-8">
                      No linked issues.
                    </div>
                  </TabsContent>

                  <TabsContent value="attachments" className="mt-4">
                    <div className="text-sm text-text-tertiary text-center py-8">
                      No attachments.
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          </div>

          {/* Right panel - Details */}
          <div className="w-72 flex-shrink-0 bg-surface-2">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {/* Type */}
                <div>
                  <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
                    Type
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-text-secondary" />
                    <span className="text-sm text-text-primary capitalize">
                      {selectedIssue.type}
                    </span>
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
                    Priority
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <Flag className={cn("h-4 w-4", PRIORITY_COLORS[selectedIssue.priority])} />
                    <span className="text-sm text-text-primary capitalize">
                      {selectedIssue.priority}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Assignee */}
                <div>
                  <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
                    Assignee
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    {selectedIssue.assigneeId ? (
                      <>
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">UN</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-text-primary">Unassigned</span>
                      </>
                    ) : (
                      <>
                        <User className="h-4 w-4 text-text-tertiary" />
                        <span className="text-sm text-text-tertiary">Unassigned</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Reporter */}
                <div>
                  <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
                    Reporter
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <User className="h-4 w-4 text-text-tertiary" />
                    <span className="text-sm text-text-tertiary">Unknown</span>
                  </div>
                </div>

                <Separator />

                {/* Labels */}
                <div>
                  <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
                    Labels
                  </label>
                  <div className="mt-1">
                    {selectedIssue.labels && selectedIssue.labels.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {selectedIssue.labels.map(label => (
                          <Badge key={label} variant="outline" className="text-xs">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-text-tertiary">None</span>
                    )}
                  </div>
                </div>

                {/* Story Points */}
                {selectedIssue.storyPoints !== undefined && (
                  <div>
                    <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
                      Story Points
                    </label>
                    <div className="mt-1 text-sm text-text-primary">
                      {selectedIssue.storyPoints}
                    </div>
                  </div>
                )}

                {/* Sprint */}
                {selectedIssue.sprintId && (
                  <div>
                    <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
                      Sprint
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-text-secondary" />
                      <span className="text-sm text-text-primary">Sprint {selectedIssue.sprintId}</span>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Due Date */}
                <div>
                  <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
                    Due Date
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-text-tertiary" />
                    <span className="text-sm text-text-tertiary">
                      {selectedIssue.dueDate || 'None'}
                    </span>
                  </div>
                </div>

                {/* Created */}
                <div>
                  <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
                    Created
                  </label>
                  <div className="mt-1 text-sm text-text-secondary">
                    {new Date(selectedIssue.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Updated */}
                <div>
                  <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
                    Updated
                  </label>
                  <div className="mt-1 text-sm text-text-secondary">
                    {new Date(selectedIssue.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default IssueDrawer;
