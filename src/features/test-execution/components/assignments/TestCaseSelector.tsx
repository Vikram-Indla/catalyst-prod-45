/**
 * Module 4C-1: Test Case Selector for Run Assignments
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, Check, Filter, FolderTree } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface TestCase {
  id: string;
  case_key: string;
  title: string;
  priority: string | null;
  type: string | null;
  folder_id: string | null;
  folder_name: string | null;
}

interface TestCaseSelectorProps {
  projectId: string;
  selectedCaseIds: string[];
  onSelectionChange: (caseIds: string[]) => void;
  excludeCaseIds?: string[];
  maxHeight?: string;
}

export function TestCaseSelector({
  projectId,
  selectedCaseIds,
  onSelectionChange,
  excludeCaseIds = [],
  maxHeight = '400px',
}: TestCaseSelectorProps) {
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Fetch test cases - using correct column names from tm_test_cases schema
  const { data: testCases = [], isLoading } = useQuery({
    queryKey: ['test-cases-for-run', projectId],
    queryFn: async (): Promise<TestCase[]> => {
      const result = await (supabase
        .from('tm_test_cases') as any)
        .select('id, key, title, priority, type, folder_id')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('key');

      if (result.error) throw result.error;

      return (result.data || []).map((tc: any) => ({
        id: tc.id,
        case_key: tc.key,
        title: tc.title,
        priority: tc.priority,
        type: tc.type,
        folder_id: tc.folder_id,
        folder_name: null,
      }));
    },
    enabled: !!projectId,
  });

  // Filter cases
  const filteredCases = useMemo(() => {
    return testCases.filter((tc) => {
      // Exclude already assigned cases
      if (excludeCaseIds.includes(tc.id)) return false;

      // Search filter
      if (search) {
        const q = search.toLowerCase();
        if (
          !tc.case_key.toLowerCase().includes(q) &&
          !tc.title.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      // Priority filter
      if (priorityFilter !== 'all' && tc.priority !== priorityFilter) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'all' && tc.type !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [testCases, search, priorityFilter, typeFilter, excludeCaseIds]);

  // Toggle selection
  const toggleCase = (caseId: string) => {
    if (selectedCaseIds.includes(caseId)) {
      onSelectionChange(selectedCaseIds.filter((id) => id !== caseId));
    } else {
      onSelectionChange([...selectedCaseIds, caseId]);
    }
  };

  // Select all visible
  const selectAllVisible = () => {
    const visibleIds = filteredCases.map((tc) => tc.id);
    const newSelection = [...new Set([...selectedCaseIds, ...visibleIds])];
    onSelectionChange(newSelection);
  };

  // Clear selection
  const clearSelection = () => {
    onSelectionChange([]);
  };

  const getPriorityBadge = (priority: string | null) => {
    const config: Record<string, string> = {
      critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    };
    return config[priority || 'medium'] || config.medium;
  };

  return (
    <div className="space-y-3">
      {/* Search and filters */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search test cases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="functional">Functional</SelectItem>
            <SelectItem value="regression">Regression</SelectItem>
            <SelectItem value="smoke">Smoke</SelectItem>
            <SelectItem value="integration">Integration</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Selection actions */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {selectedCaseIds.length} of {filteredCases.length} selected
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={selectAllVisible}>
            Select All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            disabled={selectedCaseIds.length === 0}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Test case list */}
      <ScrollArea className="rounded-md border" style={{ height: maxHeight }}>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <span className="text-sm text-muted-foreground">Loading test cases...</span>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Filter className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <span className="text-sm text-muted-foreground">No test cases found</span>
          </div>
        ) : (
          <div className="p-1">
            {filteredCases.map((tc) => {
              const isSelected = selectedCaseIds.includes(tc.id);
              return (
                <div
                  key={tc.id}
                  onClick={() => toggleCase(tc.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-primary/10'
                      : 'hover:bg-muted'
                  )}
                >
                  <Checkbox checked={isSelected} className="pointer-events-none" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {tc.case_key}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn('text-xs capitalize', getPriorityBadge(tc.priority))}
                      >
                        {tc.priority || 'medium'}
                      </Badge>
                    </div>
                    <p className="text-sm truncate">{tc.title}</p>
                    {tc.folder_name && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <FolderTree className="h-3 w-3" />
                        <span>{tc.folder_name}</span>
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
