/**
 * Smart Assignment Hook
 * Uses real profiles from database instead of mock data
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import {
  DEFAULT_WEIGHTS,
  distributeTests,
  calculateDistributionScore,
  normalizeWeights,
} from '@/lib/assignment-algorithm';
import type {
  AssignmentWeights,
  Assignment,
  SmartAssignmentTeamMember,
  TestCaseForAssignment,
  CycleContext,
  DistributionSummary,
} from '@/types/smart-assignment.types';

export function useSmartAssignment(cycleId: string, testCaseIds: string[]) {
  const [weights, setWeights] = useState<AssignmentWeights>(DEFAULT_WEIGHTS);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [hasManualAdjustments, setHasManualAdjustments] = useState(false);

  const context: CycleContext = useMemo(() => ({
    cycleId,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    remainingDays: 10,
  }), [cycleId]);

  // Fetch real team members from profiles
  const { data: team = [] } = useQuery({
    queryKey: ['smart-assignment-team', cycleId],
    queryFn: async (): Promise<SmartAssignmentTeamMember[]> => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .order('full_name');
      
      if (error || !profiles || profiles.length === 0) return [];

      // Get workload counts from tm_cycle_scope
      const { data: workloadData } = await typedQuery('tm_cycle_scope')
        .select('assigned_to');

      const workloadMap: Record<string, number> = {};
      if (workloadData) {
        for (const row of workloadData as any[]) {
          if (row.assigned_to) {
            workloadMap[row.assigned_to] = (workloadMap[row.assigned_to] || 0) + 1;
          }
        }
      }

      return profiles.map((p) => {
        const initials = (p.full_name || 'U')
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        return {
          id: p.id,
          name: p.full_name || 'Unknown',
          initials,
          avatarColor: '#2563EB',
          currentAssignments: workloadMap[p.id] || 0,
          dailyCapacity: 5,
          skills: {},
          availability: [],
        };
      });
    },
  });

  // Get tests to assign from tm_cycle_scope
  const { data: tests = [] } = useQuery({
    queryKey: ['smart-assignment-tests', cycleId, testCaseIds],
    queryFn: async (): Promise<TestCaseForAssignment[]> => {
      const { data, error } = await typedQuery('tm_cycle_scope')
        .select('id, test_case_id, test_case:tm_test_cases(id, case_key, title, priority_id, priority:tm_case_priorities(id, name, color))')
        .eq('cycle_id', cycleId);
      
      if (error || !data) return [];

      return (data as any[])
        .filter((d: any) => testCaseIds.length === 0 || testCaseIds.includes(d.test_case_id))
        .map((d: any) => ({
          id: d.id,
          testCaseId: d.test_case?.case_key || d.test_case_id,
          title: d.test_case?.title || 'Unknown',
          module: 'General',
          priority: d.test_case?.priority?.name || 'Medium',
          estimatedDuration: 15,
        }));
    },
  });

  // Calculate assignments
  const calculate = useCallback(async () => {
    setIsCalculating(true);
    setHasManualAdjustments(false);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      const result = distributeTests(tests, team, weights, context);
      setAssignments(result);
    } finally {
      setIsCalculating(false);
    }
  }, [tests, team, weights, context]);

  useEffect(() => {
    if (tests.length > 0 && team.length > 0) {
      calculate();
    }
  }, [weights, calculate, tests.length, team.length]);

  const adjustAssignment = useCallback((testId: string, newAssigneeId: string) => {
    setAssignments(prev => prev.map(a =>
      a.testCaseId === testId
        ? { ...a, assigneeId: newAssigneeId, adjusted: true }
        : a
    ));
    setHasManualAdjustments(true);
  }, []);

  const moveTest = useCallback((testId: string, fromMemberId: string, toMemberId: string) => {
    adjustAssignment(testId, toMemberId);
  }, [adjustAssignment]);

  const distributionSummary = useMemo((): DistributionSummary[] => {
    return team.map(member => {
      const memberAssignments = assignments.filter(a => a.assigneeId === member.id);
      const memberTests = memberAssignments.map(a => 
        tests.find(t => t.id === a.testCaseId)!
      ).filter(Boolean);
      
      const maxCapacity = member.dailyCapacity * context.remainingDays;
      const totalCount = member.currentAssignments + memberAssignments.length;
      
      return {
        memberId: member.id,
        memberName: member.name,
        currentCount: member.currentAssignments,
        proposedCount: memberAssignments.length,
        totalCount,
        maxCapacity,
        isOverloaded: totalCount > maxCapacity,
        tests: memberTests,
      };
    });
  }, [team, assignments, tests, context.remainingDays]);

  const distributionScore = useMemo(() => {
    return calculateDistributionScore(assignments, team);
  }, [assignments, team]);

  const updateWeight = useCallback((key: keyof AssignmentWeights, value: number) => {
    setWeights(prev => {
      const newWeights = { ...prev, [key]: value };
      return normalizeWeights(newWeights);
    });
  }, []);

  const applyPreset = useCallback((preset: AssignmentWeights) => {
    setWeights(normalizeWeights(preset));
  }, []);

  return {
    team,
    tests,
    assignments,
    weights,
    setWeights: applyPreset,
    updateWeight,
    adjustAssignment,
    moveTest,
    calculate,
    isCalculating,
    hasManualAdjustments,
    distributionScore,
    distributionSummary,
    context,
  };
}