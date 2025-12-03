/**
 * Jira Test Panel - Integration panel for linking tests to Jira issues
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Link2,
  ExternalLink,
  Search,
  Plus,
  Trash2,
  Bug,
  FileText,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface LinkedIssue {
  id: string;
  key: string;
  summary: string;
  type: 'bug' | 'story' | 'task' | 'epic';
  status: string;
  priority: string;
  url: string;
}

interface JiraTestPanelProps {
  testCaseId: string;
  linkedIssues: LinkedIssue[];
  onLinkIssue: (issueKey: string) => Promise<void>;
  onUnlinkIssue: (issueId: string) => Promise<void>;
  onCreateDefect?: (testCaseId: string, summary: string) => Promise<void>;
  isLoading?: boolean;
}

const ISSUE_TYPE_ICONS: Record<string, React.ReactNode> = {
  bug: <Bug className="h-4 w-4 text-red-500" />,
  story: <FileText className="h-4 w-4 text-green-500" />,
  task: <CheckCircle2 className="h-4 w-4 text-blue-500" />,
  epic: <AlertCircle className="h-4 w-4 text-purple-500" />,
};

const STATUS_COLORS: Record<string, string> = {
  'To Do': 'bg-gray-500',
  'In Progress': 'bg-blue-500',
  'Done': 'bg-green-500',
  'Closed': 'bg-green-500',
  'Open': 'bg-gray-500',
};

export const JiraTestPanel: React.FC<JiraTestPanelProps> = ({
  testCaseId,
  linkedIssues,
  onLinkIssue,
  onUnlinkIssue,
  onCreateDefect,
  isLoading = false,
}) => {
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isCreateDefectModalOpen, setIsCreateDefectModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [issueKeyToLink, setIssueKeyToLink] = useState('');
  const [defectSummary, setDefectSummary] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLinkIssue = async () => {
    if (!issueKeyToLink.trim()) {
      toast.error('Please enter an issue key');
      return;
    }

    setIsProcessing(true);
    try {
      await onLinkIssue(issueKeyToLink.trim().toUpperCase());
      setIssueKeyToLink('');
      setIsLinkModalOpen(false);
      toast.success('Issue linked successfully');
    } catch (error) {
      toast.error('Failed to link issue');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnlinkIssue = async (issueId: string) => {
    setIsProcessing(true);
    try {
      await onUnlinkIssue(issueId);
      toast.success('Issue unlinked');
    } catch (error) {
      toast.error('Failed to unlink issue');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateDefect = async () => {
    if (!defectSummary.trim() || !onCreateDefect) {
      toast.error('Please enter a defect summary');
      return;
    }

    setIsProcessing(true);
    try {
      await onCreateDefect(testCaseId, defectSummary.trim());
      setDefectSummary('');
      setIsCreateDefectModalOpen(false);
      toast.success('Defect created and linked');
    } catch (error) {
      toast.error('Failed to create defect');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredIssues = searchQuery
    ? linkedIssues.filter(
        (issue) =>
          issue.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
          issue.summary.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : linkedIssues;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Link2 className="h-5 w-5 text-brand-gold" />
            Linked Issues
          </CardTitle>
          <div className="flex gap-2">
            {onCreateDefect && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateDefectModalOpen(true)}
              >
                <Bug className="h-4 w-4 mr-1" />
                Create Defect
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLinkModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Link Issue
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {linkedIssues.length > 3 && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter linked issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        <ScrollArea className="h-64">
          <div className="space-y-2">
            {filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors group"
              >
                {ISSUE_TYPE_ICONS[issue.type] || <FileText className="h-4 w-4" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <a
                      href={issue.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-brand-gold hover:underline"
                    >
                      {issue.key}
                    </a>
                    <Badge
                      variant="secondary"
                      className={`${STATUS_COLORS[issue.status] || 'bg-gray-500'} text-white text-xs`}
                    >
                      {issue.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {issue.summary}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    className="h-8 w-8"
                  >
                    <a href={issue.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleUnlinkIssue(issue.id)}
                    disabled={isProcessing}
                    className="h-8 w-8 text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {filteredIssues.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No linked issues</p>
                <p className="text-sm">Link Jira issues to track requirements</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Link Issue Modal */}
      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link Jira Issue</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Issue Key</label>
              <Input
                placeholder="e.g., PROJ-123"
                value={issueKeyToLink}
                onChange={(e) => setIssueKeyToLink(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLinkIssue()}
              />
              <p className="text-xs text-muted-foreground">
                Enter the Jira issue key to link to this test case
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLinkModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleLinkIssue}
              disabled={isProcessing || !issueKeyToLink.trim()}
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              {isProcessing ? 'Linking...' : 'Link Issue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Defect Modal */}
      <Dialog open={isCreateDefectModalOpen} onOpenChange={setIsCreateDefectModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Defect</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Defect Summary</label>
              <Input
                placeholder="Brief description of the defect"
                value={defectSummary}
                onChange={(e) => setDefectSummary(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A new bug will be created in Jira and linked to this test case
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDefectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateDefect}
              disabled={isProcessing || !defectSummary.trim()}
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
            >
              {isProcessing ? 'Creating...' : 'Create & Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
