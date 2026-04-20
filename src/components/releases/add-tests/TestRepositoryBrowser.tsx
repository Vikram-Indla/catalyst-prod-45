/**
 * Test Repository Browser - Left panel showing available tests
 */

import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, X, Check, Layers } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Lozenge } from '@/components/ads';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CATALYST_V5, TEST_PRIORITY_COLORS } from '@/lib/catalyst-colors';
import { TestCaseRow } from './TestCaseRow';
import type { TestCase, TestCaseFilters } from '@/types/add-tests.types';

interface TestRepositoryBrowserProps {
  testCases: TestCase[];
  isLoading: boolean;
  filters: TestCaseFilters;
  onSearchChange: (value: string) => void;
  onModuleChange: (value: string | null) => void;
  onTestTypeChange: (value: string | null) => void;
  onPriorityChange: (value: string | null) => void;
  onAutomationStatusChange: (value: string | null) => void;
  onHideAlreadyAddedChange: (value: boolean) => void;
  onClearFilter: (key: keyof TestCaseFilters) => void;
  onClearAllFilters: () => void;
  hasActiveFilters: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  isSelected: (id: string) => boolean;
  availableCount: number;
}

export function TestRepositoryBrowser({
  testCases,
  isLoading,
  filters,
  onSearchChange,
  onModuleChange,
  onTestTypeChange,
  onPriorityChange,
  onAutomationStatusChange,
  onHideAlreadyAddedChange,
  onClearFilter,
  onClearAllFilters,
  hasActiveFilters,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  isSelected,
  availableCount,
}: TestRepositoryBrowserProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [searchValue, setSearchValue] = useState(filters.search);

  // Group tests by module
  const testsByModule = useMemo(() => {
    const grouped = testCases.reduce((acc, tc) => {
      if (!acc[tc.module]) {
        acc[tc.module] = [];
      }
      acc[tc.module].push(tc);
      return acc;
    }, {} as Record<string, TestCase[]>);

    return Object.entries(grouped)
      .map(([module, tests]) => ({ module, tests }))
      .sort((a, b) => a.module.localeCompare(b.module));
  }, [testCases]);

  // Initialize all modules as expanded
  React.useEffect(() => {
    setExpandedModules(new Set(testsByModule.map(g => g.module)));
  }, [testsByModule]);

  const toggleModule = (module: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(module)) {
        next.delete(module);
      } else {
        next.add(module);
      }
      return next;
    });
  };

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(searchValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, onSearchChange]);

  const modules = [...new Set(testCases.map(tc => tc.module))];

  return (
    <div className="flex flex-col h-full">
      {/* Search Input */}
      <div className="p-4 border-b" style={{ borderColor: CATALYST_V5.slate[200] }}>
        <div className="relative">
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
            style={{ color: CATALYST_V5.slate[400] }}
          />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search tests by title or ID..."
            className="pl-9 h-10"
            style={{ 
              borderColor: CATALYST_V5.slate[200],
              color: CATALYST_V5.slate[700],
            }}
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchValue('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Filter Row */}
      <div className="p-4 border-b space-y-3" style={{ borderColor: CATALYST_V5.slate[200] }}>
        <div className="flex flex-wrap gap-2">
          <Select 
            value={filters.module || '__all__'} 
            onValueChange={(v) => onModuleChange(v === '__all__' ? null : v)}
          >
            <SelectTrigger 
              className="w-[140px] h-8 text-xs"
              style={{ borderColor: CATALYST_V5.slate[200] }}
            >
              <SelectValue placeholder="Module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Modules</SelectItem>
              {modules.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={filters.testType || '__all__'} 
            onValueChange={(v) => onTestTypeChange(v === '__all__' ? null : v)}
          >
            <SelectTrigger 
              className="w-[120px] h-8 text-xs"
              style={{ borderColor: CATALYST_V5.slate[200] }}
            >
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Types</SelectItem>
              <SelectItem value="functional">Functional</SelectItem>
              <SelectItem value="integration">Integration</SelectItem>
              <SelectItem value="e2e">E2E</SelectItem>
              <SelectItem value="performance">Performance</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={filters.priority || '__all__'} 
            onValueChange={(v) => onPriorityChange(v === '__all__' ? null : v)}
          >
            <SelectTrigger 
              className="w-[110px] h-8 text-xs"
              style={{ borderColor: CATALYST_V5.slate[200] }}
            >
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={filters.automationStatus || '__all__'} 
            onValueChange={(v) => onAutomationStatusChange(v === '__all__' ? null : v)}
          >
            <SelectTrigger 
              className="w-[130px] h-8 text-xs"
              style={{ borderColor: CATALYST_V5.slate[200] }}
            >
              <SelectValue placeholder="Automation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              <SelectItem value="automated">Automated</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 items-center">
            {filters.search && (
              <span className="inline-flex items-center gap-1">
                <Lozenge appearance="inprogress">Search: {filters.search}</Lozenge>
                <button
                  type="button"
                  aria-label="Clear search filter"
                  onClick={() => { setSearchValue(''); onClearFilter('search'); }}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.module && (
              <span className="inline-flex items-center gap-1">
                <Lozenge appearance="inprogress">Module: {filters.module}</Lozenge>
                <button
                  type="button"
                  aria-label="Clear module filter"
                  onClick={() => onClearFilter('module')}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.testType && (
              <span className="inline-flex items-center gap-1">
                <Lozenge appearance="inprogress">Type: {filters.testType}</Lozenge>
                <button
                  type="button"
                  aria-label="Clear test type filter"
                  onClick={() => onClearFilter('testType')}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.priority && (
              <span className="inline-flex items-center gap-1">
                <Lozenge appearance="inprogress">Priority: {filters.priority}</Lozenge>
                <button
                  type="button"
                  aria-label="Clear priority filter"
                  onClick={() => onClearFilter('priority')}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <button
              onClick={onClearAllFilters}
              className="text-xs underline hover:no-underline"
              style={{ color: CATALYST_V5.primary }}
            >
              Clear All
            </button>
          </div>
        )}

        {/* Stats Bar */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: CATALYST_V5.slate[500] }}>
            {availableCount} tests available
          </span>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox 
                checked={filters.hideAlreadyAdded}
                onCheckedChange={(checked) => onHideAlreadyAddedChange(!!checked)}
                className="h-3.5 w-3.5"
              />
              <span style={{ color: CATALYST_V5.slate[600] }}>Hide already added</span>
            </label>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={onSelectAll}
              style={{ color: CATALYST_V5.primary }}
            >
              <Check className="h-3 w-3 mr-1" />
              Select All
            </Button>
          </div>
        </div>
      </div>

      {/* Test List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        ) : testsByModule.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div 
              className="p-4 rounded-full mb-4"
              style={{ backgroundColor: CATALYST_V5.slate[100] }}
            >
              <Search className="h-8 w-8" style={{ color: CATALYST_V5.slate[300] }} />
            </div>
            <h3 
              className="text-sm font-semibold mb-1"
              style={{ color: CATALYST_V5.slate[700] }}
            >
              No tests found
            </h3>
            <p 
              className="text-xs text-center mb-3"
              style={{ color: CATALYST_V5.slate[500] }}
            >
              Try adjusting your filters
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={onClearAllFilters}
              style={{ 
                backgroundColor: CATALYST_V5.primaryLight,
                color: CATALYST_V5.primary,
              }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="py-2">
            {testsByModule.map(({ module, tests }) => (
              <div key={module}>
                {/* Module Header */}
                <button
                  onClick={() => toggleModule(module)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 sticky top-0"
                  style={{ 
                    backgroundColor: CATALYST_V5.slate[50],
                    color: CATALYST_V5.slate[700],
                  }}
                >
                  {expandedModules.has(module) ? (
                    <ChevronDown className="h-4 w-4" style={{ color: CATALYST_V5.slate[400] }} />
                  ) : (
                    <ChevronRight className="h-4 w-4" style={{ color: CATALYST_V5.slate[400] }} />
                  )}
                  <Layers className="h-4 w-4" style={{ color: CATALYST_V5.slate[400] }} />
                  <span className="text-sm font-semibold flex-1 text-left">{module}</span>
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ 
                      backgroundColor: CATALYST_V5.slate[200],
                      color: CATALYST_V5.slate[600],
                    }}
                  >
                    {tests.length}
                  </span>
                </button>

                {/* Test Cases */}
                {expandedModules.has(module) && (
                  <div>
                    {tests.map(testCase => (
                      <TestCaseRow
                        key={testCase.id}
                        testCase={testCase}
                        isSelected={isSelected(testCase.id)}
                        onToggle={() => onToggleSelect(testCase.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
