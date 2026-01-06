// TMRequirementsPage - Requirements Traceability Page
import React, { useState } from 'react';
import { Upload, RefreshCw, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProjectStore } from '../stores/projectStore';
import {
  useRequirementTree,
  useRequirementLinks,
  useProjectCoverageStats,
  useGapAnalysis,
  useAvailableTestCases,
  useLinkTestCases,
  useUnlinkTestCase,
} from '../hooks/useRequirements';
import {
  CoverageStatsBar,
  RequirementsTree,
  RequirementDetailPanel,
  LinkTestCasesDialog,
  GapAnalysisView,
} from '../components/requirements';
import { RequirementWithCoverage } from '../types/requirements';

type ViewTab = 'coverage' | 'matrix' | 'gaps';

export default function TMRequirementsPage() {
  const { selectedProjectId } = useProjectStore();
  const [activeTab, setActiveTab] = useState<ViewTab>('coverage');
  const [selectedRequirement, setSelectedRequirement] = useState<RequirementWithCoverage | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  // Data queries
  const { data: requirementTree = [], isLoading: treeLoading } = useRequirementTree(selectedProjectId);
  const { data: coverageStats } = useProjectCoverageStats(selectedProjectId);
  const { data: gaps } = useGapAnalysis(selectedProjectId);
  const { data: links = [], isLoading: linksLoading } = useRequirementLinks(selectedRequirement?.id);
  const { data: allTestCases = [] } = useAvailableTestCases(selectedProjectId);

  // Mutations
  const linkTestCases = useLinkTestCases();
  const unlinkTestCase = useUnlinkTestCase();

  const handleLinkTestCases = (testCaseIds: string[]) => {
    if (!selectedRequirement) return;
    linkTestCases.mutate({
      requirementId: selectedRequirement.id,
      testCaseIds,
    });
  };

  const handleUnlinkTestCase = (testCaseId: string) => {
    if (!selectedRequirement) return;
    unlinkTestCase.mutate({
      requirementId: selectedRequirement.id,
      testCaseId,
    });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 bg-gradient-to-b from-card to-card/50 border-b">
        <div>
          <h1 className="text-xl font-bold text-foreground">Requirements Traceability</h1>
          <p className="text-xs text-muted-foreground">Coverage, Matrix & Gap Analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-1.5" />
            Export Matrix
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Sync from Jira
          </Button>
          <Button size="sm" onClick={() => setLinkDialogOpen(true)} disabled={!selectedRequirement}>
            <Link className="w-4 h-4 mr-1.5" />
            Link Test Cases
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-8 bg-card border-b">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ViewTab)}>
          <TabsList className="h-auto p-0 bg-transparent">
            <TabsTrigger value="coverage" className="px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              Coverage View
            </TabsTrigger>
            <TabsTrigger value="matrix" className="px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              Traceability Matrix
            </TabsTrigger>
            <TabsTrigger value="gaps" className="px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
              Gap Analysis
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Coverage Stats Bar */}
      {coverageStats && (
        <CoverageStatsBar
          overallCoverage={coverageStats.coverage_percentage}
          totalRequirements={coverageStats.total_requirements}
          coveredRequirements={coverageStats.covered_requirements}
          executionCoverage={coverageStats.total_test_cases > 0 ? Math.round((coverageStats.executed_tests / coverageStats.total_test_cases) * 100) : 0}
          totalTests={coverageStats.total_test_cases}
          executedTests={coverageStats.executed_tests}
          passRate={coverageStats.pass_rate}
          passedTests={coverageStats.passed_tests}
          failedTests={coverageStats.failed_tests}
          uncoveredCount={coverageStats.uncovered_requirements}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'coverage' && (
          <>
            <RequirementsTree
              requirements={requirementTree}
              selectedRequirement={selectedRequirement}
              onSelectRequirement={setSelectedRequirement}
              isLoading={treeLoading}
            />
            {selectedRequirement ? (
              <RequirementDetailPanel
                requirement={selectedRequirement}
                links={links}
                linksLoading={linksLoading}
                onUnlinkTestCase={handleUnlinkTestCase}
                onAddTestCases={() => setLinkDialogOpen(true)}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select a requirement to view details
              </div>
            )}
          </>
        )}

        {activeTab === 'matrix' && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Traceability Matrix - Coming soon
          </div>
        )}

        {activeTab === 'gaps' && gaps && (
          <div className="flex-1 overflow-auto">
            <GapAnalysisView gaps={gaps} />
          </div>
        )}
      </div>

      {/* Link Dialog */}
      <LinkTestCasesDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        requirementKey={selectedRequirement?.requirement_key || ''}
        testCases={allTestCases}
        linkedTestCaseIds={links.map(l => l.test_case_id)}
        onLink={handleLinkTestCases}
        isLoading={linkTestCases.isPending}
      />
    </div>
  );
}
