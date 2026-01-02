/**
 * Test Reports Page
 * Command-center reporting with daily/weekly views, AI narratives, exports
 */

import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { 
  Download,
  Calendar,
  BarChart3,
  Share2,
  FileText,
  FileSpreadsheet,
  Link2,
  Copy,
  Check,
  Loader2,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { DailyCommandReport } from '../../components/tests/DailyCommandReport';
import { WeeklyRunwayReport } from '../../components/tests/WeeklyRunwayReport';
import { NarrativeReportPanel } from '../../components/tests/NarrativeReportPanel';
import { useTestReportMetrics } from '../../hooks/useTestReportMetrics';
import { useReportSharing } from '../../hooks/useReportSharing';

export function TestReportsPage() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const [searchParams] = useSearchParams();
  const programId = searchParams.get('programId');
  const [activeTab, setActiveTab] = useState('daily');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const {
    dailyMetrics,
    weeklyMetrics,
    risks,
    recommendedActions,
    releaseBlockers,
    coverageGaps,
    assigneeCapacity,
    defectTrend,
    releaseReadiness,
    isLoading,
  } = useTestReportMetrics(programId);

  const {
    createShareLink,
    isCreatingShare,
    exportToPDF,
    exportToCSV,
    exportProgress,
  } = useReportSharing(programId);

  const handleExportPDF = async () => {
    const reportType = activeTab as 'daily' | 'weekly';
    await exportToPDF(
      reportType,
      { dailyMetrics, weeklyMetrics },
      risks,
      recommendedActions
    );
  };

  const handleExportCSV = () => {
    const reportType = activeTab as 'daily' | 'weekly';
    exportToCSV(reportType, { dailyMetrics, weeklyMetrics, risks });
  };

  const handleCreateShareLink = async () => {
    const reportType = activeTab as 'daily' | 'weekly';
    const result = await createShareLink(reportType);
    setShareUrl(result.url);
    setShareDialogOpen(true);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRiskClick = (risk: any) => {
    toast.info(`Opening ${risk.entityType}: ${risk.entityId}`);
  };

  const handleActionClick = (action: any) => {
    toast.info(`Executing action: ${action.actionType}`);
  };

  const handleGapClick = (gap: any) => {
    toast.info(`Opening feature: ${gap.featureName}`);
  };

  const handleBlockerClick = (blocker: any) => {
    toast.info(`Opening blocker: ${blocker.title}`);
  };

  return (
    <div className="h-full flex flex-col bg-surface-1">
      {/* Page Header */}
      <div className="px-6 py-4 border-b border-border-default bg-surface-2">
        <div className="flex items-center gap-2 text-sm text-text-tertiary mb-2">
          <span>{projectKey}</span>
          <span>/</span>
          <span>Tests</span>
          <span>/</span>
          <span className="text-text-primary font-medium">Reports</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Test Reports</h1>
            <p className="text-sm text-text-tertiary mt-0.5">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCreateShareLink}
              disabled={isCreatingShare}
            >
              {isCreatingShare ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4 mr-1.5" />
              )}
              Share
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1.5" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleCreateShareLink}>
                  <Link2 className="h-4 w-4 mr-2" />
                  Create Share Link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {exportProgress > 0 && exportProgress < 100 && (
          <div className="mt-3">
            <Progress value={exportProgress} className="h-1" />
            <p className="text-xs text-text-tertiary mt-1">Generating report... {exportProgress}%</p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-surface-2 border border-border-default mb-6">
            <TabsTrigger value="daily" className="gap-1.5 data-[state=active]:bg-accent-primary data-[state=active]:text-white">
              <Calendar className="h-4 w-4" />
              Daily Command Center
            </TabsTrigger>
            <TabsTrigger value="weekly" className="gap-1.5 data-[state=active]:bg-accent-primary data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4" />
              Weekly Runway
            </TabsTrigger>
            <TabsTrigger value="narrative" className="gap-1.5 data-[state=active]:bg-accent-primary data-[state=active]:text-white">
              <Sparkles className="h-4 w-4" />
              AI Narratives
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily">
            <DailyCommandReport
              metrics={dailyMetrics}
              risks={risks}
              recommendedActions={recommendedActions}
              isLoading={isLoading}
              onRiskClick={handleRiskClick}
              onActionClick={handleActionClick}
            />
          </TabsContent>

          <TabsContent value="weekly">
            <WeeklyRunwayReport
              metrics={weeklyMetrics}
              releaseBlockers={releaseBlockers}
              coverageGaps={coverageGaps}
              assigneeCapacity={assigneeCapacity}
              defectTrend={defectTrend}
              releaseReadiness={releaseReadiness}
              isLoading={isLoading}
              onGapClick={handleGapClick}
              onBlockerClick={handleBlockerClick}
            />
          </TabsContent>

          <TabsContent value="narrative" className="h-[calc(100vh-280px)]">
            <NarrativeReportPanel programId={programId || undefined} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Report</DialogTitle>
            <DialogDescription>
              Anyone with this link can view the {activeTab} report (read-only). Link expires in 7 days.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 mt-4">
            <Input
              value={shareUrl}
              readOnly
              className="flex-1 font-mono text-sm"
            />
            <Button size="sm" onClick={handleCopyLink}>
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TestReportsPage;
