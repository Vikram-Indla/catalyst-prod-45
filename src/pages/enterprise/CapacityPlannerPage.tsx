import { useState } from 'react';
import { PageChrome } from '@/components/layout/PageChrome';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, UserCheck, AlertTriangle, TrendingUp, Download, Plus, Bot, 
  Search, LayoutGrid, Table, Calendar, GanttChart, Layers,
  X, ChevronRight, Mail, Briefcase, MapPin
} from 'lucide-react';
import { useCapacityData, useAssignments, useAiRecommendations, exportCapacityToPdf } from '@/modules/capacity-planner';
import type { ViewType, ResourceMetric, CapacityProject, AiRecommendation } from '@/modules/capacity-planner';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function CapacityPlannerPage() {
  const { metrics, projects, resources, isLoading } = useCapacityData();
  const { createAssignment } = useAssignments();
  const { recommendations, highPriorityCount } = useAiRecommendations({ 
    resources: metrics.resources, 
    projects 
  });

  // View state
  const [currentView, setCurrentView] = useState<ViewType>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<ResourceMetric | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  
  // Assignment form state
  const [assignmentForm, setAssignmentForm] = useState({
    user_id: '',
    project_id: '',
    allocation_percentage: 50,
    start_date: new Date().toISOString().split('T')[0],
    notes: '',
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

  const handleCreateAssignment = () => {
    if (!assignmentForm.user_id || !assignmentForm.project_id) {
      toast.error('Please select a resource and project');
      return;
    }
    createAssignment.mutate({
      user_id: assignmentForm.user_id,
      project_id: assignmentForm.project_id,
      allocation_percentage: assignmentForm.allocation_percentage,
      start_date: assignmentForm.start_date,
      status: 'active',
      work_item_type: 'project',
      notes: assignmentForm.notes || undefined,
    });
    setAssignmentModalOpen(false);
    setAssignmentForm({
      user_id: '',
      project_id: '',
      allocation_percentage: 50,
      start_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  const openResourceDrawer = (resource: ResourceMetric) => {
    setSelectedResource(resource);
    setDrawerOpen(true);
  };

  const filteredResources = metrics.resources.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <div className="flex flex-col h-full bg-background">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Capacity Planner</h1>
            <p className="text-sm text-muted-foreground">Resource allocation and capacity management</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button size="sm" onClick={() => setAssignmentModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Assignment
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-5 gap-4 p-6">
          <SummaryCard icon={Users} value={metrics.summary.total} label="Total Resources" color="blue" />
          <SummaryCard icon={UserCheck} value={metrics.summary.available + metrics.summary.healthy} label="Available" color="teal" />
          <SummaryCard icon={TrendingUp} value={metrics.summary.atCapacity} label="At Capacity" color="amber" />
          <SummaryCard icon={AlertTriangle} value={metrics.summary.overAllocated} label="Over-allocated" color="red" />
          <SummaryCard icon={TrendingUp} value={`${metrics.summary.avgUtilization}%`} label="Avg Utilization" color="blue" />
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 pb-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search resources..." 
                className="pl-9 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as ViewType)}>
              <TabsList>
                <TabsTrigger value="cards"><LayoutGrid className="h-4 w-4 mr-1" />Cards</TabsTrigger>
                <TabsTrigger value="table"><Table className="h-4 w-4 mr-1" />Table</TabsTrigger>
                <TabsTrigger value="timeline"><Calendar className="h-4 w-4 mr-1" />Timeline</TabsTrigger>
                <TabsTrigger value="assignments"><GanttChart className="h-4 w-4 mr-1" />Assignments</TabsTrigger>
                <TabsTrigger value="leveling"><Layers className="h-4 w-4 mr-1" />Leveling</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6 pt-0">
          {currentView === 'cards' && (
            <CardsView resources={filteredResources} onResourceClick={openResourceDrawer} />
          )}
          {currentView === 'table' && (
            <TableView resources={filteredResources} projects={projects} onResourceClick={openResourceDrawer} />
          )}
          {currentView === 'timeline' && (
            <TimelineView resources={filteredResources} />
          )}
          {currentView === 'assignments' && (
            <AssignmentsView resources={filteredResources} />
          )}
          {currentView === 'leveling' && (
            <LevelingView resources={filteredResources} recommendations={recommendations} />
          )}
        </div>

        {/* Resource 360° Drawer */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent className="w-[500px] sm:max-w-[500px]">
            <SheetHeader>
              <SheetTitle>Resource Details</SheetTitle>
            </SheetHeader>
            {selectedResource && (
              <ResourceDrawerContent resource={selectedResource} projects={projects} />
            )}
          </SheetContent>
        </Sheet>

        {/* AI Drawer */}
        <Sheet open={aiDrawerOpen} onOpenChange={setAiDrawerOpen}>
          <SheetContent className="w-[400px] sm:max-w-[400px]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Recommendations
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-100px)] mt-4">
              <div className="space-y-4 pr-4">
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

        {/* Assignment Modal */}
        <Dialog open={assignmentModalOpen} onOpenChange={setAssignmentModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Assignment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Resource</Label>
                <Select value={assignmentForm.user_id} onValueChange={(v) => setAssignmentForm(f => ({ ...f, user_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select resource" /></SelectTrigger>
                  <SelectContent>
                    {resources.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={assignmentForm.project_id} onValueChange={(v) => setAssignmentForm(f => ({ ...f, project_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Allocation: {assignmentForm.allocation_percentage}%</Label>
                <Slider 
                  value={[assignmentForm.allocation_percentage]} 
                  onValueChange={([v]) => setAssignmentForm(f => ({ ...f, allocation_percentage: v }))}
                  max={100}
                  step={5}
                />
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input 
                  type="date" 
                  value={assignmentForm.start_date}
                  onChange={(e) => setAssignmentForm(f => ({ ...f, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea 
                  value={assignmentForm.notes}
                  onChange={(e) => setAssignmentForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignmentModalOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateAssignment} disabled={createAssignment.isPending}>
                {createAssignment.isPending ? 'Creating...' : 'Create Assignment'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AI Assistant FAB */}
        <Button
          size="lg"
          className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg"
          onClick={() => setAiDrawerOpen(true)}
        >
          <Bot className="h-6 w-6" />
          {highPriorityCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {highPriorityCount}
            </span>
          )}
        </Button>
      </div>
    </PageChrome>
  );
}

// Summary Card Component
function SummaryCard({ icon: Icon, value, label, color }: { icon: React.ElementType; value: number | string; label: string; color: string }) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-500',
    teal: 'bg-teal-500/10 text-teal-500',
    amber: 'bg-amber-500/10 text-amber-500',
    red: 'bg-red-500/10 text-red-500',
  };
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', colorClasses[color as keyof typeof colorClasses])}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Cards View
function CardsView({ resources, onResourceClick }: { resources: ResourceMetric[]; onResourceClick: (r: ResourceMetric) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {resources.map((resource) => (
        <Card 
          key={resource.id} 
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onResourceClick(resource)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={resource.avatar_url} />
                  <AvatarFallback>{resource.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-sm font-medium">{resource.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{resource.role}</p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  resource.status === 'available' && 'border-teal-500 text-teal-500',
                  resource.status === 'healthy' && 'border-green-500 text-green-500',
                  resource.status === 'at_capacity' && 'border-amber-500 text-amber-500',
                  resource.status === 'over_allocated' && 'border-red-500 text-red-500'
                )}
              >
                {resource.allocation}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    resource.allocation <= 80 && 'bg-teal-500',
                    resource.allocation > 80 && resource.allocation <= 100 && 'bg-amber-500',
                    resource.allocation > 100 && 'bg-red-500'
                  )}
                  style={{ width: `${Math.min(resource.allocation, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {resource.assignments.length} active assignment{resource.assignments.length !== 1 ? 's' : ''}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Table View
function TableView({ resources, projects, onResourceClick }: { resources: ResourceMetric[]; projects: CapacityProject[]; onResourceClick: (r: ResourceMetric) => void }) {
  const getProjectName = (projectId: string) => projects.find(p => p.id === projectId)?.name || 'Unknown';
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-3 text-sm font-medium">Resource</th>
            <th className="text-left p-3 text-sm font-medium">Role</th>
            <th className="text-left p-3 text-sm font-medium">Division</th>
            <th className="text-left p-3 text-sm font-medium">Projects</th>
            <th className="text-center p-3 text-sm font-medium">Allocation</th>
            <th className="text-center p-3 text-sm font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {resources.map((resource) => (
            <tr 
              key={resource.id} 
              className="border-t hover:bg-muted/30 cursor-pointer"
              onClick={() => onResourceClick(resource)}
            >
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={resource.avatar_url} />
                    <AvatarFallback>{resource.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-sm">{resource.name}</span>
                </div>
              </td>
              <td className="p-3 text-sm text-muted-foreground">{resource.role}</td>
              <td className="p-3 text-sm text-muted-foreground">{resource.division}</td>
              <td className="p-3 text-sm">
                {resource.assignments.length > 0 
                  ? resource.assignments.map(a => getProjectName(a.project_id)).join(', ')
                  : <span className="text-muted-foreground">None</span>
                }
              </td>
              <td className="p-3 text-center">
                <Badge variant="outline" className={cn(
                  resource.allocation <= 80 && 'border-teal-500 text-teal-500',
                  resource.allocation > 80 && resource.allocation <= 100 && 'border-amber-500 text-amber-500',
                  resource.allocation > 100 && 'border-red-500 text-red-500'
                )}>
                  {resource.allocation}%
                </Badge>
              </td>
              <td className="p-3 text-center">
                <Badge className={cn(
                  'capitalize',
                  resource.status === 'available' && 'bg-teal-500/10 text-teal-600 hover:bg-teal-500/20',
                  resource.status === 'healthy' && 'bg-green-500/10 text-green-600 hover:bg-green-500/20',
                  resource.status === 'at_capacity' && 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20',
                  resource.status === 'over_allocated' && 'bg-red-500/10 text-red-600 hover:bg-red-500/20'
                )}>
                  {resource.status?.replace('_', ' ')}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Timeline View (Heatmap)
function TimelineView({ resources }: { resources: ResourceMetric[] }) {
  const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-3 text-sm font-medium w-48">Resource</th>
            {weeks.map(week => (
              <th key={week} className="text-center p-3 text-sm font-medium">{week}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {resources.map((resource) => (
            <tr key={resource.id} className="border-t">
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">{resource.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{resource.name}</span>
                </div>
              </td>
              {weeks.map((week, i) => {
                const allocation = Math.min(100, resource.allocation + (Math.random() * 20 - 10));
                return (
                  <td key={week} className="p-1">
                    <div 
                      className={cn(
                        'h-8 rounded flex items-center justify-center text-xs font-medium',
                        allocation === 0 && 'bg-gray-100 text-gray-400',
                        allocation > 0 && allocation <= 50 && 'bg-teal-100 text-teal-700',
                        allocation > 50 && allocation <= 80 && 'bg-teal-200 text-teal-800',
                        allocation > 80 && allocation <= 100 && 'bg-amber-200 text-amber-800',
                        allocation > 100 && 'bg-red-200 text-red-800'
                      )}
                    >
                      {Math.round(allocation)}%
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Assignments View (Gantt-style)
function AssignmentsView({ resources }: { resources: ResourceMetric[] }) {
  return (
    <div className="space-y-4">
      {resources.filter(r => r.assignments.length > 0).map((resource) => (
        <Card key={resource.id}>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{resource.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-sm">{resource.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{resource.role}</p>
                </div>
              </div>
              <Badge variant="outline">{resource.allocation}%</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {resource.assignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-muted-foreground">
                    {assignment.allocation_percentage}%
                  </div>
                  <div className="flex-1 h-6 bg-blue-500/20 rounded flex items-center px-2">
                    <span className="text-xs font-medium text-blue-700">
                      {assignment.projects?.name || 'Project'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
      {resources.filter(r => r.assignments.length > 0).length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No assignments found
        </div>
      )}
    </div>
  );
}

// Leveling View
function LevelingView({ resources, recommendations }: { resources: ResourceMetric[]; recommendations: AiRecommendation[] }) {
  const overAllocated = resources.filter(r => r.status === 'over_allocated');
  
  return (
    <div className="grid grid-cols-2 gap-6">
      <div>
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          Over-allocated Resources ({overAllocated.length})
        </h3>
        <div className="space-y-3">
          {overAllocated.map((resource) => (
            <Card key={resource.id} className="border-red-200">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{resource.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{resource.name}</p>
                      <p className="text-xs text-muted-foreground">{resource.role}</p>
                    </div>
                  </div>
                  <Badge variant="destructive">{resource.allocation}%</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {overAllocated.length === 0 && (
            <p className="text-sm text-muted-foreground">No over-allocated resources</p>
          )}
        </div>
      </div>
      <div>
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <Bot className="h-4 w-4 text-blue-500" />
          AI Recommendations ({recommendations.length})
        </h3>
        <div className="space-y-3">
          {recommendations.slice(0, 5).map((rec) => (
            <RecommendationCard key={rec.id} recommendation={rec} />
          ))}
          {recommendations.length === 0 && (
            <p className="text-sm text-muted-foreground">No recommendations at this time</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Recommendation Card
function RecommendationCard({ recommendation }: { recommendation: AiRecommendation }) {
  return (
    <Card className={cn(
      recommendation.priority === 'high' && 'border-red-200',
      recommendation.priority === 'medium' && 'border-amber-200',
      recommendation.priority === 'low' && 'border-blue-200'
    )}>
      <CardContent className="py-3">
        <div className="flex items-start gap-3">
          <div className={cn(
            'p-1.5 rounded',
            recommendation.priority === 'high' && 'bg-red-100 text-red-600',
            recommendation.priority === 'medium' && 'bg-amber-100 text-amber-600',
            recommendation.priority === 'low' && 'bg-blue-100 text-blue-600'
          )}>
            {recommendation.type === 'rebalance' && <TrendingUp className="h-4 w-4" />}
            {recommendation.type === 'alert' && <AlertTriangle className="h-4 w-4" />}
            {recommendation.type === 'hire' && <Users className="h-4 w-4" />}
            {recommendation.type === 'reassign' && <ChevronRight className="h-4 w-4" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{recommendation.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{recommendation.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Resource Drawer Content
function ResourceDrawerContent({ resource, projects }: { resource: ResourceMetric; projects: CapacityProject[] }) {
  const getProjectName = (projectId: string) => projects.find(p => p.id === projectId)?.name || 'Unknown';
  
  return (
    <ScrollArea className="h-[calc(100vh-100px)] mt-4">
      <div className="space-y-6 pr-4">
        {/* Profile Section */}
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={resource.avatar_url} />
            <AvatarFallback className="text-lg">{resource.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-lg font-semibold">{resource.name}</h3>
            <p className="text-sm text-muted-foreground">{resource.role}</p>
            <Badge className="mt-1" variant="outline">{resource.division}</Badge>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{resource.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <span>{resource.department}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>Onsite</span>
          </div>
        </div>

        {/* Utilization */}
        <div>
          <h4 className="font-medium mb-2">Current Utilization</h4>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full',
                  resource.allocation <= 80 && 'bg-teal-500',
                  resource.allocation > 80 && resource.allocation <= 100 && 'bg-amber-500',
                  resource.allocation > 100 && 'bg-red-500'
                )}
                style={{ width: `${Math.min(resource.allocation, 100)}%` }}
              />
            </div>
            <span className="font-semibold">{resource.allocation}%</span>
          </div>
        </div>

        {/* Assignments */}
        <div>
          <h4 className="font-medium mb-2">Active Assignments ({resource.assignments.length})</h4>
          <div className="space-y-2">
            {resource.assignments.map((assignment) => (
              <div key={assignment.id} className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{getProjectName(assignment.project_id)}</span>
                  <Badge variant="outline">{assignment.allocation_percentage}%</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Since {new Date(assignment.start_date).toLocaleDateString()}
                </p>
              </div>
            ))}
            {resource.assignments.length === 0 && (
              <p className="text-sm text-muted-foreground">No active assignments</p>
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
