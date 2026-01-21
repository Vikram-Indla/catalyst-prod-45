// =====================================================
// TRACEABILITY MATRIX COMPONENT
// View requirement-to-test coverage across project
// =====================================================

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Grid3X3, 
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { 
  useTraceabilityMatrix,
  TraceabilityRow,
  RequirementType,
  REQUIREMENT_TYPE_LABELS
} from '@/hooks/test-cases/useRequirementLinks';
import { cn } from '@/lib/utils';

interface TraceabilityMatrixProps {
  projectId: string;
}

export function TraceabilityMatrix({ projectId }: TraceabilityMatrixProps) {
  const { data: rows = [], isLoading } = useTraceabilityMatrix(projectId);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<RequirementType | 'all'>('all');

  const filteredRows = rows.filter(row => {
    const matchesSearch = !search || 
      row.requirement_title?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || row.requirement_type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Summary stats
  const totalRequirements = filteredRows.length;
  const fullyCovered = filteredRows.filter(r => r.coverage_pct >= 100).length;
  const partiallyCovered = filteredRows.filter(r => r.coverage_pct > 0 && r.coverage_pct < 100).length;
  const notCovered = filteredRows.filter(r => r.coverage_pct === 0).length;

  const getCoverageColor = (pct: number) => {
    if (pct >= 80) return 'text-green-600 dark:text-green-400';
    if (pct >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" />
            Traceability Matrix
          </CardTitle>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>{fullyCovered} Full</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span>{partiallyCovered} Partial</span>
            </div>
            <div className="flex items-center gap-1.5">
              <XCircle className="h-4 w-4 text-red-500" />
              <span>{notCovered} None</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search requirements..."
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as RequirementType | 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(REQUIREMENT_TYPE_LABELS).filter(([k]) => k !== 'external').map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Matrix Table */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {search || typeFilter !== 'all' 
              ? 'No matching requirements found'
              : 'No requirements linked to test cases yet'}
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead>Requirement</TableHead>
                  <TableHead className="w-[80px] text-center">Status</TableHead>
                  <TableHead className="w-[80px] text-center">Tests</TableHead>
                  <TableHead className="w-[200px]">Execution Status</TableHead>
                  <TableHead className="w-[120px]">Coverage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={`${row.requirement_type}-${row.requirement_id}`}>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {REQUIREMENT_TYPE_LABELS[row.requirement_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium max-w-[300px] truncate">
                      {row.requirement_title || 'Untitled'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-xs">
                        {row.requirement_status || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {row.total_test_cases}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <ExecutionBar 
                          passed={Number(row.passed_count)}
                          failed={Number(row.failed_count)}
                          blocked={Number(row.blocked_count)}
                          notRun={Number(row.not_run_count)}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={Number(row.coverage_pct)} 
                          className="h-2 flex-1"
                        />
                        <span className={cn("text-sm font-medium w-12 text-right", getCoverageColor(Number(row.coverage_pct)))}>
                          {Number(row.coverage_pct).toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// Mini execution status bar
function ExecutionBar({ passed, failed, blocked, notRun }: { 
  passed: number; 
  failed: number; 
  blocked: number; 
  notRun: number 
}) {
  const total = passed + failed + blocked + notRun;
  if (total === 0) return <span className="text-xs text-muted-foreground">No tests</span>;

  return (
    <div className="flex items-center gap-1 w-full">
      <div className="flex h-2 flex-1 rounded-full overflow-hidden bg-muted">
        {passed > 0 && (
          <div 
            className="bg-green-500 h-full" 
            style={{ width: `${(passed / total) * 100}%` }}
            title={`${passed} Passed`}
          />
        )}
        {failed > 0 && (
          <div 
            className="bg-red-500 h-full" 
            style={{ width: `${(failed / total) * 100}%` }}
            title={`${failed} Failed`}
          />
        )}
        {blocked > 0 && (
          <div 
            className="bg-orange-500 h-full" 
            style={{ width: `${(blocked / total) * 100}%` }}
            title={`${blocked} Blocked`}
          />
        )}
        {notRun > 0 && (
          <div 
            className="bg-gray-400 h-full" 
            style={{ width: `${(notRun / total) * 100}%` }}
            title={`${notRun} Not Run`}
          />
        )}
      </div>
      <div className="flex items-center gap-0.5 text-xs text-muted-foreground ml-1">
        <span className="text-green-600">{passed}</span>/
        <span className="text-red-600">{failed}</span>/
        <span className="text-orange-600">{blocked}</span>/
        <span>{notRun}</span>
      </div>
    </div>
  );
}
