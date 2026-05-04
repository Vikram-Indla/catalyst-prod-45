/**
 * Issue Drawer Component
 * Full Jira-style drawer with two-column layout, inline editing, and activity tabs
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  X,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Minimize2,
  Share2
} from 'lucide-react';
import AiChatIcon from '@atlaskit/icon/core/ai-chat';
import MagicWandIcon from '@atlaskit/icon/core/magic-wand';
import { IconButton, Button as AKButton } from '@atlaskit/button/new';
import { Tooltip as AKTooltip } from '@atlaskit/tooltip';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip } from '@/components/ads';
import { toast } from 'sonner';
import { useInJira } from '../context/InJiraContext';
import { cn } from '@/lib/utils';
import { InlineEdit } from './drawer/InlineEdit';
import AtlaskitEditor, { type AtlaskitEditorRef } from '@/components/shared/AtlaskitEditor';
import AtlaskitRenderer from '@/components/shared/AtlaskitRenderer';
import { parseADF, createEmptyADF, isADFEmpty, plainTextToADF } from '@/utils/adf';
import { IssueActionsMenu } from './drawer/IssueActionsMenu';
import { ActivityTabs } from './drawer/ActivityTabs';
import { DetailsPanel } from './drawer/DetailsPanel';
import { useIssueAudit } from '../hooks/useIssueAudit';
import { useAISuggestions } from '../hooks/useAISuggestions';
import { StatusPill } from './StatusPill';
import { TransitionControls } from './TransitionControls';
import { AISuggestionBanner } from './import/AISuggestionBanner';
import { Issue } from '../types';

// Mock users for demo
const MOCK_USERS = [
  { id: 'user1', name: 'John Doe', email: 'john@example.com' },
  { id: 'user2', name: 'Jane Smith', email: 'jane@example.com' },
  { id: 'user3', name: 'Bob Wilson', email: 'bob@example.com' },
];

// Mock comments for demo
const MOCK_COMMENTS = [
  {
    id: 'c1',
    content: 'Looking into this issue now. Will update once I have more information.',
    authorId: 'user1',
    authorName: 'John Doe',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c2',
    content: 'Found the root cause. Working on a fix.',
    authorId: 'user2',
    authorName: 'Jane Smith',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    isInternal: true,
  },
];

// Mock SLA statuses
const MOCK_SLA = [
  { name: 'Time to First Response', status: 'ontrack' as const, timeRemaining: '2h 30m' },
  { name: 'Time to Resolution', status: 'ontrack' as const, timeRemaining: '6h 15m' },
];

export function IssueDrawer() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const { isDrawerOpen, selectedIssue, closeIssueDrawer } = useInJira();
  const [isExpanded, setIsExpanded] = useState(false);
  const [issue, setIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState(MOCK_COMMENTS);
  const [editingDesc, setEditingDesc] = useState(false);
  const editorRef = useRef<AtlaskitEditorRef>(null);

  // Sync local issue state with selected issue
  React.useEffect(() => {
    if (selectedIssue) {
      setIssue(selectedIssue);
    }
  }, [selectedIssue]);

  // Use audit hook
  const { history, logFieldChange, logAction } = useIssueAudit(issue?.id || '');
  
  // Use AI suggestions hook
  const { suggestions: aiSuggestions, refetch: refetchSuggestions } = useAISuggestions(issue?.id || null);

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

  // Handle field changes with audit logging
  const handleFieldChange = useCallback((field: string, value: unknown) => {
    if (!issue) return;
    
    const oldValue = (issue as any)[field];
    setIssue(prev => prev ? { ...prev, [field]: value } : null);
    logFieldChange(field, oldValue, value);
    toast.success(`${field} updated`);
  }, [issue, logFieldChange]);

  // Handle actions with audit logging
  const handleAction = useCallback((action: string, data?: Record<string, unknown>) => {
    logAction(action, data);
    
    switch (action) {
      case 'clone':
        toast.success('Issue cloned');
        break;
      case 'move':
        toast.info('Move dialog coming soon');
        break;
      case 'archive':
        toast.success('Issue archived');
        closeIssueDrawer();
        break;
      case 'delete':
        toast.success('Issue deleted');
        closeIssueDrawer();
        break;
      case 'export':
        toast.success(`Exporting as ${(data?.format as string)?.toUpperCase()}`);
        break;
    }
  }, [logAction, closeIssueDrawer]);

  // Handle add comment
  const handleAddComment = useCallback((content: string, isInternal?: boolean) => {
    const newComment = {
      id: `c${Date.now()}`,
      content,
      authorId: 'current-user',
      authorName: 'You',
      createdAt: new Date().toISOString(),
      isInternal,
    };
    setComments(prev => [...prev, newComment]);
    logAction('comment_added', { isInternal });
    toast.success('Comment added');
  }, [logAction]);

  const descToolbarComponents = useMemo(() => [
    <AKTooltip content="Rovo AI" key="rovo">
      {(tooltipProps) => (
        <IconButton
          {...tooltipProps}
          icon={AiChatIcon}
          label="Rovo AI"
          appearance="subtle"
        />
      )}
    </AKTooltip>,
    <AKTooltip content="Improve description" key="improve">
      {(tooltipProps) => (
        <AKButton {...tooltipProps} appearance="subtle" iconBefore={MagicWandIcon}>
          Improve
        </AKButton>
      )}
    </AKTooltip>,
  ], []);

  // Handle transition
  const handleTransition = useCallback((transitionId: string, toStatus: string) => {
    if (!issue) return;
    const oldStatus = issue.status;
    setIssue(prev => prev ? { ...prev, status: toStatus } : null);
    logAction('status_transition', { from: oldStatus, to: toStatus, transitionId });
    toast.success(`Transitioned to ${toStatus}`);
  }, [issue, logAction]);

  if (!issue) {
    return (
      <Sheet open={isDrawerOpen} onOpenChange={() => closeIssueDrawer()}>
        <SheetContent side="right" hideClose className="w-full sm:max-w-4xl p-0">
          <div className="h-full flex items-center justify-center text-text-tertiary">
            No issue selected
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isDrawerOpen} onOpenChange={() => closeIssueDrawer()}>
      <SheetContent
        side="right"
        hideClose
        className={cn(
          "p-0 flex flex-col transition-all duration-200",
          isExpanded ? "w-full sm:max-w-6xl" : "w-full sm:max-w-4xl"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-surface-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeIssueDrawer}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-accent-primary hover:underline cursor-pointer">
              {issue.key}
            </span>
            <StatusPill 
              statusId={issue.status} 
              statusName={issue.status.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              category={issue.statusCategory === 'to-do' ? 'todo' : issue.statusCategory === 'in-progress' ? 'in_progress' : 'done'}
            />
          </div>
          
          <div className="flex items-center gap-1">
            {/* Transition Controls */}
            <TransitionControls 
              issue={issue as unknown as Record<string, unknown>}
              currentStatusId={issue.status}
              onTransitionComplete={(newStatusId) => handleTransition(newStatusId, newStatusId)}
              variant="compact"
            />
            
            <Separator orientation="vertical" className="h-6 mx-2" />
            
            <Tooltip content="Share">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Share2 className="h-4 w-4" />
              </Button>
            </Tooltip>

            <Tooltip content="Open in new tab">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Tooltip>

            <Tooltip content={isExpanded ? 'Collapse' : 'Expand'}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </Tooltip>
            
            <IssueActionsMenu 
              issueId={issue.id} 
              issueKey={issue.key}
              onAction={handleAction}
            />
            
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
                {/* AI Suggestions Banner */}
                {aiSuggestions.length > 0 && (
                  <div className="mb-4">
                    <AISuggestionBanner
                      suggestions={aiSuggestions}
                      issueId={issue.id}
                      onAccept={() => refetchSuggestions()}
                      onReject={() => refetchSuggestions()}
                    />
                  </div>
                )}
                
                {/* Summary/Title - Inline Editable */}
                <InlineEdit
                  value={issue.summary}
                  onSave={(val) => handleFieldChange('summary', val)}
                  placeholder="Enter summary..."
                  displayClassName="text-xl font-semibold text-text-primary"
                  inputClassName="text-xl font-semibold"
                  className="mb-4"
                />

                {/* Description — ADF rich-text editor (Atlaskit parity) */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-text-secondary mb-2">Description</h3>
                  {editingDesc ? (
                    <AtlaskitEditor
                      ref={editorRef}
                      appearance="comment"
                      defaultValue={(() => {
                        const parsed = parseADF(issue.description ?? null);
                        if (parsed) return parsed;
                        if (issue.description?.trim()) return plainTextToADF(issue.description);
                        return createEmptyADF();
                      })()}
                      placeholder="Add a description…"
                      primaryToolbarComponents={descToolbarComponents}
                      onSave={(adf) => {
                        handleFieldChange('description', JSON.stringify(adf));
                        setEditingDesc(false);
                      }}
                      onCancel={() => setEditingDesc(false)}
                    />
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setEditingDesc(true)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingDesc(true)}
                      className="min-h-[40px] rounded cursor-text hover:bg-surface-hover transition-colors px-1 -mx-1"
                    >
                      {(() => {
                        const adf = parseADF(issue.description ?? null);
                        if (adf && !isADFEmpty(adf)) {
                          return <AtlaskitRenderer document={adf} appearance="full-page" />;
                        }
                        if (issue.description?.trim()) {
                          return <AtlaskitRenderer document={plainTextToADF(issue.description)} appearance="full-page" />;
                        }
                        return (
                          <span className="text-sm text-text-tertiary italic">
                            Add a description…
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </div>

                <Separator className="my-6" />

                {/* Activity Tabs */}
                <ActivityTabs
                  issueId={issue.id}
                  issueKey={issue.key}
                  issueTitle={issue.summary}
                  issueType={issue.type === 'subtask' ? 'story' : issue.type as 'story' | 'feature' | 'defect'}
                  programId={projectKey}
                  comments={comments}
                  history={history.map(h => ({
                    id: h.id,
                    field: h.field || h.action,
                    fromValue: h.fromValue,
                    toValue: h.toValue,
                    actorId: h.actorId,
                    actorName: h.actorName,
                    actorAvatar: h.actorAvatar,
                    changedAt: h.createdAt,
                  }))}
                  workLog={[]}
                  slaStatuses={MOCK_SLA}
                  onAddComment={handleAddComment}
                  onEditComment={(id, content) => {
                    setComments(prev => prev.map(c => c.id === id ? { ...c, content, updatedAt: new Date().toISOString() } : c));
                    logAction('comment_edited', { commentId: id });
                  }}
                  onDeleteComment={(id) => {
                    setComments(prev => prev.filter(c => c.id !== id));
                    logAction('comment_deleted', { commentId: id });
                  }}
                />
              </div>
            </ScrollArea>
          </div>

          {/* Right panel - Details */}
          <div className={cn(
            "flex-shrink-0 bg-surface-2 transition-all",
            isExpanded ? "w-80" : "w-72"
          )}>
            <DetailsPanel
              issue={issue}
              users={MOCK_USERS}
              onFieldChange={handleFieldChange}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default IssueDrawer;
