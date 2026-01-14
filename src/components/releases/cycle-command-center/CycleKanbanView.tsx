/**
 * Kanban View - 5 column board with drag and drop
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CATALYST_V5, TEST_STATUS_COLORS, TEST_PRIORITY_COLORS } from '@/lib/catalyst-colors';
import type { CycleTestCase } from '@/hooks/test-cycles/useCycleTestCases';

interface CycleKanbanViewProps {
  cycleId: string;
  testCases: CycleTestCase[];
  isLoading: boolean;
}

const COLUMNS = [
  { id: 'not_started', label: 'Not Started', bg: '#f8fafc', dot: '#94a3b8' },
  { id: 'in_progress', label: 'In Progress', bg: CATALYST_V5.primaryLighter, dot: CATALYST_V5.primary },
  { id: 'passed', label: 'Passed', bg: CATALYST_V5.tealLighter, dot: CATALYST_V5.teal },
  { id: 'failed', label: 'Failed', bg: CATALYST_V5.dangerLighter, dot: CATALYST_V5.danger },
  { id: 'blocked', label: 'Blocked', bg: CATALYST_V5.warningLighter, dot: CATALYST_V5.warning },
];

export function CycleKanbanView({ cycleId, testCases, isLoading }: CycleKanbanViewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-5 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.id} className="space-y-3">
            <Skeleton className="h-8 rounded" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  const groupedCases = COLUMNS.reduce((acc, col) => {
    acc[col.id] = testCases.filter(tc => tc.status === col.id);
    return acc;
  }, {} as Record<string, CycleTestCase[]>);

  return (
    <div className="grid grid-cols-5 gap-4 min-h-[600px]">
      {COLUMNS.map((column) => (
        <div key={column.id} className="flex flex-col">
          {/* Column Header */}
          <div className="flex items-center gap-2 mb-3 px-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: column.dot }} />
            <span className="text-sm font-medium text-foreground">{column.label}</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {groupedCases[column.id]?.length || 0}
            </Badge>
          </div>

          {/* Column Content */}
          <div 
            className="flex-1 rounded-xl p-2 space-y-2 min-h-[500px]"
            style={{ backgroundColor: column.bg }}
          >
            {groupedCases[column.id]?.map((testCase) => {
              const priorityStyle = TEST_PRIORITY_COLORS[testCase.priority];
              return (
                <div
                  key={testCase.id}
                  className="bg-background rounded-lg border p-3 cursor-pointer hover:shadow-md transition-shadow"
                  style={{ borderLeftWidth: 3, borderLeftColor: priorityStyle?.text || '#94a3b8' }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: CATALYST_V5.primary }}>
                      {testCase.caseKey}
                    </span>
                    <Badge 
                      className="text-[10px] px-1.5 py-0 border-0"
                      style={{ backgroundColor: priorityStyle?.bg, color: priorityStyle?.text }}
                    >
                      {testCase.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground line-clamp-2 mb-2">
                    {testCase.title}
                  </p>
                  <div className="flex items-center justify-between">
                    {testCase.assigneeName ? (
                      <div className="flex items-center gap-1.5">
                        <div 
                          className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium"
                          style={{ color: CATALYST_V5.primary }}
                        >
                          {testCase.assigneeName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="text-xs text-muted-foreground">{testCase.assigneeName}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Unassigned</span>
                    )}
                    {testCase.linkedDefectKey && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        {testCase.linkedDefectKey}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
