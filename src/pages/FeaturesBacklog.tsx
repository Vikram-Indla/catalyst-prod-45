import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FeaturesBacklogHeader } from '@/components/features/FeaturesBacklogHeader';
import { FeaturesListView } from '@/components/features/FeaturesListView';
import { FeaturesKanbanView } from '@/components/features/FeaturesKanbanView';
import { FeaturesColumnsDialog } from '@/components/features/FeaturesColumnsDialog';
import { FeaturesFiltersDialog } from '@/components/features/FeaturesFiltersDialog';
import { FeatureDetailsPanel } from '@/components/items/features/FeatureDetailsPanel';
import { FeatureDialog } from '@/components/forms/FeatureDialog';
import { ApplyWSJFToRankDialog } from '@/components/prioritization/ApplyWSJFToRankDialog';
import { PullRankDialog } from '@/components/backlog/PullRankDialog';
import { exportToCSV } from '@/lib/exportUtils';
import { toast } from 'sonner';

export default function FeaturesBacklog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [columnsDialogOpen, setColumnsDialogOpen] = useState(false);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'id', 'name', 'epic', 'program', 'pi', 'iteration', 'status', 'health', 'progress'
  ]);
  const [filters, setFilters] = useState<any>({});
  const [wsjfDialogOpen, setWsjfDialogOpen] = useState(false);
  const [pullRankDialogOpen, setPullRankDialogOpen] = useState(false);

  // Check for create query parameter
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setCreateDialogOpen(true);
      // Remove the create parameter after opening the dialog
      searchParams.delete('create');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  // Fetch features
  const { data: features, refetch } = useQuery({
    queryKey: ['features-backlog', searchQuery, filters],
    queryFn: async () => {
      let query = supabase
        .from('features')
        .select('*, epics(name), programs(name), program_increments(name), iterations!iteration_id(name)')
        .order('rank_within_epic');

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.health) {
        query = query.eq('health', filters.health);
      }
      if (filters.epicId) {
        query = query.eq('epic_id', filters.epicId);
      }
      if (filters.programId) {
        query = query.eq('program_id', filters.programId);
      }
      if (filters.piId) {
        query = query.eq('pi_id', filters.piId);
      }
      if (filters.iterationId) {
        query = query.eq('iteration_id', filters.iterationId);
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
        onApplyWSJF={() => setWsjfDialogOpen(true)}
        onPullRank={() => setPullRankDialogOpen(true)}
      />

      <div className="flex-1 overflow-auto px-3 sm:px-[var(--s6)]" style={{ padding: 'var(--s4) var(--s6)' }}>
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

      <FeaturesColumnsDialog
        open={columnsDialogOpen}
        onOpenChange={setColumnsDialogOpen}
        visibleColumns={visibleColumns}
        onColumnsChange={setVisibleColumns}
      />

      <FeaturesFiltersDialog
        open={filtersDialogOpen}
        onOpenChange={setFiltersDialogOpen}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <ApplyWSJFToRankDialog
        open={wsjfDialogOpen}
        onOpenChange={setWsjfDialogOpen}
        workItemType="feature"
      />

      <PullRankDialog
        open={pullRankDialogOpen}
        onOpenChange={setPullRankDialogOpen}
        workItemType="feature"
        currentItemId={selectedFeature || undefined}
      />
    </div>
  );
}
