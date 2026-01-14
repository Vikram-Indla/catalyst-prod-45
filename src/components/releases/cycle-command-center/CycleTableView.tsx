/**
 * Table View - Data table with bulk actions
 */

import React, { useState } from 'react';
import { Search, MoreHorizontal, CheckCircle, XCircle, AlertTriangle, Clock, PlayCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { CATALYST_V5, TEST_STATUS_COLORS, TEST_PRIORITY_COLORS } from '@/lib/catalyst-colors';
import type { CycleTestCase } from '@/hooks/test-cycles/useCycleTestCases';

interface CycleTableViewProps {
  cycleId: string;
  testCases: CycleTestCase[];
  isLoading: boolean;
  statusFilter: string | null;
  onStatusFilter: (status: string | null) => void;
}

const STATUS_ICONS = {
  passed: CheckCircle,
  failed: XCircle,
  blocked: AlertTriangle,
  in_progress: PlayCircle,
  not_started: Clock,
};

export function CycleTableView({ cycleId, testCases, isLoading, statusFilter, onStatusFilter }: CycleTableViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const filteredCases = testCases.filter(tc => 
    tc.title.toLowerCase().includes(search.toLowerCase()) ||
    tc.caseKey.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredCases.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCases.map(tc => tc.id)));
    }
  };

  if (isLoading) {
    return <Skeleton className="h-[400px] rounded-xl" />;
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div 
          className="flex items-center justify-between px-4 py-2 rounded-lg text-white"
          style={{ backgroundColor: CATALYST_V5.primary }}
        >
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" className="h-7 text-xs">Assign To</Button>
            <Button size="sm" variant="secondary" className="h-7 text-xs">Change Priority</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-white hover:text-white/80" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search tests..." 
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-10 px-4 py-3">
                <Checkbox checked={selectedIds.size === filteredCases.length && filteredCases.length > 0} onCheckedChange={toggleAll} />
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">ID</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Test Case</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Assignee</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Priority</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredCases.map((tc) => {
              const statusStyle = TEST_STATUS_COLORS[tc.status];
              const priorityStyle = TEST_PRIORITY_COLORS[tc.priority];
              const StatusIcon = STATUS_ICONS[tc.status];
              
              return (
                <tr key={tc.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Checkbox checked={selectedIds.has(tc.id)} onCheckedChange={() => toggleSelect(tc.id)} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium" style={{ color: CATALYST_V5.primary }}>{tc.caseKey}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-foreground">{tc.title}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className="text-xs px-2 py-0.5 gap-1 border-0" style={{ backgroundColor: statusStyle?.bg, color: statusStyle?.text }}>
                      <StatusIcon className="w-3 h-3" />
                      {tc.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">{tc.assigneeName || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className="text-xs px-2 py-0.5 border-0 capitalize" style={{ backgroundColor: priorityStyle?.bg, color: priorityStyle?.text }}>
                      {tc.priority}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
