/**
 * Defect Detail Page — G25 Rebuild
 * Route: /testhub/defects/:defectId
 */
import { useState, useEffect } from 'react';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Edit, MoreVertical, Trash2, Bug, Play } from 'lucide-react';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ads';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { SeverityBadge } from '@/components/defects/g25/SeverityBadge';
import { StatusBadge } from '@/components/defects/g25/StatusBadge';
import { PriorityBadge } from '@/components/defects/g25/PriorityBadge';
import { StatusChangeModal } from '@/components/defects/g25/StatusChangeModal';
import { EntityCommentsPanel } from '@/components/testhub/EntityCommentsPanel';
import { DefectHistory } from '@/components/defects/g25/DefectHistory';
import { DefectLinks } from '@/components/defects/g25/DefectLinks';
import { DefectAttachments } from '@/components/defects/g25/DefectAttachments';
import { AddLinkModal } from '@/components/defects/g25/AddLinkModal';
import { EditDefectModalG25 } from '@/components/defects/g25/EditDefectModal';
import { useDefectG25, useDeleteDefectG25 } from '@/hooks/useDefectsG25';
import { format, formatDistanceToNow } from 'date-fns';

export default function DefectDetailPage() {
  const { defectId } = useParams();
  const navigate = useNavigate();
  const { data: defect, isLoading } = useDefectG25(defectId);
  const deleteDefect = useDeleteDefectG25();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const [executionRunId, setExecutionRunId] = useState<string | null>(null);

  // Query tm_defect_links for reverse navigation to execution run
  useEffect(() => {
    if (!defect?.id) return;
    (async () => {
      const { data: runLink } = await typedQuery('tm_defect_links')
        .select('linked_id')
        .eq('defect_id', defect.id)
        .eq('link_type', 'test_run')
        .maybeSingle();
      setExecutionRunId(runLink?.linked_id ?? null);
    })();
  }, [defect?.id]);

  const handleDelete = async () => {
    if (!defect || !confirm(`Delete ${defect.defect_key}?`)) return;
    await deleteDefect.mutateAsync(defect.id);
    navigate('/testhub/defects');
  };

  if (isLoading) return <div className="p-6 space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-48 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (!defect) return (
    <div className="p-6 text-center py-20">
      <Bug className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
      <p className="text-lg text-muted-foreground mb-4">Defect not found</p>
      <Button variant="outline" onClick={() => navigate('/testhub/defects')}>Back to Defects</Button>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Back + Header */}
      <Button variant="ghost" size="sm" className="mb-2" onClick={() => navigate('/testhub/defects')}>
        <ChevronLeft className="h-4 w-4 mr-1" />Back to Defects
      </Button>

      <div className="border-b pb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-sm text-primary">{defect.defect_key}</span>
            </div>
            <CatalystPageHeader title={defect.title} />
            <div className="flex items-center gap-2">
              <SeverityBadge severity={defect.severity} />
              <PriorityBadge priority={defect.priority} />
              <StatusBadge status={defect.status} />
              <Button variant="outline" size="sm" onClick={() => setShowStatusModal(true)}>Change Status</Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowEditModal(true)}><Edit className="h-4 w-4 mr-2" />Edit</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-destructive" onClick={handleDelete}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Origin Card */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Origin</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {defect.jira_source === true ? (
              <>
                <div><span className="text-muted-foreground">Source</span><p className="font-medium">Jira Sync</p></div>
                <div><span className="text-muted-foreground">Jira Key</span><p className="font-medium">{defect.jira_key}</p></div>
                <div><span className="text-muted-foreground">Assignee</span><p className="font-medium">{defect.jira_assignee_name ?? '—'}</p></div>
                <div><span className="text-muted-foreground">Reporter</span><p className="font-medium">{defect.jira_reporter_name ?? '—'}</p></div>
                <div><span className="text-muted-foreground">Environment</span><p className="font-medium">{defect.environment ?? '—'}</p></div>
              </>
            ) : defect.source_test_run_id ? (
              <>
                <div><span className="text-muted-foreground">Source</span><p className="font-medium">Execution</p></div>
                {defect.source_test_case_id && (
                  <div><span className="text-muted-foreground">Test Case</span><p className="font-medium"><a href={`/testhub/repository?case=${defect.source_test_case_id}`} style={{ color: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))' }}>View Test Case</a></p></div>
                )}
                <div><span className="text-muted-foreground">Test Run</span><p className="font-medium"><a href={`/testhub/execution/${defect.source_test_run_id}`} style={{ color: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))' }}>View Execution</a></p></div>
                <div><span className="text-muted-foreground">Environment</span><p className="font-medium">{defect.environment ?? '—'}</p></div>
              </>
            ) : (
              <>
                <div><span className="text-muted-foreground">Source</span><p className="font-medium">Raised manually</p></div>
                <div><span className="text-muted-foreground">Environment</span><p className="font-medium">{defect.environment ?? '—'}</p></div>
                <div><span className="text-muted-foreground">Component</span><p className="font-medium">{defect.component ?? '—'}</p></div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Component</span><span>{defect.component || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Environment</span><span>{defect.environment || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Affected Version</span><span>{defect.affected_version || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Fixed Version</span><span>{defect.fixed_version || '—'}</span></div>
            {defect.due_date && <div className="flex justify-between"><span className="text-muted-foreground">Due Date</span><span>{format(new Date(defect.due_date), 'MMM d, yyyy')}</span></div>}
            {defect.resolution && <div className="flex justify-between"><span className="text-muted-foreground">Resolution</span><span className="capitalize">{defect.resolution.replace('_', ' ')}</span></div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">People</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Reported by</p>
              {defect.reporter && (
                <div className="flex items-center gap-2">
                  <Avatar src={defect.reporter.avatar_url || undefined} name={defect.reporter.full_name} size="xsmall" />
                  <span>{defect.reporter.full_name}</span>
                </div>
              )}
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Assigned to</p>
              {defect.assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar src={defect.assignee.avatar_url || undefined} name={defect.assignee.full_name} size="xsmall" />
                  <span>{defect.assignee.full_name}</span>
                </div>
              ) : <span className="text-muted-foreground">Unassigned</span>}
            </div>
            <div className="pt-2 border-t space-y-1">
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Created</span><span>{format(new Date(defect.created_at), 'MMM d, yyyy')}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Updated</span><span>{formatDistanceToNow(new Date(defect.updated_at), { addSuffix: true })}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description — mode-aware */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Description</CardTitle></CardHeader>
        <CardContent>
          {defect.source_test_run_id ? (
            <div style={{ background: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F8FAFC))', border: '1px solid #E2E8F0', borderRadius: 6, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))' }}>
                  Execution Evidence
                </span>
                <span style={{ fontSize: 10, background: 'var(--ds-background-selected, var(--ds-background-selected, #EFF6FF))', color: 'var(--ds-background-brand-bold-hovered, var(--ds-background-brand-bold-hovered, #1D4ED8))', padding: '1px 5px', borderRadius: 3, fontWeight: 600 }}>
                  READ ONLY
                </span>
              </div>
              <p style={{ fontSize: 13, color: '#374151', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {defect.description || 'No execution description recorded.'}
              </p>
            </div>
          ) : defect.jira_source ? (
            <div style={{ background: 'var(--ds-surface-sunken, var(--ds-surface-sunken, #F8FAFC))', border: '1px solid #E2E8F0', borderRadius: 6, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))' }}>
                  Jira Description
                </span>
                <span style={{ fontSize: 10, background: '#F0FDF4', color: '#166534', padding: '1px 5px', borderRadius: 3, fontWeight: 600 }}>
                  READ ONLY
                </span>
              </div>
              <p style={{ fontSize: 13, color: '#374151', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {defect.description || 'No description synced from Jira.'}
              </p>
            </div>
          ) : (
            defect.description ? (
              <p className="text-sm whitespace-pre-wrap">{defect.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No description provided</p>
            )
          )}
        </CardContent>
      </Card>

      {/* Steps to Reproduce */}
      {defect.steps_to_reproduce && (
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Steps to Reproduce</CardTitle></CardHeader>
          <CardContent><pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-4 rounded-lg">{defect.steps_to_reproduce}</pre></CardContent>
        </Card>
      )}

      {/* Expected / Actual */}
      {(defect.expected_result || defect.actual_result) && (
        <div className="grid grid-cols-2 gap-4">
          {defect.expected_result && (
            <Card className="border-l-4 border-l-green-500"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-600">Expected Result</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{defect.expected_result}</p></CardContent>
            </Card>
          )}
          {defect.actual_result && (
            <Card className="border-l-4 border-l-red-500"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-600">Actual Result</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{defect.actual_result}</p></CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Execution origin banner */}
      {executionRunId && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <Play className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-sm text-muted-foreground">Created from execution run</span>
          <Button variant="outline" size="sm" onClick={() => navigate(`/testhub/execution/${executionRunId}`)}>
            View Execution
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="comments">
        <TabsList>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
          <TabsTrigger value="links">Linked Items</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="comments" className="mt-4"><EntityCommentsPanel entityType="defect" entityId={defect.id} /></TabsContent>
        <TabsContent value="attachments" className="mt-4"><DefectAttachments defectId={defect.id} /></TabsContent>
        <TabsContent value="links" className="mt-4"><DefectLinks defectId={defect.id} onAddLink={() => setShowAddLink(true)} /></TabsContent>
        <TabsContent value="history" className="mt-4"><DefectHistory defectId={defect.id} /></TabsContent>
      </Tabs>

      {/* Modals */}
      <StatusChangeModal open={showStatusModal} onClose={() => setShowStatusModal(false)} defectId={defect.id} currentStatus={defect.status} />
      {showEditModal && <EditDefectModalG25 open={showEditModal} onClose={() => setShowEditModal(false)} defect={defect} />}
      {showAddLink && <AddLinkModal open={showAddLink} onClose={() => setShowAddLink(false)} defectId={defect.id} projectId={defect.project_id} />}
    </div>
  );
}
