// Risk ROAM Report Page - Kanban-style ROAM board
// Source: Screenshot-RiskROAMReport, Implementation Spec Section 6.2
// Route: /risk-roam-report

import { useState } from "react";
import { Download, Settings } from "lucide-react";
import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";
import { useRisks } from "@/hooks/risks/useRisks";
import { RisksSidebar } from "@/components/risks/RisksSidebar";
import { Risk, RoamFilters, ChartVisibility, RoamStatus } from "@/types/risks";
import { ROAM_COLUMN_ORDER } from "@/constants/risks";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RoamColumn } from "@/components/risks/RoamColumn";
import { ResolutionModal } from "@/components/risks/ResolutionModal";
import { RiskDonutChart } from "@/components/risks/RiskDonutChart";
import { ViewSettingsDialog } from "@/components/risks/ViewSettingsDialog";
import { CHART_COLORS } from "@/constants/risks";

export default function RiskRoamReportPage() {
  const { risks, isLoading, updateRisk } = useRisks();
  
  const [filters, setFilters] = useState<RoamFilters>({
    relationship: null,
    occurrence: 'all',
    impact: 'all'
  });

  const [chartVisibility, setChartVisibility] = useState<ChartVisibility>({
    openVsClosed: true,
    riskOfOccurrence: true,
    impactOfOccurrence: true
  });

  const [newExperience, setNewExperience] = useState(true);
  const [viewSettingsOpen, setViewSettingsOpen] = useState(false);
  
  const [resolutionModal, setResolutionModal] = useState<{
    isOpen: boolean;
    riskId: string | null;
    currentStatus: RoamStatus | null;
    newStatus: RoamStatus | null;
  }>({
    isOpen: false,
    riskId: null,
    currentStatus: null,
    newStatus: null,
  });

  // Filter risks based on current filters
  const filteredRisks = risks?.filter((risk: Risk) => {
    if (filters.relationship && risk.relationship !== filters.relationship) return false;
    if (filters.occurrence !== 'all' && risk.occurrence !== filters.occurrence) return false;
    if (filters.impact !== 'all' && risk.impact !== filters.impact) return false;
    return true;
  }) || [];

  // Group risks by ROAM status
  const risksByStatus = ROAM_COLUMN_ORDER.reduce((acc, status) => {
    acc[status] = filteredRisks.filter((risk: Risk) => risk.resolution_method === status);
    return acc;
  }, {} as Record<string, Risk[]>);

  // Calculate chart data
  const openCount = filteredRisks.filter((r: Risk) => r.status === 'Open').length;
  const closedCount = filteredRisks.filter((r: Risk) => r.status === 'Closed').length;
  
  const occurrenceCounts = {
    Critical: filteredRisks.filter((r: Risk) => r.occurrence === 'Critical').length,
    High: filteredRisks.filter((r: Risk) => r.occurrence === 'High').length,
    Medium: filteredRisks.filter((r: Risk) => r.occurrence === 'Medium').length,
    Low: filteredRisks.filter((r: Risk) => r.occurrence === 'Low').length,
  };

  const impactCounts = {
    Critical: filteredRisks.filter((r: Risk) => r.impact === 'Critical').length,
    High: filteredRisks.filter((r: Risk) => r.impact === 'High').length,
    Medium: filteredRisks.filter((r: Risk) => r.impact === 'Medium').length,
    Low: filteredRisks.filter((r: Risk) => r.impact === 'Low').length,
  };

  const handleRiskMove = (riskId: string, newStatus: string) => {
    const risk = risks?.find((r: Risk) => r.id === riskId);
    if (!risk) return;

    const newRoamStatus = newStatus as RoamStatus;
    
    // Show modal for Resolved or Mitigated
    if (newRoamStatus === 'Resolved' || newRoamStatus === 'Mitigated') {
      setResolutionModal({
        isOpen: true,
        riskId,
        currentStatus: risk.resolution_method,
        newStatus: newRoamStatus,
      });
    } else {
      // Directly update for Owned/Accepted
      updateRisk({
        id: riskId,
        resolution_method: newRoamStatus
      });
    }
  };

  const handleResolutionConfirm = (reason: string) => {
    if (!resolutionModal.riskId || !resolutionModal.newStatus) return;

    updateRisk({
      id: resolutionModal.riskId,
      resolution_method: resolutionModal.newStatus,
      resolution_status: reason,
    });

    setResolutionModal({
      isOpen: false,
      riskId: null,
      currentStatus: null,
      newStatus: null,
    });
  };

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // Dropped outside valid droppable
    if (!destination) return;

    // No movement
    if (source.droppableId === destination.droppableId) return;

    const riskId = draggableId;
    const newStatus = destination.droppableId as RoamStatus;

    handleRiskMove(riskId, newStatus);
  };

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      <RisksSidebar className="hidden lg:flex" />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
      {/* Page Header */}
      <div className="border-b bg-card px-2 sm:px-4 lg:px-6 py-2 sm:py-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-brand-gold flex-shrink-0 text-sm sm:text-base">☆</span>
              <h1 className="text-sm sm:text-base lg:text-lg font-heading font-semibold text-text-primary truncate">
                Risk ROAM
              </h1>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="new-exp" className="text-sm text-text-secondary">
                New experience
              </Label>
              <Switch
                id="new-exp"
                checked={newExperience}
                onCheckedChange={setNewExperience}
              />
            </div>
            
            <Button variant="outline" size="sm" onClick={() => setViewSettingsOpen(true)}>
              <Settings className="w-4 h-4 mr-2" />
              View settings
            </Button>

            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* ROAM Kanban Board */}
      <div className="flex-1 overflow-auto">
        <div className="p-3 sm:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64 text-sm text-text-muted">
              Loading risks...
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                {ROAM_COLUMN_ORDER.map(status => (
                  <Droppable key={status} droppableId={status}>
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps}>
                        <RoamColumn
                          status={status}
                          risks={risksByStatus[status]}
                          onRiskMove={handleRiskMove}
                        />
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                ))}
              </div>
            </DragDropContext>
          )}

          {/* Charts Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-8">
            {chartVisibility.openVsClosed && (
              <div className="bg-card border rounded-lg p-6">
                <h3 className="text-sm font-medium text-text-primary mb-4">
                  Open vs. closed
                </h3>
                <RiskDonutChart
                  data={[
                    { name: 'Open', value: openCount, color: CHART_COLORS.openVsClosed.Open },
                    { name: 'Closed', value: closedCount, color: CHART_COLORS.openVsClosed.Closed },
                  ]}
                />
                <div className="space-y-1 mt-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.openVsClosed.Open }}></div>
                    <span className="text-text-secondary">Open - {openCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.openVsClosed.Closed }}></div>
                    <span className="text-text-secondary">Closed - {closedCount}</span>
                  </div>
                </div>
              </div>
            )}

            {chartVisibility.riskOfOccurrence && (
              <div className="bg-card border rounded-lg p-6">
                <h3 className="text-sm font-medium text-text-primary mb-4">
                  Risk of occurrence
                </h3>
                <RiskDonutChart
                  data={[
                    { name: 'Critical', value: occurrenceCounts.Critical, color: CHART_COLORS.severity.Critical },
                    { name: 'High', value: occurrenceCounts.High, color: CHART_COLORS.severity.High },
                    { name: 'Medium', value: occurrenceCounts.Medium, color: CHART_COLORS.severity.Medium },
                    { name: 'Low', value: occurrenceCounts.Low, color: CHART_COLORS.severity.Low },
                  ]}
                />
                <div className="space-y-1 mt-2 text-sm">
                  {Object.entries(occurrenceCounts).map(([level, count]) => (
                    <div key={level} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.severity[level as keyof typeof CHART_COLORS.severity] }}></div>
                      <span className="text-text-secondary">{level} - {count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {chartVisibility.impactOfOccurrence && (
              <div className="bg-card border rounded-lg p-6">
                <h3 className="text-sm font-medium text-text-primary mb-4">
                  Impact of occurrence
                </h3>
                <RiskDonutChart
                  data={[
                    { name: 'Critical', value: impactCounts.Critical, color: CHART_COLORS.severity.Critical },
                    { name: 'High', value: impactCounts.High, color: CHART_COLORS.severity.High },
                    { name: 'Medium', value: impactCounts.Medium, color: CHART_COLORS.severity.Medium },
                    { name: 'Low', value: impactCounts.Low, color: CHART_COLORS.severity.Low },
                  ]}
                />
                <div className="space-y-1 mt-2 text-sm">
                  {Object.entries(impactCounts).map(([level, count]) => (
                    <div key={level} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.severity[level as keyof typeof CHART_COLORS.severity] }}></div>
                      <span className="text-text-secondary">{level} - {count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Settings Dialog */}
      <ViewSettingsDialog
        isOpen={viewSettingsOpen}
        onClose={() => setViewSettingsOpen(false)}
        chartVisibility={chartVisibility}
        onChartVisibilityChange={setChartVisibility}
      />

      {/* Resolution Modal */}
      {resolutionModal.isOpen && resolutionModal.currentStatus && resolutionModal.newStatus && (
        <ResolutionModal
          isOpen={resolutionModal.isOpen}
          onClose={() => setResolutionModal({ ...resolutionModal, isOpen: false })}
          currentStatus={resolutionModal.currentStatus}
          newStatus={resolutionModal.newStatus}
          onConfirm={handleResolutionConfirm}
        />
      )}
      </div>
    </div>
  );
}
