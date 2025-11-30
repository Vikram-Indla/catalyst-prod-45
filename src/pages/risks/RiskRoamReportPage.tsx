// Risk ROAM Report Page - Kanban-style ROAM board
// Source: Screenshot-RiskROAMReport, Implementation Spec Section 6.2
// Route: /risk-roam-report

import { useState } from "react";
import { Download, Settings } from "lucide-react";
import { useRisks } from "@/hooks/risks/useRisks";
import { Risk, RoamFilters, ChartVisibility, RoamStatus } from "@/types/risks";
import { ROAM_COLUMN_ORDER } from "@/constants/risks";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RoamColumn } from "@/components/risks/RoamColumn";
import { ResolutionModal } from "@/components/risks/ResolutionModal";

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

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Page Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-brand-gold">☆</span>
            <h1 className="text-lg font-heading font-semibold text-text-primary">
              Risk ROAM
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
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
            
            <Button variant="outline" size="sm">
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
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64 text-text-muted">
              Loading risks...
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4 mb-8">
              {ROAM_COLUMN_ORDER.map(status => (
                <RoamColumn
                  key={status}
                  status={status}
                  risks={risksByStatus[status]}
                  onRiskMove={handleRiskMove}
                />
              ))}
            </div>
          )}

          {/* Charts Section */}
          <div className="grid grid-cols-3 gap-6 mt-8">
            {chartVisibility.openVsClosed && (
              <div className="bg-card border rounded-lg p-6">
                <h3 className="text-sm font-medium text-text-primary mb-4">
                  Open vs. closed
                </h3>
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-brand-gold">
                      {openCount + closedCount}
                    </div>
                    <div className="text-sm text-text-muted">total</div>
                  </div>
                </div>
                <div className="space-y-1 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-brand-gold"></div>
                    <span className="text-text-secondary">Open - {openCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-success"></div>
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
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-brand-gold">
                      {Object.values(occurrenceCounts).reduce((a, b) => a + b, 0)}
                    </div>
                    <div className="text-sm text-text-muted">total</div>
                  </div>
                </div>
                <div className="space-y-1 mt-4 text-sm">
                  {Object.entries(occurrenceCounts).map(([level, count]) => (
                    <div key={level} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-brand-gold"></div>
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
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-brand-gold">
                      {Object.values(impactCounts).reduce((a, b) => a + b, 0)}
                    </div>
                    <div className="text-sm text-text-muted">total</div>
                  </div>
                </div>
                <div className="space-y-1 mt-4 text-sm">
                  {Object.entries(impactCounts).map(([level, count]) => (
                    <div key={level} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-brand-gold"></div>
                      <span className="text-text-secondary">{level} - {count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
  );
}
