/**
 * Goals & Key Results — TanStack Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { goalsService } from '@/services/goalsService';
import type { Goal, KeyResult, CreateGoalInput, CreateKRInput, CreateCheckinInput } from '@/types/goals';

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: goalsService.getGoals,
  });
}

export function useAllKeyResults() {
  return useQuery({
    queryKey: ['all-key-results'],
    queryFn: goalsService.getAllKeyResults,
  });
}

export function useKeyResults(goalId: string) {
  return useQuery({
    queryKey: ['key-results', goalId],
    queryFn: () => goalsService.getKeyResults(goalId),
    enabled: !!goalId,
  });
}

export function useCheckins(krId: string) {
  return useQuery({
    queryKey: ['checkins', krId],
    queryFn: () => goalsService.getCheckins(krId),
    enabled: !!krId,
  });
}

export function useThemes() {
  return useQuery({
    queryKey: ['themes'],
    queryFn: goalsService.getThemes,
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGoalInput) => goalsService.createGoal(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Goal> }) =>
      goalsService.updateGoal(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goalsService.deleteGoal(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useCreateKR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateKRInput) => goalsService.createKR(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-key-results'] });
      qc.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useUpdateKR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<KeyResult> }) =>
      goalsService.updateKR(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-key-results'] });
      qc.invalidateQueries({ queryKey: ['key-results'] });
    },
  });
}

export function useDeleteKR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goalsService.deleteKR(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-key-results'] });
      qc.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useCreateCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCheckinInput) => goalsService.createCheckin(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-key-results'] });
      qc.invalidateQueries({ queryKey: ['goals'] });
      qc.invalidateQueries({ queryKey: ['checkins'] });
      qc.invalidateQueries({ queryKey: ['goal-checkins'] });
    },
  });
}

// ── Goal-Request hooks (Fix 5) ──

export function useGoalInitiatives(goalId: string) {
  return useQuery({
    queryKey: ['goal-initiatives', goalId],
    queryFn: () => goalsService.getGoalInitiatives(goalId),
    enabled: !!goalId,
  });
}

export function useLinkInitiative() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, requestId }: { goalId: string; requestId: string }) =>
      goalsService.linkInitiative(goalId, requestId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goal-initiatives'] }),
  });
}

export function useUnlinkInitiative() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goalsService.unlinkInitiative(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goal-initiatives'] }),
  });
}

export function useSearchInitiatives(query: string) {
  return useQuery({
    queryKey: ['search-initiatives', query],
    queryFn: () => goalsService.searchInitiatives(query),
    enabled: query.length >= 2,
  });
}
