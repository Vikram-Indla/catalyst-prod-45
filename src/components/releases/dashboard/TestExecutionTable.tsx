import { useState } from 'react';
import { TestCase } from '@/types/release-dashboard';
import { Checkbox } from '@/components/ui/checkbox';
import { Lozenge, Avatar } from '@/components/ads';
import type { LozengeAppearance } from '@/components/ads';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestExecutionTableProps {
  tests: TestCase[];
  onTestClick: (test: TestCase) => void;
}

const statusAppearance: Record<string, LozengeAppearance> = {
  passed: 'success',
  failed: 'removed',
  blocked: 'moved',
  'not-run': 'default',
  'in-progress': 'inprogress',
};

const priorityAppearance: Record<TestCase['priority'], LozengeAppearance> = {
  critical: 'removed',
  high: 'moved',
  medium: 'inprogress',
  low: 'default',
};

type SortField = 'id' | 'title' | 'priority' | 'status';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 8;

export function TestExecutionTable({ tests, onTestClick }: TestExecutionTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(0);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const statusOrder = { failed: 0, blocked: 1, 'not-run': 2, passed: 3 };

  const sortedTests = [...tests].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'priority') {
      cmp = priorityOrder[a.priority] - priorityOrder[b.priority];
    } else if (sortField === 'status') {
      cmp = statusOrder[a.status] - statusOrder[b.status];
    } else {
      cmp = String(a[sortField]).localeCompare(String(b[sortField]));
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.ceil(sortedTests.length / PAGE_SIZE);
  const pagedTests = sortedTests.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleAll = () => {
    if (selectedIds.size === tests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tests.map(t => t.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="w-10 px-3.5 py-2.5">
                <Checkbox
                  checked={selectedIds.size === tests.length && tests.length > 0}
                  onCheckedChange={toggleAll}
                />
              </th>
              <th
                className="w-20 px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => toggleSort('id')}
              >
                <span className="flex items-center gap-1">ID <SortIcon field="id" /></span>
              </th>
              <th
                className="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => toggleSort('title')}
              >
                <span className="flex items-center gap-1">Test Case <SortIcon field="title" /></span>
              </th>
              <th
                className="w-[70px] px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => toggleSort('priority')}
              >
                <span className="flex items-center gap-1">Priority <SortIcon field="priority" /></span>
              </th>
              <th className="w-[100px] px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Assignee
              </th>
              <th
                className="w-[85px] px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => toggleSort('status')}
              >
                <span className="flex items-center gap-1">Status <SortIcon field="status" /></span>
              </th>
              <th className="w-[70px] px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Duration
              </th>
            </tr>
          </thead>
          <tbody>
            {pagedTests.map((test) => (
              <tr
                key={test.id}
                onClick={() => onTestClick(test)}
                className={cn(
                  "border-b border-border/50 cursor-pointer transition-colors hover:bg-muted/50",
                  selectedIds.has(test.id) && "bg-primary/5"
                )}
              >
                <td className="px-3.5 py-3" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(test.id)}
                    onCheckedChange={() => toggleOne(test.id)}
                  />
                </td>
                <td className="px-3.5 py-3 text-primary font-medium">{test.id}</td>
                <td className="px-3.5 py-3 font-medium text-foreground">{test.title}</td>
                <td className="px-3.5 py-3">
                  <span className="capitalize">
                    <Lozenge appearance={priorityAppearance[test.priority]}>
                      {test.priority}
                    </Lozenge>
                  </span>
                </td>
                <td className="px-3.5 py-3">
                  {test.assigneeId ? (
                    <div className="flex items-center gap-2">
                      <Avatar name={test.assigneeId} size="xsmall" />
                      <span className="text-xs text-muted-foreground truncate max-w-[60px]">
                        {test.assigneeId}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3.5 py-3">
                  <span className="capitalize">
                    <Lozenge appearance={statusAppearance[test.status] ?? 'default'}>
                      {test.status.replace('-', ' ')}
                    </Lozenge>
                  </span>
                </td>
                <td className="px-3.5 py-3 text-muted-foreground">
                  {test.duration ? `${Math.floor(test.duration / 60)}m ${test.duration % 60}s` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-border bg-muted/30">
        <span className="text-xs text-muted-foreground">
          Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, tests.length)} of {tests.length} tests
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
            <Button
              key={i}
              variant={page === i ? 'default' : 'ghost'}
              size="sm"
              className="h-7 w-7 p-0 text-xs"
              onClick={() => setPage(i)}
            >
              {i + 1}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
