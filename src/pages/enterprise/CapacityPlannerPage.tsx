import { useState, useMemo } from 'react';
import { PageChrome } from '@/components/layout/PageChrome';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, CheckCircle2, BarChart3, AlertTriangle, TrendingUp, Download, Printer, Plus, 
  Search, LayoutGrid, Table2, CalendarDays, GanttChart, Sparkles, FileStack, Bot,
  ChevronLeft, ChevronRight, Clock, Eye, Copy, Check, RotateCcw, Play, FolderKanban,
  Pencil, Trash2, Cloud
} from 'lucide-react';
import { useCapacityData, useAssignments, useAiRecommendations, exportCapacityToPdf } from '@/modules/capacity-planner';
import type { ViewType, ResourceMetric, CapacityProject, AiRecommendation } from '@/modules/capacity-planner';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button360 } from '@/components/capacity/Button360';

type PeriodType = 'weekly' | 'monthly' | 'quarterly';
type GroupByType = 'none' | 'project' | 'division' | 'department';
type ExtendedViewType = ViewType | 'scenarios';

// Division colors - Catalyst V5 compliant
const divisionColors = {
  Product: { bg: 'bg-[#d4b896]', text: 'text-[#4a3f35]', badge: 'bg-[#d4b896]/15 text-[#c69c6d]' },
  Delivery: { bg: 'bg-[#0d9488]', text: 'text-white', badge: 'bg-[#2563eb]/10 text-[#2563eb]' },
  Support: { bg: 'bg-[#4d8b4d]', text: 'text-white', badge: 'bg-[#5c7c5c]/15 text-[#5c7c5c]' },
};

const projectColors = [
  '#4d8b4d', // Olive
  '#8b7355', // Bronze  
  '#0d9488', // Teal
  '#d4b896', // Champagne
  '#2563eb', // Blue
  '#22c55e', // Green
];

export default function CapacityPlannerPage() {
  const { metrics, projects, resources, isLoading } = useCapacityData();
  const { createAssignment, deleteAssignment } = useAssignments();
  const { recommendations, highPriorityCount } = useAiRecommendations({ 
    resources: metrics.resources, 
    projects 
  });
  
  // Edit resource state
  const [editResourceId, setEditResourceId] = useState<string | null>(null);

  // View state
  const [currentView, setCurrentView] = useState<ExtendedViewType>('cards');
  const [period, setPeriod] = useState<PeriodType>('monthly');
  const [groupBy, setGroupBy] = useState<GroupByType>('project');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<ResourceMetric | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  // Resource form state
  const [resourceForm, setResourceForm] = useState({
    name: '',
    role: 'Frontend Developer',
    division: 'Delivery',
  });

  const handleExport = () => {
    exportCapacityToPdf({
      resources: metrics.resources,
      summary: metrics.summary,
      period: 'Q1 2025',
      generatedAt: new Date(),
    });
    toast.success('PDF exported successfully');
  };

  const handlePrint = () => {
    window.print();
  };

  const openResourceDrawer = (resource: ResourceMetric) => {
    setSelectedResource(resource);
    setDrawerOpen(true);
  };

  const filteredResources = metrics.resources.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group resources by project
  const groupedByProject = useMemo(() => {
    const groups: Record<string, ResourceMetric[]> = {};
    filteredResources.forEach((r) => {
      if (r.assignments.length > 0) {
        const projectId = r.assignments[0].project_id;
        const project = projects.find(p => p.id === projectId);
        const key = project?.name || 'Unassigned';
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
      } else {
        if (!groups['Unassigned']) groups['Unassigned'] = [];
        groups['Unassigned'].push(r);
      }
    });
    return groups;
  }, [filteredResources, projects]);

  // Under-allocated resources for Leveling
  const underAllocatedResources = filteredResources.filter(r => r.allocation < 80);

  if (isLoading) {
    return (
      <PageChrome>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading capacity data...</div>
        </div>
      </PageChrome>
    );
  }

  return (
    <PageChrome>
      <div className="flex flex-col h-full bg-[hsl(var(--background))]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-wrap gap-3">
          <div className="flex items-center gap-4">
            {/* Period Toggle */}
            <div className="flex bg-card border border-border rounded-lg p-1">
              {(['weekly', 'monthly', 'quarterly'] as PeriodType[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'px-4 py-2 text-xs font-semibold rounded-md transition-all capitalize',
                    period === p
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            
            {/* Search */}
            <div className="relative ml-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search resources..." 
                className="pl-9 w-48 h-9 text-sm bg-card"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button size="sm" onClick={() => setResourceModalOpen(true)} className="gap-2 bg-[#2563eb] hover:bg-[#1d4ed8]">
              <Plus className="h-4 w-4" />
              Add Resource
            </Button>
          </div>
        </div>

        {/* Summary Bar */}
        <div className="flex gap-2 px-5 pb-4 flex-wrap">
          <SummaryCard 
            icon={Users} 
            value={metrics.summary.total} 
            label="Resources" 
            iconBg="bg-[#2563eb]/10" 
            iconColor="text-[#2563eb]" 
          />
          <SummaryCard 
            icon={CheckCircle2} 
            value={metrics.summary.available + metrics.summary.healthy} 
            label="Available" 
            iconBg="bg-[#0d9488]/10" 
            iconColor="text-[#0d9488]" 
          />
          <SummaryCard 
            icon={BarChart3} 
            value={metrics.summary.atCapacity} 
            label="At Capacity" 
            iconBg="bg-[#d97706]/10" 
            iconColor="text-[#d97706]" 
          />
          <SummaryCard 
            icon={BarChart3} 
            value={metrics.summary.overAllocated} 
            label="Over-allocated" 
            iconBg="bg-[#64748b]/10" 
            iconColor="text-[#64748b]" 
          />
          
          {/* Utilization Gauge */}
          <div className="bg-card border border-border rounded-lg px-4 py-3 flex-1 min-w-40">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Utilization</span>
              <span className={cn(
                'text-lg font-bold',
                metrics.summary.avgUtilization >= 80 ? 'text-[#dc2626]' : 
                metrics.summary.avgUtilization >= 60 ? 'text-[#d97706]' : 'text-[#0d9488]'
              )}>
                {metrics.summary.avgUtilization}%
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-1.5">
              <div 
                className={cn(
                  'h-full rounded-full transition-all',
                  metrics.summary.avgUtilization >= 80 ? 'bg-[#dc2626]' : 
                  metrics.summary.avgUtilization >= 60 ? 'bg-[#d97706]' : 'bg-[#0d9488]'
                )}
                style={{ width: `${Math.min(metrics.summary.avgUtilization, 100)}%` }}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <LegendDot color="bg-[#2563eb]" label={`0`} />
              <LegendDot color="bg-[#0d9488]" label={`${metrics.summary.available + metrics.summary.healthy}`} />
              <LegendDot color="bg-[#d97706]" label={`${metrics.summary.atCapacity}`} />
              <LegendDot color="bg-[#dc2626]" label={`${metrics.summary.overAllocated}`} />
            </div>
          </div>
        </div>

        {/* Toolbar with View Tabs */}
        <div className="flex items-center justify-between px-5 pb-4 gap-3 flex-wrap">
          <div className="flex bg-muted p-1 rounded-lg border border-border">
            <ViewTab icon={LayoutGrid} label="Cards" active={currentView === 'cards'} onClick={() => setCurrentView('cards')} />
            <ViewTab icon={Table2} label="Table" active={currentView === 'table'} onClick={() => setCurrentView('table')} />
            <ViewTab icon={CalendarDays} label="Timeline" active={currentView === 'timeline'} onClick={() => setCurrentView('timeline')} />
            <ViewTab icon={GanttChart} label="Assignments" active={currentView === 'assignments'} onClick={() => setCurrentView('assignments')} />
            <ViewTab 
              icon={Sparkles} 
              label="Leveling" 
              active={currentView === 'leveling'} 
              onClick={() => setCurrentView('leveling')} 
              badge={underAllocatedResources.length}
            />
            <ViewTab icon={FileStack} label="Scenarios" active={currentView === 'scenarios'} onClick={() => setCurrentView('scenarios')} />
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByType)}>
              <SelectTrigger className="w-40 h-9 text-sm">
                <SelectValue placeholder="Group by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Grouping</SelectItem>
                <SelectItem value="project">Group by Project</SelectItem>
                <SelectItem value="division">Group by Division</SelectItem>
                <SelectItem value="department">Group by Department</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto px-5 pb-5">
          {currentView === 'cards' && (
            <CardsView 
              resources={filteredResources} 
              groupedByProject={groupedByProject}
              groupBy={groupBy}
              projects={projects}
              onResourceClick={openResourceDrawer} 
            />
          )}
          {currentView === 'table' && (
            <TableView 
              resources={filteredResources} 
              projects={projects} 
              onResourceClick={openResourceDrawer}
              onEditResource={(id) => setEditResourceId(id)}
              onDeleteResource={(resource) => {
                if (window.confirm(`Are you sure you want to remove all assignments for ${resource.name}?`)) {
                  resource.assignments.forEach((a) => {
                    deleteAssignment.mutate(a.id);
                  });
                }
              }}
            />
          )}
          {currentView === 'timeline' && (
            <TimelineView resources={filteredResources} period={period} />
          )}
          {currentView === 'assignments' && (
            <AssignmentsView resources={filteredResources} projects={projects} createAssignment={createAssignment} />
          )}
          {currentView === 'leveling' && (
            <LevelingView resources={underAllocatedResources} recommendations={recommendations} />
          )}
          {currentView === 'scenarios' && (
            <ScenariosView />
          )}
        </div>

        {/* Resource 360° Drawer */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent className="w-[500px] sm:max-w-[500px]">
            <SheetHeader>
              <SheetTitle>Resource 360°</SheetTitle>
            </SheetHeader>
            {selectedResource && (
              <ResourceDrawerContent resource={selectedResource} projects={projects} />
            )}
          </SheetContent>
        </Sheet>

        {/* AI Drawer */}
        <Sheet open={aiDrawerOpen} onOpenChange={setAiDrawerOpen}>
          <SheetContent className="w-[420px] sm:max-w-[420px]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0d9488] to-[#0f766e] flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                AI Resource Assistant
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-120px)] mt-4">
              <div className="space-y-3 pr-4">
                {recommendations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recommendations at this time.</p>
                ) : (
                  recommendations.map((rec) => (
                    <RecommendationCard key={rec.id} recommendation={rec} />
                  ))
                )}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>

        {/* Add Resource Modal */}
        <Dialog open={resourceModalOpen} onOpenChange={setResourceModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Resource</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input 
                  value={resourceForm.name}
                  onChange={(e) => setResourceForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Enter name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={resourceForm.role} onValueChange={(v) => setResourceForm(f => ({ ...f, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Frontend Developer">Frontend Developer</SelectItem>
                      <SelectItem value="Backend Developer">Backend Developer</SelectItem>
                      <SelectItem value="Sr Frontend Developer">Sr Frontend Developer</SelectItem>
                      <SelectItem value="Sr Backend Developer">Sr Backend Developer</SelectItem>
                      <SelectItem value="DevOps Engineer">DevOps Engineer</SelectItem>
                      <SelectItem value="QA Analyst">QA Analyst</SelectItem>
                      <SelectItem value="Product Owner">Product Owner</SelectItem>
                      <SelectItem value="Delivery Manager">Delivery Manager</SelectItem>
                      <SelectItem value="Backend Architect">Backend Architect</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Division</Label>
                  <Select value={resourceForm.division} onValueChange={(v) => setResourceForm(f => ({ ...f, division: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Product">Product</SelectItem>
                      <SelectItem value="Delivery">Delivery</SelectItem>
                      <SelectItem value="Support">Support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResourceModalOpen(false)}>Cancel</Button>
              <Button onClick={() => { toast.success('Resource added'); setResourceModalOpen(false); }} className="bg-[#2563eb] hover:bg-[#1d4ed8]">
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Resource Modal */}
        <Dialog open={editResourceId !== null} onOpenChange={(open) => !open && setEditResourceId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Resource</DialogTitle>
            </DialogHeader>
            {(() => {
              const editingResource = metrics.resources.find(r => r.id === editResourceId);
              if (!editingResource) return null;
              return (
                <EditResourceForm 
                  resource={editingResource} 
                  onSave={() => {
                    toast.success('Resource updated');
                    setEditResourceId(null);
                  }}
                  onCancel={() => setEditResourceId(null)}
                />
              );
            })()}
          </DialogContent>
        </Dialog>

        <div className="fixed bottom-6 right-6 z-50">
          <div className="absolute inset-[-4px] rounded-full bg-[#0d9488]/25 animate-ping" style={{ animationDuration: '2.5s' }} />
          <button
            onClick={() => setAiDrawerOpen(true)}
            className="relative w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[#0d9488] to-[#0f766e] flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer border-0"
            style={{ boxShadow: '0 4px 16px rgba(13, 148, 136, 0.35)' }}
          >
            <Bot className="h-6 w-6 text-white" />
            {highPriorityCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#dc2626] text-white text-[11px] font-bold flex items-center justify-center border-2 border-white">
                {highPriorityCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </PageChrome>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary Card Component
// ─────────────────────────────────────────────────────────────────────────────
function SummaryCard({ icon: Icon, value, label, iconBg, iconColor }: { 
  icon: React.ElementType; 
  value: number | string; 
  label: string; 
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3 min-w-36 flex-1">
      <div className={cn('w-8 h-8 rounded-md flex items-center justify-center', iconBg)}>
        <Icon className={cn('h-4 w-4', iconColor)} />
      </div>
      <div>
        <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// Legend Dot
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
      <div className={cn('w-1.5 h-1.5 rounded-full', color)} />
      {label}
    </div>
  );
}

// View Tab
function ViewTab({ icon: Icon, label, active, onClick, badge }: { 
  icon: React.ElementType; 
  label: string; 
  active: boolean; 
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2.5 text-sm font-medium rounded-md flex items-center gap-2 transition-all',
        active 
          ? 'bg-card text-foreground shadow-sm' 
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <Icon className={cn('h-4 w-4', active ? 'opacity-100' : 'opacity-60')} />
      {label}
      {badge !== undefined && badge > 0 && (
        <span className={cn(
          'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
          active ? 'bg-[#d97706] text-white' : 'bg-[#dc2626] text-white'
        )}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cards View with Project Grouping
// ─────────────────────────────────────────────────────────────────────────────
function CardsView({ resources, groupedByProject, groupBy, projects, onResourceClick }: { 
  resources: ResourceMetric[]; 
  groupedByProject: Record<string, ResourceMetric[]>;
  groupBy: GroupByType;
  projects: CapacityProject[];
  onResourceClick: (r: ResourceMetric) => void;
}) {
  if (groupBy === 'project') {
    return (
      <div className="space-y-6">
        {Object.entries(groupedByProject).map(([projectName, projectResources]) => (
          <div key={projectName} className="space-y-3">
            {/* Group Header */}
            <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
              <div className="w-8 h-8 rounded-md bg-muted-foreground/80 flex items-center justify-center">
                <FolderKanban className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-foreground">{projectName}</span>
              <span className="text-xs text-muted-foreground ml-auto bg-muted px-2.5 py-1 rounded-full">
                {projectResources.length} resources
              </span>
            </div>
            
            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {projectResources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} projects={projects} onClick={() => onResourceClick(resource)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {resources.map((resource) => (
        <ResourceCard key={resource.id} resource={resource} projects={projects} onClick={() => onResourceClick(resource)} />
      ))}
    </div>
  );
}

// Resource Card - V5 Design with Button360
function ResourceCard({ resource, projects, onClick }: { resource: ResourceMetric; projects: CapacityProject[]; onClick: () => void }) {
  const division = (resource.division || 'Delivery') as keyof typeof divisionColors;
  const divColor = divisionColors[division] || divisionColors.Delivery;
  const initials = resource.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';
  
  const primaryProject = resource.assignments[0]?.project_id 
    ? projects.find(p => p.id === resource.assignments[0]?.project_id)
    : null;

  return (
    <div 
      className="bg-card border border-border rounded-lg p-4 hover:border-border-strong hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold', divColor.bg, divColor.text)}>
          {initials}
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{resource.name}</p>
          <p className="text-xs text-muted-foreground truncate">{resource.role}</p>
          {/* Project Tags */}
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            {primaryProject ? (
              <span 
                className="text-[10px] font-semibold text-white px-2 py-0.5 rounded"
                style={{ background: projectColors[0] }}
              >
                {primaryProject.code || primaryProject.name?.substring(0, 3).toUpperCase()}
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-white px-2 py-0.5 rounded bg-muted-foreground">
                Unassigned
              </span>
            )}
          </div>
        </div>
        
        {/* 360° button with orbital animation */}
        <Button360 onClick={onClick} size="md" />
        
        {/* Allocation */}
        <div className="text-right">
          <p className={cn(
            'text-lg font-bold',
            resource.allocation > 100 ? 'text-[#dc2626]' :
            resource.allocation > 80 ? 'text-[#b45309]' : 'text-[#0d9488]'
          )}>
            {resource.allocation}%
          </p>
          <p className="text-[10px] text-muted-foreground">Allocated</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Table View with Division Badges and Actions
// ─────────────────────────────────────────────────────────────────────────────
interface TableViewProps {
  resources: ResourceMetric[];
  projects: CapacityProject[];
  onResourceClick: (r: ResourceMetric) => void;
  onEditResource: (id: string) => void;
  onDeleteResource: (r: ResourceMetric) => void;
}

function TableView({ resources, projects, onResourceClick, onEditResource, onDeleteResource }: TableViewProps) {
  const getProjectName = (projectId: string) => projects.find(p => p.id === projectId)?.name || 'Unknown';
  
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Division</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Primary Project</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Allocation</th>
            <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Assignments</th>
            <th className="text-right px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody>
          {resources.map((resource) => {
            const division = (resource.division || 'Delivery') as keyof typeof divisionColors;
            const divColor = divisionColors[division] || divisionColors.Delivery;
            const initials = resource.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';
            const primaryProject = resource.assignments[0]?.project_id ? getProjectName(resource.assignments[0]?.project_id) : '-';
            
            return (
              <tr 
                key={resource.id} 
                className="group border-t border-border hover:bg-muted/30"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold', divColor.bg, divColor.text)}>
                      {initials}
                    </div>
                    <span className="text-sm font-medium text-foreground">{resource.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{resource.role}</td>
                <td className="px-4 py-3">
                  <span className={cn('text-[11px] font-semibold px-2 py-1 rounded uppercase', divColor.badge)}>
                    {division}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-foreground">{primaryProject}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-semibold min-w-[40px]">{resource.allocation}%</span>
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          'h-full rounded-full',
                          resource.allocation > 100 ? 'bg-[#dc2626]' :
                          resource.allocation > 80 ? 'bg-[#d97706]' : 'bg-[#0d9488]'
                        )}
                        style={{ width: `${Math.min(resource.allocation, 100)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-sm text-muted-foreground">{resource.assignments.length}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {/* 360° View Button with orbital animation */}
                    <Button360 
                      onClick={() => onResourceClick(resource)} 
                      size="sm"
                    />
                    {/* Edit Button */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEditResource(resource.id); }}
                      className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      title="Edit resource"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {/* Delete Button */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeleteResource(resource); }}
                      className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      title="Delete resource"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeline View with Monthly Columns
// ─────────────────────────────────────────────────────────────────────────────
function TimelineView({ resources, period }: { resources: ResourceMetric[]; period: PeriodType }) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex bg-muted/50 border-b border-border sticky top-0 z-10">
        <div className="w-52 px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-r border-border shrink-0">
          Resource
        </div>
        <div className="flex-1 flex">
          {months.map((month, i) => (
            <div 
              key={month} 
              className={cn(
                'flex-1 px-2 py-3 text-center text-[11px] font-semibold text-muted-foreground border-r border-border last:border-r-0 min-w-20',
                i === 0 && 'bg-[#2563eb]/5 text-[#2563eb]'
              )}
            >
              {month}
            </div>
          ))}
        </div>
      </div>
      
      {/* Body */}
      <div className="max-h-[500px] overflow-y-auto">
        {resources.map((resource) => {
          const division = (resource.division || 'Delivery') as keyof typeof divisionColors;
          const divColor = divisionColors[division] || divisionColors.Delivery;
          const initials = resource.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';
          
          return (
            <div key={resource.id} className="flex border-b border-border last:border-b-0 hover:bg-muted/20">
              <div className="w-52 px-4 py-3 flex items-center gap-3 border-r border-border shrink-0">
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold', divColor.bg, divColor.text)}>
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{resource.name}</p>
                  <p className="text-xs text-muted-foreground">{resource.role}</p>
                </div>
              </div>
              <div className="flex-1 flex">
                {months.map((month, i) => {
                  // Generate random allocation for demo
                  const alloc = Math.floor(70 + Math.random() * 50);
                  return (
                    <div 
                      key={month}
                      className={cn(
                        'flex-1 px-2 py-2.5 flex items-center justify-center border-r border-border last:border-r-0 min-w-20',
                        i === 0 && 'bg-[#2563eb]/5'
                      )}
                    >
                      <span className={cn(
                        'text-[11px] font-semibold px-2.5 py-1 rounded',
                        alloc > 100 ? 'bg-[#dc2626]/10 text-[#dc2626]' :
                        alloc > 80 ? 'bg-[#d97706]/10 text-[#d97706]' : 'bg-[#0d9488]/10 text-[#0d9488]'
                      )}>
                        {alloc}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Assignments View (Gantt) with Add Assignment Modal
// ─────────────────────────────────────────────────────────────────────────────
interface AssignmentsViewProps {
  resources: ResourceMetric[];
  projects: CapacityProject[];
  createAssignment: ReturnType<typeof useAssignments>['createAssignment'];
}

function AssignmentsView({ resources, projects, createAssignment }: AssignmentsViewProps) {
  const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];
  const [addModalOpen, setAddModalOpen] = useState(false);
  
  // Form state
  const [selectedUserId, setSelectedUserId] = useState('');
  const [assignmentName, setAssignmentName] = useState('');
  const [workItemType, setWorkItemType] = useState<'project' | 'epic' | 'feature' | 'story'>('project');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [allocationPercent, setAllocationPercent] = useState(50);

  const resetForm = () => {
    setSelectedUserId('');
    setAssignmentName('');
    setWorkItemType('project');
    setSelectedProjectId('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setAllocationPercent(50);
  };

  const handleAddAssignment = async () => {
    if (!selectedUserId || !selectedProjectId) {
      toast.error('Please select a resource and project');
      return;
    }

    try {
      await createAssignment.mutateAsync({
        user_id: selectedUserId,
        project_id: selectedProjectId,
        allocation_percentage: allocationPercent,
        start_date: startDate,
        end_date: endDate,
        status: 'active',
        work_item_type: workItemType,
        notes: assignmentName || undefined,
      });
      setAddModalOpen(false);
      resetForm();
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  return (
    <div className="space-y-3">
      {/* Scenario Panel */}
      <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-[#0d9488]/10 text-[#0d9488] uppercase">Active</span>
          <span className="text-sm font-semibold text-foreground">Current Plan - Q1 2025</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="h-3.5 w-3.5" />
            New Scenario
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Copy className="h-3.5 w-3.5" />
            Compare
          </Button>
        </div>
      </div>
      
      {/* Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 border border-border rounded-md bg-card text-muted-foreground hover:text-foreground flex items-center justify-center">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="w-8 h-8 border border-border rounded-md bg-card text-muted-foreground hover:text-foreground flex items-center justify-center">
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-foreground px-2 min-w-32 text-center">January 2025</span>
          <Button variant="outline" size="sm">Today</Button>
        </div>
        <Button 
          size="sm" 
          className="gap-2 bg-[#2563eb] hover:bg-[#1d4ed8]"
          onClick={() => setAddModalOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Assignment
        </Button>
      </div>
      
      {/* Gantt Chart */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex bg-muted/50 border-b border-border sticky top-0 z-10">
          <div className="w-56 px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-r border-border shrink-0">
            Resource
          </div>
          <div className="flex-1 flex overflow-x-auto">
            {weeks.map((week, i) => (
              <div key={week} className="min-w-36 flex-1 border-r border-border last:border-r-0">
                <div className={cn(
                  'px-2 py-2 text-center text-[11px] font-semibold text-muted-foreground border-b border-border',
                  i === 0 && 'bg-[#2563eb]/5 text-[#2563eb]'
                )}>
                  {week}
                </div>
                <div className="flex border-b border-border">
                  {[29, 30, 31, 1, 2, 3, 4].map((day, di) => (
                    <div 
                      key={di} 
                      className={cn(
                        'flex-1 px-0.5 py-1 text-[9px] text-center text-muted-foreground',
                        (di === 5 || di === 6) && 'bg-muted/50'
                      )}
                    >
                      {day}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Body */}
        <div className="max-h-[480px] overflow-y-auto">
          {resources.slice(0, 8).map((resource) => {
            const division = (resource.division || 'Delivery') as keyof typeof divisionColors;
            const divColor = divisionColors[division] || divisionColors.Delivery;
            const initials = resource.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';
            
            return (
              <div key={resource.id} className="flex border-b border-border last:border-b-0 min-h-[60px] hover:bg-muted/20">
                <div className="w-56 px-4 py-2.5 flex items-start gap-3 border-r border-border shrink-0">
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0', divColor.bg, divColor.text)}>
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{resource.name}</p>
                    <p className="text-[11px] text-muted-foreground">{resource.role}</p>
                    <span className={cn(
                      'text-[10px] font-semibold mt-1 inline-block',
                      resource.allocation > 100 ? 'text-[#dc2626]' :
                      resource.allocation > 80 ? 'text-[#d97706]' : 'text-[#0d9488]'
                    )}>
                      {resource.allocation}%
                    </span>
                  </div>
                </div>
                <div className="flex-1 flex relative">
                  {weeks.map((week, i) => (
                    <div key={week} className="min-w-36 flex-1 border-r border-border last:border-r-0 p-1.5">
                      {/* Gantt bar from real assignments */}
                      {resource.assignments.slice(i, i + 1).map((assignment, ai) => {
                        const project = projects.find(p => p.id === assignment.project_id);
                        return (
                          <div 
                            key={assignment.id}
                            className="h-6 rounded text-[10px] font-medium text-white flex items-center px-2 cursor-grab hover:translate-y-[-1px] hover:shadow-md transition-all truncate"
                            style={{ background: projectColors[ai % projectColors.length] }}
                          >
                            {project?.name || 'Project'}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  {/* Capacity indicator */}
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted">
                    <div 
                      className={cn(
                        'h-full',
                        resource.allocation > 100 ? 'bg-[#dc2626]' :
                        resource.allocation > 80 ? 'bg-[#d97706]' : 'bg-[#0d9488]'
                      )}
                      style={{ width: `${Math.min(resource.allocation, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Assignment Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Resource */}
            <div className="space-y-2">
              <Label>Resource</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger><SelectValue placeholder="Select resource..." /></SelectTrigger>
                <SelectContent>
                  {resources.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({100 - r.allocation}% available)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assignment Name */}
            <div className="space-y-2">
              <Label>Assignment Name</Label>
              <Input 
                value={assignmentName}
                onChange={(e) => setAssignmentName(e.target.value)}
                placeholder="e.g., EPIC-123: User Authentication"
              />
            </div>

            {/* Type and Project */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={workItemType} onValueChange={(v) => setWorkItemType(v as 'project' | 'epic' | 'feature' | 'story')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="epic">Epic</SelectItem>
                    <SelectItem value="feature">Feature</SelectItem>
                    <SelectItem value="story">Story</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dates and Allocation */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Allocation %</Label>
                <Input 
                  type="number"
                  min={5}
                  max={100}
                  step={5}
                  value={allocationPercent}
                  onChange={(e) => setAllocationPercent(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddModalOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddAssignment}
              disabled={createAssignment.isPending}
              className="bg-[#2563eb] hover:bg-[#1d4ed8]"
            >
              {createAssignment.isPending ? 'Adding...' : 'Add Assignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Leveling View with AI Banner and Two-Panel Layout
// ─────────────────────────────────────────────────────────────────────────────
function LevelingView({ resources, recommendations }: { resources: ResourceMetric[]; recommendations: AiRecommendation[] }) {
  const [selectedResource, setSelectedResource] = useState<ResourceMetric | null>(resources[0] || null);
  const [releaseVersion, setReleaseVersion] = useState('');
  const [allocationFilter, setAllocationFilter] = useState('under80');
  const [selectedWorkItems, setSelectedWorkItems] = useState<{ id: string; allocation: number }[]>([]);

  // Mock work items for demonstration
  const workItems = [
    { id: '1', itemId: 'SEN-1003', title: 'Create chart component library', project: 'Senaei BAU', epic: 'Real-time Dashboard Analytics', allocation: 30 },
    { id: '2', itemId: 'SEN-1004', title: 'Implement WebSocket real-time sync', project: 'Senaei BAU', epic: 'Real-time Dashboard Analytics', allocation: 30 },
    { id: '3', itemId: 'SEN-1005', title: 'Dashboard layout responsive design', project: 'Senaei BAU', epic: 'Real-time Dashboard Analytics', allocation: 25 },
  ];

  const handleWorkItemToggle = (workItemId: string, defaultAllocation: number) => {
    setSelectedWorkItems(prev => {
      const exists = prev.find(w => w.id === workItemId);
      if (exists) {
        return prev.filter(w => w.id !== workItemId);
      }
      return [...prev, { id: workItemId, allocation: defaultAllocation }];
    });
  };

  const handleAllocationChange = (workItemId: string, allocation: number) => {
    setSelectedWorkItems(prev => 
      prev.map(w => w.id === workItemId ? { ...w, allocation } : w)
    );
  };

  const isSelected = (workItemId: string) => selectedWorkItems.some(w => w.id === workItemId);
  const getAllocation = (workItemId: string, defaultVal: number) => 
    selectedWorkItems.find(w => w.id === workItemId)?.allocation || defaultVal;

  const totalPendingAllocation = selectedWorkItems.reduce((sum, w) => sum + w.allocation, 0);
  const availableCapacity = selectedResource ? 100 - selectedResource.allocation : 0;
  
  const handleSkip = () => {
    const currentIdx = resources.findIndex(r => r.id === selectedResource?.id);
    if (currentIdx < resources.length - 1) {
      setSelectedResource(resources[currentIdx + 1]);
      setSelectedWorkItems([]);
    }
  };

  const handleAssign = () => {
    if (selectedWorkItems.length > 0) {
      toast.success(`Assigned ${selectedWorkItems.length} items to ${selectedResource?.name}`);
      handleSkip();
    }
  };

  return (
    <div className="space-y-5">
      {/* AI Banner - Blue Gradient */}
      <div 
        className="flex items-center gap-4 p-5 rounded-xl text-white"
        style={{ background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)' }}
      >
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Cloud className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold mb-0.5">AI Resource Leveling</h3>
          <p className="text-sm opacity-90">
            <strong>{resources.length} resources</strong> have available capacity this period. Start the wizard to optimally assign them to open work items.
          </p>
        </div>
        <Button 
          variant="secondary" 
          size="sm" 
          className="gap-2 bg-white text-[#2563eb] hover:bg-white/90 font-semibold"
        >
          <Play className="h-4 w-4" />
          Start Wizard
        </Button>
      </div>
      
      {/* Filters Row */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground font-medium">Release Version:</span>
          <Select value={releaseVersion} onValueChange={setReleaseVersion}>
            <SelectTrigger className="w-52 h-10 bg-card">
              <SelectValue placeholder="Select Release..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="r2025.1">Release 2025.1 - Q1</SelectItem>
              <SelectItem value="r2025.2">Release 2025.2 - Q2</SelectItem>
              <SelectItem value="r2025.3">Release 2025.3 - Q3</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Select value={allocationFilter} onValueChange={setAllocationFilter}>
          <SelectTrigger className="w-52 h-10 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="under80">Under-allocated (&lt;80%)</SelectItem>
            <SelectItem value="available">Available (&lt;50%)</SelectItem>
            <SelectItem value="all">All Resources</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Two-Column Layout */}
      <div className="grid grid-cols-[340px_1fr] gap-5 min-h-[520px]">
        {/* Left Panel - Resources List */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Resources to Level</h3>
            <span className="text-xs text-muted-foreground">{resources.length} remaining</span>
          </div>
          <div className="max-h-[470px] overflow-y-auto">
            {resources.map((resource) => {
              const division = (resource.division || 'Delivery') as keyof typeof divisionColors;
              const divColor = divisionColors[division] || divisionColors.Delivery;
              const initials = resource.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';
              const freeCapacity = 100 - resource.allocation;
              const isCurrentSelected = selectedResource?.id === resource.id;
              
              return (
                <button 
                  key={resource.id}
                  onClick={() => { setSelectedResource(resource); setSelectedWorkItems([]); }}
                  className={cn(
                    'w-full flex items-center gap-3 px-5 py-4 text-left transition-colors relative',
                    isCurrentSelected 
                      ? 'bg-[#f5f5f4]' 
                      : 'hover:bg-muted/30'
                  )}
                >
                  {/* Selection indicator */}
                  {isCurrentSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#2563eb] rounded-r" />
                  )}
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold shrink-0', divColor.bg, divColor.text)}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{resource.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{resource.role}</p>
                  </div>
                  <span className={cn(
                    'text-xs font-semibold',
                    freeCapacity >= 40 ? 'text-[#0d9488]' : 
                    freeCapacity >= 20 ? 'text-[#d97706]' : 'text-[#dc2626]'
                  )}>
                    {freeCapacity}% free
                  </span>
                </button>
              );
            })}
            {resources.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No resources match the current filter
              </div>
            )}
          </div>
        </div>
        
        {/* Right Panel - Work Items */}
        <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
          {selectedResource ? (
            <>
              {/* Resource Header */}
              <div className="px-6 py-5 border-b border-border flex items-center gap-4">
                <div className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold',
                  divisionColors[(selectedResource.division || 'Delivery') as keyof typeof divisionColors]?.bg,
                  divisionColors[(selectedResource.division || 'Delivery') as keyof typeof divisionColors]?.text
                )}>
                  {selectedResource.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-lg font-semibold text-foreground">{selectedResource.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedResource.role} · {selectedResource.division || 'Delivery'}</p>
                </div>
                <div className="flex gap-6 text-center">
                  <div>
                    <p className="text-2xl font-bold text-[#d97706]">{selectedResource.allocation}%</p>
                    <p className="text-xs text-muted-foreground">Current</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#0d9488]">{availableCapacity}%</p>
                    <p className="text-xs text-muted-foreground">Available</p>
                  </div>
                </div>
              </div>

              {/* Work Items Header */}
              <div className="px-6 py-4 border-b border-border">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-foreground">
                    Available Work Items <span className="font-normal text-muted-foreground">({workItems.length} items)</span>
                  </h4>
                </div>
                <div className="flex gap-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-36 h-9 text-sm">
                      <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects</SelectItem>
                      <SelectItem value="senaei">Senaei BAU</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-28 h-9 text-sm">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="story">Story</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Work Items List */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="space-y-3">
                  {workItems.map((item) => {
                    const selected = isSelected(item.id);
                    const allocation = getAllocation(item.id, item.allocation);
                    
                    return (
                      <div 
                        key={item.id}
                        className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-muted/20 transition-colors"
                      >
                        {/* Checkbox */}
                        <input 
                          type="checkbox"
                          checked={selected}
                          onChange={() => handleWorkItemToggle(item.id, item.allocation)}
                          className="w-5 h-5 rounded border-border text-[#2563eb] focus:ring-[#2563eb]"
                        />
                        
                        {/* Icon */}
                        <div className="w-10 h-10 rounded-lg bg-[#d4b896]/20 flex items-center justify-center shrink-0">
                          <FileStack className="h-5 w-5 text-[#8b7355]" />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#2563eb]">{item.itemId}</p>
                          <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.project} · {item.epic}</p>
                        </div>
                        
                        {/* Allocation Input */}
                        <div className="flex flex-col items-center gap-0.5">
                          <Input 
                            type="number"
                            min={5}
                            max={100}
                            step={5}
                            value={allocation}
                            onChange={(e) => handleAllocationChange(item.id, parseInt(e.target.value) || 0)}
                            disabled={!selected}
                            className={cn(
                              "w-16 h-9 text-center text-sm font-medium",
                              !selected && "bg-muted text-muted-foreground"
                            )}
                          />
                          <span className="text-[10px] text-muted-foreground">% alloc</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
                <Button variant="outline" onClick={handleSkip}>
                  Skip
                </Button>
                <Button 
                  onClick={handleAssign}
                  disabled={selectedWorkItems.length === 0}
                  className="bg-[#2563eb] hover:bg-[#1d4ed8] gap-2"
                >
                  {selectedWorkItems.length > 0 ? (
                    <>
                      <Check className="h-4 w-4" />
                      Assign {selectedWorkItems.length} items
                    </>
                  ) : (
                    'Select items to assign'
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground gap-4">
              <Clock className="h-12 w-12 opacity-50" />
              <p className="text-sm">Select a resource from the queue to begin assignment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenarios View
// ─────────────────────────────────────────────────────────────────────────────
function ScenariosView() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [timeScope, setTimeScope] = useState<'release' | 'custom'>('release');
  const [releaseVersion, setReleaseVersion] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const scenarios = [
    { id: 'SCN-2025-001', name: 'Current Plan - Q1 2025', version: 'v1.0', status: 'ACTIVE', created: '2025-01-02', resources: 26 },
    { id: 'SCN-2025-001-S1', name: '↳ Pre-reorg', version: 'v1.0-s1', status: 'SNAPSHOT', created: '2025-01-05', resources: null },
    { id: 'SCN-2025-002', name: 'Q2 Hiring Plan', version: 'v1.0', status: 'DRAFT', created: '2025-01-10', resources: 30 },
    { id: 'SCN-2025-003', name: 'Cost Reduction Model', version: 'v1.0', status: 'DRAFT', created: '2025-01-12', resources: 22 },
  ];

  const filteredScenarios = scenarios.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateScenario = () => {
    if (!scenarioName.trim()) {
      toast.error('Scenario name is required');
      return;
    }
    toast.success(`Scenario "${scenarioName}" created successfully`);
    setCreateModalOpen(false);
    setScenarioName('');
    setDescription('');
    setReleaseVersion('');
  };

  const handleViewScenario = (id: string) => {
    toast.info(`Opening scenario ${id}`);
  };

  const handleRestoreSnapshot = (id: string) => {
    toast.success(`Snapshot ${id} restored`);
  };

  const handleActivateScenario = (id: string) => {
    toast.success(`Scenario ${id} activated`);
  };

  const handleDuplicateScenario = (id: string) => {
    toast.success(`Scenario ${id} duplicated`);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Scenario Management</h2>
        <Button size="sm" className="gap-2 bg-[#2563eb] hover:bg-[#1d4ed8]" onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Scenario
        </Button>
      </div>
      
      {/* Two-Column Layout */}
      <div className="grid grid-cols-[340px_1fr] gap-5">
        {/* Active Scenario Card */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-[#0d9488]/10 text-[#0d9488] uppercase">Active</span>
            <span className="text-xs text-muted-foreground">v1.0</span>
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">Current Plan - Q1 2025</h3>
          <p className="text-xs text-muted-foreground mb-4">ID: SCN-2025-001 &nbsp;&nbsp; Created: Jan 2, 2025</p>
          
          <div className="bg-muted/50 rounded-lg p-4 grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-xl font-bold text-foreground">26</p>
              <p className="text-[10px] text-muted-foreground">Resources</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">76% <span className="text-[10px]">Avg</span></p>
              <p className="text-[10px] text-muted-foreground">Util</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-foreground">42</p>
              <p className="text-[10px] text-muted-foreground">Assignments</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewScenario('SCN-2025-001')}>View Details</Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={() => toast.success('Snapshot created')}>Create Snapshot</Button>
          </div>
        </div>
        
        {/* Scenarios Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Saved Scenarios & Snapshots</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search scenarios..." 
                className="pl-9 w-48 h-8 text-sm" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <table className="w-full">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase">ID</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Name</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Version</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Status</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Created</th>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Resources</th>
                <th className="text-center px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredScenarios.map((scenario) => (
                <tr key={scenario.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-5 py-3 text-sm text-[#2563eb] font-medium">{scenario.id}</td>
                  <td className="px-5 py-3 text-sm text-foreground">{scenario.name}</td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">{scenario.version}</td>
                  <td className="px-5 py-3">
                    <span className={cn(
                      'text-[10px] font-semibold px-2 py-1 rounded uppercase',
                      scenario.status === 'ACTIVE' && 'bg-[#0d9488]/10 text-[#0d9488]',
                      scenario.status === 'DRAFT' && 'bg-[#d97706]/10 text-[#d97706]',
                      scenario.status === 'SNAPSHOT' && 'bg-muted text-muted-foreground'
                    )}>
                      {scenario.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">{scenario.created}</td>
                  <td className="px-5 py-3 text-sm text-center text-foreground">{scenario.resources ?? '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col items-center gap-1">
                      {/* Top row actions */}
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleViewScenario(scenario.id)}
                          className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {scenario.status === 'SNAPSHOT' && (
                          <button 
                            onClick={() => handleRestoreSnapshot(scenario.id)}
                            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Restore"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                        {scenario.status === 'DRAFT' && (
                          <button 
                            onClick={() => handleActivateScenario(scenario.id)}
                            className="w-7 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="Activate"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {/* Bottom row actions */}
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleDuplicateScenario(scenario.id)}
                          className={cn(
                            "w-7 h-7 rounded flex items-center justify-center transition-colors",
                            scenario.status === 'SNAPSHOT' 
                              ? "border border-[#2563eb] text-[#2563eb] hover:bg-[#2563eb]/10" 
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                          title="Duplicate"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Scenario Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Scenario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Scenario Name *</Label>
              <Input 
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="e.g., Q2 Hiring Plan"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Time Scope</Label>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={timeScope === 'release'}
                    onChange={() => setTimeScope('release')}
                    className="w-4 h-4 text-[#2563eb]"
                  />
                  <span className="text-sm">By Release Version</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={timeScope === 'custom'}
                    onChange={() => setTimeScope('custom')}
                    className="w-4 h-4 text-[#2563eb]"
                  />
                  <span className="text-sm">Custom Date Range</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Release Version *</Label>
              <Select value={releaseVersion} onValueChange={setReleaseVersion}>
                <SelectTrigger><SelectValue placeholder="Select release..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="v2025.1">v2025.1 - Q1 2025</SelectItem>
                  <SelectItem value="v2025.2">v2025.2 - Q2 2025</SelectItem>
                  <SelectItem value="v2025.3">v2025.3 - Q3 2025</SelectItem>
                  <SelectItem value="v2025.4">v2025.4 - Q4 2025</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of scenario purpose..."
                className="w-full min-h-[80px] px-3 py-2 text-sm border border-border rounded-md bg-background resize-y"
              />
            </div>

            {/* Scenario Preview */}
            <div className="border border-[#2563eb]/30 bg-[#2563eb]/5 rounded-lg p-4">
              <p className="text-xs font-semibold text-[#2563eb] uppercase mb-3">Scenario Preview</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xl font-bold text-foreground">26</p>
                  <p className="text-xs text-muted-foreground">Resources</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">--</p>
                  <p className="text-xs text-muted-foreground">Work Items</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">SCN-2025-004</p>
                  <p className="text-xs text-muted-foreground">Scenario ID</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateScenario} className="bg-[#2563eb] hover:bg-[#1d4ed8]">
              Create Scenario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommendation Card
// ─────────────────────────────────────────────────────────────────────────────
function RecommendationCard({ recommendation }: { recommendation: AiRecommendation }) {
  const priorityColors = {
    high: 'border-l-[#dc2626]',
    medium: 'border-l-[#d97706]',
    low: 'border-l-[#0d9488]',
  };
  
  const typeIcons = {
    rebalance: TrendingUp,
    hire: Users,
    alert: AlertTriangle,
    reassign: GanttChart,
  };
  
  const Icon = typeIcons[recommendation.type] || AlertTriangle;
  
  return (
    <div className={cn('bg-muted/50 border border-border rounded-lg p-4 border-l-4', priorityColors[recommendation.priority])}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-foreground mb-1">{recommendation.title}</h4>
          <p className="text-xs text-muted-foreground">{recommendation.description}</p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" className="h-7 text-xs">Dismiss</Button>
            <Button size="sm" className="h-7 text-xs bg-[#2563eb] hover:bg-[#1d4ed8]">Apply</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Resource Drawer Content
// ─────────────────────────────────────────────────────────────────────────────
function ResourceDrawerContent({ resource, projects }: { resource: ResourceMetric; projects: CapacityProject[] }) {
  const division = (resource.division || 'Delivery') as keyof typeof divisionColors;
  const divColor = divisionColors[division] || divisionColors.Delivery;
  const initials = resource.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';
  
  return (
    <div className="mt-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className={cn('w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold', divColor.bg, divColor.text)}>
          {initials}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground">{resource.name}</h3>
          <p className="text-sm text-muted-foreground">{resource.role}</p>
          <span className={cn('text-[11px] font-semibold px-2 py-1 rounded uppercase mt-1 inline-block', divColor.badge)}>
            {division}
          </span>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="text-center">
          <p className={cn(
            'text-2xl font-bold',
            resource.allocation > 100 ? 'text-[#dc2626]' :
            resource.allocation > 80 ? 'text-[#d97706]' : 'text-[#0d9488]'
          )}>
            {resource.allocation}%
          </p>
          <p className="text-xs text-muted-foreground">Allocated</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{resource.assignments.length}</p>
          <p className="text-xs text-muted-foreground">Projects</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-[#0d9488]">{Math.max(0, 100 - resource.allocation)}%</p>
          <p className="text-xs text-muted-foreground">Available</p>
        </div>
      </div>
      
      {/* Assignments */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Current Assignments</h4>
        <div className="space-y-2">
          {resource.assignments.map((assignment, i) => {
            const project = projects.find(p => p.id === assignment.project_id);
            return (
              <div key={assignment.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-1 h-8 rounded-full" style={{ background: projectColors[i % projectColors.length] }} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{project?.name || 'Unknown Project'}</p>
                  <p className="text-xs text-muted-foreground">{assignment.work_item_type}</p>
                </div>
                <span className="text-sm font-semibold text-foreground">{assignment.allocation_percentage}%</span>
              </div>
            );
          })}
          {resource.assignments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No active assignments</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit Resource Form
// ─────────────────────────────────────────────────────────────────────────────
function EditResourceForm({ 
  resource, 
  onSave, 
  onCancel 
}: { 
  resource: ResourceMetric;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(resource.name);
  const [role, setRole] = useState(resource.role || 'Frontend Developer');
  const [division, setDivision] = useState(resource.division || 'Delivery');

  return (
    <>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter name"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Frontend Developer">Frontend Developer</SelectItem>
                <SelectItem value="Backend Developer">Backend Developer</SelectItem>
                <SelectItem value="Sr Frontend Developer">Sr Frontend Developer</SelectItem>
                <SelectItem value="Sr Backend Developer">Sr Backend Developer</SelectItem>
                <SelectItem value="DevOps Engineer">DevOps Engineer</SelectItem>
                <SelectItem value="QA Analyst">QA Analyst</SelectItem>
                <SelectItem value="Product Owner">Product Owner</SelectItem>
                <SelectItem value="Delivery Manager">Delivery Manager</SelectItem>
                <SelectItem value="Backend Architect">Backend Architect</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Division</Label>
            <Select value={division} onValueChange={setDivision}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Product">Product</SelectItem>
                <SelectItem value="Delivery">Delivery</SelectItem>
                <SelectItem value="Support">Support</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={onSave} className="bg-[#2563eb] hover:bg-[#1d4ed8]">
          Save
        </Button>
      </DialogFooter>
    </>
  );
}
