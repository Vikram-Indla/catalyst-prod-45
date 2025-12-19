import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, AlertCircle, Clock, Users, ChevronRight, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { GlobalPageHeader } from '@/components/layout/GlobalPageHeader';
import { useIncidents } from '@/hooks/useIncidents';
import { CreateIncidentDialog } from '@/components/incidents/CreateIncidentDialog';
import { IncidentFiltersDialog } from '@/components/incidents/IncidentFiltersDialog';
import type { Incident, IncidentFilters } from '@/types/incident';
import { cn } from '@/lib/utils';
import { 
  STATUS_CONFIG, 
  SEVERITY_CONFIG,
  StatusBadge,
  SeverityBadge 
} from '@/components/incidents/badges/IncidentBadges';

function IncidentRow({ incident }: { incident: Incident }) {
  const statusConfig = STATUS_CONFIG[incident.status];
  const severityConfig = SEVERITY_CONFIG[incident.severity];

  return (
    <Link
      to={`/release/incidents/${incident.id}`}
      className="flex items-center gap-4 px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-brand-primary">{incident.incident_key}</span>
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border', severityConfig.className)}>
            {severityConfig.label}
          </Badge>
          {incident.is_major_incident && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              Major
            </Badge>
          )}
        </div>
        <p className="text-sm text-foreground truncate">{incident.title}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(incident.created_at).toLocaleDateString()}
          </span>
          {incident.assignee && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {incident.assignee.full_name}
            </span>
          )}
          {incident.delivery_stage && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
              {incident.delivery_stage}
            </Badge>
          )}
        </div>
      </div>
      <Badge variant="outline" className={cn('text-[10px] px-2 py-0.5 border', statusConfig.className)}>
        {statusConfig.label}
      </Badge>
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-1">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border">
          <div className="flex-1">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-4 w-full max-w-md mb-1" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

export default function IncidentRoomList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [filters, setFilters] = useState<IncidentFilters>({
    status: [],
    severity: [],
    support_level: [],
    delivery_stage: [],
  });
  const { data: incidents, isLoading, error } = useIncidents(filters);

  // Handle ?create=true query param
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setCreateDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filteredIncidents = incidents?.filter(incident =>
    incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    incident.incident_key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    open: incidents?.filter(i => ['open', 'triage', 'in_progress'].includes(i.status)).length || 0,
    critical: incidents?.filter(i => i.severity === 'SEV1' && i.status !== 'resolved' && i.status !== 'closed').length || 0,
    toCommittee: incidents?.filter(i => i.status === 'to_committee').length || 0,
  };

  return (
    <div className="flex flex-col h-full">
      <GlobalPageHeader
        sectionLabel="RELEASE"
        pageTitle="Incident Room"
        rightActions={
          <div className="flex items-center gap-2">
            <Link to="/release/incident-command-center">
              <Button variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                Command Center
              </Button>
            </Link>
            <Button 
              className="bg-brand-primary hover:bg-brand-primary-hover text-white"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Incident
            </Button>
          </div>
        }
        toolbar={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search incidents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <IncidentFiltersDialog filters={filters} onFiltersChange={setFilters} />
          </div>
        }
      />

      {/* Stats Summary */}
      <div className="flex items-center gap-6 px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-sm font-medium">{stats.critical} Critical</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          <span className="text-sm text-muted-foreground">{stats.open} Open</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-purple-500" />
          <span className="text-sm text-muted-foreground">{stats.toCommittee} Awaiting Committee</span>
        </div>
      </div>

      {/* Incidents List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm font-medium text-destructive mb-1">Failed to load incidents</p>
            <p className="text-xs text-muted-foreground">{error instanceof Error ? error.message : 'Unable to fetch data from the server'}</p>
          </div>
        ) : filteredIncidents?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'No incidents match your search' : 'No incidents yet'}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Incident
            </Button>
          </div>
        ) : (
          <div>
            {filteredIncidents?.map(incident => (
              <IncidentRow key={incident.id} incident={incident} />
            ))}
          </div>
        )}
      </div>

      <CreateIncidentDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />
    </div>
  );
}
