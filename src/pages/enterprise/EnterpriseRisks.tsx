// Enterprise Risks Page - Risks grid for enterprise level
// Route: /enterprise/risks

import { useState, useMemo } from 'react';
import { Search, Filter, MoreVertical, Plus } from 'lucide-react';
import { useRisks } from '@/hooks/risks/useRisks';
import { useToast } from '@/hooks/use-toast';
import { Risk, RiskFormData, RiskGridFilters } from '@/types/risks';
import { RoamBadge } from '@/components/risks/RoamBadge';
import { RiskDetailPanel } from '@/components/risks/RiskDetailPanel';
import { RiskFiltersDialog } from '@/components/risks/RiskFiltersDialog';
import { CreateEditRiskPanel } from '@/components/risks/CreateEditRiskPanel';
import { DeleteRiskDialog } from '@/components/risks/DeleteRiskDialog';
import { MassMoveDialog } from '@/components/risks/MassMoveDialog';
import { ColumnsDialog } from '@/components/risks/ColumnsDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const DEFAULT_FILTERS: RiskGridFilters = {
  program_increment_id: null,
  owner_id: null,
  status: "Open",
  resolution_method: null,
  occurrence: null,
  impact: null,
  critical_path: null
};

const DEFAULT_VISIBLE_COLUMNS = [
  'roam', 'title', 'pi', 'occurrence', 'impact', 'critical_path', 'status'
];

export default function EnterpriseRisks() {
  const { toast } = useToast();
  const { risks, isLoading, createRisk, updateRisk, deleteRisk, isCreating, isUpdating } = useRisks();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRiskIds, setSelectedRiskIds] = useState<string[]>([]);
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [isFiltersDialogOpen, setIsFiltersDialogOpen] = useState(false);
  const [isCreateEditOpen, setIsCreateEditOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [riskToDelete, setRiskToDelete] = useState<Risk | null>(null);
  const [isMassMoveOpen, setIsMassMoveOpen] = useState(false);
  const [isColumnsDialogOpen, setIsColumnsDialogOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
  const [filters, setFilters] = useState<RiskGridFilters>(DEFAULT_FILTERS);

  const filteredRisks = useMemo(() => {
    return risks?.filter((risk: Risk) => {
      if (filters.status && risk.status !== filters.status) return false;
      if (filters.resolution_method && risk.resolution_method !== filters.resolution_method) return false;
      if (filters.occurrence && risk.occurrence !== filters.occurrence) return false;
      if (filters.impact && risk.impact !== filters.impact) return false;
      if (filters.program_increment_id && risk.program_increment_id !== filters.program_increment_id) return false;
      
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

  const handleCreateEditSave = (data: RiskFormData) => {
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
      if (selectedRisk?.id === riskToDelete.id) {
        setSelectedRisk(null);
      }
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
    a.download = `enterprise-risks-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Risks exported to CSV successfully",
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
              Enterprise Risks
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
              New Risk
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
                  <Checkbox 
                    checked={selectedRiskIds.length === filteredRisks.length && filteredRisks.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedRiskIds(filteredRisks.map(r => r.id));
                      } else {
                        setSelectedRiskIds([]);
                      }
                    }}
                  />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRisks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-text-muted">
                    No risks found. Try adjusting your filters or create a new risk.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRisks.map((risk) => (
                  <TableRow 
                    key={risk.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedRisk(risk)}
                  >
                    <TableCell>☆</TableCell>
                    <TableCell className="font-mono text-sm">{risk.risk_number}</TableCell>
                    {visibleColumns.includes('roam') && (
                      <TableCell>
                        <RoamBadge status={risk.resolution_method} />
                      </TableCell>
                    )}
                    {visibleColumns.includes('title') && (
                      <TableCell className="font-medium">{risk.title}</TableCell>
                    )}
                    {visibleColumns.includes('pi') && (
                      <TableCell className="text-sm">{risk.program_increment_id || '-'}</TableCell>
                    )}
                    {visibleColumns.includes('occurrence') && (
                      <TableCell className="text-sm">{risk.occurrence || '-'}</TableCell>
                    )}
                    {visibleColumns.includes('impact') && (
                      <TableCell className="text-sm">{risk.impact || '-'}</TableCell>
                    )}
                    {visibleColumns.includes('critical_path') && (
                      <TableCell className="text-sm">{risk.critical_path || '-'}</TableCell>
                    )}
                    {visibleColumns.includes('status') && (
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded ${
                          risk.status === 'Open' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {risk.status}
                        </span>
                      </TableCell>
                    )}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        checked={selectedRiskIds.includes(risk.id)}
                        onCheckedChange={() => toggleRiskSelection(risk.id)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Panels and Dialogs */}
      {selectedRisk && (
        <RiskDetailPanel
          risk={selectedRisk}
          isOpen={!!selectedRisk}
          onClose={() => setSelectedRisk(null)}
          onUpdate={(updates) => updateRisk({ id: selectedRisk.id, ...updates })}
        />
      )}

      <CreateEditRiskPanel
        risk={editingRisk}
        isOpen={isCreateEditOpen}
        onClose={() => {
          setIsCreateEditOpen(false);
          setEditingRisk(null);
        }}
        onSave={handleCreateEditSave}
        isSubmitting={isCreating || isUpdating}
      />

      <DeleteRiskDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        riskTitle={riskToDelete?.title || ''}
      />

      <MassMoveDialog
        isOpen={isMassMoveOpen}
        onClose={() => setIsMassMoveOpen(false)}
        onConfirm={handleMassMove}
        selectedCount={selectedRiskIds.length}
      />

      <ColumnsDialog
        isOpen={isColumnsDialogOpen}
        onClose={() => setIsColumnsDialogOpen(false)}
        visibleColumns={visibleColumns}
        onColumnsChange={setVisibleColumns}
      />

      <RiskFiltersDialog
        isOpen={isFiltersDialogOpen}
        onClose={() => setIsFiltersDialogOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
      />
    </div>
  );
}
