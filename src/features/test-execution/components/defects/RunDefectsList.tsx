/**
 * Module 4C-3: Run Defects List
 * Lists all defects linked to a test run
 */

import React, { useState } from 'react';
import { Bug, ExternalLink, Filter, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { RunDefectItem } from '../../hooks/useRunDefects';
import type { DefectSeverity, DefectStatus } from '../../types/defect-linking';
import { SEVERITY_CONFIG, STATUS_CONFIG } from '../../types/defect-linking';

interface RunDefectsListProps {
  defects: RunDefectItem[];
  isLoading?: boolean;
  onDefectClick?: (defectId: string) => void;
  className?: string;
}

export function RunDefectsList({
  defects,
  isLoading,
  onDefectClick,
  className,
}: RunDefectsListProps) {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredDefects = defects.filter((d) => {
    if (severityFilter !== 'all' && d.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    return true;
  });

  if (isLoading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bug className="h-4 w-4" />
            Run Defects
            <Badge variant="secondary">{defects.length}</Badge>
          </CardTitle>

          <div className="flex items-center gap-2">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="major">Major</SelectItem>
                <SelectItem value="minor">Minor</SelectItem>
                <SelectItem value="trivial">Trivial</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredDefects.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {defects.length === 0
              ? 'No defects linked to this run'
              : 'No defects match the current filters'}
          </div>
        ) : (
          <ScrollArea className="h-80">
            <div className="space-y-2">
              {filteredDefects.map((defect) => (
                <DefectListItem
                  key={defect.id}
                  defect={defect}
                  onClick={() => onDefectClick?.(defect.id)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function DefectListItem({
  defect,
  onClick,
}: {
  defect: RunDefectItem;
  onClick?: () => void;
}) {
  const severityConfig = SEVERITY_CONFIG[defect.severity];
  const statusConfig = STATUS_CONFIG[defect.status];

  return (
    <div
      className={cn(
        'p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className="font-mono text-xs shrink-0"
            >
              {defect.key}
            </Badge>
            <Badge
              className={cn('text-xs shrink-0', severityConfig.bgClass, severityConfig.textClass)}
            >
              {severityConfig.label}
            </Badge>
            <Badge
              variant="outline"
              className={cn('text-xs shrink-0', statusConfig.bgClass, statusConfig.textClass)}
            >
              {statusConfig.label}
            </Badge>
          </div>

          {/* Title */}
          <p className="text-sm font-medium truncate">{defect.title}</p>

          {/* Test case info */}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="font-mono">{defect.test_case_key}</span>
            {defect.step_number && (
              <span>Step {defect.step_number}</span>
            )}
            {defect.assignee_name && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {defect.assignee_name}
              </span>
            )}
          </div>
        </div>

        {onClick && (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
