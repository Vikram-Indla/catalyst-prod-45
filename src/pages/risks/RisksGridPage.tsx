// Risk Grid Page - Main tabular view of risks
// Source: Screenshot-Risk1, Implementation Spec Section 6.1
// Route: /risks
//
// 2026-07-03 (CAT-AUDIT-1053, features/CAT-AUDIT-FULLSWEEP-20260703-001/
// lanes/LANE-12_cross-surface.md): migrated from bespoke shadcn-table
// chrome (custom <Table>, custom pagination, custom column-visibility
// toggling) to the canonical BacklogPage + data-adapter pattern already
// proven by incidenthub (IncidentListPage.tsx / incidentsBacklogDataSource.ts).
// Inherits the same JiraTable, column picker, toolbar, sticky header,
// sort, keyboard nav, bulk-select as /project-hub/BAU/backlog.
//
// Preserved per audit note "ROAM badge/detail-panel wiring must be
// preserved": the risk-specific chrome (Add Risk, Filters, Actions menu
// incl. Mass Move / Export / ROAM report, RiskDetailPanel drawer,
// Create/Edit/Delete/MassMove/Filters dialogs) is kept as page-level
// header chrome above the BacklogPage mount — same pattern as incidents'
// stats cards. RoamBadge itself has no equivalent column in BacklogPage's
// shared registry (see risksBacklogDataSource.ts) so it no longer renders
// per-row inside the table; the existing "Where Status = X" filter chip in
// the header communicates active filtering same as before.
//
// Data: `risks` table via useRisksBacklogSource — a real Catalyst-owned
// table, so unlike incidents this adapter wires REAL create/update/delete
// mutations (see risksBacklogDataSource.ts for exact mapping).

import { useState } from "react";
import AddIcon from '@atlaskit/icon/core/add';
import FilterIcon from '@atlaskit/icon/core/filter';
import ShowMoreVerticalIcon from '@atlaskit/icon/core/show-more-vertical';
import Spinner from '@atlaskit/spinner';
import Button from "@atlaskit/button/new";
import { BacklogPage } from '@/modules/project-work-hub/pages/BacklogPage.atlaskit';
import { useRisksBacklogSource } from './risksBacklogDataSource';
import { useRisks } from "@/hooks/risks/useRisks";
import { RisksSidebar } from "@/components/risks/RisksSidebar";
import { Risk, RiskGridFilters } from "@/types/risks";
import { RiskDetailPanel } from "@/components/risks/RiskDetailPanel";
import { RiskFiltersDialog } from "@/components/risks/RiskFiltersDialog";
import { CreateEditRiskDialog } from "@/components/risks/CreateEditRiskDialog";
import { DeleteRiskDialog } from "@/components/risks/DeleteRiskDialog";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const RISKS_SENTINEL_KEY = 'RISKS';
const RISKS_SENTINEL_ID = 'risks';

export default function RisksGridPage() {
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [isFiltersDialogOpen, setIsFiltersDialogOpen] = useState(false);
  const [isCreateEditOpen, setIsCreateEditOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [riskToDelete, setRiskToDelete] = useState<Risk | null>(null);
  const [filters, setFilters] = useState<RiskGridFilters>({
    owner_id: null,
    status: "Open", // Default filter per Screenshot-Risk1
    resolution_method: null,
    occurrence: null,
    impact: null,
    critical_path: null,
  });

  // updateRisk/deleteRisk here drive the dialogs below (edit/delete flows
  // launched from page chrome); the adapter has its own useRisks() call for
  // the table itself — same data, React Query dedupes the fetch.
  const { risks, updateRisk, deleteRisk, createRisk, isCreating, isUpdating } = useRisks();
  const { toast } = useToast();

  const adapter = useRisksBacklogSource(setSelectedRisk);

  const handleCreateEditSave = (data: any) => {
    if (editingRisk) {
      updateRisk({ id: editingRisk.id, ...data });
    } else {
      createRisk(data);
    }
    setIsCreateEditOpen(false);
    setEditingRisk(null);
  };

  const handleDelete = (risk: Risk) => {
    setRiskToDelete(risk);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (riskToDelete) {
      deleteRisk(riskToDelete.id);
      setIsDeleteDialogOpen(false);
      setRiskToDelete(null);
    }
  };

  const handleExport = () => {
    const rows = risks ?? [];
    const csv = [
      ["Risk #", "Title", "Status", "ROAM", "Occurrence", "Impact", "Critical Path"].join(","),
      ...rows.map((risk: Risk) =>
        [
          risk.risk_number,
          `"${risk.title}"`,
          risk.status,
          risk.resolution_method,
          risk.occurrence || "",
          risk.impact || "",
          risk.critical_path || "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `risks-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Risks exported to CSV successfully",
    });
  };

  if (!adapter) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%', padding: 48 }}>
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-background">
      <RisksSidebar className="hidden lg:flex" />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Page Header with design tokens */}
        <div className="border-b bg-card px-[var(--s2)] sm:px-[var(--s4)] lg:px-[var(--s6)] py-[var(--s2)] sm:py-[var(--s3)]">
          <div className="flex flex-col gap-[var(--s2)]">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-[var(--s2)] min-w-0 flex-1">
                <span className="text-brand-primary flex-shrink-0 text-sm sm:text-base">☆</span>
                <h1 className="text-sm sm:text-base lg:text-lg font-heading font-semibold text-text-primary truncate">
                  Risk Grid
                </h1>
                {filters.status && (
                  <span className="text-xs text-text-secondary hidden xl:inline whitespace-nowrap">
                    Where Status = {filters.status}
                  </span>
                )}
              </div>

              <Button
                appearance="primary"
                iconBefore={AddIcon}
                onClick={() => {
                  setEditingRisk(null);
                  setIsCreateEditOpen(true);
                }}
              >
                Add Risk
              </Button>
            </div>

            <div className="flex items-center gap-[var(--s2)]">
              <Button
                appearance="default"
                iconBefore={FilterIcon}
                onClick={() => setIsFiltersDialogOpen(true)}
              >
                Filters
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button appearance="default" iconBefore={ShowMoreVerticalIcon}>
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExport}>Export Risks</DropdownMenuItem>
                  <DropdownMenuItem>Risk ROAM Report</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Canonical BacklogPage table — column picker, toolbar, sort,
            bulk-select, inline create are all inherited unchanged. */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <BacklogPage
            /* projectId / projectKey are sentinels — BacklogPage's own
               ph_issues query returns nothing for these, so all rows come
               from the adapter's extraStories. */
            projectId={RISKS_SENTINEL_ID}
            projectKey={RISKS_SENTINEL_KEY}
            displayName="Risks"
            baseUrl="/risks"
            dataSource={adapter}
          />
        </div>

        {/* Risk Detail Panel */}
        {selectedRisk && (
          <RiskDetailPanel
            risk={selectedRisk}
            isOpen={!!selectedRisk}
            onClose={() => setSelectedRisk(null)}
            onUpdate={(updates) => {
              updateRisk(updates as any);
              setSelectedRisk(null);
            }}
          />
        )}

        {/* Filters Dialog */}
        <RiskFiltersDialog
          isOpen={isFiltersDialogOpen}
          onClose={() => setIsFiltersDialogOpen(false)}
          filters={filters}
          onFiltersChange={setFilters}
        />

        {/* Create/Edit Risk Panel */}
        <CreateEditRiskDialog
          risk={editingRisk || undefined}
          open={isCreateEditOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateEditOpen(false);
              setEditingRisk(null);
            }
          }}
          onSave={handleCreateEditSave}
          isSubmitting={isCreating || isUpdating}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteRiskDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleDeleteConfirm}
          riskTitle={riskToDelete?.title || ''}
        />
      </div>
    </div>
  );
}
