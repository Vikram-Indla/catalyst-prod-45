/**
 * G22: Test Sets List Page
 * Route: /testhub/test-sets
 */

import { useState } from 'react';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { Plus, Layers, MoreHorizontal, Play, RefreshCw, Zap, TestTubes, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Lozenge } from '@/components/ads';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search } from 'lucide-react';
import { useTestSets, useDeleteTestSet, useRefreshDynamicSet, useCloneTestSet, useArchiveTestSet } from '@/hooks/useTestSets';
import { useProjectContext } from '@/hooks/useProjectContext';

const DEFAULT_PROJECT_ID = '00000000-0000-0000-0000-000000000001';
import { SetTypeBadge } from '@/components/test-sets/SetTypeBadge';
import { CreateTestSetModal } from '@/components/test-sets/CreateTestSetModal';
import { RefreshConfirmDialog } from '@/components/test-sets/RefreshConfirmDialog';
import { AddToCycleModal } from '@/components/test-sets/AddToCycleModal';
import { CreateTestCycleModal } from '@/components/testhub/CreateTestCycleModal';
import { TestSet, TestSetFilters, TEST_SET_TYPE_CONFIG } from '@/types/test-sets';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function TestSetsPage() {
  const { projectId: ctxProjectId } = useProjectContext();
  const projectId = ctxProjectId || DEFAULT_PROJECT_ID;
  const navigate = useNavigate();
  const [filters, setFilters] = useState<TestSetFilters>({ search: '', type: 'all', status: 'active' });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<TestSet | null>(null);
  const [sortBy, setSortBy] = useState<'created' | 'updated' | 'name' | 'count'>('updated');
  const [membershipWarningSet, setMembershipWarningSet] = useState<TestSet | null>(null);
  const [refreshingSet, setRefreshingSet] = useState<TestSet | null>(null);
  const [addToCycleSet, setAddToCycleSet] = useState<TestSet | null>(null);
  const [deletingSet, setDeletingSet] = useState<TestSet | null>(null);
  const [isCreateCycleOpen, setIsCreateCycleOpen] = useState(false);

  const { data: testSets, isLoading } = useTestSets(projectId, filters);
  const deleteMutation = useDeleteTestSet();
  const refreshMutation = useRefreshDynamicSet();
  const cloneMutation = useCloneTestSet();
  const archiveMutation = useArchiveTestSet();
  

  const handleEdit = (set: TestSet) => { setEditingSet(set); setIsCreateOpen(true); };
  const handleClose = () => { setIsCreateOpen(false); setEditingSet(null); };

  const sortedSets = (testSets || []).sort((a, b) => {
    switch(sortBy) {
      case 'name': return a.name.localeCompare(b.name);
      case 'count': return b.test_count - a.test_count;
      case 'created': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'updated': default: return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    }
  });

  return (
    <div className="flex-1 p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Layers className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CatalystPageHeader title="Test Sets" />
          </div>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Create Test Set
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search test sets..." value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} className="pl-9 h-9" />
        </div>
        <Select value={filters.type} onValueChange={v => setFilters({ ...filters, type: v as any })}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(TEST_SET_TYPE_CONFIG).map(([k, c]) => <SelectItem key={k} value={k}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.status} onValueChange={v => setFilters({ ...filters, status: v as any })}>
          <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Sort by" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">Last Updated</SelectItem>
            <SelectItem value="created">Created Date</SelectItem>
            <SelectItem value="name">Name (A-Z)</SelectItem>
            <SelectItem value="count">Test Count</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">{testSets?.length || 0} test sets</span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : !testSets?.length ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <Layers className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2 text-foreground">No test sets found</h3>
          <p className="text-muted-foreground mb-4">Create your first test set to organize test cases</p>
          <Button onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Test Set</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedSets.map(set => (
            <Card key={set.id} className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30" onClick={() => navigate(`/testhub/test-sets/${set.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{set.set_key}</span>
                    {set.membership_type === 'dynamic' && (
                      <Lozenge appearance="inprogress">Dynamic</Lozenge>
                    )}
                  </div>
                  <SetTypeBadge type={set.set_type} size="sm" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{set.name}</h3>
                {set.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{set.description}</p>}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <span><Layers className="h-3 w-3 inline mr-1" />{set.test_count} tests</span>
                  <span>·</span>
                  <span>{set.owner?.full_name || 'Unassigned'}</span>
                  <span>·</span>
                  <span>{formatDistanceToNow(new Date(set.updated_at), { addSuffix: true })}</span>
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <button onClick={() => navigate(`/testhub/test-sets/${set.id}`)} className="flex-1 h-9 px-3 rounded-md border border-border hover:bg-muted transition-colors flex items-center justify-center gap-1 text-sm">
                    <Play className="h-4 w-4" />View
                  </button>
                  <button onClick={() => setAddToCycleSet(set)} 
                    className="h-9 px-3 rounded-md border border-border hover:bg-muted transition-colors flex items-center justify-center gap-1 text-sm" 
                    title="Add to existing cycle">
                    <TestTubes className="h-4 w-4" />
                  </button>
                  {set.membership_type === 'dynamic' && (
                    <button onClick={() => setRefreshingSet(set)} className="h-9 px-3 rounded-md border border-border hover:bg-muted transition-colors flex items-center justify-center">
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><button className="h-9 px-2 rounded-md border border-border hover:bg-muted transition-colors flex items-center"><MoreHorizontal className="h-4 w-4" /></button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(set)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => cloneMutation.mutate({ setId: set.id })}>Clone</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsCreateCycleOpen(true)}>Create New Cycle</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => archiveMutation.mutate({ setId: set.id, archive: set.is_active })}>
                        {set.is_active ? 'Archive' : 'Restore'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeletingSet(set)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateTestSetModal open={isCreateOpen} onClose={handleClose} editingSet={editingSet} projectId={projectId} />
      
      {/* Refresh Confirmation Dialog */}
      {refreshingSet && (
        <RefreshConfirmDialog
          open={!!refreshingSet}
          onClose={() => setRefreshingSet(null)}
          onConfirm={() => {
            refreshMutation.mutate(refreshingSet.id);
            setRefreshingSet(null);
          }}
          testSet={refreshingSet}
          isLoading={refreshMutation.isPending}
        />
      )}

      {/* Add to Cycle Modal */}
      {addToCycleSet && (
        <AddToCycleModal
          open={!!addToCycleSet}
          onClose={() => setAddToCycleSet(null)}
          testSet={addToCycleSet}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingSet} onOpenChange={() => setDeletingSet(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-destructive" />Delete Test Set?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingSet?.name}</strong>? This will remove the set and all {deletingSet?.test_count || 0} test case associations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deletingSet) { deleteMutation.mutate(deletingSet.id); setDeletingSet(null); } }}>Delete</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Membership Type Warning Dialog */}
      <AlertDialog open={!!membershipWarningSet} onOpenChange={() => setMembershipWarningSet(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-destructive" />Change Membership Type?</AlertDialogTitle>
            <AlertDialogDescription>
              Changing from {membershipWarningSet?.membership_type === 'static' ? 'static to dynamic' : 'dynamic to static'} will affect how test cases are managed. 
              {membershipWarningSet?.membership_type === 'dynamic' && ' Existing cases will remain, but dynamic criteria will be lost.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { membershipWarningSet && handleEdit(membershipWarningSet); setMembershipWarningSet(null); }}>Continue</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      {/* Create Cycle Modal */}
      <CreateTestCycleModal
        isOpen={isCreateCycleOpen}
        onClose={() => setIsCreateCycleOpen(false)}
        onSuccess={() => setIsCreateCycleOpen(false)}
      />
    </div>
  );
}
