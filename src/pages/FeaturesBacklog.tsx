import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FeaturesBacklogHeader } from '@/components/features/FeaturesBacklogHeader';
import { FeaturesListView } from '@/components/features/FeaturesListView';
import { FeaturesKanbanView } from '@/components/features/FeaturesKanbanView';
import { FeatureDetailsPanel } from '@/components/items/features/FeatureDetailsPanel';
import { FeatureDialog } from '@/components/forms/FeatureDialog';
import { exportToCSV } from '@/lib/exportUtils';
import { toast } from 'sonner';

export default function FeaturesBacklog() {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  const [visibleColumns] = useState<string[]>([
    'id', 'name', 'epic', 'program', 'pi', 'iteration', 'status', 'health', 'progress'
  ]);

  // Fetch features
  const { data: features, refetch } = useQuery({
    queryKey: ['features-backlog', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('features')
        .select('*, epics(name), programs(name), program_increments(name), iterations!iteration_id(name)')
        .order('rank_within_epic');

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const selectedFeatureData = features?.find(f => f.id === selectedFeature);

  const handleExport = () => {
    if (features && features.length > 0) {
      exportToCSV(
        features,
        'features',
        ['name', 'status', 'health', 'estimate_points', 'wsjf_score', 'progress_pct']
      );
      toast.success('Features exported successfully');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <FeaturesBacklogHeader
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onCreateFeature={() => setCreateDialogOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onColumnsClick={() => setColumnsDialogOpen(true)}
        onFiltersClick={() => setFiltersDialogOpen(true)}
        onExport={handleExport}
      />

      <div className="flex-1 overflow-auto px-6 py-6">
        {viewMode === 'list' ? (
          <div className="border rounded-lg bg-card overflow-hidden">
            <FeaturesListView
              features={features || []}
              onFeatureSelect={setSelectedFeature}
              onRefetch={refetch}
              visibleColumns={visibleColumns}
            />
          </div>
        ) : (
          <FeaturesKanbanView
            features={features || []}
            onFeatureSelect={setSelectedFeature}
            onRefetch={refetch}
          />
        )}
      </div>

      {selectedFeatureData && (
        <FeatureDetailsPanel
          feature={selectedFeatureData}
          open={!!selectedFeature}
          onClose={() => setSelectedFeature(null)}
        />
      )}

      <FeatureDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
