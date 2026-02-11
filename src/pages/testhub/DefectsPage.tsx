/**
 * Defects List Page — G25 Rebuild
 * Route: /testhub/defects
 */
import { useState } from 'react';
import { Bug, Plus, Download } from 'lucide-react';
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10">
            <Bug className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Defects</h1>
            <p className="text-sm text-muted-foreground">Track and manage bugs discovered during testing</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />Create Defect
          </Button>
        </div>
      </div>

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
  );
}
