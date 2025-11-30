// Risk Grid Page - Main tabular view of risks
// Source: Screenshot-Risk1, Implementation Spec Section 6.1
// Route: /risks

import { useState, useMemo } from "react";
import { Search, Filter, MoreVertical, Plus } from "lucide-react";
import { useRisks } from "@/hooks/risks/useRisks";
import { RisksSidebar } from "@/components/risks/RisksSidebar";
import { Risk, RiskGridFilters } from "@/types/risks";
import { RoamBadge } from "@/components/risks/RoamBadge";
import { RiskDetailPanel } from "@/components/risks/RiskDetailPanel";
import { RiskFiltersDialog } from "@/components/risks/RiskFiltersDialog";
import { CreateEditRiskPanel } from "@/components/risks/CreateEditRiskPanel";
import { DeleteRiskDialog } from "@/components/risks/DeleteRiskDialog";
import { MassMoveDialog } from "@/components/risks/MassMoveDialog";
import { ColumnsDialog } from "@/components/risks/ColumnsDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function RisksGridPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRiskIds, setSelectedRiskIds] = useState<string[]>([]);
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [isFiltersDialogOpen, setIsFiltersDialogOpen] = useState(false);
  const [isCreateEditOpen, setIsCreateEditOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [riskToDelete, setRiskToDelete] = useState<Risk | null>(null);
  const [isMassMoveOpen, setIsMassMoveOpen] = useState(false);
  const [isColumnsDialogOpen, setIsColumnsDialogOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'roam', 'title', 'pi', 'occurrence', 'impact', 'critical_path', 'status'
  ]);
  const [filters, setFilters] = useState<RiskGridFilters>({
    program_increment_id: null,
    owner_id: null,
    status: "Open", // Default filter per Screenshot-Risk1
    resolution_method: null,
    occurrence: null,
    impact: null,
    critical_path: null
  });

  // Get programId from navigation context - for now, using first program
  const { risks, isLoading, createRisk, updateRisk, deleteRisk, isCreating, isUpdating } = useRisks();
  const { toast } = useToast();

  // Filter and search risks
  const filteredRisks = useMemo(() => {
    return risks?.filter((risk: Risk) => {
      // Apply status filter
      if (filters.status && risk.status !== filters.status) return false;
      
      // Apply search
      if (searchQuery && !risk.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      return true;
    }) || [];
  }, [risks, filters, searchQuery]);

  const toggleRiskSelection = (riskId: string) => {
    setSelectedRiskIds(prev =>
      prev.includes(riskId) ? prev.filter(id => id !== riskId) : [...prev, riskId]
    );
  };

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

  const handleMassMove = (piId: string) => {
    selectedRiskIds.forEach(riskId => {
      updateRisk({ id: riskId, program_increment_id: piId });
    });
    setSelectedRiskIds([]);
    setIsMassMoveOpen(false);
  };

  const handleExport = () => {
    const csv = [
      ["Risk #", "Title", "Status", "ROAM", "Occurrence", "Impact", "Critical Path"].join(","),
      ...filteredRisks.map((risk) =>
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

  return (
    <div className="flex h-full bg-background">
      <RisksSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
      {/* Page Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-brand-gold">☆</span>
            <h1 className="text-lg font-heading font-semibold text-text-primary">
              Risk Grid
            </h1>
            {filters.status && (
              <span className="text-sm text-text-secondary">
                Where Status = {filters.status}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsFiltersDialogOpen(true)}>
              <Filter className="w-4 h-4 mr-2" />
              Apply Filters
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="w-4 h-4 mr-2" />
                  More Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsColumnsDialogOpen(true)}>
                  Columns Shown
                </DropdownMenuItem>
                <DropdownMenuItem 
                  disabled={selectedRiskIds.length === 0}
                  onClick={() => setIsMassMoveOpen(true)}
                >
                  Mass Move
                </DropdownMenuItem>
                <DropdownMenuItem 
                  disabled={selectedRiskIds.length === 0}
                  onClick={() => {
                    if (selectedRiskIds.length > 0 && filteredRisks.length > 0) {
                      const firstSelected = filteredRisks.find(r => r.id === selectedRiskIds[0]);
                      if (firstSelected) handleDelete(firstSelected);
                    }
                  }}
                >
                  Delete
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport}>Export Risks</DropdownMenuItem>
                <DropdownMenuItem>Risk ROAM Report</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
              size="sm" 
              className="bg-brand-gold hover:bg-brand-gold-hover text-white"
              onClick={() => {
                setEditingRisk(null);
                setIsCreateEditOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Risk
            </Button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-6 py-3 border-b">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            placeholder="Search risks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-text-muted">
            Loading risks...
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">☆</TableHead>
                <TableHead className="w-16">ID</TableHead>
                {visibleColumns.includes('roam') && <TableHead className="w-32">ROAM</TableHead>}
                {visibleColumns.includes('title') && <TableHead>Title</TableHead>}
                {visibleColumns.includes('pi') && <TableHead className="w-32">PI</TableHead>}
                {visibleColumns.includes('occurrence') && <TableHead className="w-20">Occ</TableHead>}
                {visibleColumns.includes('impact') && <TableHead className="w-20">Imp</TableHead>}
                {visibleColumns.includes('critical_path') && <TableHead className="w-24">Critical</TableHead>}
                {visibleColumns.includes('status') && <TableHead className="w-20">Status</TableHead>}
                <TableHead className="w-16">
                  <Checkbox />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRisks.map((risk: Risk) => (
                <TableRow
                  key={risk.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedRisk(risk)}
                >
                  <TableCell>☆</TableCell>
                  <TableCell className="font-medium text-text-primary">
                    {risk.risk_number}
                  </TableCell>
                  {visibleColumns.includes('roam') && (
                    <TableCell>
                      <RoamBadge status={risk.resolution_method} />
                    </TableCell>
                  )}
                  {visibleColumns.includes('title') && (
                    <TableCell className="text-text-primary">
                      {risk.title}
                    </TableCell>
                  )}
                  {visibleColumns.includes('pi') && (
                    <TableCell className="text-text-secondary">
                      PI-{risk.program_increment_id.substring(0, 8)}
                    </TableCell>
                  )}
                  {visibleColumns.includes('occurrence') && (
                    <TableCell className="text-text-secondary">
                      {risk.occurrence || '—'}
                    </TableCell>
                  )}
                  {visibleColumns.includes('impact') && (
                    <TableCell className="text-text-secondary">
                      {risk.impact || '—'}
                    </TableCell>
                  )}
                  {visibleColumns.includes('critical_path') && (
                    <TableCell className="text-text-secondary">
                      {risk.critical_path || '—'}
                    </TableCell>
                  )}
                  {visibleColumns.includes('status') && (
                    <TableCell className="text-text-secondary">
                      {risk.status}
                    </TableCell>
                  )}
                  <TableCell>
                    <Checkbox
                      checked={selectedRiskIds.includes(risk.id)}
                      onCheckedChange={() => toggleRiskSelection(risk.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="border-t px-6 py-3 bg-card">
        <div className="flex items-center justify-between text-sm text-text-secondary">
          <div>
            {filteredRisks.length > 0 
              ? `1-${Math.min(10, filteredRisks.length)} of ${filteredRisks.length} Records`
              : '0 Records'}
          </div>
          <div className="flex items-center gap-2">
            <span>1 of {Math.ceil(filteredRisks.length / 10) || 1}</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm">First</Button>
              <Button variant="outline" size="sm">Prev</Button>
              <Button variant="outline" size="sm">Next</Button>
              <Button variant="outline" size="sm">Last</Button>
            </div>
          </div>
        </div>
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
      <CreateEditRiskPanel
        risk={editingRisk || undefined}
        isOpen={isCreateEditOpen}
        onClose={() => {
          setIsCreateEditOpen(false);
          setEditingRisk(null);
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

      {/* Mass Move Dialog */}
      <MassMoveDialog
        isOpen={isMassMoveOpen}
        onClose={() => setIsMassMoveOpen(false)}
        onConfirm={handleMassMove}
        selectedCount={selectedRiskIds.length}
      />

      {/* Columns Dialog */}
      <ColumnsDialog
        isOpen={isColumnsDialogOpen}
        onClose={() => setIsColumnsDialogOpen(false)}
        visibleColumns={visibleColumns}
        onColumnsChange={setVisibleColumns}
      />
      </div>
    </div>
  );
}
