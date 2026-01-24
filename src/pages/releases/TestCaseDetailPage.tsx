/**
 * Test Case Detail Page — Catalyst Release & Test Management Module
 * Route: /releases/test-cases/:id
 * Quality Target: 9.5/10 (GOD-TIER)
 * Features: Keyboard navigation, tab persistence, enhanced animations, quick actions
 */

import { useState, useCallback } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight, 
  Copy, 
  History, 
  Play,
  ListChecks,
  Clock,
  Link2,
  MessageSquare,
  Keyboard,
  FileText,
  GitCommit,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TestCaseHeader } from '@/components/releases/test-case-detail/TestCaseHeader';
import { TestCaseSteps } from '@/components/releases/test-case-detail/TestCaseSteps';
import { TestCaseExecutionHistory } from '@/components/releases/test-case-detail/TestCaseExecutionHistory';
import { TestCaseLinksAttachments } from '@/components/releases/test-case-detail/TestCaseLinksAttachments';
import { TestCaseComments } from '@/components/releases/test-case-detail/TestCaseComments';
import { TestCasePropertiesPanel } from '@/components/releases/test-case-detail/TestCasePropertiesPanel';
import { RequirementsCoverage } from '@/components/releases/test-case-detail/RequirementsCoverage';
import { TestCaseVersionHistory } from '@/components/releases/test-case-detail/TestCaseVersionHistory';
import { QuickActionsBar } from '@/components/releases/test-case-detail/QuickActionsBar';
import { useTestCase, useCloneTestCase, useTestCaseSteps } from '@/hooks/test-management/useTestCases';
import { useTestCaseNavigation } from '@/hooks/use-test-case-navigation';
import { useTestCaseExecutionHistory, ExecutionHistoryRecord } from '@/hooks/test-management/useTestCaseExecutionHistory';
import { cn } from '@/lib/utils';

export default function TestCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Persist active tab in URL
  const activeTab = searchParams.get('tab') || 'steps';
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab }, { replace: true });
  };
  
  // Real data from DB
  const { data: testCase, isLoading, isError, refetch } = useTestCase(id);
  const { data: stepsData } = useTestCaseSteps(id);
  const { data: executionHistory = [] } = useTestCaseExecutionHistory(id);
  
  // Clone mutation
  const cloneMutation = useCloneTestCase();
  
  // Keyboard navigation between test cases
  const { 
    currentIndex, 
    totalCount, 
    hasPrev, 
    hasNext, 
    goToPrev, 
    goToNext 
  } = useTestCaseNavigation({ currentId: id || '' });

  // Quick action handlers
  const handleExecute = useCallback(() => {
    toast.info('Execution module not enabled yet', {
      description: 'This feature will be available in a future release.',
    });
  }, []);

  const handleDuplicate = useCallback(async () => {
    if (!testCase || !testCase.project_id) return;
    
    try {
      const clonedCase = await cloneMutation.mutateAsync({
        id: testCase.id,
        project_id: testCase.project_id,
      });
      toast.success(`Test case duplicated as ${clonedCase.key}`);
      navigate(`/releases/test-cases/${clonedCase.id}`);
    } catch (error) {
      toast.error('Failed to duplicate test case');
    }
  }, [testCase, cloneMutation, navigate]);

  const handleVersionHistory = useCallback(() => {
    toast.info('Version history not implemented yet', {
      description: 'This feature will be available in a future release.',
    });
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (isError || !testCase) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertTriangle className="w-12 h-12 text-destructive" />
        <div className="text-center">
          <h2 className="text-lg font-semibold">Test Case Not Found</h2>
          <p className="text-muted-foreground">The test case you're looking for doesn't exist or couldn't be loaded.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
          <Button onClick={() => navigate('/releases/test-cases')}>
            Back to Test Cases
          </Button>
        </div>
      </div>
    );
  }

  const steps = stepsData || testCase.steps || [];

  return (
    <motion.div 
      className="flex flex-col h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Breadcrumb & Actions */}
      <div className="flex items-center justify-between px-6 py-3 bg-muted/30 border-b">
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-1">
            <span className="text-muted-foreground uppercase tracking-wide text-xs font-medium">RELEASES</span>
            <span className="text-muted-foreground">/</span>
            <Link to="/releases/test-cases" className="text-muted-foreground hover:text-foreground transition-colors">
              Test Cases
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-semibold text-foreground">{testCase.key || id}</span>
            {totalCount > 0 && (
              <span className="text-xs text-muted-foreground ml-2">
                ({currentIndex + 1} of {totalCount})
              </span>
            )}
          </div>
          
          {/* Back link + Navigation */}
          <div className="flex items-center gap-3">
            <Link 
              to="/releases/test-cases" 
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Test Cases
            </Link>
            
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={!hasPrev}
                    onClick={goToPrev}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Previous (←)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={!hasNext}
                    onClick={goToNext}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Next (→)</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 text-muted-foreground">
                <Keyboard className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="space-y-1">
              <p className="font-medium text-xs">Keyboard Shortcuts</p>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p><kbd className="bg-muted px-1 rounded">←</kbd> Previous test case</p>
                <p><kbd className="bg-muted px-1 rounded">→</kbd> Next test case</p>
                <p><kbd className="bg-muted px-1 rounded">Esc</kbd> Back to list</p>
              </div>
            </TooltipContent>
          </Tooltip>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8"
            onClick={handleDuplicate}
            disabled={cloneMutation.isPending}
          >
            {cloneMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Copy className="w-3.5 h-3.5 mr-1.5" />
            )}
            Duplicate
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8"
                onClick={handleVersionHistory}
              >
                <History className="w-3.5 h-3.5 mr-1.5" />
                Version History
              </Button>
            </TooltipTrigger>
            <TooltipContent>Version history not implemented yet</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="sm" 
                className="h-8 bg-teal-600 hover:bg-teal-700 text-white"
                onClick={handleExecute}
              >
                <Play className="w-3.5 h-3.5 mr-1.5" />
                Run Test
              </Button>
            </TooltipTrigger>
            <TooltipContent>Execution module not enabled yet</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="flex gap-6 p-6">
          {/* Left: Main Content */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Header Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <TestCaseHeader testCase={testCase} />
            </motion.div>

            {/* Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0 gap-0 flex-wrap">
                  <TabsTrigger 
                    value="steps" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-3 data-[state=active]:shadow-none"
                  >
                    <ListChecks className="w-4 h-4 mr-2" />
                    Steps
                    <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                      {steps.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="history" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-3 data-[state=active]:shadow-none"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    History
                    <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                      {executionHistory.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="requirements" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-3 data-[state=active]:shadow-none"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Requirements
                    <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full">0</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="links" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-3 data-[state=active]:shadow-none"
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Links
                    <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full">0</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="comments" 
                    data-tab="comments"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-3 data-[state=active]:shadow-none"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Comments
                    <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full">0</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="versions" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-3 data-[state=active]:shadow-none"
                  >
                    <GitCommit className="w-4 h-4 mr-2" />
                    Versions
                    <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                      {testCase.version || 1}
                    </span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="steps" className="mt-6">
                  <TestCaseSteps 
                    testCaseId={testCase.id}
                    steps={steps}
                  />
                </TabsContent>

                <TabsContent value="history" className="mt-6">
                  <TestCaseExecutionHistory history={executionHistory} />
                </TabsContent>

                <TabsContent value="requirements" className="mt-6">
                  <RequirementsCoverage requirements={[]} />
                </TabsContent>

                <TabsContent value="links" className="mt-6">
                  <TestCaseLinksAttachments />
                </TabsContent>

                <TabsContent value="comments" className="mt-6">
                  <TestCaseComments />
                </TabsContent>

                <TabsContent value="versions" className="mt-6">
                  <TestCaseVersionHistory versions={[]} />
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>

          {/* Right: Properties Panel */}
          <motion.div
            className="w-80 flex-shrink-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <TestCasePropertiesPanel testCase={testCase} />
          </motion.div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <QuickActionsBar 
        testCaseId={testCase.key || testCase.id} 
        onExecute={handleExecute}
        onDuplicate={handleDuplicate}
      />
    </motion.div>
  );
}
