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
    <div className="flex h-full w-full bg-background">
      <RisksSidebar className="hidden lg:flex" />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
      {/* Page Header */}
      <div className="border-b bg-card px-2 sm:px-4 lg:px-6 py-2 sm:py-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-brand-gold flex-shrink-0 text-sm sm:text-base">☆</span>
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
              size="sm"
              className="bg-brand-gold hover:bg-brand-gold-hover text-white flex-shrink-0"
              onClick={() => {
                setEditingRisk(null);
                setIsCreateEditOpen(true);
              }}
            >
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Risk</span>
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsFiltersDialogOpen(true)}
              className="flex-shrink-0"
            >
              <Filter className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Filters</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex-shrink-0">
                  <MoreVertical className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Actions</span>
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
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-2 sm:px-4 lg:px-6 py-2 border-b">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            placeholder="Search risks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-sm h-9"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 overflow-auto px-2 sm:px-4 lg:px-6 py-2 sm:py-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-xs sm:text-sm text-text-muted">
            Loading risks...
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-8 sm:w-10">☆</TableHead>
                <TableHead className="w-12 sm:w-16 text-xs sm:text-sm">ID</TableHead>
                {visibleColumns.includes('roam') && <TableHead className="w-24 sm:w-32 text-xs sm:text-sm">ROAM</TableHead>}
                {visibleColumns.includes('title') && <TableHead className="text-xs sm:text-sm">Title</TableHead>}
                {visibleColumns.includes('pi') && <TableHead className="w-20 sm:w-32 text-xs sm:text-sm hidden md:table-cell">PI</TableHead>}
                {visibleColumns.includes('occurrence') && <TableHead className="w-16 sm:w-20 text-xs sm:text-sm hidden lg:table-cell">Occ</TableHead>}
                {visibleColumns.includes('impact') && <TableHead className="w-16 sm:w-20 text-xs sm:text-sm hidden lg:table-cell">Imp</TableHead>}
                {visibleColumns.includes('critical_path') && <TableHead className="w-20 sm:w-24 text-xs sm:text-sm hidden xl:table-cell">Critical</TableHead>}
                {visibleColumns.includes('status') && <TableHead className="w-16 sm:w-20 text-xs sm:text-sm">Status</TableHead>}
                <TableHead className="w-12 sm:w-16">
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
                  <TableCell className="text-xs sm:text-sm">☆</TableCell>
                  <TableCell className="font-medium text-text-primary text-xs sm:text-sm">
                    {risk.risk_number}
                  </TableCell>
                  {visibleColumns.includes('roam') && (
                    <TableCell>
                      <RoamBadge status={risk.resolution_method} />
                    </TableCell>
                  )}
                  {visibleColumns.includes('title') && (
                    <TableCell className="text-text-primary text-xs sm:text-sm">
                      {risk.title}
                    </TableCell>
                  )}
                  {visibleColumns.includes('pi') && (
                    <TableCell className="text-text-secondary text-xs sm:text-sm hidden md:table-cell">
                      PI-{risk.program_increment_id.substring(0, 8)}
                    </TableCell>
                  )}
                  {visibleColumns.includes('occurrence') && (
                    <TableCell className="text-text-secondary text-xs sm:text-sm hidden lg:table-cell">
                      {risk.occurrence || '—'}
                    </TableCell>
                  )}
                  {visibleColumns.includes('impact') && (
                    <TableCell className="text-text-secondary text-xs sm:text-sm hidden lg:table-cell">
                      {risk.impact || '—'}
                    </TableCell>
                  )}
                  {visibleColumns.includes('critical_path') && (
                    <TableCell className="text-text-secondary text-xs sm:text-sm hidden xl:table-cell">
                      {risk.critical_path || '—'}
                    </TableCell>
                  )}
                  {visibleColumns.includes('status') && (
                    <TableCell className="text-text-secondary text-xs sm:text-sm">
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
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="border-t px-2 sm:px-4 lg:px-6 py-2 bg-card">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm text-text-secondary">
          <div className="text-center sm:text-left">
            {filteredRisks.length > 0 
              ? `1-${Math.min(10, filteredRisks.length)} of ${filteredRisks.length}`
              : '0 Records'}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs">Page 1 of {Math.ceil(filteredRisks.length / 10) || 1}</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs hidden sm:flex">First</Button>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs">Prev</Button>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs">Next</Button>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs hidden sm:flex">Last</Button>
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
