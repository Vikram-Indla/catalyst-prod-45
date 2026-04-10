/**
 * FeatureAuditTab — Audit log and governance for Feature detail page
 * Shows approval statuses for Business Request, Epic, and CAB (Release)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, Clock, Shield, AlertTriangle, User, MinusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';

interface FeatureAuditTabProps {
  featureId: string;
}

type ApprovalStatus = 'approved' | 'pending' | 'not_started';

interface ApprovalCard {
  id: string;
  type: string;
  status: ApprovalStatus;
  owner: string | null;
}

function getApprovalIcon(status: ApprovalStatus) {
  switch (status) {
    case 'approved':
      return <CheckCircle2 className="h-5 w-5 text-status-success" />;
    case 'pending':
      return <Clock className="h-5 w-5 text-status-warning" />;
    case 'not_started':
    default:
      return <MinusCircle className="h-5 w-5 text-muted-foreground" />;
  }
}

function getApprovalBadge(status: ApprovalStatus) {
  switch (status) {
    case 'approved':
      return <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">Approved</Badge>;
    case 'pending':
      return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">Pending</Badge>;
    case 'not_started':
    default:
      return <Badge className="bg-muted text-muted-foreground">Not Started</Badge>;
  }
}

export function FeatureAuditTab({ featureId }: FeatureAuditTabProps) {
  // Fetch feature with epic and release data
  const { data: approvalData, isLoading } = useQuery({
    queryKey: ['feature-approval-status', featureId],
    queryFn: async () => {
      // First get the feature with its epic_id and release_id
      const { data: feature, error: featureError } = await supabase
        .from('features')
        .select('id, epic_id, release_id')
        .eq('id', featureId)
        .single();

      if (featureError) throw featureError;

      const approvals: ApprovalCard[] = [];

      // 1. Business Request - through Epic's linked_business_request_id
      let businessRequestStatus: ApprovalStatus = 'not_started';
      let businessRequestOwner: string | null = null;

      if (feature.epic_id) {
        const { data: epic } = await supabase
          .from('epics')
          .select('linked_business_request_id, assignee_id')
          .eq('id', feature.epic_id)
          .single();

        if (epic?.linked_business_request_id) {
          const { data: businessRequest } = await typedQuery('business_requests')
            .select('process_step, assignee')
            .eq('id', epic.linked_business_request_id)
            .single();
          const brTyped = businessRequest as { process_step: string; assignee: string } | null;

          if (brTyped) {
            if (brTyped.process_step === 'ready for implementation') {
              businessRequestStatus = 'approved';
              businessRequestOwner = brTyped.assignee;
            } else {
              businessRequestStatus = 'pending';
              businessRequestOwner = brTyped.assignee;
            }
          }
        }
      }

      approvals.push({
        id: '1',
        type: 'Business Request',
        status: businessRequestStatus,
        owner: businessRequestOwner,
      });

      // 2. Epic - check epic status (process_step via process_step_id or state)
      let epicStatus: ApprovalStatus = 'not_started';
      let epicOwner: string | null = null;

      if (feature.epic_id) {
        const { data: epic } = await supabase
          .from('epics')
          .select('state, process_step_id, assignee_id, owner_name')
          .eq('id', feature.epic_id)
          .single();

        if (epic) {
          // Check if epic has a process_step linked
          if (epic.process_step_id) {
            const { data: processStep } = await supabase
              .from('process_steps')
              .select('name')
              .eq('id', epic.process_step_id)
              .single();

            const stepName = processStep?.name?.toLowerCase() || '';
            if (stepName.includes('ready') && stepName.includes('implementation')) {
              epicStatus = 'approved';
            } else if (stepName) {
              epicStatus = 'pending';
            }
          } else if (epic.state === 'accepted') {
            // 'accepted' is the closest to "ready for implementation" in the epic_state enum
            epicStatus = 'approved';
          } else if (epic.state === 'in_progress') {
            epicStatus = 'pending';
          }

          // Get owner name
          if (epic.owner_name) {
            epicOwner = epic.owner_name;
          } else if (epic.assignee_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', epic.assignee_id)
              .single();
            epicOwner = profile?.full_name || null;
          }
        }
      }

      approvals.push({
        id: '2',
        type: 'Epic',
        status: epicStatus,
        owner: epicOwner,
      });

      // 3. CAB - based on release linkage
      // Not linked = Not Started, Linked but not ready = Pending, Ready for Implementation = Approved
      let cabStatus: ApprovalStatus = 'not_started';
      let cabOwner: string | null = null;

      if (feature.release_id) {
        const { data: release } = await supabase
          .from('releases')
          .select('status')
          .eq('id', feature.release_id)
          .single();

        if (release) {
          // Check if release status is ready (ready for implementation)
          if (release.status === 'ready') {
            cabStatus = 'approved';
          } else {
            cabStatus = 'pending';
          }
        }
      }

      approvals.push({
        id: '3',
        type: 'CAB',
        status: cabStatus,
        owner: cabOwner,
      });

      return approvals;
    },
    enabled: !!featureId,
  });

  // Fetch audit logs
  const { data: auditLogs } = useQuery({
    queryKey: ['feature-audit-logs', featureId],
    queryFn: async () => {
      const { data } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('entity_type', 'features')
        .eq('entity_id', featureId)
        .order('created_at', { ascending: false })
        .limit(50);

      return data || [];
    },
    enabled: !!featureId,
  });

  const approvals = approvalData || [
    { id: '1', type: 'Business Request', status: 'not_started' as ApprovalStatus, owner: null },
    { id: '2', type: 'Epic', status: 'not_started' as ApprovalStatus, owner: null },
    { id: '3', type: 'CAB', status: 'not_started' as ApprovalStatus, owner: null },
  ];

  return (
    <div className="space-y-8">
      {/* Approval Status Blocks */}
      <section>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
          Approval Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {approvals.map((approval) => (
            <div 
              key={approval.id}
              className={cn(
                "p-4 rounded-lg border",
                approval.status === 'approved' && "bg-teal-500/5 border-teal-500/20",
                approval.status === 'pending' && "bg-orange-500/5 border-orange-500/20",
                approval.status === 'not_started' && "bg-muted/50 border-border"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{approval.type}</span>
                </div>
                {getApprovalIcon(approval.status)}
              </div>
              <div className="space-y-1">
                {getApprovalBadge(approval.status)}
                {approval.owner && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                    <User className="h-3 w-3" />
                    <span>{approval.owner}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Audit Log Table */}
      <section>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
          Audit Log
        </h3>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold text-xs uppercase tracking-wide w-[180px]">Timestamp</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide w-[150px]">Actor</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide">Event</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs && auditLogs.length > 0 ? (
                auditLogs.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-muted/30">
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">
                        {entry.created_at && formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {entry.actor_id ? (
                          <div className="w-6 h-6 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-medium">
                            U
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                            <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                        <span className="text-sm">{entry.actor_id ? 'User' : 'System'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{entry.action}</span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    No audit history yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground mt-2 italic">
          Audit events are immutable and generated server-side for compliance.
        </p>
      </section>
    </div>
  );
}
