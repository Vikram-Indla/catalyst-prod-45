import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Download, Search, LayoutGrid, List, 
  Layers, Loader2, FileText, FileSpreadsheet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CycleCardEnhanced } from '@/components/releases/test-cycles/CycleCardEnhanced';
import { CycleKPICards } from '@/components/releases/test-cycles/CycleKPICards';
import { CycleTableView } from '@/components/releases/test-cycles/CycleTableView';
import { CreateCycleModalEnhanced, CreateCycleFormData } from '@/components/releases/test-cycles/CreateCycleModalEnhanced';
import { EditTestCycleDialog } from '@/components/releases/test-cycles/EditTestCycleDialog';
import { 
  useTestCyclesEnhanced, 
  useCycleKPIs, 
  useCreateCycleEnhanced,
  useDeleteCycleEnhanced,
  useCloneCycleEnhanced,
  useProjects,
  useReleases,
  CycleWithDetails,
} from '@/hooks/test-management';
import { exportTestCycles } from '@/utils/exportTestCycles';

type ViewMode = 'card' | 'list';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const ENVIRONMENT_OPTIONS = [
  { value: 'all', label: 'All Environments' },
  { value: 'dev', label: 'Development' },
  { value: 'staging', label: 'Staging' },
  { value: 'uat', label: 'UAT' },
  { value: 'prod', label: 'Production' },
];

export default function TestCyclesPage() {
  const navigate = useNavigate();
  
  // Get current project
  const { data: projects } = useProjects();
  const projectId = projects?.[0]?.id;
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [releaseFilter, setReleaseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [envFilter, setEnvFilter] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  
  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCycleForEdit, setSelectedCycleForEdit] = useState<CycleWithDetails | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // Fetch releases for filter dropdown
  const { data: releases } = useReleases();
  
  // Fetch cycles with enhanced data
  const { data: cycles, isLoading } = useTestCyclesEnhanced(projectId, {
    search: searchQuery || undefined,
    releaseId: releaseFilter !== 'all' ? releaseFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    environment: envFilter !== 'all' ? envFilter : undefined,
  });
  
  // Compute KPIs
  const kpis = useCycleKPIs(cycles);
  
  // Mutations
  const createCycleMutation = useCreateCycleEnhanced();
  const deleteCycleMutation = useDeleteCycleEnhanced();
  const cloneCycleMutation = useCloneCycleEnhanced();
  
  // Group cycles by status
  const groupedCycles = useMemo(() => ({
    in_progress: (cycles || []).filter(c => c.status === 'in_progress'),
    planned: (cycles || []).filter(c => c.status === 'planned'),
    completed: (cycles || []).filter(c => c.status === 'completed'),
  }), [cycles]);
  
  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setReleaseFilter('all');
    setStatusFilter('all');
    setEnvFilter('all');
  };
  
  // Handlers
  const handleCreateCycle = (data: CreateCycleFormData) => {
    if (!projectId) {
      toast.error('No project selected');
      return;
    }
    
    createCycleMutation.mutate(
      {
        project_id: projectId,
        name: data.name,
        description: data.description,
        release_id: data.release_id,
        environment: data.environment,
        assigned_to: data.assigned_to,
        planned_start: data.planned_start,
        planned_end: data.planned_end,
      },
      {
        onSuccess: () => {
          setIsCreateModalOpen(false);
        },
      }
    );
  };
  
  const handleEditCycle = (cycle: CycleWithDetails) => {
    setSelectedCycleForEdit(cycle);
    setIsEditModalOpen(true);
  };
  
  const handleDeleteCycle = (cycleId: string) => {
    deleteCycleMutation.mutate(cycleId);
  };
  
  const handleDuplicateCycle = (cycle: CycleWithDetails) => {
    if (!projectId) return;
    cloneCycleMutation.mutate({ cycleId: cycle.id, projectId });
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    setIsExporting(true);
    try {
      const exportData = (cycles || []).map(c => ({
        id: c.key,
        name: c.name,
        status: c.status,
        progress: c.total_cases > 0 
          ? Math.round(((c.passed_count + c.failed_count + c.blocked_count) / c.total_cases) * 100) 
          : 0,
        passed: c.passed_count,
        failed: c.failed_count,
        blocked: c.blocked_count,
        startDate: c.planned_start,
        endDate: c.planned_end,
        environment: c.environment,
      }));
      await exportTestCycles(exportData, format);
      toast.success(`Exported ${exportData.length} test cycles`);
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const hasFilters = searchQuery || releaseFilter !== 'all' || statusFilter !== 'all' || envFilter !== 'all';

  return (
    <div className="p-6">
      {/* Breadcrumb & Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground uppercase tracking-wide">RELEASES</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-semibold text-foreground">Test Cycles</span>
        </div>
        
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isExporting}>
                {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileText className="w-4 h-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="default" size="sm" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Cycle
          </Button>
        </div>
      </div>
      
      {/* KPI Cards */}
      <CycleKPICards kpis={kpis} isLoading={isLoading} />
      
      {/* Filters Bar */}
      <div className="flex items-center justify-between p-4 bg-background border border-border rounded-lg mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search cycles..." 
              className="pl-10 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Release Filter */}
          <Select value={releaseFilter} onValueChange={setReleaseFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Releases" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Releases</SelectItem>
              {releases?.map(release => (
                <SelectItem key={release.id} value={release.id}>
                  {release.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Environment Filter */}
          <Select value={envFilter} onValueChange={setEnvFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Environments" />
            </SelectTrigger>
            <SelectContent>
              {ENVIRONMENT_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {hasFilters && (
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
        
        {/* View Toggle */}
        <div className="flex items-center bg-muted rounded-lg p-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(viewMode === 'card' && "bg-background shadow-sm")}
            onClick={() => setViewMode('card')}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className={cn(viewMode === 'list' && "bg-background shadow-sm")}
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (cycles?.length || 0) === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Layers className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No test cycles found</h3>
          <p className="text-muted-foreground mb-4 max-w-sm">
            {hasFilters
              ? "No cycles match your filters. Try adjusting your search criteria."
              : "Get started by creating your first test cycle."}
          </p>
          <div className="flex items-center gap-3">
            {hasFilters && (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
            <Button variant="default" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Cycle
            </Button>
          </div>
        </div>
      ) : viewMode === 'card' ? (
        <div className="space-y-8">
          {/* In Progress Section */}
          {groupedCycles.in_progress.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <h2 className="font-semibold text-foreground">In Progress</h2>
                <Badge variant="secondary">{groupedCycles.in_progress.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedCycles.in_progress.map(cycle => (
                  <CycleCardEnhanced 
                    key={cycle.id} 
                    cycle={cycle} 
                    onEdit={handleEditCycle}
                    onDuplicate={handleDuplicateCycle}
                    onDelete={handleDeleteCycle}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Planned Section */}
          {groupedCycles.planned.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-muted-foreground"></div>
                <h2 className="font-semibold text-foreground">Planned</h2>
                <Badge variant="secondary">{groupedCycles.planned.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedCycles.planned.map(cycle => (
                  <CycleCardEnhanced 
                    key={cycle.id} 
                    cycle={cycle}
                    onEdit={handleEditCycle}
                    onDuplicate={handleDuplicateCycle}
                    onDelete={handleDeleteCycle}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Completed Section */}
          {groupedCycles.completed.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <h2 className="font-semibold text-foreground">Completed</h2>
                <Badge variant="secondary">{groupedCycles.completed.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedCycles.completed.map(cycle => (
                  <CycleCardEnhanced 
                    key={cycle.id} 
                    cycle={cycle}
                    onEdit={handleEditCycle}
                    onDuplicate={handleDuplicateCycle}
                    onDelete={handleDeleteCycle}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <CycleTableView 
          cycles={(cycles || []).map(c => ({
            id: c.key,
            name: c.name,
            releaseId: c.release?.id || '',
            releaseName: c.release?.name || '',
            environment: c.environment as any,
            status: c.status as any,
            progress: c.total_cases > 0 
              ? Math.round(((c.passed_count + c.failed_count + c.blocked_count) / c.total_cases) * 100) 
              : 0,
            totalTests: c.total_cases,
            passedTests: c.passed_count,
            failedTests: c.failed_count,
            skippedTests: c.skipped_count,
            pendingTests: c.not_run_count,
            duration: '-',
            assignee: {
              name: c.assignee?.full_name || 'Unassigned',
              initials: c.assignee?.full_name?.split(' ').map(p => p[0]).join('').slice(0, 2) || 'UA',
              color: 'blue',
            },
            createdAt: c.created_at,
            updatedAt: c.updated_at,
            _originalId: c.id,
          }))}
          onEdit={(cycle) => navigate(`/releases/test-cycles/${cycle._originalId || cycle.id}`)}
          onDuplicate={(cycle) => {
            if (!projectId) return;
            cloneCycleMutation.mutate({ cycleId: cycle._originalId || cycle.id, projectId });
          }}
          onDelete={(cycleId) => {
            const cycle = cycles?.find(c => c.key === cycleId);
            if (cycle) deleteCycleMutation.mutate(cycle.id);
          }}
        />
      )}
      
      {/* Create Modal */}
      <CreateCycleModalEnhanced
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onCreateCycle={handleCreateCycle}
        isCreating={createCycleMutation.isPending}
      />
      
      {/* Edit Modal */}
      <EditTestCycleDialog
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        cycle={selectedCycleForEdit ? {
          id: selectedCycleForEdit.id,
          name: selectedCycleForEdit.name,
          description: selectedCycleForEdit.description,
          status: selectedCycleForEdit.status,
          startDate: selectedCycleForEdit.planned_start,
          endDate: selectedCycleForEdit.planned_end,
          environment: selectedCycleForEdit.environment,
        } : null}
        onSuccess={() => setSelectedCycleForEdit(null)}
      />
    </div>
  );
}
