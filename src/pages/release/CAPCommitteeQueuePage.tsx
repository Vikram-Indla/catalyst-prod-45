import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronLeft, ChevronRight, Users, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useIncidents } from '@/hooks/useIncidents';
import { format, formatDistanceToNow } from 'date-fns';
import type { Incident, CommitteeMember, VoteStatus } from '@/types/incident';

// Severity badge
const SeverityBadge = ({ severity }: { severity: string }) => {
  const colors: Record<string, string> = {
    SEV1: 'bg-red-100 text-red-800 border-red-200',
    SEV2: 'bg-orange-100 text-orange-800 border-orange-200',
    SEV3: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    SEV4: 'bg-blue-100 text-blue-800 border-blue-200',
  };
  return (
    <Badge variant="outline" className={cn('text-[10px] font-medium px-1.5 py-0', colors[severity] || 'bg-gray-100')}>
      {severity}
    </Badge>
  );
};

// Testing Status badge
const TestingStatusBadge = ({ status }: { status: string | undefined }) => {
  if (!status) return <span className="text-muted-foreground text-xs">-</span>;
  const config: Record<string, { label: string; className: string }> = {
    not_started: { label: 'Not Started', className: 'bg-gray-100 text-gray-700' },
    dev_test: { label: 'Dev Test', className: 'bg-blue-100 text-blue-700' },
    qa: { label: 'QA', className: 'bg-purple-100 text-purple-700' },
    uat: { label: 'UAT', className: 'bg-orange-100 text-orange-700' },
    prod_verified: { label: 'Prod Verified', className: 'bg-green-100 text-green-700' },
  };
  const { label, className } = config[status] || { label: status, className: 'bg-gray-100' };
  return (
    <Badge variant="outline" className={cn('text-[10px] font-medium px-1.5 py-0', className)}>
      {label}
    </Badge>
  );
};

// Approval Progress component
function ApprovalProgress({ 
  incident,
  onViewDetails 
}: { 
  incident: Incident;
  onViewDetails: () => void;
}) {
  const committee = incident.committee;
  if (!committee) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  const members = committee.members || [];
  const approvedCount = members.filter(m => m.vote?.vote === 'approved').length;
  const rejectedCount = members.filter(m => m.vote?.vote === 'rejected').length;
  const vetoedCount = members.filter(m => m.vote?.vote === 'vetoed').length;
  const pendingCount = members.filter(m => !m.vote?.vote || m.vote?.vote === 'pending').length;
  const totalMembers = members.length;
  const requiredApprovals = committee.required_approvals || 1;

  const progressPercent = totalMembers > 0 ? (approvedCount / requiredApprovals) * 100 : 0;
  const hasVeto = vetoedCount > 0;
  const isRejected = rejectedCount > 0 || hasVeto;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button 
          className="w-full text-left hover:bg-muted/50 rounded p-1 -m-1"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2">
            <Progress 
              value={Math.min(progressPercent, 100)} 
              className={cn(
                "h-2 flex-1",
                hasVeto ? "[&>div]:bg-orange-500" : isRejected ? "[&>div]:bg-red-500" : "[&>div]:bg-green-500"
              )}
            />
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {approvedCount}/{requiredApprovals}
            </span>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Approval Status</span>
            <Badge variant="outline" className={cn(
              "text-[10px]",
              committee.status === 'approved' ? "bg-green-100 text-green-800" :
              committee.status === 'rejected' ? "bg-red-100 text-red-800" :
              "bg-yellow-100 text-yellow-800"
            )}>
              {committee.status.toUpperCase()}
            </Badge>
          </div>
          <div className="space-y-1">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium">
                    {member.user?.avatar_initials || member.user?.full_name?.charAt(0) || '?'}
                  </div>
                  <span className="truncate max-w-[100px]">{member.user?.full_name}</span>
                  {member.has_veto && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0 text-orange-700 border-orange-200">V</Badge>
                  )}
                </div>
                <VoteIcon vote={member.vote?.vote || 'pending'} />
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Vote status icon
const VoteIcon = ({ vote }: { vote: VoteStatus }) => {
  switch (vote) {
    case 'approved':
      return <CheckCircle className="h-3.5 w-3.5 text-green-600" />;
    case 'rejected':
      return <XCircle className="h-3.5 w-3.5 text-red-600" />;
    case 'vetoed':
      return <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />;
    default:
      return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
  }
};

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';
type FilterSeverity = 'all' | 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4';
type FilterAging = 'all' | '< 1 day' | '1-3 days' | '3-7 days' | '> 7 days';

export default function CAPCommitteeQueuePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('pending');
  const [severityFilter, setSeverityFilter] = useState<FilterSeverity>('all');
  const [agingFilter, setAgingFilter] = useState<FilterAging>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Fetch all L3 incidents that require committee review
  const { data: allIncidents = [], isLoading } = useIncidents({ support_level: ['L3'] });

  // Filter incidents that have committee or require it
  const committeeIncidents = useMemo(() => {
    return allIncidents.filter(i => 
      i.requires_committee || 
      i.committee || 
      i.support_level === 'L3'
    );
  }, [allIncidents]);

  // Calculate aging in days
  const getAgingDays = (createdAt: string) => {
    const now = new Date();
    return Math.floor((now.getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  };

  // Apply filters
  const filteredIncidents = useMemo(() => {
    let result = committeeIncidents;

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(i => {
        if (!i.committee) return statusFilter === 'pending';
        return i.committee.status === statusFilter;
      });
    }

    // Severity filter
    if (severityFilter !== 'all') {
      result = result.filter(i => i.severity === severityFilter);
    }

    // Aging filter
    if (agingFilter !== 'all') {
      result = result.filter(i => {
        const days = getAgingDays(i.created_at);
        switch (agingFilter) {
          case '< 1 day': return days < 1;
          case '1-3 days': return days >= 1 && days < 3;
          case '3-7 days': return days >= 3 && days < 7;
          case '> 7 days': return days >= 7;
          default: return true;
        }
      });
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i =>
        i.incident_key?.toLowerCase().includes(q) ||
        i.title?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [committeeIncidents, statusFilter, severityFilter, agingFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredIncidents.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedIncidents = filteredIncidents.slice(startIndex, startIndex + pageSize);

  // Calculate time waiting (since approver added / committee created)
  const getTimeWaiting = (incident: Incident) => {
    if (!incident.committee?.created_at) return '-';
    return formatDistanceToNow(new Date(incident.committee.created_at), { addSuffix: false });
  };

  // Calculate aging (since incident creation)
  const getAging = (createdAt: string) => {
    return formatDistanceToNow(new Date(createdAt), { addSuffix: false });
  };

  const handleRowClick = (incident: Incident) => {
    navigate(`/release/incident-room/${incident.id}`);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-brand-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 border-b border-border bg-card flex-shrink-0 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-base font-semibold text-foreground">CAP Committee Queue</h1>
          <Badge variant="secondary" className="text-xs">
            {filteredIncidents.length} {statusFilter === 'pending' ? 'Pending' : 'Total'}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          {/* Smart Filters: Status, Severity, Aging */}
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as FilterStatus); setCurrentPage(1); }}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-50 bg-popover">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v as FilterSeverity); setCurrentPage(1); }}>
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-50 bg-popover">
              <SelectItem value="all">All Sev</SelectItem>
              <SelectItem value="SEV1">SEV1</SelectItem>
              <SelectItem value="SEV2">SEV2</SelectItem>
              <SelectItem value="SEV3">SEV3</SelectItem>
              <SelectItem value="SEV4">SEV4</SelectItem>
            </SelectContent>
          </Select>

          <Select value={agingFilter} onValueChange={(v) => { setAgingFilter(v as FilterAging); setCurrentPage(1); }}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-50 bg-popover">
              <SelectItem value="all">All Ages</SelectItem>
              <SelectItem value="< 1 day">&lt; 1 day</SelectItem>
              <SelectItem value="1-3 days">1-3 days</SelectItem>
              <SelectItem value="3-7 days">3-7 days</SelectItem>
              <SelectItem value="> 7 days">&gt; 7 days</SelectItem>
            </SelectContent>
          </Select>

          {/* Pagination */}
          <div className="flex items-center gap-1 border border-border rounded bg-white px-1 h-8">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
              disabled={currentPage === 1} 
              className="h-6 w-6 p-0"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-foreground px-2 whitespace-nowrap">
              {filteredIncidents.length > 0 
                ? `${startIndex + 1}-${Math.min(startIndex + pageSize, filteredIncidents.length)} of ${filteredIncidents.length}` 
                : '0'}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
              disabled={currentPage === totalPages || totalPages === 0} 
              className="h-6 w-6 p-0"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-muted/80">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide w-24">Key</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide">Summary</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide w-16">Severity</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide w-20">Testing</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide w-20">Deploy</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide w-20">Change #</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide w-28">Approval</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide w-20">Waiting</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide w-16">Aging</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wide w-20">Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedIncidents.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="h-8 w-8 text-muted-foreground/30" />
                    <span>No incidents {statusFilter === 'pending' ? 'pending committee approval' : 'found'}</span>
                    {(statusFilter !== 'all' || severityFilter !== 'all' || agingFilter !== 'all') && (
                      <button 
                        onClick={() => { setStatusFilter('pending'); setSeverityFilter('all'); setAgingFilter('all'); }}
                        className="text-xs text-brand-primary hover:underline"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : paginatedIncidents.map((incident) => (
              <tr
                key={incident.id}
                className="hover:bg-muted/30 cursor-pointer border-b border-border/50"
                onClick={() => handleRowClick(incident)}
              >
                <td className="px-3 py-2">
                  <span className="font-mono text-xs font-medium text-brand-primary">
                    {incident.incident_key}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className="text-foreground line-clamp-1">{incident.title}</span>
                </td>
                <td className="px-3 py-2">
                  <SeverityBadge severity={incident.severity} />
                </td>
                <td className="px-3 py-2">
                  <TestingStatusBadge status={(incident as unknown as { testing_status?: string }).testing_status} />
                </td>
                <td className="px-3 py-2">
                  <span className="text-muted-foreground text-xs font-mono">
                    {incident.target_date ? format(new Date(incident.target_date), 'MMM d') : '-'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className="text-muted-foreground text-xs font-mono">
                    {(incident as unknown as { change_number?: string }).change_number || '-'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <ApprovalProgress 
                    incident={incident} 
                    onViewDetails={() => {}}
                  />
                </td>
                <td className="px-3 py-2">
                  <span className="text-muted-foreground text-xs font-mono">
                    {getTimeWaiting(incident)}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className={cn(
                    "text-xs font-mono",
                    getAgingDays(incident.created_at) >= 7 ? "text-red-600 font-semibold" :
                    getAgingDays(incident.created_at) >= 3 ? "text-orange-600" :
                    "text-muted-foreground"
                  )}>
                    {getAging(incident.created_at)}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <Badge variant="outline" className={cn(
                    "text-[10px] font-medium px-1.5 py-0",
                    incident.committee?.status === 'approved' ? "bg-green-100 text-green-800" :
                    incident.committee?.status === 'rejected' ? "bg-red-100 text-red-800" :
                    "bg-yellow-100 text-yellow-800"
                  )}>
                    {incident.committee?.status?.toUpperCase() || 'PENDING'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
