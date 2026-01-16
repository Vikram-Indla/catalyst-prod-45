/**
 * Release Compare Main Component
 * Orchestrates the comparison view
 */

import React, { useState, useMemo } from 'react';
import { CompareHeader } from './CompareHeader';
import { ReleaseSelector } from './ReleaseSelector';
import { CompareInsightsBar } from './CompareInsightsBar';
import { ComparisonTable } from './ComparisonTable';
import { ComparedRelease, ReleaseOption, CompareHealthLevel } from '../types';
import { calculateWinners, generateInsights } from '../utils/compareUtils';

interface ReleaseCompareProps {
  availableReleases: ReleaseOption[];
  releases: ComparedRelease[];
}

export function ReleaseCompare({ availableReleases, releases }: ReleaseCompareProps) {
  // Initialize with first 3 releases or all if less than 3
  const initialIds = availableReleases.slice(0, Math.min(3, availableReleases.length)).map(r => r.id);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);
  
  // Filter releases based on selection
  const selectedReleases = useMemo(() => {
    return selectedIds
      .map(id => releases.find(r => r.id === id))
      .filter((r): r is ComparedRelease => r !== undefined);
  }, [selectedIds, releases]);
  
  // Calculate winners and insights
  const winners = useMemo(() => calculateWinners(selectedReleases), [selectedReleases]);
  const insights = useMemo(() => generateInsights(selectedReleases), [selectedReleases]);
  
  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export comparison');
  };
  
  const handleSaveView = () => {
    // TODO: Implement save view functionality
    console.log('Save comparison view');
  };
  
  if (availableReleases.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <p>At least 2 releases are required for comparison.</p>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <CompareHeader onExport={handleExport} onSaveView={handleSaveView} />
      
      <ReleaseSelector
        availableReleases={availableReleases}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />
      
      {selectedReleases.length >= 2 && (
        <>
          <CompareInsightsBar insights={insights} />
          <ComparisonTable releases={selectedReleases} winners={winners} />
        </>
      )}
    </div>
  );
}
