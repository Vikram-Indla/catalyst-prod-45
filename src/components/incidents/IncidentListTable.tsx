import { Link, useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Incident } from '@/types/incident';
import { cn } from '@/lib/utils';
import { getAgingTime } from '@/components/incidents/badges/IncidentBadges';

interface IncidentListTableProps {
  incidents: Incident[];
  isLoading?: boolean;
}

// Enterprise-grade badge configs with explicit labels
const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  open: { label: 'Open', className: 'border-blue-500 text-blue-700 bg-blue-50' },
  triage: { label: 'Triage', className: 'border-amber-500 text-amber-700 bg-amber-50' },
  to_committee: { label: 'Committee', className: 'border-purple-500 text-purple-700 bg-purple-50' },
  in_progress: { label: 'In Progress', className: 'border-sky-500 text-sky-700 bg-sky-50' },
  resolved: { label: 'Resolved', className: 'border-emerald-500 text-emerald-700 bg-emerald-50' },
  converted: { label: 'Converted', className: 'border-slate-500 text-slate-700 bg-slate-50' },
  closed: { label: 'Closed', className: 'border-slate-400 text-slate-500 bg-slate-50' },
};

const SEVERITY_LABELS: Record<string, { label: string; className: string }> = {
  SEV1: { label: 'Severity: SEV1', className: 'border-rose-600 text-rose-700 bg-rose-50' },
  SEV2: { label: 'Severity: SEV2', className: 'border-amber-600 text-amber-700 bg-amber-50' },
  SEV3: { label: 'Severity: SEV3', className: 'border-slate-500 text-slate-600 bg-slate-50' },
  SEV4: { label: 'Severity: SEV4', className: 'border-slate-400 text-slate-500 bg-slate-50' },
};

const PRIORITY_LABELS: Record<string, { label: string; className: string }> = {
  P1: { label: 'Priority: P1', className: 'border-rose-600 text-rose-700 bg-rose-50' },
  P2: { label: 'Priority: P2', className: 'border-amber-600 text-amber-700 bg-amber-50' },
  P3: { label: 'Priority: P3', className: 'border-slate-500 text-slate-600 bg-slate-50' },
  P4: { label: 'Priority: P4', className: 'border-slate-400 text-slate-500 bg-slate-50' },
};

const SUPPORT_LABELS: Record<string, { label: string; className: string }> = {
  L1: { label: 'L1 Support', className: 'border-slate-400 text-slate-600 bg-slate-50' },
  L2: { label: 'L2 Support', className: 'border-blue-500 text-blue-700 bg-blue-50' },
  L3: { label: 'L3 Support', className: 'border-purple-500 text-purple-700 bg-purple-50' },
};

function LoadingSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[100px]">Key</TableHead>
          <TableHead>Summary</TableHead>
          <TableHead className="w-[110px]">Severity</TableHead>
          <TableHead className="w-[100px]">Priority</TableHead>
          <TableHead className="w-[100px]">Level</TableHead>
          <TableHead className="w-[100px]">Status</TableHead>
          <TableHead className="w-[120px]">Assignee</TableHead>
          <TableHead className="w-[60px]">Age</TableHead>
          <TableHead className="w-[80px]">SLA</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(8)].map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
            <TableCell><Skeleton className="h-4 w-full max-w-md" /></TableCell>
            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-8" /></TableCell>
            <TableCell><Skeleton className="h-4 w-12" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function IncidentListTable({ incidents, isLoading }: IncidentListTableProps) {
  const navigate = useNavigate();
  
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent text-xs">
          <TableHead className="w-[100px] font-semibold">Key</TableHead>
          <TableHead className="font-semibold">Summary</TableHead>
          <TableHead className="w-[110px] font-semibold">Severity</TableHead>
          <TableHead className="w-[100px] font-semibold">Priority</TableHead>
          <TableHead className="w-[100px] font-semibold">Level</TableHead>
          <TableHead className="w-[100px] font-semibold">Status</TableHead>
          <TableHead className="w-[130px] font-semibold">Assignee</TableHead>
          <TableHead className="w-[60px] font-semibold">Age</TableHead>
          <TableHead className="w-[100px] font-semibold">SLA</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {incidents.map((incident) => {
          const statusConfig = STATUS_LABELS[incident.status] || STATUS_LABELS.open;
          const severityConfig = SEVERITY_LABELS[incident.severity] || SEVERITY_LABELS.SEV3;
          const priorityConfig = incident.priority ? PRIORITY_LABELS[incident.priority] : null;
          const supportConfig = incident.support_level ? SUPPORT_LABELS[incident.support_level] : null;
          const age = getAgingTime(incident.created_at);
          
          // SLA status
          const slaBreached = incident.sla?.response_breached || incident.sla?.resolution_breached;
          
          return (
            <TableRow 
              key={incident.id} 
              className="hover:bg-muted/50 cursor-pointer group"
              onClick={() => navigate(`/release/incidents/${incident.id}`)}
            >
              {/* Key */}
              <TableCell className="py-2">
                <div className="flex items-center gap-1.5">
                  <Link to={`/release/incidents/${incident.id}`} className="text-xs font-medium text-brand-primary hover:underline">
                    {incident.incident_key}
                  </Link>
                  {incident.is_major_incident && (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  )}
                </div>
              </TableCell>
              
              {/* Summary */}
              <TableCell className="py-2">
                <span className="text-xs text-foreground line-clamp-1">{incident.title}</span>
              </TableCell>
              
              {/* Severity */}
              <TableCell className="py-2">
                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 font-normal', severityConfig.className)}>
                  {severityConfig.label}
                </Badge>
              </TableCell>
              
              {/* Priority */}
              <TableCell className="py-2">
                {priorityConfig ? (
                  <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 font-normal', priorityConfig.className)}>
                    {priorityConfig.label}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              
              {/* Support Level */}
              <TableCell className="py-2">
                {supportConfig ? (
                  <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 font-normal', supportConfig.className)}>
                    {supportConfig.label}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              
              {/* Status */}
              <TableCell className="py-2">
                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 font-normal', statusConfig.className)}>
                  {statusConfig.label}
                </Badge>
              </TableCell>
              
              {/* Assignee */}
              <TableCell className="py-2">
                {incident.assignee ? (
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <span className="text-xs text-foreground truncate max-w-[90px]">
                      {incident.assignee.full_name}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Unassigned</span>
                )}
              </TableCell>
              
              {/* Age */}
              <TableCell className="py-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {age}
                </div>
              </TableCell>
              
              {/* SLA */}
              <TableCell className="py-2">
                {slaBreached ? (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-rose-500 text-rose-600 bg-rose-50">
                    Breached
                  </Badge>
                ) : incident.sla ? (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500 text-emerald-600 bg-emerald-50">
                    On Track
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
