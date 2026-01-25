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
  Grid3X3,
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
import { TestCaseChangeHistory } from '@/components/releases/test-case-detail/TestCaseChangeHistory';
import { TestCaseLinksAttachments } from '@/components/releases/test-case-detail/TestCaseLinksAttachments';
import { TestCaseComments } from '@/components/releases/test-case-detail/TestCaseComments';
import { TestCasePropertiesPanel } from '@/components/releases/test-case-detail/TestCasePropertiesPanel';
import { RequirementsCoverage } from '@/components/releases/test-case-detail/RequirementsCoverage';
import { TestCaseVersionHistory } from '@/components/releases/test-case-detail/TestCaseVersionHistory';
import { VersionHistoryPanel } from '@/components/releases/test-case-detail/VersionHistoryPanel';
import { TestCaseDataTab } from '@/components/releases/test-case-detail/TestCaseDataTab';
import { DataRowSelectionModal } from '@/components/test-management/DataRowSelectionModal';
import { useTestCase, useCloneTestCase, useTestCaseSteps } from '@/hooks/test-management/useTestCases';
import { useTestCaseNavigation } from '@/hooks/use-test-case-navigation';
import { useTestCaseExecutionHistory } from '@/hooks/test-management/useTestCaseExecutionHistory';
import { useTestCaseCommentsCount } from '@/hooks/test-management/useTestCaseComments';
import { useTestCaseVersionsCount } from '@/hooks/test-management/useTestCaseVersions';
import { useTestCaseAuditLogCount } from '@/hooks/test-management/useTestCaseAuditLog';
import { useTestDataRows, useTestDataParameters } from '@/hooks/test-management/useTestData';
import { useCyclesForTestCase, type CycleForTestCase } from '@/hooks/test-cycles/useCyclesForTestCase';
import { useCreateRunWithDataRows, useTestDataRowsForExecution, type DataRowSelection } from '@/hooks/test-management/useCreateRunWithDataRows';
import { SelectCycleToRunDialog } from '@/components/releases/test-case-detail/SelectCycleToRunDialog';
import { isValidUUID } from '@/lib/utils/assertUuid';
import { cn } from '@/lib/utils';

export default function TestCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isVersionPanelOpen, setIsVersionPanelOpen] = useState(false);
  const [isSelectCycleDialogOpen, setIsSelectCycleDialogOpen] = useState(false);
  
  // DDT (Data-Driven Testing) execution state
  const [isDataRowModalOpen, setIsDataRowModalOpen] = useState(false);
  const [dataRowsForExecution, setDataRowsForExecution] = useState<DataRowSelection[]>([]);
  const [selectedCycleForExecution, setSelectedCycleForExecution] = useState<CycleForTestCase | null>(null);
  
  // Validate UUID - redirect to list if invalid (display key passed instead of UUID)
  const isValidId = id ? isValidUUID(id) : false;
  
  // Persist active tab in URL
  const activeTab = searchParams.get('tab') || 'steps';
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab }, { replace: true });
  };
  
  // Real data from DB (only query if valid UUID)
  const { data: testCase, isLoading, isError, refetch } = useTestCase(isValidId ? id : undefined);
  const { data: stepsData } = useTestCaseSteps(isValidId ? id : undefined);
  const { data: executionHistory = [] } = useTestCaseExecutionHistory(isValidId ? id : undefined);
  const { data: commentsCount = 0 } = useTestCaseCommentsCount(isValidId ? id : undefined);
  const { data: versionsCount = 0 } = useTestCaseVersionsCount(isValidId ? id : undefined);
  const { data: changesCount = 0 } = useTestCaseAuditLogCount(isValidId ? id : undefined);
  const { data: testDataRows = [] } = useTestDataRows(isValidId ? id : undefined);
  const { data: parameters = [] } = useTestDataParameters(isValidId ? id : undefined);
  
  // Fetch cycles that contain this test case (for "Run in cycle" functionality)
  const { data: cyclesForCase = [] } = useCyclesForTestCase(isValidId ? id : undefined);
  
  // Clone mutation
  const cloneMutation = useCloneTestCase();
  
  // DDT execution hooks
  const { fetchRows } = useTestDataRowsForExecution(isValidId ? id : undefined);
  const createRunMutation = useCreateRunWithDataRows();
  
  // Keyboard navigation between test cases (navigation disabled when no IDs available)
  const { 
    currentIndex, 
    totalCount, 
    hasPrev, 
    hasNext, 
    goToPrev, 
    goToNext 
  } = useTestCaseNavigation({ 
    currentId: id || '', 
    testCaseIds: [], // Navigation IDs not available on detail page - could be passed via state
    enabled: isValidId
  });

  /**
   * Starts actual execution: creates run(s) in DB, then navigates to StepRunner
   */
  const startExecution = useCallback(async (cycle: CycleForTestCase, selectedRows: DataRowSelection[]) => {
    if (!id) return;
    
    try {
      const result = await createRunMutation.mutateAsync({
        cycle_id: cycle.cycleId,
        scope_id: cycle.scopeId,
        case_id: id,
        selected_rows: selectedRows,
      });

      // Navigate to the working execution route with the actual runId
      navigate(`/releases/execute/${cycle.cycleId}/${result.first_run_id}`);
    } catch (error) {
      console.error('Failed to start execution:', error);
      toast.error('Failed to start execution');
    }
  }, [id, createRunMutation, navigate]);

  /**
   * Handle "Run in cycle" button click:
   * 1. If no cycles, show warning
   * 2. If one cycle, check for DDT rows and proceed
   * 3. If multiple cycles, show selection dialog first
   */
  const handleExecute = useCallback(async () => {
    if (cyclesForCase.length === 0) {
      toast.warning('Test case not in any cycle', {
        description: 'Add this test case to a cycle first to execute it.',
      });
      return;
    }
    
    if (cyclesForCase.length === 1) {
      // Only one cycle - check for DDT rows
      const cycle = cyclesForCase[0];
      await handleCycleSelected(cycle);
    } else {
      // Multiple cycles - show selection dialog
      setIsSelectCycleDialogOpen(true);
    }
  }, [cyclesForCase]);

  /**
   * After cycle is selected (either auto or via dialog), check for DDT rows
   */
  const handleCycleSelected = useCallback(async (cycle: CycleForTestCase) => {
    setSelectedCycleForExecution(cycle);
    setIsSelectCycleDialogOpen(false);
    
    try {
      const rows = await fetchRows();
      
      if (rows.length === 0) {
        // No data rows - start single execution immediately
        await startExecution(cycle, []);
      } else {
        // Has data rows - show selection modal
        setDataRowsForExecution(rows);
        setIsDataRowModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching data rows:', error);
      // Fallback: start single execution
      await startExecution(cycle, []);
    }
  }, [fetchRows, startExecution]);

  /**
   * Handle data row selection confirmation
   */
  const handleDataRowsConfirmed = useCallback(async (selectedRows: DataRowSelection[]) => {
    if (!selectedCycleForExecution) return;
    
    setIsDataRowModalOpen(false);
    await startExecution(selectedCycleForExecution, selectedRows);
  }, [selectedCycleForExecution, startExecution]);

  const handleSelectCycleForExecution = useCallback((cycle: CycleForTestCase) => {
    handleCycleSelected(cycle);
  }, [handleCycleSelected]);

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
    setIsVersionPanelOpen(true);
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
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8"
            onClick={handleVersionHistory}
          >
            <History className="w-3.5 h-3.5 mr-1.5" />
            Version History
            {versionsCount > 0 && (
              <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                {versionsCount}
              </span>
            )}
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="sm" 
                className="h-8 bg-teal-600 hover:bg-teal-700 text-white"
                onClick={handleExecute}
              >
                <Play className="w-3.5 h-3.5 mr-1.5" />
                {cyclesForCase.length > 0 ? 'Run in Cycle' : 'Run Test'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {cyclesForCase.length === 0 
                ? 'Add to a cycle to execute'
                : cyclesForCase.length === 1
                  ? `Execute in ${cyclesForCase[0].cycleKey}`
                  : `Execute in one of ${cyclesForCase.length} cycles`}
            </TooltipContent>
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
                    value="data" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-3 data-[state=active]:shadow-none"
                  >
                    <Grid3X3 className="w-4 h-4 mr-2" />
                    Data
                    <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                      {testDataRows.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="runs" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-3 data-[state=active]:shadow-none"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Runs
                    <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                      {executionHistory.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="changes" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-3 data-[state=active]:shadow-none"
                  >
                    <History className="w-4 h-4 mr-2" />
                    Changes
                    <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                      {changesCount}
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
                    <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                      {commentsCount}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="versions" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-4 py-3 data-[state=active]:shadow-none"
                  >
                    <GitCommit className="w-4 h-4 mr-2" />
                    Versions
                    <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                      {versionsCount}
                    </span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="steps" className="mt-6">
                  <TestCaseSteps 
                    testCaseId={testCase.id}
                    steps={steps}
                    testCaseTitle={testCase.title}
                    testCaseType={testCase.type?.name?.toLowerCase()}
                  />
                </TabsContent>

                <TabsContent value="data" className="mt-6">
                  <TestCaseDataTab testCaseId={testCase.id} />
                </TabsContent>

                <TabsContent value="runs" className="mt-6">
                  <TestCaseExecutionHistory history={executionHistory} />
                </TabsContent>

                <TabsContent value="changes" className="mt-6">
                  <TestCaseChangeHistory testCaseId={testCase.id} />
                </TabsContent>

                <TabsContent value="requirements" className="mt-6">
                  <RequirementsCoverage requirements={[]} />
                </TabsContent>

                <TabsContent value="links" className="mt-6">
                  <TestCaseLinksAttachments testCaseId={id || ''} />
                </TabsContent>

                <TabsContent value="comments" className="mt-6">
                  <TestCaseComments />
                </TabsContent>

                <TabsContent value="versions" className="mt-6">
                  <TestCaseVersionHistory testCaseId={testCase.id} currentVersion={testCase.version || 1} />
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

      {/* Version History Panel */}
      <VersionHistoryPanel
        isOpen={isVersionPanelOpen}
        onClose={() => setIsVersionPanelOpen(false)}
        testCaseId={testCase.id}
        currentVersion={testCase.version || 1}
      />

      {/* Select Cycle Dialog (when test case is in multiple cycles) */}
      <SelectCycleToRunDialog
        open={isSelectCycleDialogOpen}
        onOpenChange={setIsSelectCycleDialogOpen}
        cycles={cyclesForCase}
        onSelectCycle={handleSelectCycleForExecution}
      />

      {/* Data Row Selection Modal (DDT execution) */}
      <DataRowSelectionModal
        open={isDataRowModalOpen}
        onOpenChange={setIsDataRowModalOpen}
        rows={dataRowsForExecution}
        columnOrder={parameters.map(p => p.parameter_name)}
        testCaseTitle={testCase?.title || 'Test Case'}
        isLoading={createRunMutation.isPending}
        onConfirm={handleDataRowsConfirmed}
      />
    </motion.div>
  );
}
