/**
 * FeatureAuditTab — Audit log and governance for Feature detail page
 */

import { CheckCircle2, XCircle, Clock, Shield, AlertTriangle, User } from 'lucide-react';
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

interface FeatureAuditTabProps {
  featureId: string;
}

// Mock approval data
const MOCK_APPROVALS = [
  { id: '1', type: 'Technical', status: 'approved', approver: 'Ahmed K.', date: '2025-12-15' },
  { id: '2', type: 'Security', status: 'pending', approver: null, date: null },
  { id: '3', type: 'CAB', status: 'pending', approver: null, date: null },
];

// Mock audit log
const MOCK_AUDIT_LOG = [
  { id: '1', timestamp: '2025-12-18 14:32:15', actor: 'Sara M.', event: 'Status changed', details: 'Backlog → In Progress' },
  { id: '2', timestamp: '2025-12-17 09:15:00', actor: 'Ahmed K.', event: 'Technical approval', details: 'Approved with conditions' },
  { id: '3', timestamp: '2025-12-15 16:45:22', actor: 'Abu Badr', event: 'Description updated', details: 'Added key objectives' },
  { id: '4', timestamp: '2025-12-14 11:20:00', actor: 'Sara M.', event: 'Owner assigned', details: 'Assigned to Sara M.' },
  { id: '5', timestamp: '2025-12-12 10:00:00', actor: 'System', event: 'Feature created', details: 'Initial creation from Epic decomposition' },
];

function getApprovalIcon(status: string) {
  switch (status) {
    case 'approved':
      return <CheckCircle2 className="h-5 w-5 text-status-success" />;
    case 'rejected':
      return <XCircle className="h-5 w-5 text-status-danger" />;
    case 'pending':
    default:
      return <Clock className="h-5 w-5 text-status-warning" />;
  }
}

function getApprovalBadge(status: string) {
  switch (status) {
    case 'approved':
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Approved</Badge>;
    case 'rejected':
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Rejected</Badge>;
    case 'pending':
    default:
      return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">Pending</Badge>;
  }
}

export function FeatureAuditTab({ featureId }: FeatureAuditTabProps) {
  return (
    <div className="space-y-8">
      {/* Approval Status Blocks */}
      <section>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
          Approval Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {MOCK_APPROVALS.map((approval) => (
            <div 
              key={approval.id}
              className={cn(
                "p-4 rounded-lg border",
                approval.status === 'approved' && "bg-green-500/5 border-green-500/20",
                approval.status === 'rejected' && "bg-red-500/5 border-red-500/20",
                approval.status === 'pending' && "bg-orange-500/5 border-orange-500/20"
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
                {approval.approver && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                    <User className="h-3 w-3" />
                    <span>{approval.approver}</span>
                    <span>·</span>
                    <span>{approval.date}</span>
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
                <TableHead className="font-semibold text-xs uppercase tracking-wide w-[200px]">Event</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_AUDIT_LOG.map((entry) => (
                <TableRow key={entry.id} className="hover:bg-muted/30">
                  <TableCell>
                    <span className="font-mono text-xs text-muted-foreground">
                      {entry.timestamp}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {entry.actor === 'System' ? (
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                          <AlertTriangle className="h-3 w-3 text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-medium">
                          {entry.actor.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                      )}
                      <span className="text-sm">{entry.actor}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{entry.event}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{entry.details}</span>
                  </TableCell>
                </TableRow>
              ))}
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
