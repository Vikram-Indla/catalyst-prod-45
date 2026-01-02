/**
 * Work Item Links Manager
 * Manages links between test cases and stories/defects
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Link2,
  Plus,
  X,
  Search,
  FileText,
  Bug,
  Layers,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useTestCaseLinks,
  useLinkableWorkItems,
  TestCaseLink,
  WorkItemType,
} from '../../hooks/useTestCaseLinks';

interface WorkItemLinksManagerProps {
  caseId: string;
  projectId: string | null;
  readOnly?: boolean;
}

function getWorkItemIcon(type: WorkItemType) {
  switch (type) {
    case 'story':
      return <FileText className="h-4 w-4 text-accent-primary" />;
    case 'defect':
      return <Bug className="h-4 w-4 text-status-error" />;
    case 'feature':
      return <Layers className="h-4 w-4 text-status-warning" />;
    default:
      return <FileText className="h-4 w-4 text-text-tertiary" />;
  }
}

function getStatusColor(status: string | undefined) {
  if (!status) return 'bg-surface-3 text-text-tertiary';
  
  const normalized = status.toLowerCase();
  if (['done', 'closed', 'resolved', 'completed'].includes(normalized)) {
    return 'bg-status-success/10 text-status-success';
  }
  if (['in_progress', 'in progress', 'active', 'open'].includes(normalized)) {
    return 'bg-accent-subtle text-accent-primary';
  }
  if (['blocked', 'failed'].includes(normalized)) {
    return 'bg-status-error/10 text-status-error';
  }
  return 'bg-surface-3 text-text-tertiary';
}

export function WorkItemLinksManager({
  caseId,
  projectId,
  readOnly = false,
}: WorkItemLinksManagerProps) {
  const {
    links,
    isLoading,
    createLink,
    deleteLink,
    isCreating,
    isDeleting,
  } = useTestCaseLinks(caseId);

  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<WorkItemType>('story');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: searchResults,
    isLoading: isSearching,
  } = useLinkableWorkItems(projectId, selectedType, searchQuery);

  const handleCreateLink = async (workItemId: string) => {
    try {
      await createLink({
        caseId,
        workItemId,
        workItemType: selectedType,
      });
      setShowLinkDialog(false);
      setSearchQuery('');
    } catch (err) {
      console.error('Failed to create link:', err);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      await deleteLink(linkId);
    } catch (err) {
      console.error('Failed to delete link:', err);
    }
  };

  // Group links by type
  const storyLinks = links.filter(l => l.work_item_type === 'story');
  const defectLinks = links.filter(l => l.work_item_type === 'defect');
  const featureLinks = links.filter(l => l.work_item_type === 'feature');

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-secondary">
          Linked Work Items ({links.length})
        </span>
        {!readOnly && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowLinkDialog(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Link Item
          </Button>
        )}
      </div>

      {/* No links state */}
      {links.length === 0 ? (
        <div className="text-center py-8 bg-surface-2 rounded-lg border border-border-default">
          <Link2 className="h-8 w-8 mx-auto mb-2 text-text-quaternary opacity-50" />
          <p className="text-sm text-text-tertiary">No linked work items</p>
          <p className="text-xs text-text-quaternary mt-1">
            Link stories, defects, or features
          </p>
          {!readOnly && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => setShowLinkDialog(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add First Link
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Stories */}
          {storyLinks.length > 0 && (
            <LinkSection
              title="Stories"
              icon={<FileText className="h-4 w-4 text-accent-primary" />}
              links={storyLinks}
              onDelete={!readOnly ? handleDeleteLink : undefined}
              isDeleting={isDeleting}
            />
          )}

          {/* Defects */}
          {defectLinks.length > 0 && (
            <LinkSection
              title="Defects"
              icon={<Bug className="h-4 w-4 text-status-error" />}
              links={defectLinks}
              onDelete={!readOnly ? handleDeleteLink : undefined}
              isDeleting={isDeleting}
            />
          )}

          {/* Features */}
          {featureLinks.length > 0 && (
            <LinkSection
              title="Features"
              icon={<Layers className="h-4 w-4 text-status-warning" />}
              links={featureLinks}
              onDelete={!readOnly ? handleDeleteLink : undefined}
              isDeleting={isDeleting}
            />
          )}
        </div>
      )}

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Link Work Item
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Type selector */}
            <div>
              <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
                Type
              </label>
              <Select
                value={selectedType}
                onValueChange={(v) => {
                  setSelectedType(v as WorkItemType);
                  setSearchQuery('');
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="story">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-accent-primary" />
                      Story
                    </span>
                  </SelectItem>
                  <SelectItem value="defect">
                    <span className="flex items-center gap-2">
                      <Bug className="h-4 w-4 text-status-error" />
                      Defect
                    </span>
                  </SelectItem>
                  <SelectItem value="feature">
                    <span className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-status-warning" />
                      Feature
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div>
              <label className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
                Search
              </label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-quaternary" />
                <Input
                  placeholder={`Search ${selectedType}s...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Results */}
            <div className="max-h-60 overflow-y-auto space-y-1 border border-border-default rounded-lg p-2">
              {isSearching ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
                </div>
              ) : searchResults?.length === 0 ? (
                <div className="text-center py-6 text-text-tertiary">
                  <p className="text-sm">No {selectedType}s found</p>
                  {!searchQuery && (
                    <p className="text-xs mt-1">Try searching by title or key</p>
                  )}
                </div>
              ) : (
                searchResults?.map((item) => {
                  const isAlreadyLinked = links.some(l => l.work_item_id === item.id);

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'p-2 rounded-md border transition-colors',
                        isAlreadyLinked
                          ? 'bg-surface-3 border-border-default opacity-50 cursor-not-allowed'
                          : 'bg-surface-2 border-border-default hover:border-accent-primary cursor-pointer'
                      )}
                      onClick={() => !isAlreadyLinked && handleCreateLink(item.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {getWorkItemIcon(item.type)}
                          <div className="min-w-0">
                            <p className="text-sm text-text-primary truncate">
                              {item.title}
                            </p>
                            <p className="text-xs text-text-tertiary font-mono">
                              {item.key}
                            </p>
                          </div>
                        </div>
                        {isAlreadyLinked ? (
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            Linked
                          </Badge>
                        ) : (
                          <Badge className={cn('text-[10px] shrink-0', getStatusColor(item.status))}>
                            {item.status || 'Unknown'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Link Section Component
interface LinkSectionProps {
  title: string;
  icon: React.ReactNode;
  links: TestCaseLink[];
  onDelete?: (linkId: string) => void;
  isDeleting?: boolean;
}

function LinkSection({ title, icon, links, onDelete, isDeleting }: LinkSectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
          {title} ({links.length})
        </span>
      </div>
      <div className="space-y-1.5">
        {links.map((link) => (
          <div
            key={link.id}
            className="flex items-center justify-between gap-2 p-2.5 bg-surface-2 rounded-lg border border-border-default group hover:border-border-hover transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              {getWorkItemIcon(link.work_item_type)}
              <div className="min-w-0">
                <p className="text-sm text-text-primary truncate">
                  {link.work_item_title || 'Unknown'}
                </p>
                <p className="text-xs text-text-tertiary font-mono">
                  {link.work_item_key || link.work_item_id.slice(0, 8)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className={cn('text-[10px]', getStatusColor(link.work_item_status))}>
                {link.work_item_status || 'Unknown'}
              </Badge>
              {onDelete && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-text-tertiary hover:text-status-error"
                  onClick={() => onDelete(link.id)}
                  disabled={isDeleting}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WorkItemLinksManager;
