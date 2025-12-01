import { useState, useEffect } from 'react';
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FeatureDetailsPanel } from '@/components/items/features/FeatureDetailsPanel';
import { FeatureWSJFDialog } from '@/components/items/features/FeatureWSJFDialog';
import { FeatureToolbar } from '@/components/items/features/FeatureToolbar';
import { FeatureTable } from '@/components/items/features/FeatureTable';
import { FeatureMassMoveDialog } from '@/components/items/features/FeatureMassMoveDialog';
import { Search, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { Feature } from '@/types/feature.types';

export default function FeaturesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [wsjfDialogOpen, setWSJFDialogOpen] = useState(false);
  const [massMoveDialogOpen, setMassMoveDialogOpen] = useState(false);
  
  // Get featureId from URL params
  const featureIdFromUrl = searchParams.get('featureId');
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(featureIdFromUrl);

  // Update selectedFeatureId when URL changes
  React.useEffect(() => {
    if (featureIdFromUrl) {
      setSelectedFeatureId(featureIdFromUrl);
    } else {
      setSelectedFeatureId(null);
    }
  }, [featureIdFromUrl]);

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

  const handleExport = () => {
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
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="border-b bg-card px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">Features</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Mid-level work items that deliver value to end users
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button onClick={() => setSelectedFeatureId('new')} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Create Feature</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="border-b bg-card px-3 sm:px-6 py-2 sm:py-3">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full"
          />
        </div>
      </div>

      {/* Toolbar */}
      <FeatureToolbar
        selectedFeatureIds={selectedRows}
        onCreateFeature={() => navigate('/features?featureId=new')}
        onImport={() => toast.info('Import features coming soon')}
        onExport={handleExport}
        onAuditReport={() => toast.info('Audit report coming soon')}
        onWSJFPrioritization={() => navigate('/features/prioritization')}
        onMassMove={() => setMassMoveDialogOpen(true)}
        onPromoteToEpic={() => toast.info('Promote to epic coming soon')}
        onWorkflow={() => toast.info('Workflow coming soon')}
        onRecycleBin={() => toast.info('Recycle bin coming soon')}
        onCanceledItems={() => toast.info('Canceled items coming soon')}
      />

      {/* Features Table */}
      <div className="flex-1 overflow-auto px-3 sm:px-6 py-3 sm:py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-sm text-muted-foreground">Loading features...</div>
          </div>
        ) : features && features.length > 0 ? (
          <div className="overflow-x-auto">
            <FeatureTable
            features={features}
            selectedIds={selectedRows}
            onSelectionChange={setSelectedRows}
            onRowClick={(id) => {
              navigate(`/features?featureId=${id}`);
            }}
            onSortChange={(column, direction) => {
              toast.info(`Sorting by ${column} ${direction}`);
            }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <div className="text-sm text-muted-foreground mb-4">No features found</div>
          </div>
        )}
      </div>

      {/* Feature Details Panel */}
      {selectedFeatureId && (
        <FeatureDetailsPanel
          feature={selectedFeatureId === 'new' ? undefined : selectedFeature}
          open={!!selectedFeatureId}
          onClose={() => {
            setSelectedFeatureId(null);
            navigate('/features');
          }}
        />
      )}

      {/* Mass Move Dialog */}
      <FeatureMassMoveDialog
        open={massMoveDialogOpen}
        onClose={() => setMassMoveDialogOpen(false)}
        selectedFeatureIds={selectedRows}
      />

      {/* WSJF Prioritization Dialog */}
      <FeatureWSJFDialog
        features={selectedRows.length > 0 ? features?.filter(f => selectedRows.includes(f.id)) || [] : []}
        open={wsjfDialogOpen}
        onClose={() => setWSJFDialogOpen(false)}
      />
    </div>
  );
}
