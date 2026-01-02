/**
 * TEST SETS PAGE
 * Manage test sets (reusable groups of test cases)
 */

import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Package,
  AlertCircle,
  MoreHorizontal,
  Archive,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TestsEmptyState } from '../components/TestsEmptyState';

export function TestsSetsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [newSetDescription, setNewSetDescription] = useState('');

  // Fetch test sets for this project
  const { data: testSets, isLoading, error } = useQuery({
    queryKey: ['project-test-sets', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('test_sets')
        .select(`
          *,
          test_set_cases(id),
          created_by_user:profiles!test_sets_created_by_fkey(id, full_name)
        `)
        .eq('project_id', projectId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Create set mutation
  const createSetMutation = useMutation({
    mutationFn: async () => {
      if (!user || !projectId || !newSetName.trim()) {
        throw new Error('Missing required fields');
      }

      // Generate key - query raw to avoid TS issues
      const { data: existing } = await supabase
        .from('test_sets')
        .select('key')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1);

      const lastKey = (existing?.[0] as any)?.key;
      const lastNum = lastKey?.match(/SET-(\d+)/)?.[1];
      const nextNum = lastNum ? parseInt(lastNum) + 1 : 1;
      const setKey = `SET-${nextNum.toString().padStart(3, '0')}`;

      const { data, error } = await supabase
        .from('test_sets')
        .insert({
          key: setKey,
          name: newSetName.trim(),
          description: newSetDescription.trim() || null,
          project_id: projectId,
          status: 'active',
          created_by: user.id,
        } as any)
        .select()
        .single();

      if (error) throw error;

      await supabase.from('test_activity_log').insert({
        user_id: user.id,
        activity_type: 'created',
        entity_type: 'test_set',
        entity_id: data.id,
        entity_title: data.name,
        description: `Created test set "${data.name}"`,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-test-sets', projectId] });
      toast.success('Test set created');
      setCreateModalOpen(false);
      setNewSetName('');
      setNewSetDescription('');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Archive set mutation
  const archiveSetMutation = useMutation({
    mutationFn: async (setId: string) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('test_sets')
        .update({ status: 'archived' })
        .eq('id', setId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-test-sets', projectId] });
      toast.success('Test set archived');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const filteredSets = useMemo(() => {
    if (!testSets) return [];
    if (!searchQuery) return testSets;
    
    const q = searchQuery.toLowerCase();
    return testSets.filter((set: any) =>
      set.name?.toLowerCase().includes(q) ||
      set.key?.toLowerCase().includes(q) ||
      set.description?.toLowerCase().includes(q)
    );
  }, [testSets, searchQuery]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load test sets: {(error as Error).message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <Input
              placeholder="Search test sets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-surface-2 border-border-default"
            />
          </div>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Create Test Set
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : filteredSets.length === 0 ? (
        searchQuery ? (
          <Card className="bg-surface-2 border-border-default p-8 text-center">
            <Package className="h-12 w-12 mx-auto text-text-tertiary mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">No Matching Sets</h3>
            <p className="text-text-secondary">
              No test sets match "{searchQuery}". Try a different search.
            </p>
          </Card>
        ) : (
          <TestsEmptyState 
            type="sets" 
            onPrimaryAction={() => setCreateModalOpen(true)} 
          />
        )
      ) : (
        <div className="grid gap-3">
          {filteredSets.map((set: any) => (
            <Card 
              key={set.id} 
              className="bg-surface-2 border-border-default p-4 hover:bg-surface-hover transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-surface-3 rounded-lg">
                    <Package className="h-5 w-5 text-accent-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {set.key}
                      </Badge>
                      <h3 className="font-medium text-text-primary">{set.name}</h3>
                    </div>
                    <p className="text-sm text-text-tertiary">
                      {set.test_set_cases?.length || 0} test cases
                      {set.description && ` • ${set.description.slice(0, 50)}${set.description.length > 50 ? '...' : ''}`}
                    </p>
                    <p className="text-xs text-text-quaternary mt-1">
                      Created {format(new Date(set.created_at), 'MMM d, yyyy')}
                      {set.created_by_user && ` by ${set.created_by_user.full_name}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/projects/${projectId}/tests/cases?setId=${set.id}`}>
                    <Button variant="outline" size="sm" className="gap-1">
                      View Cases
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-surface-1 border-border-default">
                      <DropdownMenuItem 
                        className="text-status-error"
                        onClick={() => archiveSetMutation.mutate(set.id)}
                        disabled={archiveSetMutation.isPending}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="bg-surface-1 border-border-default">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-text-primary">
              <Package className="h-5 w-5 text-accent-primary" />
              Create Test Set
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-text-primary">
                Set Name <span className="text-status-error">*</span>
              </Label>
              <Input
                id="name"
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
                placeholder="e.g., Login Tests, Checkout Flow"
                className="bg-surface-2 border-border-default"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-text-primary">
                Description
              </Label>
              <Textarea
                id="description"
                value={newSetDescription}
                onChange={(e) => setNewSetDescription(e.target.value)}
                placeholder="Describe the purpose of this test set..."
                className="bg-surface-2 border-border-default min-h-[80px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateModalOpen(false)}
              disabled={createSetMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createSetMutation.mutate()}
              disabled={!newSetName.trim() || createSetMutation.isPending}
            >
              {createSetMutation.isPending ? 'Creating...' : 'Create Set'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TestsSetsPage;
