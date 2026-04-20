/**
 * TestCaseDetailDrawer — Inline drawer for viewing test case details
 * FULLY WIRED: No mock data, all DB-backed
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Lozenge } from '@/components/ads';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  X,
  Edit,
  Play,
  History,
  Link2,
  FileText,
  Clock,
  User,
  Calendar,
  Tag,
  Copy,
  ExternalLink,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { StatusBadge, PriorityBadge, TypeBadge } from './badges';
import { ExecutionStatusBadge } from './badges/ExecutionStatusBadge';
import { AutomationBadge } from './badges/AutomationBadge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { assertUuid, isValidUUID } from '@/lib/utils/assertUuid';

// Real hooks
import { useTestCaseSteps, useCloneTestCase, useDeleteTestCase } from '@/hooks/test-management/useTestCases';
import { useTestCaseExecutionHistory } from '@/hooks/test-management/useTestCaseExecutionHistory';
import { useCaseRequirements, REQUIREMENT_TYPE_LABELS } from '@/hooks/test-cases/useRequirementLinks';
import { useQueryClient } from '@tanstack/react-query';

import type { TestCaseType } from '@/types/test-cases';

interface TestCase {
  id: string;       // Actual database UUID
  key?: string;     // Display key like "TES-0001"
  title: string;
  description?: string;
  status: 'draft' | 'ready' | 'approved' | 'deprecated';
  priority: 'critical' | 'high' | 'medium' | 'low';
  type: TestCaseType;
  preconditions?: string;
  postconditions?: string;
  tags?: string[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  lastRunStatus?: 'passed' | 'failed' | 'blocked' | 'not_run';
  automationStatus?: 'automated' | 'manual' | 'in_progress';
  project_id?: string;
}

interface TestCaseDetailDrawerProps {
  testCase: TestCase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onExecute?: () => void;
  projectId?: string;
}

export function TestCaseDetailDrawer({
  testCase,
  open,
  onOpenChange,
  onEdit,
  onExecute,
  projectId,
}: TestCaseDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const cloneMutation = useCloneTestCase();
  const deleteMutation = useDeleteTestCase();

  // id is now always the UUID, key is the display key
  const caseUuid = testCase?.id || null;
  const displayKey = testCase?.key || testCase?.id || 'Unknown';

  // Real DB hooks - use UUID for all queries
  const { data: steps = [], isLoading: stepsLoading } = useTestCaseSteps(caseUuid);
  const { data: executionHistory = [], isLoading: historyLoading } = useTestCaseExecutionHistory(caseUuid);
  const { data: requirementLinks = [], isLoading: linksLoading } = useCaseRequirements(caseUuid);

  if (!testCase) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(displayKey);
    toast.success('Test case ID copied');
  };

  const handleDuplicate = () => {
    const resolvedProjectId = projectId || testCase.project_id;
    if (!resolvedProjectId) {
      toast.error('Cannot duplicate: project ID not available');
      return;
    }
    if (!caseUuid || !assertUuid(caseUuid, 'handleDuplicate.caseUuid')) {
      toast.error('Cannot duplicate: invalid test case UUID');
      return;
    }
    
    cloneMutation.mutate(
      { id: caseUuid, project_id: resolvedProjectId },
      {
        onSuccess: () => {
          toast.success('Test case duplicated');
          queryClient.invalidateQueries({ queryKey: ['tm-cases', resolvedProjectId] });
        },
        onError: (error) => {
          toast.error(`Failed to duplicate: ${error.message}`);
        },
      }
    );
  };

  const handleDelete = () => {
    const resolvedProjectId = projectId || testCase.project_id;
    if (!resolvedProjectId) {
      toast.error('Cannot delete: project ID not available');
      return;
    }
    if (!caseUuid || !assertUuid(caseUuid, 'handleDelete.caseUuid')) {
      toast.error('Cannot delete: invalid test case UUID');
      return;
    }
    
    deleteMutation.mutate(
      { id: caseUuid, project_id: resolvedProjectId },
      {
        onSuccess: () => {
          toast.success('Test case deleted');
          setIsDeleteDialogOpen(false);
          onOpenChange(false); // Close drawer after delete
          queryClient.invalidateQueries({ queryKey: ['tm-cases', resolvedProjectId] });
        },
        onError: (error) => {
          toast.error(`Failed to delete: ${error.message}`);
        },
      }
    );
  };

  const handleOpenInNewTab = () => {
    // Navigate to full detail page using UUID for routing
    if (caseUuid && assertUuid(caseUuid, 'handleOpenInNewTab.caseUuid')) {
      window.open(`/releases/test-cases/${caseUuid}`, '_blank');
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col">
          {/* Header */}
          <SheetHeader className="px-6 py-4 border-b bg-muted/30">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <button 
                    onClick={handleCopyId}
                    className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {displayKey}
                  </button>
                  <Copy className="w-3 h-3 text-muted-foreground" />
                </div>
                <SheetTitle className="text-lg font-semibold line-clamp-2">
                  {testCase.title}
                </SheetTitle>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit className="w-3.5 h-3.5 mr-1.5" />
                  Edit
                </Button>
                <Button size="sm" onClick={onExecute}>
                  <Play className="w-3.5 h-3.5 mr-1.5" />
                  Execute
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={handleDuplicate}
                      disabled={cloneMutation.isPending}
                    >
                      {cloneMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Copy className="w-4 h-4 mr-2" />
                      )}
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleOpenInNewTab}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open in new tab
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            {/* Status Badges */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <StatusBadge status={testCase.status} size="sm" />
              <PriorityBadge priority={testCase.priority} size="sm" />
              <TypeBadge type={testCase.type} size="sm" />
              {testCase.automationStatus && (
                <AutomationBadge status={testCase.automationStatus} size="sm" />
              )}
              {testCase.lastRunStatus && (
                <ExecutionStatusBadge status={testCase.lastRunStatus} size="sm" />
              )}
            </div>
          </SheetHeader>
          
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-6 mt-4 grid grid-cols-4 w-auto">
              <TabsTrigger value="details" className="text-xs">
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                Details
              </TabsTrigger>
              <TabsTrigger value="steps" className="text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Steps ({steps.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs">
                <History className="w-3.5 h-3.5 mr-1.5" />
                History
              </TabsTrigger>
              <TabsTrigger value="links" className="text-xs">
                <Link2 className="w-3.5 h-3.5 mr-1.5" />
                Links
              </TabsTrigger>
            </TabsList>
            
            <ScrollArea className="flex-1 px-6 py-4">
              {/* Details Tab */}
              <TabsContent value="details" className="mt-0 space-y-6">
                {/* Description */}
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Description</h4>
                  <p className="text-sm">
                    {testCase.description || <span className="text-muted-foreground italic">No description provided.</span>}
                  </p>
                </div>
                
                {/* Preconditions */}
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Preconditions</h4>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">
                    {testCase.preconditions || <span className="text-muted-foreground italic">No preconditions specified.</span>}
                  </p>
                </div>
                
                {/* Tags */}
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {testCase.tags && testCase.tags.length > 0 ? (
                      testCase.tags.map(tag => (
                        <Lozenge key={tag} appearance="default">{tag}</Lozenge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground italic">No tags</span>
                    )}
                  </div>
                </div>
                
                <Separator />
                
                {/* Metadata */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Created by
                    </span>
                    <span className="font-medium">{testCase.createdBy || <span className="text-muted-foreground italic">Unknown</span>}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Created
                    </span>
                    <span className="font-medium">{testCase.createdAt || <span className="text-muted-foreground italic">—</span>}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Last updated
                    </span>
                    <span className="font-medium">{testCase.updatedAt || <span className="text-muted-foreground italic">—</span>}</span>
                  </div>
                </div>
              </TabsContent>
              
              {/* Steps Tab - REAL DATA */}
              <TabsContent value="steps" className="mt-0">
                {stepsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : steps.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">No steps yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Click Edit to add test steps</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {steps.map((step, index) => (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                            {step.step_number}
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <div>
                              <span className="text-xs text-muted-foreground font-medium uppercase">Action</span>
                              <p className="text-sm mt-0.5">{step.action}</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground font-medium uppercase">Expected Result</span>
                              <p className="text-sm mt-0.5 text-muted-foreground">{step.expected_result}</p>
                            </div>
                            {step.test_data && (
                              <div>
                                <span className="text-xs text-muted-foreground font-medium uppercase">Test Data</span>
                                <p className="text-sm mt-0.5 text-muted-foreground font-mono bg-muted/50 p-2 rounded">{step.test_data}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              {/* History Tab - REAL DATA */}
              <TabsContent value="history" className="mt-0">
                {historyLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : executionHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">No executions yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Run this test case in a cycle to see history</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {executionHistory.map((run, index) => (
                      <motion.div
                        key={run.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          {run.status === 'passed' ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : run.status === 'failed' ? (
                            <XCircle className="w-5 h-5 text-red-500" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                          )}
                          <div>
                            <p className="text-sm font-medium capitalize">{run.status.replace('_', ' ')}</p>
                            <p className="text-xs text-muted-foreground">{run.cycleName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">{run.executor}</p>
                          <p className="text-xs text-muted-foreground">{run.timestamp}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              {/* Links Tab - REAL DATA */}
              <TabsContent value="links" className="mt-0">
                {linksLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : requirementLinks.length === 0 ? (
                  <div className="text-center py-12">
                    <Link2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">No linked items</p>
                    <p className="text-xs text-muted-foreground mt-1">Use the full detail view to link requirements</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requirementLinks.map((link, index) => (
                      <motion.div
                        key={link.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <Lozenge appearance="default">
                            {REQUIREMENT_TYPE_LABELS[link.requirement_type] || link.requirement_type}
                          </Lozenge>
                          <div>
                            <p className="text-sm font-medium">
                              {link.external_key || link.requirement_id || '—'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {link.external_title || link.requirement_title || 'Untitled'}
                            </p>
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </motion.div>
                    ))}
                  </div>
                )}
                
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => {
                    toast.info('Use the full detail view to link work items');
                  }}
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  Link Work Item
                </Button>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test Case</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{testCase.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
