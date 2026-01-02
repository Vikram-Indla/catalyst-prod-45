/**
 * Issue Test Management Tab
 * Integrated test management within the Jira Issue drawer
 * Features: View linked cases, create/execute/link cases, add to set/cycle
 */

import React, { useState, useMemo } from 'react';
import {
  TestTube,
  Plus,
  Link2,
  Unlink,
  Play,
  FolderPlus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  MoreHorizontal,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useIssueTestCases, useAddCaseToCollection, WorkItemType, LinkedTestCase, TestCaseForLinking } from '../../hooks/useIssueTestCases';
import { useTestSets } from '../../hooks/useTestSets';
import { useTestCycles } from '../../hooks/useTestCycles';

interface IssueTestManagementTabProps {
  issueId: string;
  issueKey: string;
  issueTitle: string;
  issueType: WorkItemType;
  programId: string;
  onExecuteCase?: (caseId: string) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

const EXECUTION_STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  passed: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: 'text-green-600', label: 'Passed' },
  failed: { icon: <XCircle className="h-3.5 w-3.5" />, color: 'text-red-600', label: 'Failed' },
  blocked: { icon: <AlertCircle className="h-3.5 w-3.5" />, color: 'text-orange-600', label: 'Blocked' },
  not_run: { icon: <Clock className="h-3.5 w-3.5" />, color: 'text-slate-500', label: 'Not Run' },
  in_progress: { icon: <RefreshCw className="h-3.5 w-3.5" />, color: 'text-blue-600', label: 'In Progress' },
};

export function IssueTestManagementTab({
  issueId,
  issueKey,
  issueTitle,
  issueType,
  programId,
  onExecuteCase,
}: IssueTestManagementTabProps) {
  const {
    linkedCases,
    isLoading,
    refetch,
    searchCases,
    linkCase,
    unlinkCase,
    createCase,
    isLinking,
    isCreating,
  } = useIssueTestCases(issueId, issueType);

  const { addToSet, addToCycle, isAddingToSet, isAddingToCycle } = useAddCaseToCollection();

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showAddToSetModal, setShowAddToSetModal] = useState(false);
  const [showAddToCycleModal, setShowAddToCycleModal] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  // Create case form
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    preconditions: '',
    expected_result: '',
    priority: 'medium' as 'critical' | 'high' | 'medium' | 'low',
  });

  // Link search
  const [linkSearch, setLinkSearch] = useState('');
  const [linkResults, setLinkResults] = useState<TestCaseForLinking[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Sets and cycles for add modals
  const { testSets: sets } = useTestSets(programId);
  const { testCycles: cycles } = useTestCycles(programId);

  // Handle search for linking
  const handleLinkSearch = async () => {
    if (!programId) return;
    setIsSearching(true);
    try {
      const results = await searchCases(programId, linkSearch);
      // Filter out already linked cases
      const linkedIds = new Set(linkedCases.map(c => c.id));
      setLinkResults(results.filter(r => !linkedIds.has(r.id)));
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle create case
  const handleCreateCase = async () => {
    if (!createForm.title.trim()) return;

    try {
      await createCase({
        title: createForm.title,
        description: createForm.description || undefined,
        preconditions: createForm.preconditions || undefined,
        expected_result: createForm.expected_result || undefined,
        priority: createForm.priority,
        programId,
        workItemId: issueId,
        workItemType: issueType,
      });
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        description: '',
        preconditions: '',
        expected_result: '',
        priority: 'medium',
      });
    } catch (err) {
      // Error handled by mutation
    }
  };

  // Handle link case
  const handleLinkCase = async (caseId: string) => {
    try {
      await linkCase({ caseId });
      setLinkResults(prev => prev.filter(r => r.id !== caseId));
    } catch (err) {
      // Error handled by mutation
    }
  };

  // Handle unlink case
  const handleUnlinkCase = async (linkId: string, caseId: string) => {
    try {
      await unlinkCase({ linkId, caseId });
    } catch (err) {
      // Error handled by mutation
    }
  };

  // Prefill create form with issue title
  const handleOpenCreateModal = () => {
    setCreateForm(prev => ({
      ...prev,
      title: `Test: ${issueTitle}`,
      description: `Test case for ${issueKey}`,
    }));
    setShowCreateModal(true);
  };

  // Open add to set/cycle modal
  const handleOpenAddToSet = (caseId: string) => {
    setSelectedCaseId(caseId);
    setShowAddToSetModal(true);
  };

  const handleOpenAddToCycle = (caseId: string) => {
    setSelectedCaseId(caseId);
    setShowAddToCycleModal(true);
  };

  // Handle add to set
  const handleAddToSet = async (setId: string) => {
    if (!selectedCaseId) return;
    try {
      await addToSet({ caseId: selectedCaseId, setId });
      setShowAddToSetModal(false);
      setSelectedCaseId(null);
    } catch (err) {
      // Error handled by mutation
    }
  };

  // Handle add to cycle
  const handleAddToCycle = async (cycleId: string) => {
    if (!selectedCaseId) return;
    try {
      await addToCycle({ caseId: selectedCaseId, cycleId });
      setShowAddToCycleModal(false);
      setSelectedCaseId(null);
    } catch (err) {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TestTube className="h-4 w-4 text-text-tertiary" />
          <span className="text-sm font-medium text-text-secondary">
            Test Cases ({linkedCases.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setShowLinkModal(true)}
          >
            <Link2 className="h-3 w-3" />
            Link
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={handleOpenCreateModal}
          >
            <Plus className="h-3 w-3" />
            Create
          </Button>
        </div>
      </div>

      {/* Linked cases list */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : linkedCases.length === 0 ? (
        <div className="text-center py-8 bg-surface-2 rounded-lg">
          <TestTube className="h-10 w-10 text-text-quaternary mx-auto mb-3" />
          <p className="text-text-tertiary text-sm">No test cases linked</p>
          <p className="text-text-quaternary text-xs mt-1">
            Create a new test case or link an existing one
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setShowLinkModal(true)}
            >
              <Link2 className="h-3 w-3 mr-1" />
              Link Existing
            </Button>
            <Button
              size="sm"
              className="text-xs"
              onClick={handleOpenCreateModal}
            >
              <Plus className="h-3 w-3 mr-1" />
              Create New
            </Button>
          </div>
        </div>
      ) : (
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2">
            {linkedCases.map((tc) => {
              const execStatus = tc.last_execution_status
                ? EXECUTION_STATUS_CONFIG[tc.last_execution_status] || EXECUTION_STATUS_CONFIG.not_run
                : EXECUTION_STATUS_CONFIG.not_run;

              return (
                <div
                  key={tc.id}
                  className="p-3 bg-surface-2 rounded-lg border border-border-default hover:border-border-strong transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-text-primary truncate">
                          {tc.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={cn('text-[10px] h-4', PRIORITY_COLORS[tc.priority])}>
                          {tc.priority}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] h-4">
                          {tc.test_type}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] h-4">
                          {tc.status}
                        </Badge>
                        <div className={cn('flex items-center gap-1 text-xs', execStatus.color)}>
                          {execStatus.icon}
                          <span>{execStatus.label}</span>
                        </div>
                        {tc.last_executed_at && (
                          <span className="text-[10px] text-text-quaternary">
                            {formatDistanceToNow(new Date(tc.last_executed_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {onExecuteCase && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onExecuteCase(tc.id)}
                          title="Execute"
                        >
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenAddToSet(tc.id)}>
                            <FolderPlus className="mr-2 h-3.5 w-3.5" />
                            Add to Set
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenAddToCycle(tc.id)}>
                            <RefreshCw className="mr-2 h-3.5 w-3.5" />
                            Add to Cycle
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleUnlinkCase(tc.link_id, tc.id)}
                            className="text-red-600"
                          >
                            <Unlink className="mr-2 h-3.5 w-3.5" />
                            Unlink
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Create Case Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Test Case</DialogTitle>
            <DialogDescription>
              Create a new test case linked to {issueKey}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tc-title">Title *</Label>
              <Input
                id="tc-title"
                value={createForm.title}
                onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Test case title..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tc-desc">Description</Label>
              <Textarea
                id="tc-desc"
                value={createForm.description}
                onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="What should this test verify?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tc-precond">Preconditions</Label>
              <Textarea
                id="tc-precond"
                value={createForm.preconditions}
                onChange={(e) => setCreateForm(prev => ({ ...prev, preconditions: e.target.value }))}
                placeholder="What must be set up before this test?"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tc-expected">Expected Result</Label>
              <Textarea
                id="tc-expected"
                value={createForm.expected_result}
                onChange={(e) => setCreateForm(prev => ({ ...prev, expected_result: e.target.value }))}
                placeholder="What is the expected outcome?"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={createForm.priority}
                onValueChange={(val) => setCreateForm(prev => ({ ...prev, priority: val as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCase} disabled={!createForm.title.trim() || isCreating}>
              {isCreating ? 'Creating...' : 'Create & Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Case Modal */}
      <Dialog open={showLinkModal} onOpenChange={setShowLinkModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Link Test Case</DialogTitle>
            <DialogDescription>
              Search and link an existing test case to {issueKey}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search test cases..."
                value={linkSearch}
                onChange={(e) => setLinkSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLinkSearch()}
              />
              <Button onClick={handleLinkSearch} disabled={isSearching}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {isSearching ? (
                  <>
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </>
                ) : linkResults.length === 0 ? (
                  <div className="text-center py-6 text-text-tertiary text-sm">
                    {linkSearch ? 'No test cases found' : 'Search for test cases to link'}
                  </div>
                ) : (
                  linkResults.map((tc) => (
                    <div
                      key={tc.id}
                      className="flex items-center justify-between p-3 bg-surface-2 rounded-lg border border-border-default"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-text-primary block truncate">
                          {tc.title}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={cn('text-[10px] h-4', PRIORITY_COLORS[tc.priority])}>
                            {tc.priority}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] h-4">
                            {tc.status}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-2"
                        onClick={() => handleLinkCase(tc.id)}
                        disabled={isLinking}
                      >
                        <Link2 className="h-3 w-3 mr-1" />
                        Link
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Set Modal */}
      <Dialog open={showAddToSetModal} onOpenChange={setShowAddToSetModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Test Set</DialogTitle>
            <DialogDescription>
              Select a test set to add this case to
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[300px] py-4">
            <div className="space-y-2">
              {sets.length === 0 ? (
                <div className="text-center py-6 text-text-tertiary text-sm">
                  No test sets available
                </div>
              ) : (
                sets.map((set) => (
                  <Button
                    key={set.id}
                    variant="outline"
                    className="w-full justify-start h-auto py-3"
                    onClick={() => handleAddToSet(set.id)}
                    disabled={isAddingToSet}
                  >
                    <FolderPlus className="h-4 w-4 mr-2" />
                    <div className="text-left">
                      <div className="font-medium">{set.name}</div>
                      {set.description && (
                        <div className="text-xs text-text-tertiary truncate max-w-[280px]">
                          {set.description}
                        </div>
                      )}
                    </div>
                  </Button>
                ))
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddToSetModal(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Cycle Modal */}
      <Dialog open={showAddToCycleModal} onOpenChange={setShowAddToCycleModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Test Cycle</DialogTitle>
            <DialogDescription>
              Select a test cycle to add this case to
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[300px] py-4">
            <div className="space-y-2">
              {cycles.length === 0 ? (
                <div className="text-center py-6 text-text-tertiary text-sm">
                  No test cycles available
                </div>
              ) : (
                cycles.filter(c => c.status !== 'completed').map((cycle) => (
                  <Button
                    key={cycle.id}
                    variant="outline"
                    className="w-full justify-start h-auto py-3"
                    onClick={() => handleAddToCycle(cycle.id)}
                    disabled={isAddingToCycle}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    <div className="text-left">
                      <div className="font-medium">{cycle.name}</div>
                      <div className="text-xs text-text-tertiary">
                        {cycle.status}
                      </div>
                    </div>
                  </Button>
                ))
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddToCycleModal(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default IssueTestManagementTab;
