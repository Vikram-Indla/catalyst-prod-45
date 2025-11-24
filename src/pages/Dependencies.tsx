import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ListScreenToolbar } from '@/components/shared/ListScreenToolbar';
import { RightDetailsPanel } from '@/components/shared/RightDetailsPanel';
import { DependencyDialog } from '@/components/forms/DependencyDialog';
import { AlertCircle, ArrowRight, Plus } from 'lucide-react';
import { PermissionGuard } from '@/components/shared/PermissionGuard';

export default function Dependencies() {
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
          from_feature:features!dependencies_from_feature_id_fkey(id, name, program_id, programs(name)),
          to_feature:features!dependencies_to_feature_id_fkey(id, name, program_id, programs(name)),
          due_iteration:iterations(id, name, start_date, end_date)
        `);

      if (statusFilter) query = query.eq('status', statusFilter);
      if (riskFilter) query = query.eq('risk_level', riskFilter);

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      
      // Filter by search term on the client side
      if (searchTerm) {
        return data?.filter(d => 
          d.from_feature?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.to_feature?.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      return data;
    },
  });

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
    
    return { total, critical, open };
  };

  const stats = getDependencyCount();

  const handleEdit = (dependency: any) => {
    setEditingDependencyId(dependency.id);
    setDialogOpen(true);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dependencies</h1>
          <p className="text-muted-foreground">Manage cross-team and cross-program dependencies</p>
        </div>
        <PermissionGuard requiredRole="team_lead" showMessage={false}>
          <Button onClick={() => { setEditingDependencyId(undefined); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Dependency
          </Button>
        </PermissionGuard>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <ArrowRight className="h-8 w-8 text-muted-foreground" />
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Dependencies</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-destructive/20">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <div>
              <div className="text-2xl font-bold">{stats.critical}</div>
              <div className="text-sm text-muted-foreground">High Risk</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-warning/20">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-warning" />
            <div>
              <div className="text-2xl font-bold">{stats.open}</div>
              <div className="text-sm text-muted-foreground">Open</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex gap-4">
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox />
            </TableHead>
            <TableHead>From Feature</TableHead>
            <TableHead>From Program</TableHead>
            <TableHead className="text-center">→</TableHead>
            <TableHead>To Feature</TableHead>
            <TableHead>To Program</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Due Iteration</TableHead>
            <TableHead>Risk</TableHead>
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
                <Badge variant="outline" className="capitalize">
                  {dependency.type}
                </Badge>
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
                <Badge variant="outline" className="capitalize">
                  {dependency.status?.replace('_', ' ')}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <RightDetailsPanel
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title="Dependency Details"
        tabs={[
          {
            id: 'details',
            label: 'Details',
            content: selectedDependency && (
              <div className="space-y-4">
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
                  <label className="text-sm font-medium">Type</label>
                  <Badge variant="outline" className="mt-1 capitalize">
                    {selectedDependency.type}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Risk Level</label>
                  <Badge
                    className={`mt-1 capitalize ${
                      selectedDependency.risk_level === 'high' ? 'bg-destructive' :
                      selectedDependency.risk_level === 'med' ? 'bg-warning' : 'bg-success'
                    }`}
                  >
                    {selectedDependency.risk_level}
                  </Badge>
                </div>
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
