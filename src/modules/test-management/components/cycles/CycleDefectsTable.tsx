/**
 * Cycle Defects Table Component
 */

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { Defect, DefectSeverity, DefectStatus } from '../../api/types';

interface CycleDefectsTableProps {
  defects: Defect[];
  onViewDefect?: (defectId: string) => void;
}

const SEVERITY_CONFIG: Record<DefectSeverity, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-danger/10 text-danger border-danger/20' },
  major: { label: 'Major', className: 'bg-warning/10 text-warning border-warning/20' },
  minor: { label: 'Minor', className: 'bg-info/10 text-info border-info/20' },
  trivial: { label: 'Trivial', className: 'bg-muted text-muted-foreground' },
};

const STATUS_CONFIG: Record<DefectStatus, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-danger/10 text-danger border-danger/20' },
  in_progress: { label: 'In Progress', className: 'bg-info/10 text-info border-info/20' },
  resolved: { label: 'Resolved', className: 'bg-success/10 text-success border-success/20' },
  closed: { label: 'Closed', className: 'bg-muted text-muted-foreground' },
  wont_fix: { label: "Won't Fix", className: 'bg-muted text-muted-foreground' },
};

export function CycleDefectsTable({ defects, onViewDefect }: CycleDefectsTableProps) {
  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Key</TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="w-24">Severity</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead className="w-28">Linked Case</TableHead>
            <TableHead className="w-36">Reporter</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {defects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No defects linked to this cycle.
              </TableCell>
            </TableRow>
          ) : (
            defects.map((defect) => {
              const severityConfig = SEVERITY_CONFIG[defect.severity];
              const statusConfig = STATUS_CONFIG[defect.status];
              
              return (
                <TableRow 
                  key={defect.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onViewDefect?.(defect.id)}
                >
                  <TableCell>
                    <span className="font-mono text-sm text-primary">
                      {defect.defect_key}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="line-clamp-1">{defect.title}</span>
                      {defect.external_tracker_url && (
                        <a 
                          href={defect.external_tracker_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={cn('text-xs capitalize', severityConfig.className)}
                    >
                      {severityConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={cn('text-xs', statusConfig.className)}
                    >
                      {statusConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm text-muted-foreground">
                      {defect.step?.case_id ? 'TC-xxx' : '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {defect.reporter ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={defect.reporter.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {getInitials(defect.reporter.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate">
                          {defect.reporter.full_name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
