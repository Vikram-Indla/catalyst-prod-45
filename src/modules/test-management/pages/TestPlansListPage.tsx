/**
 * TestPlansListPage - Main list view for test plans
 * Catalyst V5 design tokens
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, LayoutList, LayoutGrid } from 'lucide-react';
import { useTestPlans, useDeleteTestPlan, useTransitionPlanStatus, useCloneTestPlan } from '../hooks/useTestPlans';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { TestPlansTable } from '../components/plans/TestPlansTable';
import { CreateTestPlanDialog } from '../components/plans/CreateTestPlanDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { TestPlanStatus, TestPlanFilters, TestPlanWithStats } from '../types/testPlans';
import { toast } from 'sonner';

export function TestPlansListPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<TestPlanFilters>({});
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<TestPlanWithStats | null>(null);
  
  // Clone dialog state
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [planToClone, setPlanToClone] = useState<TestPlanWithStats | null>(null);
  const [cloneName, setCloneName] = useState('');

  const { data: plans, isLoading } = useTestPlans({
    ...filters,
    search: search || undefined,
  });
  
  // Fetch releases for filter dropdown
  const { data: releases } = useQuery({
    queryKey: ['releases-dropdown'],
    queryFn: async () => {
      const { data } = await supabase.from('releases').select('id, name').order('name');
      return data || [];
    },
  });
  const deletePlanMutation = useDeleteTestPlan();
  const transitionMutation = useTransitionPlanStatus();
  const cloneMutation = useCloneTestPlan();

  const handleStatusChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      status: value === 'all' ? undefined : value as TestPlanStatus,
    }));
  };

  const handleReleaseChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      release_id: value === 'all' ? undefined : value,
    }));
  };

  const handlePlanClick = (plan: TestPlanWithStats) => {
    navigate(`/tests/plans/${plan.id}`);
  };

  const handleEdit = (plan: TestPlanWithStats) => {
    navigate(`/tests/plans/${plan.id}?edit=true`);
  };

  const handleClone = (plan: TestPlanWithStats) => {
    setPlanToClone(plan);
    setCloneName(`${plan.name} (Copy)`);
    setCloneDialogOpen(true);
  };

  const handleConfirmClone = async () => {
    if (!planToClone || !cloneName.trim()) return;
    try {
      const newPlan = await cloneMutation.mutateAsync({ planId: planToClone.id, newName: cloneName });
      setCloneDialogOpen(false);
      setPlanToClone(null);
      setCloneName('');
      navigate(`/tests/plans/${newPlan.id}`);
    } catch {
      // Error handled by mutation
    }
  };

  const handleDelete = (plan: TestPlanWithStats) => {
    setPlanToDelete(plan);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!planToDelete) return;
    try {
      await deletePlanMutation.mutateAsync(planToDelete.id);
      setDeleteDialogOpen(false);
      setPlanToDelete(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleStart = async (plan: TestPlanWithStats) => {
    try {
      await transitionMutation.mutateAsync({ planId: plan.id, newStatus: 'active' });
      toast.success(`Plan "${plan.name}" is now active`);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Test Plans</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize and track test execution cycles
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Plan
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="bg-card rounded-xl border border-border p-4 mb-4 shadow-sm">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search plans by name or key..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <Select onValueChange={handleStatusChange} defaultValue="all">
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="executing">Executing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          {/* Release Filter */}
          <Select onValueChange={handleReleaseChange} defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Releases" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Releases</SelectItem>
              {releases?.map((release) => (
                <SelectItem key={release.id} value={release.id}>
                  {release.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1" />

          {/* View Toggle */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 border-l border-border transition-colors ${
                viewMode === 'grid'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <TestPlansTable
        plans={plans || []}
        isLoading={isLoading}
        onPlanClick={handlePlanClick}
        onEdit={handleEdit}
        onClone={handleClone}
        onDelete={handleDelete}
        onStart={handleStart}
      />

      {/* Create Dialog */}
      <CreateTestPlanDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{planToDelete?.name}"? This will remove all linked test cases and executions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePlanMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clone Dialog */}
      <Dialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Test Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clone-name">New Plan Name</Label>
              <Input
                id="clone-name"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                placeholder="Enter name for cloned plan"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              This will create a copy of "{planToClone?.name}" including all linked test cases.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCloneDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmClone}
              disabled={!cloneName.trim() || cloneMutation.isPending}
            >
              {cloneMutation.isPending ? 'Cloning...' : 'Clone Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TestPlansListPage;
