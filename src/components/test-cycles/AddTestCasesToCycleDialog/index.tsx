/**
 * Add Test Cases to Cycle Dialog
 * Enterprise-grade dual-panel interface for adding test cases to cycles
 */

import React, { useState, useMemo } from 'react';
import { Search, FileText, Check, X, Folder } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lozenge } from '@/components/ads';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFoldersWithCounts } from '@/hooks/test-management/useFolders';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTestCaseSelection } from './hooks/useTestCaseSelection';
import { useAvailableTestCases } from './hooks/useAvailableTestCases';
import { FolderTree } from './FolderTree';
import { FilterBar } from './FilterBar';
import { SelectionSummary } from './SelectionSummary';
import { TestCaseRow } from './TestCaseRow';
import { buildFolderTree, groupByFolder } from './utils';
import type { AddTestCasesToCycleDialogProps, TestCaseFilters } from './types';

const defaultFilters: TestCaseFilters = {
  search: '',
  folders: [],
  types: [],
  priorities: [],
  statuses: [],
  labels: [],
  isAutomated: null,
};

export function AddTestCasesToCycleDialog({
  open,
  onOpenChange,
  cycleId,
  cycleName,
  projectId,
  existingTestCaseIds,
  onAdd,
}: AddTestCasesToCycleDialogProps) {
  const [filters, setFilters] = useState<TestCaseFilters>(defaultFilters);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSearch, setSelectedSearch] = useState('');

  // Fetch data
  const { data: folders = [] } = useFoldersWithCounts(projectId);
  const { data: testCases = [], isLoading } = useAvailableTestCases(projectId, filters);
  
  // Fetch priorities and types for filters
  const { data: priorities = [] } = useQuery({
    queryKey: ['tm-priorities', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('tm_case_priorities').select('*').eq('project_id', projectId).order('sort_order');
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: types = [] } = useQuery({
    queryKey: ['tm-types', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.from('tm_case_types').select('*').eq('project_id', projectId).order('name');
      if (error) throw error;
      // Map to include sort_order since DB doesn't have it
      return (data || []).map((row, index) => ({
        ...row,
        sort_order: index,
      }));
    },
    enabled: !!projectId,
  });

  // Selection state
  const selection = useTestCaseSelection(existingTestCaseIds, testCases);

  // Build folder tree
  const { tree, unfiledCases } = useMemo(() => {
    const existingSet = new Set(existingTestCaseIds);
    return buildFolderTree(folders, testCases, existingSet);
  }, [folders, testCases, existingTestCaseIds]);

  // Filter selected cases for display
  const filteredSelected = useMemo(() => {
    if (!selectedSearch) return selection.selectedTestCases;
    const search = selectedSearch.toLowerCase();
    return selection.selectedTestCases.filter(tc =>
      tc.title.toLowerCase().includes(search) || tc.key.toLowerCase().includes(search)
    );
  }, [selection.selectedTestCases, selectedSearch]);

  const groupedSelected = useMemo(() => groupByFolder(filteredSelected), [filteredSelected]);

  const handleSubmit = async () => {
    if (selection.count === 0) return;
    setIsSubmitting(true);
    try {
      await onAdd(Array.from(selection.selectedIds));
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] w-[95vw] h-[85vh] max-h-[800px] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-slate-200 shrink-0">
          <DialogTitle className="text-lg">Add Test Cases to {cycleName}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-2 gap-4 p-6 min-h-0 overflow-hidden">
          {/* Available Panel */}
          <div className="border border-slate-200 rounded-lg bg-white flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-slate-500" />
                <span className="font-medium text-slate-700">Available</span>
                <Lozenge appearance="default">{testCases.length} total</Lozenge>
              </div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search test cases..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-9 h-9"
                />
              </div>
              <FilterBar filters={filters} onFiltersChange={setFilters} priorities={priorities} types={types} />
            </div>
            <ScrollArea className="flex-1">
              <FolderTree tree={tree} unfiledCases={unfiledCases} selection={selection} allTestCases={testCases} isLoading={isLoading} />
            </ScrollArea>
            <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 flex gap-2 shrink-0">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => {
                const selectableIds = testCases.filter(tc => !selection.isAlreadyInCycle(tc.id)).map(tc => tc.id);
                selection.selectMultiple(selectableIds);
              }}>
                Select All Visible
              </Button>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => selection.clear()}>Clear</Button>
            </div>
          </div>

          {/* Selected Panel */}
          <div className="border border-slate-200 rounded-lg bg-white flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <Check className="w-4 h-4 text-teal-600" />
                <span className="font-medium text-slate-700">Selected</span>
                <Lozenge appearance="success">{selection.count} tests</Lozenge>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Filter selected..." value={selectedSearch} onChange={(e) => setSelectedSearch(e.target.value)} className="pl-9 h-9" />
              </div>
            </div>
            <ScrollArea className="flex-1">
              {selection.count === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Folder className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">No test cases selected</p>
                  <p className="text-xs text-slate-400 mt-1">Select from the left panel</p>
                </div>
              ) : (
                <div>
                  {Object.entries(groupedSelected).map(([folderName, cases]) => (
                    <div key={folderName}>
                      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-600">{folderName}</span>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-red-500 hover:text-red-700" onClick={() => selection.deselectMultiple(cases.map(c => c.id))}>
                          <X className="w-3 h-3 mr-1" />Remove
                        </Button>
                      </div>
                      {cases.map(tc => (
                        <div key={tc.id} className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 hover:bg-slate-50">
                          <span className="text-xs font-mono text-slate-500 w-14">{tc.key}</span>
                          <span className="flex-1 text-sm text-slate-700 truncate">{tc.title}</span>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-red-500" onClick={() => selection.deselect(tc.id)}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <SelectionSummary count={selection.count} estimatedTime={selection.estimatedTime} priorityBreakdown={selection.priorityBreakdown} onClearAll={() => selection.clear()} />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-200 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={selection.count === 0 || isSubmitting} className="bg-primary hover:bg-primary/90">
            {isSubmitting ? 'Adding...' : `Add ${selection.count} Test Cases to Cycle`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddTestCasesToCycleDialog;
