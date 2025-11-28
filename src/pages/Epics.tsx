import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { exportToCSV } from '@/lib/exportUtils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { HealthBadge } from '@/components/shared/HealthBadge';
import { EpicDialog } from '@/components/forms/EpicDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Search } from 'lucide-react';
import { EpicsToolbar } from '@/components/epics/EpicsToolbar';
import { EpicsFilterBar, EpicFilters } from '@/components/epics/EpicsFilterBar';
import { EpicsAdditionalOptionsMenu } from '@/components/epics/EpicsAdditionalOptionsMenu';
import { EpicDetailsTabFull } from '@/components/epics/tabs/EpicDetailsTabFull';
import { EpicDoughnutChart } from '@/components/epics/EpicDoughnutChart';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImportDialog } from '@/components/shared/ImportDialog';
import { CommentsSection } from '@/components/shared/CommentsSection';
import { AttachmentsSection } from '@/components/shared/AttachmentsSection';

export default function Epics() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<EpicFilters>({});
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingEpic, setEditingEpic] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ['epics', searchQuery, filters],
    queryFn: async () => {
      let query = supabase
        .from('epics')
        .select('*, strategic_themes(name), programs(name)')
        .is('deleted_at', null)
        .is('parked_at', null)
        .order('name');

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,epic_key.ilike.%${searchQuery}%`);
      }

      if (filters.portfolioId) {
        query = query.eq('portfolio_id', filters.portfolioId);
      }
      if (filters.programId) {
        query = query.eq('primary_program_id', filters.programId);
      }
      if (filters.state) {
        query = query.eq('state', filters.state as any);
      }
      if (filters.epicType) {
        query = query.eq('epic_type', filters.epicType);
      }
      if (filters.investmentType) {
        query = query.eq('investment_type', filters.investmentType);
      }
      if (filters.mvp !== undefined) {
        query = query.eq('mvp', filters.mvp);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const selectedData = items?.find(i => i.id === selectedItem);

  // Fetch child counts for doughnut chart
  const { data: childCounts } = useQuery({
    queryKey: ['epic-child-counts', selectedItem],
    queryFn: async () => {
      if (!selectedItem) return null;
      
      const { data: features } = await supabase
        .from('features')
        .select('status')
        .eq('epic_id', selectedItem);

      const counts = {
        notStarted: 0,
        inProgress: 0,
        accepted: 0,
        done: 0,
      };

      features?.forEach((f) => {
        const status = f.status as string;
        if (status === 'funnel' || status === 'backlog') counts.notStarted++;
        else if (status === 'implementing') counts.inProgress++;
        else if (status === 'done') counts.done++;
        else counts.inProgress++; // Default other statuses to in progress
      });

      return counts;
    },
    enabled: !!selectedItem,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      proposed: 'secondary',
      analyzing: 'secondary',
      approved: 'default',
      in_progress: 'default',
      done: 'outline',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status.replace('_', ' ')}</Badge>;
  };

  const handleCreate = () => {
    setEditingEpic(null);
    setDialogOpen(true);
  };

  const importMutation = useMutation({
    mutationFn: async (data: any[]) => {
      const { error } = await supabase.from('epics').insert(data.map(row => ({
        name: row.name,
        description: row.description || null,
        status: row.status || 'proposed',
        health: row.health || 'green',
        theme_id: row.theme_id || null,
      })));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics'] });
      toast({ title: 'Epics imported successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to import epics', variant: 'destructive' });
    }
  });

  const handleExport = () => {
    if (items && items.length > 0) {
      exportToCSV(items, 'epics', ['name', 'description', 'status', 'health', 'start_date', 'end_date', 'epic_type', 'investment_type']);
      toast({ title: 'Epics exported successfully' });
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="border-b bg-card px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Epics</h1>
          <p className="text-sm text-muted-foreground">Large customer-facing initiatives broken into capabilities and features</p>
        </div>
      </div>

      <EpicsToolbar
        onAddEpic={handleCreate}
        onBottomUpEstimate={() => toast({ title: 'Bottom-Up Estimate - Coming Soon' })}
        onPrioritization={() => toast({ title: 'Prioritization - Coming Soon' })}
        onImport={() => setImportDialogOpen(true)}
        onExport={handleExport}
        onMassMove={() => toast({ title: 'Mass Move - Coming Soon' })}
        onWorkTree={() => toast({ title: 'Work Tree - Coming Soon' })}
        onPrintCards={() => toast({ title: 'Print Cards - Coming Soon' })}
        onRecycleBin={() => toast({ title: 'Recycle Bin - Coming Soon' })}
        onCanceledItems={() => toast({ title: 'Canceled Items - Coming Soon' })}
        onColumnsShown={() => toast({ title: 'Columns Config - Coming Soon' })}
        selectedCount={selectedRows.length}
      />

      <EpicsFilterBar onFilterChange={setFilters} />

      <div className="flex-1 flex flex-col p-6 space-y-4 overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search epics by name or key..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </div>

        <div className="flex-1 border rounded-lg overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"><Checkbox /></TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Theme</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Investment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>MVP</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : items && items.length > 0 ? (
                items.map((item) => (
                  <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedItem(item.id)}>
                    <TableCell onClick={(e) => e.stopPropagation()}><Checkbox /></TableCell>
                    <TableCell className="font-mono text-xs">{item.epic_key || '-'}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-sm">{item.strategic_themes?.name || '-'}</TableCell>
                    <TableCell className="text-sm">{item.epic_type || '-'}</TableCell>
                    <TableCell className="text-sm">{item.investment_type || '-'}</TableCell>
                    <TableCell>{getStatusBadge(item.status || 'proposed')}</TableCell>
                    <TableCell><HealthBadge health={item.health} /></TableCell>
                    <TableCell>{item.mvp ? <Badge variant="default" className="text-xs">MVP</Badge> : '-'}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()} className="text-right">
                      <EpicsAdditionalOptionsMenu
                        epicId={item.id}
                        onDiscussions={() => {}}
                        onSubscribe={() => {}}
                        onUpdateChildSteps={() => {}}
                        onResponsibilityMatrix={() => {}}
                        onTrace={() => {}}
                        onStatusReport={() => {}}
                        onRequirementHierarchy={() => {}}
                        onAuditLog={() => {}}
                        onLinks={() => {}}
                        onDrop={() => {}}
                        onSplit={() => {}}
                        onDelete={() => {}}
                        onCancel={() => {}}
                        onCopy={() => {}}
                        onAddToKanban={() => {}}
                        onEpicPlanning={() => {}}
                        onWorkTree={() => {}}
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No epics found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedData && (
        <Sheet open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{selectedData.name}</SheetTitle>
            </SheetHeader>

            <Tabs defaultValue="details" className="mt-6">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="children">Children</TabsTrigger>
                <TabsTrigger value="forecast">Forecast</TabsTrigger>
                <TabsTrigger value="more">More</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <EpicDetailsTabFull epic={selectedData} />
              </TabsContent>

              <TabsContent value="children" className="space-y-4 p-4">
                <h3 className="text-lg font-semibold">Progress & Children</h3>
                {childCounts && (
                  <EpicDoughnutChart
                    childCounts={childCounts}
                    epicAccepted={selectedData.status === 'done'}
                  />
                )}
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Feature and capability breakdown</p>
                </div>
              </TabsContent>

              <TabsContent value="forecast" className="space-y-4 p-4">
                <h3 className="text-lg font-semibold">Forecast</h3>
                <p className="text-sm text-muted-foreground">PI planning and capacity estimates</p>
              </TabsContent>

              <TabsContent value="more" className="space-y-4">
                <Tabs defaultValue="design" className="w-full">
                  <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="design">Design</TabsTrigger>
                    <TabsTrigger value="intake">Intake</TabsTrigger>
                    <TabsTrigger value="benefits">Benefits</TabsTrigger>
                    <TabsTrigger value="value">Value</TabsTrigger>
                  </TabsList>
                  <TabsContent value="design" className="p-4">
                    <p className="text-sm text-muted-foreground">Design artifacts and mockups</p>
                  </TabsContent>
                  <TabsContent value="intake" className="p-4">
                    <p className="text-sm text-muted-foreground">Intake form responses</p>
                  </TabsContent>
                  <TabsContent value="benefits" className="p-4">
                    <p className="text-sm text-muted-foreground">Business benefits analysis</p>
                  </TabsContent>
                  <TabsContent value="value" className="p-4">
                    <p className="text-sm text-muted-foreground">Value metrics and ROI</p>
                  </TabsContent>
                </Tabs>

                <div className="space-y-4 p-4 border-t">
                  <h4 className="font-semibold">Attachments</h4>
                  <AttachmentsSection entityId={selectedItem} entityType="epic" />
                </div>

                <div className="space-y-4 p-4 border-t">
                  <h4 className="font-semibold">Comments</h4>
                  <CommentsSection entityId={selectedItem} entityType="epic" />
                </div>
              </TabsContent>
            </Tabs>
          </SheetContent>
        </Sheet>
      )}

      <EpicDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        epic={editingEpic}
      />
      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={(data) => importMutation.mutate(data)}
        title="Import Epics"
        requiredFields={['name']}
      />
    </div>
  );
}
