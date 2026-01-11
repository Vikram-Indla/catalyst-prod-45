import { useState, useMemo, useEffect } from "react";
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
import { 
  defectsData, 
  Defect, 
  releaseOptions, 
  statusOptions, 
  severityOptions, 
  assigneeOptions,
  getAssigneeById 
} from "@/data/defectsData";
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
  
  // Data
  const [defects, setDefects] = useState<Defect[]>(defectsData);
  
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
      assignee: getAssigneeById(formData.assigneeId),
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
  const updateStatus = (defectId: string, newStatus: Defect['status']) => {
    setDefects(defects.map(d => 
      d.id === defectId ? { ...d, status: newStatus, updatedAt: 'Just now' } : d
    ));
    const statusLabels: Record<string, string> = {
      open: 'Open',
      in_progress: 'In Progress',
      resolved: 'Resolved',
      closed: 'Closed',
      reopened: 'Reopened'
    };
    toast.success(`Status updated to ${statusLabels[newStatus]}`);
  };
  
  // Delete defect
  const handleDelete = (defectId: string) => {
    setDefects(defects.filter(d => d.id !== defectId));
    toast.success('Defect deleted');
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Page Header */}
      <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 uppercase tracking-wide">RELEASES</span>
              <span className="text-gray-400">/</span>
              <span className="font-semibold text-gray-900">Defects</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button 
              size="sm" 
              className="bg-red-600 hover:bg-red-700 text-white"
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
            variant="danger"
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
        <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
              <SelectContent className="bg-white">
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
              <SelectContent className="bg-white">
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
              <SelectContent className="bg-white">
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
              <SelectContent className="bg-white">
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
              className="text-gray-500"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
            >
              <X className="w-4 h-4 mr-1" />
              Clear filters
            </Button>
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "px-3",
                  viewMode === 'list' && "bg-white shadow-sm"
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
                  viewMode === 'kanban' && "bg-white shadow-sm"
                )}
                onClick={() => setViewMode('kanban')}
              >
                <Columns className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-500">
          Showing {filteredDefects.length} of {defects.length} defects
        </div>

        {/* View Content */}
        {viewMode === 'list' ? (
          <DefectTableView 
            defects={filteredDefects} 
            onUpdateStatus={updateStatus}
            onDelete={handleDelete}
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
    </div>
  );
}

// Stats Card Component
interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  variant: 'default' | 'danger' | 'primary' | 'success';
  trend?: string;
}

function StatCard({ label, value, icon: Icon, variant, trend }: StatCardProps) {
  const variantStyles = {
    default: 'bg-gray-50 border-gray-200',
    danger: 'bg-red-50 border-red-200',
    primary: 'bg-blue-50 border-blue-200',
    success: 'bg-green-50 border-green-200',
  };
  
  const iconStyles = {
    default: 'text-gray-600 bg-gray-100',
    danger: 'text-red-600 bg-red-100',
    primary: 'text-blue-600 bg-blue-100',
    success: 'text-green-600 bg-green-100',
  };
  
  const valueStyles = {
    default: 'text-gray-900',
    danger: 'text-red-700',
    primary: 'text-blue-700',
    success: 'text-green-700',
  };
  
  return (
    <Card className={cn(
      "p-4 border",
      variantStyles[variant]
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
          <p className={cn("text-2xl font-bold", valueStyles[variant])}>{value}</p>
          {trend && (
            <p className="text-xs text-gray-500 mt-1">{trend}</p>
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
