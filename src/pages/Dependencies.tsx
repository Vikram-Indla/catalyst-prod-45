import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ListScreenToolbar } from '@/components/shared/ListScreenToolbar';
import { RightDetailsPanel } from '@/components/shared/RightDetailsPanel';
import { DependencyDialog } from '@/components/forms/DependencyDialog';
import { AlertCircle, ArrowRight, Plus, AlertTriangle, Network } from 'lucide-react';
import { PermissionGuard } from '@/components/shared/PermissionGuard';
import { useToast } from '@/hooks/use-toast';

export default function Dependencies() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'open' | 'in_progress' | 'done' | ''>('');
  const [riskFilter, setRiskFilter] = useState<'low' | 'med' | 'high' | ''>('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDependency, setSelectedDependency] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDependencyId, setEditingDependencyId] = useState<string | undefined>();

  const { data: dependencies } = useQuery({
    queryKey: ['all-dependencies', searchTerm, statusFilter, riskFilter],
    queryFn: async () => {
      let query = supabase
        .from('dependencies')
        .select(`
          *,
          from_feature:features!dependencies_from_feature_id_fkey(id, name, project_id, status, blocked, projects(name)),
          to_feature:features!dependencies_to_feature_id_fkey(id, name, project_id, status, blocked, projects(name)),
          due_iteration:iterations!dependencies_due_iteration_id_fkey(id, name, start_date, end_date)
        `);

      if (statusFilter) query = query.eq('status', statusFilter);
      if (riskFilter) query = query.eq('risk_level', riskFilter);

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      
      if (searchTerm) {
        return data?.filter(d => 
          d.from_feature?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.to_feature?.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      return data;
    },
  });

  const updateCriticalityMutation = useMutation({
    mutationFn: async ({ id, criticality }: { id: string; criticality: number }) => {
      const { error } = await supabase
        .from('dependencies')
        .update({ criticality_score: criticality })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-dependencies'] });
      toast({ title: "Criticality updated" });
    },
  });

  const calculateCriticalPath = () => {
    if (!dependencies) return [];
    
    // Find critical dependencies (high risk + blocking features)
    return dependencies.filter(d => 
      d.risk_level === 'high' && 
      (d.from_feature?.blocked || d.to_feature?.blocked)
    );
  };

  const getCrossGramDependencies = () => {
    if (!dependencies) return [];
    
    return dependencies.filter(d => 
      d.from_feature?.project_id !== d.to_feature?.project_id
    );
  };

  const handleRowClick = (dependency: any) => {
    setSelectedDependency(dependency);
    setDetailsOpen(true);
  };

  const handleRowSelect = (dependencyId: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(dependencyId)) {
      newSelected.delete(dependencyId);
    } else {
      newSelected.add(dependencyId);
    }
    setSelectedRows(newSelected);
  };

  const getDependencyCount = () => {
    const total = dependencies?.length || 0;
    const critical = dependencies?.filter(d => d.risk_level === 'high').length || 0;
    const open = dependencies?.filter(d => d.status === 'open').length || 0;
    const crossProgram = getCrossGramDependencies().length;
    const criticalPath = calculateCriticalPath().length;
    
    return { total, critical, open, crossProgram, criticalPath };
  };

  const stats = getDependencyCount();

  const handleEdit = (dependency: any) => {
    setEditingDependencyId(dependency.id);
    setDialogOpen(true);
  };

  return (
    <div className="px-3 sm:px-[var(--s6)] py-3 sm:py-[var(--s6)] space-y-3 sm:space-y-[var(--s6)]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Dependencies</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Advanced dependency tracking with critical path analysis</p>
        </div>
        <PermissionGuard requiredRole="team_lead" showMessage={false}>
          <Button onClick={() => { setEditingDependencyId(undefined); setDialogOpen(true); }} size="sm" className="h-8 sm:h-9 text-xs sm:text-sm w-full sm:w-auto">
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Create Dependency</span>
            <span className="sm:hidden ml-1">Create</span>
          </Button>
        </PermissionGuard>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-[var(--s4)]">
        <Card className="px-3 sm:px-[var(--s4)] py-3 sm:py-[var(--s4)]">
          <div className="flex items-center gap-2 sm:gap-[var(--s3)]">
            <ArrowRight className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
              <div className="text-xs sm:text-sm text-muted-foreground truncate">Total</div>
            </div>
          </div>
        </Card>
        <Card className="px-3 sm:p-4 py-3 border-destructive/20">
          <div className="flex items-center gap-2 sm:gap-3">
            <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-destructive flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.critical}</div>
              <div className="text-xs sm:text-sm text-muted-foreground truncate">High Risk</div>
            </div>
          </div>
        </Card>
        <Card className="px-3 sm:p-4 py-3 border-warning/20">
          <div className="flex items-center gap-2 sm:gap-3">
            <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-warning flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.open}</div>
              <div className="text-xs sm:text-sm text-muted-foreground truncate">Open</div>
            </div>
          </div>
        </Card>
        <Card className="px-3 sm:p-4 py-3 border-primary/20">
          <div className="flex items-center gap-2 sm:gap-3">
            <Network className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.crossProgram}</div>
              <div className="text-xs sm:text-sm text-muted-foreground truncate">Cross-Program</div>
            </div>
          </div>
        </Card>
        <Card className="px-3 sm:p-4 py-3 border-primary/20 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 sm:gap-3">
            <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.criticalPath}</div>
              <div className="text-xs sm:text-sm text-muted-foreground truncate">Critical Path</div>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
          <TabsTrigger value="critical" className="text-xs sm:text-sm">Critical</TabsTrigger>
          <TabsTrigger value="cross-program" className="text-xs sm:text-sm">Cross-Program</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-[var(--s3)] sm:space-y-[var(--s4)]">
          <div className="flex flex-col sm:flex-row gap-[var(--s3)] sm:gap-[var(--s4)]">
            <Input
              placeholder="Search dependencies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={statusFilter || undefined} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Select value={riskFilter || undefined} onValueChange={(value) => setRiskFilter(value as typeof riskFilter)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Risk Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="med">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ListScreenToolbar selectedCount={selectedRows.size} />

          <div className="overflow-x-auto">
            <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"><Checkbox /></TableHead>
                <TableHead>From Feature</TableHead>
                <TableHead>From Program</TableHead>
                <TableHead className="text-center">→</TableHead>
                <TableHead>To Feature</TableHead>
                <TableHead>To Program</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Criticality</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dependencies?.map((dependency) => (
                <TableRow
                  key={dependency.id}
                  className="cursor-pointer"
                  onClick={() => handleRowClick(dependency)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedRows.has(dependency.id)}
                      onCheckedChange={() => handleRowSelect(dependency.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{dependency.from_feature?.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {dependency.from_feature?.programs?.name}
                  </TableCell>
                  <TableCell className="text-center">
                    <ArrowRight className="h-4 w-4 mx-auto text-muted-foreground" />
                  </TableCell>
                  <TableCell className="font-medium">{dependency.to_feature?.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {dependency.to_feature?.programs?.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{dependency.type}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {dependency.due_iteration?.name || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`capitalize ${
                        dependency.risk_level === 'high' ? 'bg-destructive' :
                        dependency.risk_level === 'med' ? 'bg-warning' : 'bg-success'
                      }`}
                    >
                      {dependency.risk_level}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(dependency.criticality_score || 0) * 10} 
                        className="h-2 w-16"
                      />
                      <span className="text-xs text-muted-foreground">
                        {dependency.criticality_score || 0}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {dependency.status?.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </TabsContent>

        <TabsContent value="critical">
          <Card className="px-[var(--s6)] py-[var(--s6)]">
            <h3 className="text-lg font-semibold mb-[var(--s4)]">Critical Path Dependencies</h3>
            <div className="space-y-[var(--s3)]">
              {calculateCriticalPath().map((dep) => (
                <div key={dep.id} className="p-4 border-l-4 border-destructive bg-destructive/5 rounded">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="font-medium">
                        {dep.from_feature?.name} → {dep.to_feature?.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Blocking: {dep.from_feature?.blocked || dep.to_feature?.blocked ? 'Yes' : 'No'}
                      </div>
                    </div>
                    <Badge className="bg-destructive">Critical</Badge>
                  </div>
                </div>
              ))}
              {calculateCriticalPath().length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No critical path dependencies identified
                </p>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="cross-program">
          <Card className="px-[var(--s6)] py-[var(--s6)]">
            <h3 className="text-lg font-semibold mb-[var(--s4)]">Cross-Program Dependencies</h3>
            <div className="space-y-[var(--s3)]">
              {getCrossGramDependencies().map((dep) => (
                <div key={dep.id} className="p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="font-medium">
                        {dep.from_feature?.programs?.name} → {dep.to_feature?.programs?.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {dep.from_feature?.name} → {dep.to_feature?.name}
                      </div>
                    </div>
                    <Badge variant="outline">{dep.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <RightDetailsPanel
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title="Dependency Details"
        tabs={[
          {
            id: 'details',
            label: 'Details',
            content: selectedDependency && (
              <div className="space-y-[var(--s4)]">
                <div>
                  <label className="text-sm font-medium">From Feature</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedDependency.from_feature?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedDependency.from_feature?.programs?.name}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">To Feature</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedDependency.to_feature?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedDependency.to_feature?.programs?.name}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Criticality Score</label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    defaultValue={selectedDependency.criticality_score || 0}
                    onChange={(e) => {
                      updateCriticalityMutation.mutate({
                        id: selectedDependency.id,
                        criticality: parseInt(e.target.value),
                      });
                    }}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    0 = Low impact, 10 = Critical
                  </p>
                </div>
                {selectedDependency.resolution_plan && (
                  <div>
                    <label className="text-sm font-medium">Resolution Plan</label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedDependency.resolution_plan}
                    </p>
                  </div>
                )}
                <PermissionGuard requiredRole="team_lead" showMessage={false}>
                  <Button onClick={() => handleEdit(selectedDependency)} className="w-full mt-4">
                    Edit Dependency
                  </Button>
                </PermissionGuard>
              </div>
            ),
          },
        ]}
      />

      <DependencyDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingDependencyId(undefined); }}
        dependencyId={editingDependencyId}
      />
    </div>
  );
}