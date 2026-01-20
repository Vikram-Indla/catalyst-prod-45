/**
 * Release Compare Page
 * Route: /releases/compare
 * Uses production hooks to fetch real data from Supabase
 */

import React, { useState, useMemo } from 'react';
import { ReleaseCompare, ComparedRelease, ReleaseOption } from '@/features/release-compare';
import { useAvailableReleases, useCompareMetrics } from '@/features/release-compare/hooks';
import { Loader2 } from 'lucide-react';

export default function ComparePage() {
  const { data: availableReleases = [], isLoading: isLoadingReleases } = useAvailableReleases();
  
  // Track selected release IDs - initialize with first 3 when data loads
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Initialize selection when releases load
  React.useEffect(() => {
    if (availableReleases.length > 0 && selectedIds.length === 0) {
      const initialIds = availableReleases.slice(0, Math.min(3, availableReleases.length)).map(r => r.id);
      setSelectedIds(initialIds);
    }
  }, [availableReleases, selectedIds.length]);
  
  // Fetch metrics for selected releases
  const { data: compareMetrics = [], isLoading: isLoadingMetrics } = useCompareMetrics(selectedIds);
  
  const isLoading = isLoadingReleases || (selectedIds.length >= 2 && isLoadingMetrics);
  
  if (isLoadingReleases) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-sm">Loading releases...</span>
        </div>
      </div>
    );
  }
  
  if (availableReleases.length < 2) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-background text-muted-foreground">
        <p className="text-lg font-medium">At least 2 releases are required for comparison.</p>
        <p className="text-sm mt-2">Create more releases to enable this feature.</p>
      </div>
    );
  }
  
  return (
    <div className="h-full overflow-auto bg-background">
      <ReleaseCompare
        availableReleases={availableReleases}
        releases={compareMetrics}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        isLoadingMetrics={isLoadingMetrics}
      />
    </div>
  );
}
