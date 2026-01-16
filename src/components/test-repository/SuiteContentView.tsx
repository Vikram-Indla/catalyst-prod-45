/**
 * Suite Content View
 * Shows suite details and test list
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Play, Plus, MoreHorizontal, GripVertical, Trash2, FolderInput, Copy } from 'lucide-react';
import { useRepositoryStore } from '@/stores/repositoryStore';
import { cn } from '@/lib/utils';
import type { TestSuite, RepositoryTestCase } from '@/types/test-repository';
import { PRIORITY_CONFIG, STATUS_CONFIG, RUN_RESULT_CONFIG } from '@/types/test-repository';
import { format } from 'date-fns';

interface SuiteContentViewProps {
  suite: TestSuite;
}

export function SuiteContentView({ suite }: SuiteContentViewProps) {
  const { 
    tests, 
    selectedTestIds, 
    toggleTestSelection, 
    selectAllTests, 
    clearTestSelection,
    openDrawer,
  } = useRepositoryStore();

  const hasSelection = selectedTestIds.size > 0;
  const allSelected = selectedTestIds.size === tests.length && tests.length > 0;

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      {/* Content Header */}
      <div className="px-6 py-4 border-b border-border bg-card">
        {/* Breadcrumb */}
        <div className="text-xs text-muted-foreground mb-2">
          Test Repository / {suite.name}
        </div>

        {/* Title Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-foreground">{suite.name}</h1>
            <Badge variant="outline" className="text-[10px] capitalize">
              {suite.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8">
              <Plus className="w-4 h-4 mr-2" />
              Add Test
            </Button>
            <Button size="sm" className="h-8 bg-primary hover:bg-primary/90">
              <Play className="w-4 h-4 mr-2" />
              Run Suite
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Total Tests" value={suite.testCount} />
          <StatCard label="Passed" value={suite.passedCount} color="text-teal-600" />
          <StatCard label="Failed" value={suite.failedCount} color="text-destructive" />
          <StatCard 
            label="Pass Rate" 
            value={suite.testCount > 0 ? `${Math.round((suite.passedCount / suite.testCount) * 100)}%` : '—'} 
            color="text-primary" 
          />
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {hasSelection && (
        <div className="px-6 py-2 bg-primary/5 border-b border-primary/20 flex items-center gap-4">
          <span className="text-xs font-medium text-foreground">
            {selectedTestIds.size} selected
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              <FolderInput className="w-3.5 h-3.5 mr-1.5" />
              Move
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              Copy
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete
            </Button>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs ml-auto"
            onClick={clearTestSelection}
          >
            Clear Selection
          </Button>
        </div>
      )}

      {/* Test List */}
      <div className="flex-1 overflow-y-auto">
        {/* Header Row */}
        <div className="sticky top-0 bg-muted/50 border-b border-border px-6 py-2 flex items-center gap-4 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          <Checkbox
            checked={allSelected}
            onCheckedChange={() => allSelected ? clearTestSelection() : selectAllTests()}
            className="mr-2"
          />
          <div className="w-[80px]">ID</div>
          <div className="flex-1">Test Name</div>
          <div className="w-[70px]">Priority</div>
          <div className="w-[90px]">Status</div>
          <div className="w-[80px]">Last Run</div>
          <div className="w-8" />
        </div>

        {/* Test Items */}
        {tests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm font-medium mb-2">No test cases yet</p>
            <p className="text-xs mb-4">Add your first test case to this suite</p>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Test Case
            </Button>
          </div>
        ) : (
          tests.map((test) => (
            <TestListItem
              key={test.id}
              test={test}
              isSelected={selectedTestIds.has(test.id)}
              onToggleSelect={() => toggleTestSelection(test.id)}
              onClick={() => openDrawer(test.id)}
            />
          ))
        )}
      </div>
    </main>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-muted/30 rounded-lg px-4 py-3">
      <div className={cn("text-xl font-bold", color || "text-foreground")}>{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

interface TestListItemProps {
  test: RepositoryTestCase;
  isSelected: boolean;
  onToggleSelect: () => void;
  onClick: () => void;
}

function TestListItem({ test, isSelected, onToggleSelect, onClick }: TestListItemProps) {
  const priorityConfig = PRIORITY_CONFIG[test.priority];
  const statusConfig = STATUS_CONFIG[test.status];
  const runResultConfig = test.lastRunResult ? RUN_RESULT_CONFIG[test.lastRunResult] : null;

  return (
    <div
      className={cn(
        "group flex items-center gap-4 px-6 py-3 border-b border-border/50 cursor-pointer transition-colors",
        "hover:bg-muted/50",
        isSelected && "bg-primary/5"
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggleSelect}
        onClick={(e) => e.stopPropagation()}
        className="mr-2"
      />
      
      {/* Drag Handle */}
      <GripVertical className="w-4 h-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 cursor-grab" />

      {/* ID */}
      <div 
        className="w-[80px] text-xs font-medium text-primary cursor-pointer hover:underline"
        onClick={onClick}
      >
        {test.id}
      </div>

      {/* Name */}
      <div 
        className="flex-1 text-sm font-medium text-foreground truncate cursor-pointer hover:text-primary"
        onClick={onClick}
      >
        {test.name}
      </div>

      {/* Priority */}
      <div className="w-[70px]">
        <Badge className={cn("text-[10px] font-semibold capitalize", priorityConfig.bgClass, priorityConfig.textClass)}>
          {test.priority}
        </Badge>
      </div>

      {/* Status */}
      <div className="w-[90px]">
        <Badge className={cn("text-[10px] font-semibold", statusConfig.bgClass, statusConfig.textClass)}>
          {statusConfig.label}
        </Badge>
      </div>

      {/* Last Run */}
      <div className="w-[80px]">
        {runResultConfig ? (
          <Badge className={cn("text-[10px] font-semibold", runResultConfig.bgClass, runResultConfig.textClass)}>
            {runResultConfig.label}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

      {/* Actions */}
      <div className="w-8">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 opacity-0 group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
