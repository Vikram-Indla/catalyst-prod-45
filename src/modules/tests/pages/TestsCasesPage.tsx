/**
 * TEST CASES PAGE
 * Full CRUD table for test cases
 */

import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter,
  ListChecks,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useProjectContext } from '@/hooks/useProjectContext';
import { useProjectTestCases } from '@/hooks/useProjectTestMetrics';
import { CreateTestCaseModal } from '@/modules/in-jira/components/tests/CreateTestCaseModal';
import { TestCaseDrawer } from '@/modules/in-jira/components/tests/TestCaseDrawer';

export function TestsCasesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { programId } = useProjectContext();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState<any>(null);

  const {
    testCases,
    isLoading,
    error,
    createTestCase,
    isCreating,
  } = useProjectTestCases(projectId || '');

  const filteredCases = useMemo(() => {
    if (!searchQuery) return testCases;
    const q = searchQuery.toLowerCase();
    return testCases.filter(tc =>
      tc.title?.toLowerCase().includes(q) ||
      tc.description?.toLowerCase().includes(q) ||
      tc.component?.toLowerCase().includes(q)
    );
  }, [testCases, searchQuery]);

  const handleRowClick = (tc: any) => {
    setSelectedTestCase(tc);
    setDrawerOpen(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-status-error bg-status-error/10';
      case 'high': return 'text-status-warning bg-status-warning/10';
      case 'medium': return 'text-accent-primary bg-accent-subtle';
      case 'low': return 'text-text-tertiary bg-surface-3';
      default: return 'text-text-tertiary bg-surface-3';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'text-status-success bg-status-success/10';
      case 'approved': return 'text-accent-primary bg-accent-subtle';
      case 'under_review': return 'text-status-warning bg-status-warning/10';
      case 'draft': return 'text-text-tertiary bg-surface-3';
      case 'deprecated': return 'text-status-error bg-status-error/10';
      default: return 'text-text-tertiary bg-surface-3';
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load test cases: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <Input
              placeholder="Search test cases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-surface-2 border-border-default"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Create Test Case
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : filteredCases.length === 0 ? (
        <Card className="bg-surface-2 border-border-default p-8 text-center">
          <ListChecks className="h-12 w-12 mx-auto text-text-tertiary mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">No Test Cases</h3>
          <p className="text-text-secondary mb-4">
            {searchQuery ? 'No test cases match your search.' : 'Create your first test case to get started.'}
          </p>
          {!searchQuery && (
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Create Test Case
            </Button>
          )}
        </Card>
      ) : (
        <div className="border border-border-default rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-2 border-b border-border-default">
              <tr className="text-left text-xs text-text-tertiary uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium w-24">Priority</th>
                <th className="px-4 py-3 font-medium w-28">Status</th>
                <th className="px-4 py-3 font-medium w-24">Type</th>
                <th className="px-4 py-3 font-medium w-32">Component</th>
                <th className="px-4 py-3 font-medium w-28">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {filteredCases.map(tc => (
                <tr
                  key={tc.id}
                  onClick={() => handleRowClick(tc)}
                  className="hover:bg-surface-hover cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-text-primary truncate max-w-[300px]">
                      {tc.title}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={cn('capitalize text-xs', getPriorityColor(tc.priority))}>
                      {tc.priority}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={cn('text-xs', getStatusColor(tc.status))}>
                      {tc.status?.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary capitalize">
                    {tc.test_type}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary truncate max-w-[120px]">
                    {tc.component || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-tertiary">
                    {tc.created_at ? format(new Date(tc.created_at), 'MMM d, yyyy') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <CreateTestCaseModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        projectId={projectId || ''}
        programId={programId || ''}
        onSubmit={async (data) => {
          await createTestCase({
            title: data.title,
            description: data.description,
            preconditions: data.preconditions,
            test_type: data.test_type,
            priority: data.priority,
            status: data.status,
            linked_work_item_id: data.linked_work_item_id,
            component: data.component,
            objective: data.objective,
          });
        }}
        isSubmitting={isCreating}
      />

    </div>
  );
}
