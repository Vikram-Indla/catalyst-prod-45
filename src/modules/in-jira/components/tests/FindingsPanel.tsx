/**
 * Findings Panel Component
 * Displays and manages test findings
 */

import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Clock, Eye, Trash2, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { TestFinding, TraceabilityGap } from '../../hooks/useTraceability';

interface FindingsPanelProps {
  findings: TestFinding[];
  onResolve: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
  onCreate: (input: {
    severity: string;
    type: string;
    title: string;
    description?: string;
    entities_json?: Record<string, unknown>;
  }) => Promise<void>;
  isCreating?: boolean;
  prefillFromGap?: TraceabilityGap | null;
  onClearPrefill?: () => void;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'resolved': return <CheckCircle className="h-4 w-4 text-status-success" />;
    case 'dismissed': return <XCircle className="h-4 w-4 text-text-quaternary" />;
    case 'in_progress': return <Clock className="h-4 w-4 text-status-info" />;
    default: return <AlertTriangle className="h-4 w-4 text-status-warning" />;
  }
};

const getSeverityBadge = (severity: string) => {
  const colors: Record<string, string> = {
    critical: 'bg-status-error/10 text-status-error border-status-error/30',
    high: 'bg-status-error/10 text-status-error border-status-error/20',
    medium: 'bg-status-warning/10 text-status-warning border-status-warning/30',
    low: 'bg-status-info/10 text-status-info border-status-info/30',
  };
  return colors[severity] || 'bg-surface-3 text-text-secondary';
};

export function FindingsPanel({
  findings,
  onResolve,
  onDismiss,
  onCreate,
  isCreating,
  prefillFromGap,
  onClearPrefill,
}: FindingsPanelProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newFinding, setNewFinding] = useState({
    title: '',
    description: '',
    severity: 'medium',
    type: 'coverage_gap',
  });

  // Handle prefill from gap
  React.useEffect(() => {
    if (prefillFromGap) {
      setNewFinding({
        title: prefillFromGap.title,
        description: prefillFromGap.description,
        severity: prefillFromGap.severity,
        type: prefillFromGap.type,
      });
      setCreateDialogOpen(true);
    }
  }, [prefillFromGap]);

  const handleCreate = async () => {
    await onCreate({
      ...newFinding,
      entities_json: prefillFromGap ? {
        entityId: prefillFromGap.entityId,
        entityType: prefillFromGap.entityType,
        entityTitle: prefillFromGap.entityTitle,
      } : {},
    });
    setNewFinding({ title: '', description: '', severity: 'medium', type: 'coverage_gap' });
    setCreateDialogOpen(false);
    onClearPrefill?.();
  };

  const openFindings = findings.filter(f => f.status === 'open' || f.status === 'in_progress');
  const resolvedFindings = findings.filter(f => f.status === 'resolved' || f.status === 'dismissed');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-primary">
          Findings ({openFindings.length} open)
        </h3>
        <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
          Create Finding
        </Button>
      </div>

      {/* Open Findings */}
      {openFindings.length === 0 ? (
        <Card className="bg-surface-2">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-text-secondary">No open findings</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {openFindings.map(finding => (
            <Card key={finding.id} className="bg-surface-2 hover:bg-surface-3 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(finding.status)}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-text-primary">{finding.title}</h4>
                        <Badge variant="outline" className={cn('text-xs capitalize', getSeverityBadge(finding.severity))}>
                          {finding.severity}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {finding.type.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      {finding.description && (
                        <p className="text-xs text-text-secondary mb-1">{finding.description}</p>
                      )}
                      <p className="text-xs text-text-tertiary">
                        Created {format(new Date(finding.created_at), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onResolve(finding.id)}>
                        <CheckCircle className="h-4 w-4 mr-2 text-status-success" />
                        Mark Resolved
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDismiss(finding.id)}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Dismiss
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Resolved Findings (collapsed) */}
      {resolvedFindings.length > 0 && (
        <details className="mt-4">
          <summary className="text-xs text-text-tertiary cursor-pointer hover:text-text-secondary">
            {resolvedFindings.length} resolved/dismissed finding{resolvedFindings.length !== 1 ? 's' : ''}
          </summary>
          <div className="space-y-2 mt-2">
            {resolvedFindings.slice(0, 5).map(finding => (
              <Card key={finding.id} className="bg-surface-1 opacity-60">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(finding.status)}
                    <span className="text-sm text-text-secondary line-through">{finding.title}</span>
                    <Badge variant="secondary" className="text-xs capitalize">{finding.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </details>
      )}

      {/* Create Finding Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => {
        setCreateDialogOpen(open);
        if (!open) onClearPrefill?.();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Finding</DialogTitle>
            <DialogDescription>
              Document a traceability gap or risk that needs attention.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newFinding.title}
                onChange={e => setNewFinding({ ...newFinding, title: e.target.value })}
                placeholder="Enter finding title..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select value={newFinding.severity} onValueChange={v => setNewFinding({ ...newFinding, severity: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={newFinding.type} onValueChange={v => setNewFinding({ ...newFinding, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="missing_tests">Missing Tests</SelectItem>
                    <SelectItem value="no_execution">No Execution</SelectItem>
                    <SelectItem value="repeated_failure">Repeated Failure</SelectItem>
                    <SelectItem value="blocked_stale">Stale Blocked</SelectItem>
                    <SelectItem value="coverage_gap">Coverage Gap</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newFinding.description}
                onChange={e => setNewFinding({ ...newFinding, description: e.target.value })}
                placeholder="Describe the issue and impact..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newFinding.title || isCreating}>
              Create Finding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
