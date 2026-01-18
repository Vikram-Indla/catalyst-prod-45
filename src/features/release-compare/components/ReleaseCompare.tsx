/**
 * Release Compare Main Component
 * Orchestrates the comparison view
 */

import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { CompareHeader } from './CompareHeader';
import { ReleaseSelector } from './ReleaseSelector';
import { CompareInsightsBar } from './CompareInsightsBar';
import { ComparisonTable } from './ComparisonTable';
import { SaveComparisonViewDialog } from './SaveComparisonViewDialog';
import { ComparedRelease, ReleaseOption } from '../types';
import { calculateWinners, generateInsights } from '../utils/compareUtils';
import { exportComparison } from '@/utils/exportComparison';

interface ReleaseCompareProps {
  availableReleases: ReleaseOption[];
  releases: ComparedRelease[];
}

export function ReleaseCompare({ availableReleases, releases }: ReleaseCompareProps) {
  // Initialize with first 3 releases or all if less than 3
  const initialIds = availableReleases.slice(0, Math.min(3, availableReleases.length)).map(r => r.id);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaveViewOpen, setIsSaveViewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Filter releases based on selection
  const selectedReleases = useMemo(() => {
    return selectedIds
      .map(id => releases.find(r => r.id === id))
      .filter((r): r is ComparedRelease => r !== undefined);
  }, [selectedIds, releases]);
  
  // Calculate winners and insights
  const winners = useMemo(() => calculateWinners(selectedReleases), [selectedReleases]);
  const insights = useMemo(() => generateInsights(selectedReleases), [selectedReleases]);
  
  const handleExport = async (format: 'pdf' | 'excel') => {
    if (selectedReleases.length < 2) {
      toast.error('Select at least 2 releases to export');
      return;
    }
    
    setIsExporting(true);
    try {
      await exportComparison({
        releases: selectedReleases,
        generatedAt: new Date().toISOString(),
      }, format);
      toast.success(`Comparison exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export comparison');
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleSaveView = async (viewData: { name: string; description: string; isDefault: boolean }) => {
    setIsSaving(true);
    try {
      // Simulate saving - in production this would save to Supabase
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Store in localStorage for now (would be saved_comparison_views table in production)
      const savedViews = JSON.parse(localStorage.getItem('savedComparisonViews') || '[]');
      const newView = {
        id: crypto.randomUUID(),
        name: viewData.name,
        description: viewData.description,
        isDefault: viewData.isDefault,
        releaseIds: selectedIds,
        createdAt: new Date().toISOString(),
      };
      
      // If this is default, unset other defaults
      if (viewData.isDefault) {
        savedViews.forEach((v: { isDefault: boolean }) => {
          v.isDefault = false;
        });
      }
      
      savedViews.push(newView);
      localStorage.setItem('savedComparisonViews', JSON.stringify(savedViews));
      
      toast.success('Comparison view saved');
      setIsSaveViewOpen(false);
    } catch (error) {
      console.error('Save view error:', error);
      toast.error('Failed to save view');
    } finally {
      setIsSaving(false);
    }
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
      <CompareHeader 
        onExport={handleExport} 
        onSaveView={() => setIsSaveViewOpen(true)}
        isExporting={isExporting}
      />
      
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
      
      <SaveComparisonViewDialog
        open={isSaveViewOpen}
        onOpenChange={setIsSaveViewOpen}
        onSave={handleSaveView}
        selectedReleaseIds={selectedIds}
        isSaving={isSaving}
      />
    </div>
  );
}
