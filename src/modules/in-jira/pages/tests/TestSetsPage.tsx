/**
 * Test Sets Page - Full CRUD with Smart Sets
 */

import React, { useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { 
  Plus, Search, Filter, MoreHorizontal, Folder, PlayCircle, FileText, Zap, Archive, Trash2, Copy, Edit2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTestSets, TestSetWithCount } from '../../hooks/useTestSets';
import { CreateTestSetModal } from '../../components/tests/CreateTestSetModal';
import { TestSetDrawer } from '../../components/tests/TestSetDrawer';

export function TestSetsPage() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const [searchParams] = useSearchParams();
  const programId = searchParams.get('programId');

  const {
    testSets, isLoading, canCreate, canEdit, canDelete,
    createTestSet, updateTestSet, deleteTestSet, addCasesToSet,
    isCreating, isUpdating,
  } = useTestSets(programId);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSet, setSelectedSet] = useState<TestSetWithCount | null>(null);

  const filteredSets = useMemo(() => {
    return testSets.filter(set => {
      if (searchQuery && !set.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (statusFilter !== 'all' && set.status !== statusFilter) return false;
      if (typeFilter === 'smart' && !set.is_smart_set) return false;
      if (typeFilter === 'manual' && set.is_smart_set) return false;
      return true;
    });
  }, [testSets, searchQuery, statusFilter, typeFilter]);

  const openDrawer = (set: TestSetWithCount) => {
    setSelectedSet(set);
    setDrawerOpen(true);
  };

  const handleClone = async (set: TestSetWithCount) => {
    await createTestSet({
      name: `${set.name} (Copy)`,
      description: set.description || undefined,
      objective: set.objective || undefined,
      program_id: set.program_id,
      is_smart_set: set.is_smart_set,
      smart_set_criteria: set.smart_set_criteria || undefined,
    });
  };

  return (
    <div className="h-full flex flex-col bg-surface-1">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-default">
        <div className="flex items-center gap-2 text-sm text-text-tertiary mb-2">
          <span>{projectKey}</span><span>/</span><span>Tests</span><span>/</span>
          <span className="text-text-primary font-medium">Test Sets</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-primary">Test Sets</h1>
          {canCreate && (
            <Button size="sm" onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Create Test Set
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-border-default flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-quaternary" />
          <Input placeholder="Search test sets..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="smart">Smart</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-40" />)}
          </div>
        ) : filteredSets.length === 0 ? (
          <div className="text-center py-16">
            <Folder className="h-12 w-12 mx-auto mb-3 text-text-quaternary" />
            <p className="text-text-secondary">No test sets found</p>
            {canCreate && (
              <Button className="mt-4" onClick={() => setCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />Create First Set
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSets.map(set => (
              <Card key={set.id} className="bg-surface-2 border-border-default hover:border-border-hover transition-colors cursor-pointer" onClick={() => openDrawer(set)}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Folder className="h-5 w-5 text-accent-primary" />
                      <CardTitle className="text-base font-medium text-text-primary">{set.name}</CardTitle>
                      {set.is_smart_set && <Badge variant="outline" className="text-status-warning border-status-warning"><Zap className="h-3 w-3 mr-0.5" />Smart</Badge>}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); openDrawer(set); }}>View Details</DropdownMenuItem>
                        {canEdit && <DropdownMenuItem onClick={e => { e.stopPropagation(); openDrawer(set); }}><Edit2 className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>}
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); handleClone(set); }}><Copy className="h-4 w-4 mr-2" />Clone</DropdownMenuItem>
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); toast.success('Execute coming soon'); }}><PlayCircle className="h-4 w-4 mr-2" />Execute</DropdownMenuItem>
                        {canDelete && <><DropdownMenuSeparator /><DropdownMenuItem className="text-status-error" onClick={e => { e.stopPropagation(); deleteTestSet(set.id); }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-sm text-text-tertiary mt-1 line-clamp-2">{set.description || set.objective || 'No description'}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5 text-text-secondary"><FileText className="h-4 w-4" />{set.case_count} cases</div>
                      {set.status === 'archived' && <Badge variant="secondary">Archived</Badge>}
                    </div>
                    <Button variant="ghost" size="sm" className="text-accent-primary" onClick={e => { e.stopPropagation(); toast.success('Execute coming soon'); }}>
                      <PlayCircle className="h-4 w-4 mr-1.5" />Execute
                    </Button>
                  </div>
                  <p className="text-xs text-text-quaternary mt-2">Created {format(new Date(set.created_at), 'MMM d, yyyy')}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateTestSetModal open={createModalOpen} onOpenChange={setCreateModalOpen} programId={programId || ''} onSubmit={async (input) => { await createTestSet(input); }} isSubmitting={isCreating} />
      <TestSetDrawer open={drawerOpen} onOpenChange={setDrawerOpen} testSet={selectedSet} onUpdate={async (input) => { await updateTestSet(input); }} onDelete={async (id) => { await deleteTestSet(id); }} onAddCases={async (setId, caseIds) => { await addCasesToSet({ setId, caseIds }); }} isUpdating={isUpdating} canEdit={canEdit} canDelete={canDelete} />
    </div>
  );
}

export default TestSetsPage;
