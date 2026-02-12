/**
 * Defects List Page — G25 Rebuild
 * Route: /testhub/defects
 */
import { useState } from 'react';
import { Bug, Plus, Download } from 'lucide-react';
import { TestHubPageHeader } from '@/components/testhub/TestHubPageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDefectsG25, useDefectStatsG25, useDeleteDefectG25 } from '@/hooks/useDefectsG25';
import { DefectStatsBar } from '@/components/defects/g25/DefectStatsBar';
import { DefectFilters } from '@/components/defects/g25/DefectFilters';
import { DefectTable } from '@/components/defects/g25/DefectTable';
import { CreateDefectModalG25 } from '@/components/defects/g25/CreateDefectModal';
import { DefectFilters as DefectFiltersType, Defect } from '@/types/defects';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function DefectsPage() {
  const [filters, setFilters] = useState<DefectFiltersType>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);

  const { data: defects, isLoading } = useDefectsG25(filters);
  const { data: stats, isLoading: loadingStats } = useDefectStatsG25();
  const deleteDefect = useDeleteDefectG25();

  const { data: users } = useQuery({
    queryKey: ['profiles-list'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').order('full_name');
      return data || [];
    },
  });

  const handleDelete = async (defect: Defect) => {
    if (confirm(`Delete "${defect.defect_key}"? This cannot be undone.`)) {
      await deleteDefect.mutateAsync(defect.id);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <TestHubPageHeader title="Defects" subtitle="Track and manage bugs discovered during testing">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />Create Defect
          </Button>
      </TestHubPageHeader>
      <div className="p-6 space-y-6 flex-1 overflow-auto">

      {/* Stats Bar */}
      {loadingStats ? <Skeleton className="h-12 w-full" /> : stats && <DefectStatsBar stats={stats} />}

      {/* Filters */}
      <DefectFilters filters={filters} onChange={setFilters} users={users || []} />

      {/* Results Count */}
      <p className="text-sm text-muted-foreground">
        Showing {defects?.length || 0} defect{(defects?.length || 0) !== 1 ? 's' : ''}
      </p>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : defects?.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <Bug className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">
            {Object.keys(filters).length > 0 ? 'No defects match your filters' : 'No defects found'}
          </p>
          <Button variant="outline" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />Create Defect
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <DefectTable defects={defects || []} selectedIds={selectedIds} onSelectionChange={setSelectedIds} onDelete={handleDelete} />
        </div>
      )}

      <CreateDefectModalG25 open={showCreate} onClose={() => setShowCreate(false)} />
      </div>
    </div>
  );
}
