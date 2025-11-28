import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { HealthBadge } from '@/components/shared/HealthBadge';
import { Badge } from '@/components/ui/badge';
import { FeatureDetailsPanel } from '@/components/items/features/FeatureDetailsPanel';
import { FeatureWSJFDialog } from '@/components/items/features/FeatureWSJFDialog';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Upload, 
  Download,
  Calculator,
  Printer,
  Trash2,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import type { Feature } from '@/types/feature.types';

export default function FeaturesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [wsjfDialogOpen, setWSJFDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: features, isLoading } = useQuery({
    queryKey: ['features', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('features')
        .select(`
          *,
          epics(name),
          programs(name),
          teams(name)
        `)
        .order('rank_within_epic', { ascending: true, nullsFirst: false });

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Feature[];
    },
  });

  const selectedFeature = features?.find(f => f.id === selectedFeatureId);

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="secondary">New</Badge>;
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      'funnel': 'secondary',
      'backlog': 'outline',
      'implementing': 'default',
      'validating': 'default',
      'deploying': 'default',
      'done': 'outline',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status.replace(/_/g, ' ')}</Badge>;
  };

  const handleMoreAction = (action: string) => {
    switch (action) {
      case 'prioritization':
        setWSJFDialogOpen(true);
        break;
      case 'import':
        toast.info('Import features dialog coming soon');
        break;
      case 'export':
        if (features && features.length > 0) {
          const exportData = features.map(f => ({
            'ID': f.display_id || f.id.slice(0, 8),
            'Name': f.name,
            'Status': f.status || '',
            'Health': f.health || '',
            'Epic': (f as any).epics?.name || '',
            'Program': (f as any).programs?.name || '',
            'Points': f.estimate_points || 0
          }));
          
          const csv = [
            Object.keys(exportData[0]).join(','),
            ...exportData.map(row => Object.values(row).map(v => `"${v}"`).join(','))
          ].join('\n');
          
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'features-export.csv';
          link.click();
          
          toast.success('Features exported to CSV');
        } else {
          toast.error('No features to export');
        }
        break;
      case 'print-cards':
        toast.info('Print feature cards coming soon');
        break;
      case 'recycle-bin':
        toast.info('Recycle bin view coming soon');
        break;
      case 'canceled-items':
        toast.info('Canceled items view coming soon');
        break;
    }
  };

  const toggleSelectAll = () => {
    if (selectedRows.length === features?.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(features?.map(f => f.id) || []);
    }
  };

  const toggleRowSelection = (id: string) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Features</h1>
            <p className="text-sm text-muted-foreground">
              Mid-level work items that deliver value to end users
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setSelectedFeatureId('new')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Feature
            </Button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b bg-card px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search features..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full"
              />
            </div>
            {selectedRows.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {selectedRows.length} selected
              </div>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="w-4 h-4 mr-2" />
                More Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => handleMoreAction('import')}>
                <Upload className="w-4 h-4 mr-2" />
                Import Features
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleMoreAction('export')}>
                <Download className="w-4 h-4 mr-2" />
                Export Features
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleMoreAction('prioritization')}>
                <Calculator className="w-4 h-4 mr-2" />
                WSJF Prioritization
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleMoreAction('print-cards')}>
                <Printer className="w-4 h-4 mr-2" />
                Print Cards
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleMoreAction('recycle-bin')}>
                <Trash2 className="w-4 h-4 mr-2" />
                Recycle Bin
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleMoreAction('canceled-items')}>
                <XCircle className="w-4 h-4 mr-2" />
                Canceled Items
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Features Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading features...</div>
          </div>
        ) : features && features.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedRows.length === features.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Epic</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {features.map((feature) => (
                <TableRow 
                  key={feature.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedFeatureId(feature.id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedRows.includes(feature.id)}
                      onCheckedChange={() => toggleRowSelection(feature.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {feature.display_id || feature.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="font-medium">{feature.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {(feature as any).epics?.name || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {(feature as any).programs?.name || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {(feature as any).teams?.name || '-'}
                  </TableCell>
                  <TableCell>{getStatusBadge(feature.status)}</TableCell>
                  <TableCell>
                    <HealthBadge health={(feature.health as 'green' | 'yellow' | 'red') || 'green'} />
                  </TableCell>
                  <TableCell>{feature.estimate_points || 0}</TableCell>
                  <TableCell>
                    <div className="w-24">
                      <div className="text-xs text-muted-foreground mb-1">
                        {feature.progress_pct || 0}%
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all"
                          style={{ width: `${feature.progress_pct || 0}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-muted-foreground mb-4">No features found</div>
            <Button onClick={() => setSelectedFeatureId('new')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Feature
            </Button>
          </div>
        )}
      </div>

      {/* Feature Details Panel */}
      {selectedFeatureId && (
        <FeatureDetailsPanel
          feature={selectedFeatureId === 'new' ? undefined : selectedFeature}
          open={!!selectedFeatureId}
          onClose={() => setSelectedFeatureId(null)}
        />
      )}

      {/* WSJF Prioritization Dialog */}
      <FeatureWSJFDialog
        features={selectedRows.length > 0 ? features?.filter(f => selectedRows.includes(f.id)) || [] : []}
        open={wsjfDialogOpen}
        onClose={() => setWSJFDialogOpen(false)}
      />
    </div>
  );
}
