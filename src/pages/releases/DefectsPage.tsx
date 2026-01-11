import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Bug, 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  Archive,
  TrendingDown,
  Plus,
  Download,
  Search,
  List,
  Columns,
  X
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import { DefectTableView } from "@/components/releases/defects/DefectTableView";
import { DefectKanbanView } from "@/components/releases/defects/DefectKanbanView";
import { ReportDefectModal, DefectFormData } from "@/components/releases/defects/ReportDefectModal";
import { EditDefectModal } from "@/components/releases/defects/EditDefectModal";
import { ReassignModal } from "@/components/releases/defects/ReassignModal";
import { 
  defectsData, 
  Defect, 
  releaseOptions, 
  statusOptions, 
  severityOptions, 
  assigneeOptions,
  getAssigneeById 
} from "@/data/defectsData";
import { useActiveUsers } from "@/hooks/useActiveUsers";
import { cn } from "@/lib/utils";

// Initial empty form state
const initialFormState: DefectFormData = {
  title: '',
  severity: '',
  priority: '',
  defectType: '',
  module: '',
  stepsToReproduce: '',
  expectedResult: '',
  actualResult: '',
  url: '',
  environment: '',
  releaseId: '',
  browser: '',
  os: '',
  device: '',
  linkedTestId: '',
  assigneeId: '',
  howDetected: '',
  description: ''
};

export default function ReleasesDefectsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Fetch active users for assignee lookup
  const { data: activeUsers = [] } = useActiveUsers();
  
  // Data
  const [defects, setDefects] = useState<Defect[]>(defectsData);
  
  // Helper to get assignee from UUID or initials
  const getAssigneeFromId = useCallback((assigneeId: string | undefined) => {
    if (!assigneeId) {
      return { name: 'Unassigned', initials: '?', color: 'gray' };
    }
    
    // First try to find in active users (UUID lookup)
    const user = activeUsers.find(u => u.id === assigneeId);
    if (user) {
      const name = user.full_name || user.email || 'Unknown';
      const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      // Generate a consistent color based on user id
      const colors = ['blue', 'green', 'purple', 'orange', 'teal', 'pink'];
      const colorIndex = assigneeId.charCodeAt(0) % colors.length;
      return { name, initials, color: colors[colorIndex] };
    }
    
    // Fallback to legacy getAssigneeById (initials-based)
    return getAssigneeById(assigneeId);
  }, [activeUsers]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [releaseFilter, setReleaseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  
  // View
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  
  // Modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [formData, setFormData] = useState<DefectFormData>(initialFormState);
  
  // Edit and Reassign modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  
  // Auto-open modal when ?create=true is in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('create') === 'true') {
      setIsReportModalOpen(true);
      // Clear the param from URL
      params.delete('create');
      const newSearch = params.toString();
      navigate(location.pathname + (newSearch ? `?${newSearch}` : ''), { replace: true });
    }
  }, [location.search, navigate, location.pathname]);
  
  // Filtered defects
  const filteredDefects = useMemo(() => {
    return defects.filter(defect => {
      const matchesSearch = !searchQuery || 
        defect.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        defect.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRelease = releaseFilter === 'all' || defect.releaseId === releaseFilter;
      const matchesStatus = statusFilter === 'all' || defect.status === statusFilter;
      const matchesSeverity = severityFilter === 'all' || defect.severity === severityFilter;
      const matchesAssignee = assigneeFilter === 'all' || 
        defect.assignee.initials === assigneeFilter ||
        (assigneeFilter === 'unassigned' && defect.assignee.initials === '?');
      
      return matchesSearch && matchesRelease && matchesStatus && matchesSeverity && matchesAssignee;
    });
  }, [defects, searchQuery, releaseFilter, statusFilter, severityFilter, assigneeFilter]);
  
  // Stats
  const stats = useMemo(() => ({
    total: defects.length,
    open: defects.filter(d => d.status === 'open' || d.status === 'reopened').length,
    inProgress: defects.filter(d => d.status === 'in_progress').length,
    resolved: defects.filter(d => d.status === 'resolved').length,
    closed: defects.filter(d => d.status === 'closed').length
  }), [defects]);
  
  // Check if filters are active
  const hasActiveFilters = searchQuery || releaseFilter !== 'all' || statusFilter !== 'all' || 
    severityFilter !== 'all' || assigneeFilter !== 'all';
  
  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setReleaseFilter('all');
    setStatusFilter('all');
    setSeverityFilter('all');
    setAssigneeFilter('all');
  };
  
  // Create defect with simplified validation (only 6 required fields)
  const handleReportDefect = () => {
    // Validate required fields (simplified to 6 essential fields)
    const requiredFields: (keyof DefectFormData)[] = [
      'title', 'severity', 'stepsToReproduce', 'expectedResult', 
      'actualResult', 'releaseId'
    ];
    
    const fieldLabels: Record<string, string> = {
      title: 'Title',
      severity: 'Severity',
      stepsToReproduce: 'Steps to Reproduce',
      expectedResult: 'Expected Result',
      actualResult: 'Actual Result',
      releaseId: 'Release'
    };
    
    const missingFields = requiredFields.filter(f => !formData[f]);
    
    if (missingFields.length > 0) {
      const missingLabels = missingFields.map(f => fieldLabels[f]).join(', ');
      toast.error(`Please fill required fields: ${missingLabels}`);
      return;
    }
    
    const defectNumber = defects.length + 90;
    
    // Build comprehensive description from form data
    const fullDescription = `
**Steps to Reproduce:**
${formData.stepsToReproduce}

**Expected Result:**
${formData.expectedResult}

**Actual Result:**
${formData.actualResult}

**Environment:** ${formData.environment}
**Browser:** ${formData.browser || 'Not specified'}
**OS:** ${formData.os || 'Not specified'}
**Device:** ${formData.device || 'Not specified'}
${formData.url ? `**URL:** ${formData.url}` : ''}
    `.trim();
    
    const defect: Defect = {
      id: `DEF-${String(defectNumber).padStart(3, '0')}`,
      title: formData.title,
      description: fullDescription,
      severity: formData.severity as Defect['severity'],
      status: 'open',
      releaseId: formData.releaseId,
      linkedTestId: formData.linkedTestId === 'none' ? null : formData.linkedTestId || null,
      linkedStepId: null,
      assignee: getAssigneeFromId(formData.assigneeId),
      reporter: { name: 'Vikram S.', initials: 'VS', color: 'blue' },
      createdAt: 'Just now',
      updatedAt: 'Just now',
      // Extended fields
      priority: formData.priority,
      defectType: formData.defectType,
      module: formData.module,
      environment: formData.environment,
      browser: formData.browser,
      os: formData.os,
      device: formData.device,
      url: formData.url,
      howDetected: formData.howDetected,
      stepsToReproduce: formData.stepsToReproduce,
      expectedResult: formData.expectedResult,
      actualResult: formData.actualResult
    };
    
    setDefects([defect, ...defects]);
    setIsReportModalOpen(false);
    setFormData(initialFormState);
    toast.success(`${defect.id} reported successfully`);
  };
  
  // Update status
  const updateStatus = (defectId: string, newStatus: string) => {
    setDefects(defects.map(d => 
      d.id === defectId ? { ...d, status: newStatus, updatedAt: 'Just now' } : d
    ));
    toast.success(`Status updated to ${newStatus.replace(/_/g, ' ').toUpperCase()}`);
  };
  
  // Delete defect
  const handleDelete = (defectId: string) => {
    setDefects(defects.filter(d => d.id !== defectId));
    toast.success('Defect deleted');
  };

  // Handle Edit
  const handleEdit = (defect: Defect) => {
    setSelectedDefect(defect);
    setIsEditModalOpen(true);
  };

  // Handle Reassign
  const handleReassign = (defect: Defect) => {
    setSelectedDefect(defect);
    setIsReassignModalOpen(true);
  };

  // Save edited defect
  const handleSaveEdit = (updatedDefect: Defect) => {
    setDefects(defects.map(d => d.id === updatedDefect.id ? updatedDefect : d));
  };

  // Save reassignment
  const handleSaveReassign = (assigneeId: string) => {
    if (!selectedDefect) return;

    const newAssignee = getAssigneeFromId(assigneeId);

    setDefects(prev =>
      prev.map(d =>
        d.id === selectedDefect.id ? { ...d, assignee: newAssignee, updatedAt: 'Just now' } : d
      )
    );

    setSelectedDefect(prev =>
      prev ? { ...prev, assignee: newAssignee, updatedAt: 'Just now' } : prev
    );

    toast.success(`Reassigned to ${newAssignee.name}`);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Page Header */}
      <div className="flex-shrink-0 border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground uppercase tracking-wide">RELEASES</span>
              <span className="text-muted-foreground/50">/</span>
              <span className="font-semibold text-foreground">Defects</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button 
              size="sm" 
              onClick={() => setIsReportModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Report Defect
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Stats Cards Row */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <StatCard 
            label="Total Defects" 
            value={stats.total}
            icon={Bug}
            variant="default"
          />
          <StatCard 
            label="Open" 
            value={stats.open}
            icon={AlertCircle}
            variant="warning"
            trend="+3 this week"
          />
          <StatCard 
            label="In Progress" 
            value={stats.inProgress}
            icon={Clock}
            variant="primary"
          />
          <StatCard 
            label="Resolved" 
            value={stats.resolved}
            icon={CheckCircle}
            variant="success"
          />
          <StatCard 
            label="Closed" 
            value={stats.closed}
            icon={Archive}
            variant="default"
          />
          <StatCard 
            label="Avg. Resolution" 
            value="2.3 days"
            icon={TrendingDown}
            variant="success"
            trend="-0.5 days vs last month"
          />
        </div>

        {/* Filters Bar */}
        <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search defects..." 
                className="pl-10 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Release Filter */}
            <Select value={releaseFilter} onValueChange={setReleaseFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Releases" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {releaseOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.value === 'all' ? option.label : option.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Severity Filter */}
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Severity" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {severityOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Assignee Filter */}
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Assignees" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {assigneeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Clear Filters */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-muted-foreground"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
            >
              <X className="w-4 h-4 mr-1" />
              Clear filters
            </Button>
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted rounded-lg p-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "px-3",
                  viewMode === 'list' && "bg-card shadow-sm"
                )}
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className={cn(
                  "px-3",
                  viewMode === 'kanban' && "bg-card shadow-sm"
                )}
                onClick={() => setViewMode('kanban')}
              >
                <Columns className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {filteredDefects.length} of {defects.length} defects
        </div>

        {/* View Content */}
        {viewMode === 'list' ? (
          <DefectTableView 
            defects={filteredDefects} 
            onUpdateStatus={updateStatus}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onReassign={handleReassign}
          />
        ) : (
          <DefectKanbanView 
            defects={filteredDefects}
            onUpdateStatus={updateStatus}
          />
        )}
      </div>

      {/* Report Defect Modal */}
      <ReportDefectModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleReportDefect}
      />

      {/* Edit Defect Modal */}
      {selectedDefect && (
        <EditDefectModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          defect={selectedDefect}
          onSave={handleSaveEdit}
        />
      )}

      {/* Reassign Modal */}
      {selectedDefect && (
        <ReassignModal
          open={isReassignModalOpen}
          onOpenChange={setIsReassignModalOpen}
          currentAssignee={selectedDefect.assignee}
          onReassign={handleSaveReassign}
        />
      )}
    </div>
  );
}

// Stats Card Component
interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  variant: 'default' | 'warning' | 'primary' | 'success';
  trend?: string;
}

function StatCard({ label, value, icon: Icon, variant, trend }: StatCardProps) {
  const variantStyles = {
    default: 'bg-muted border-border',
    warning: 'bg-amber-50 border-amber-200',
    primary: 'bg-blue-50 border-primary/20',
    success: 'bg-teal-50 border-teal-200',
  };
  
  const iconStyles = {
    default: 'text-muted-foreground bg-muted',
    warning: 'text-amber-600 bg-amber-100',
    primary: 'text-primary bg-blue-100',
    success: 'text-teal-600 bg-teal-100',
  };
  
  const valueStyles = {
    default: 'text-foreground',
    warning: 'text-amber-700',
    primary: 'text-primary',
    success: 'text-teal-700',
  };
  
  return (
    <Card className={cn(
      "p-4 border",
      variantStyles[variant]
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
          <p className={cn("text-2xl font-bold", valueStyles[variant])}>{value}</p>
          {trend && (
            <p className="text-xs text-muted-foreground mt-1">{trend}</p>
          )}
        </div>
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          iconStyles[variant]
        )}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </Card>
  );
}
