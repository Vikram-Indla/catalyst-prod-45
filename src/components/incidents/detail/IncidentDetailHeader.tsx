import { Link } from 'react-router-dom';
import { Eye, EyeOff, Share2, MoreVertical, Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { IncidentStatus, SeverityLevel, PriorityLevel, SupportLevel } from '@/types/incident';

const STATUS_CONFIG: Record<IncidentStatus, { label: string; className: string }> = {
  open: { label: 'New', className: 'bg-blue-100 text-blue-800' },
  triage: { label: 'Triage', className: 'bg-yellow-100 text-yellow-800' },
  to_committee: { label: 'To Committee', className: 'bg-purple-100 text-purple-800' },
  in_progress: { label: 'In Progress', className: 'bg-cyan-100 text-cyan-800' },
  resolved: { label: 'Resolved', className: 'bg-green-100 text-green-800' },
  converted: { label: 'Converted', className: 'bg-secondary-green/20 text-secondary-green' },
  closed: { label: 'Closed', className: 'bg-muted text-muted-foreground' },
};

const SEVERITY_CONFIG: Record<SeverityLevel, { label: string; className: string }> = {
  SEV1: { label: 'SEV1', className: 'bg-red-100 text-red-800 border-red-200' },
  SEV2: { label: 'SEV2', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  SEV3: { label: 'SEV3', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  SEV4: { label: 'SEV4', className: 'bg-blue-100 text-blue-800 border-blue-200' },
};

const PRIORITY_CONFIG: Record<PriorityLevel, { label: string; className: string }> = {
  P1: { label: 'P1', className: 'bg-red-100 text-red-800 border-red-200' },
  P2: { label: 'P2', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  P3: { label: 'P3', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  P4: { label: 'P4', className: 'bg-blue-100 text-blue-800 border-blue-200' },
};

interface IncidentDetailHeaderProps {
  incidentKey: string;
  title: string;
  status: IncidentStatus;
  severity: SeverityLevel;
  priority: PriorityLevel | null;
  supportLevel: SupportLevel | null;
  isMajorIncident: boolean;
  isWatching: boolean;
  watcherCount: number;
  canConvert: boolean;
  canSendCommittee: boolean;
  conversionReason?: string;
  committeeReason?: string;
  onToggleWatch: () => void;
  onSendToCommittee: () => void;
  onOpenConvertDialog: () => void;
  isSubmitting: boolean;
  isWatchPending: boolean;
}

export function IncidentDetailHeader({
  incidentKey,
  title,
  status,
  severity,
  priority,
  supportLevel,
  isMajorIncident,
  isWatching,
  watcherCount,
  canConvert,
  canSendCommittee,
  conversionReason,
  committeeReason,
  onToggleWatch,
  onSendToCommittee,
  onOpenConvertDialog,
  isSubmitting,
  isWatchPending,
}: IncidentDetailHeaderProps) {
  const statusConfig = STATUS_CONFIG[status];
  const severityConfig = SEVERITY_CONFIG[severity];
  const priorityConfig = priority ? PRIORITY_CONFIG[priority] : null;

  return (
    <header className="border-b border-border bg-background px-6 py-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
        <Link to="/release/incident-room" className="hover:text-foreground">RELEASE</Link>
        <span>/</span>
        <Link to="/release/incident-room" className="hover:text-foreground">Incidents</Link>
        <span>/</span>
        <span className="text-foreground">{incidentKey}</span>
      </nav>

      {/* Main Header Row */}
      <div className="flex items-start justify-between gap-4">
        {/* Left: Key + Summary + Badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold text-brand-primary whitespace-nowrap">
              {incidentKey}
            </h1>
            <span className="text-muted-foreground">—</span>
            <span className="text-xl font-semibold text-foreground truncate">
              {title}
            </span>
          </div>
          
          {/* Badge Row */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {/* Status Pill */}
            <Badge className={cn('font-medium', statusConfig.className)}>
              {statusConfig.label}
            </Badge>
            
            {/* Severity Badge */}
            <Badge variant="outline" className={cn('border', severityConfig.className)}>
              {severityConfig.label}
            </Badge>
            
            {/* Priority Badge */}
            {priorityConfig && (
              <Badge variant="outline" className={cn('border', priorityConfig.className)}>
                {priorityConfig.label}
              </Badge>
            )}
            
            {/* Support Level Badge */}
            {supportLevel && (
              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                {supportLevel}
              </Badge>
            )}
            
            {/* Major Incident Flag */}
            {isMajorIncident && (
              <Badge variant="destructive">Major Incident</Badge>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Watch Button */}
          <Button 
            variant={isWatching ? 'default' : 'ghost'} 
            size="sm"
            onClick={onToggleWatch}
            disabled={isWatchPending}
            className={isWatching ? 'bg-brand-primary hover:bg-brand-primary-hover text-white' : ''}
          >
            {isWatching ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
            {isWatching ? 'Unwatch' : 'Watch'}
            {watcherCount > 0 && <span className="ml-1">({watcherCount})</span>}
          </Button>
          
          {/* Share */}
          <Button variant="ghost" size="sm">
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
          
          {/* More Menu */}
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
          
          {/* Send to Committee */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={onSendToCommittee}
            disabled={!canSendCommittee || isSubmitting}
            title={committeeReason}
          >
            <Users className="h-4 w-4 mr-1" />
            Send to Committee
          </Button>
          
          {/* Convert */}
          <Button 
            size="sm"
            onClick={onOpenConvertDialog}
            disabled={!canConvert || isSubmitting}
            title={conversionReason}
            className="bg-brand-primary hover:bg-brand-primary-hover text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            Convert
          </Button>
        </div>
      </div>
    </header>
  );
}
