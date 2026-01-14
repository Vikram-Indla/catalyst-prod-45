/**
 * Smart Assignment Hook
 * Manages assignment calculation and state
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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

// Mock team data
const MOCK_TEAM: SmartAssignmentTeamMember[] = [
  {
    id: '1',
    name: 'Ahmed S.',
    initials: 'AS',
    avatarColor: '#2563eb',
    currentAssignments: 12,
    dailyCapacity: 5,
    skills: {
      'Authentication': { module: 'Authentication', level: 5, testsCompleted: 45, avgExecutionTimeMinutes: 12, passRate: 0.95 },
      'User Management': { module: 'User Management', level: 4, testsCompleted: 30, avgExecutionTimeMinutes: 15, passRate: 0.90 },
      'Dashboard': { module: 'Dashboard', level: 3, testsCompleted: 20, avgExecutionTimeMinutes: 18, passRate: 0.85 },
    },
    availability: [
      { date: '2024-01-15', availableHours: 8, isAvailable: true },
      { date: '2024-01-16', availableHours: 8, isAvailable: true },
      { date: '2024-01-17', availableHours: 4, isAvailable: true },
      { date: '2024-01-18', availableHours: 8, isAvailable: true },
      { date: '2024-01-19', availableHours: 0, isAvailable: false },
    ],
  },
  {
    id: '2',
    name: 'Sara M.',
    initials: 'SM',
    avatarColor: '#0d9488',
    currentAssignments: 8,
    dailyCapacity: 6,
    skills: {
      'Orders': { module: 'Orders', level: 5, testsCompleted: 55, avgExecutionTimeMinutes: 10, passRate: 0.92 },
      'Payments': { module: 'Payments', level: 5, testsCompleted: 40, avgExecutionTimeMinutes: 20, passRate: 0.88 },
      'Dashboard': { module: 'Dashboard', level: 4, testsCompleted: 25, avgExecutionTimeMinutes: 15, passRate: 0.90 },
    },
    availability: [
      { date: '2024-01-15', availableHours: 8, isAvailable: true },
      { date: '2024-01-16', availableHours: 8, isAvailable: true },
      { date: '2024-01-17', availableHours: 8, isAvailable: true },
      { date: '2024-01-18', availableHours: 8, isAvailable: true },
      { date: '2024-01-19', availableHours: 8, isAvailable: true },
    ],
  },
  {
    id: '3',
    name: 'Khalid A.',
    initials: 'KA',
    avatarColor: '#d97706',
    currentAssignments: 5,
    dailyCapacity: 4,
    skills: {
      'Reports': { module: 'Reports', level: 5, testsCompleted: 60, avgExecutionTimeMinutes: 8, passRate: 0.94 },
      'Dashboard': { module: 'Dashboard', level: 4, testsCompleted: 35, avgExecutionTimeMinutes: 12, passRate: 0.91 },
      'User Management': { module: 'User Management', level: 3, testsCompleted: 15, avgExecutionTimeMinutes: 20, passRate: 0.80 },
    },
    availability: [
      { date: '2024-01-15', availableHours: 8, isAvailable: true },
      { date: '2024-01-16', availableHours: 8, isAvailable: true },
      { date: '2024-01-17', availableHours: 8, isAvailable: true },
      { date: '2024-01-18', availableHours: 0, isAvailable: false },
      { date: '2024-01-19', availableHours: 8, isAvailable: true },
    ],
  },
  {
    id: '4',
    name: 'Fatima H.',
    initials: 'FH',
    avatarColor: '#ef4444',
    currentAssignments: 3,
    dailyCapacity: 5,
    skills: {
      'Authentication': { module: 'Authentication', level: 4, testsCompleted: 25, avgExecutionTimeMinutes: 14, passRate: 0.88 },
      'Orders': { module: 'Orders', level: 3, testsCompleted: 18, avgExecutionTimeMinutes: 22, passRate: 0.82 },
      'Payments': { module: 'Payments', level: 4, testsCompleted: 28, avgExecutionTimeMinutes: 18, passRate: 0.86 },
    },
    availability: [
      { date: '2024-01-15', availableHours: 8, isAvailable: true },
      { date: '2024-01-16', availableHours: 8, isAvailable: true },
      { date: '2024-01-17', availableHours: 8, isAvailable: true },
      { date: '2024-01-18', availableHours: 8, isAvailable: true },
      { date: '2024-01-19', availableHours: 8, isAvailable: true },
    ],
  },
];

// Mock test cases for assignment
const MOCK_TESTS: TestCaseForAssignment[] = [
  { id: '1', testCaseId: 'TC-001', title: 'User can login with valid credentials', module: 'Authentication', priority: 'critical', estimatedDuration: 15 },
  { id: '2', testCaseId: 'TC-002', title: 'User cannot login with invalid password', module: 'Authentication', priority: 'critical', estimatedDuration: 10 },
  { id: '3', testCaseId: 'TC-003', title: 'Password reset email is sent', module: 'Authentication', priority: 'high', estimatedDuration: 20 },
  { id: '4', testCaseId: 'TC-005', title: 'User profile displays correctly', module: 'User Management', priority: 'high', estimatedDuration: 10 },
  { id: '5', testCaseId: 'TC-006', title: 'User can update profile picture', module: 'User Management', priority: 'medium', estimatedDuration: 15 },
  { id: '6', testCaseId: 'TC-009', title: 'Dashboard loads within 2 seconds', module: 'Dashboard', priority: 'high', estimatedDuration: 15 },
  { id: '7', testCaseId: 'TC-010', title: 'Dashboard widgets refresh correctly', module: 'Dashboard', priority: 'medium', estimatedDuration: 10 },
  { id: '8', testCaseId: 'TC-012', title: 'Order can be created successfully', module: 'Orders', priority: 'critical', estimatedDuration: 25 },
  { id: '9', testCaseId: 'TC-013', title: 'Order status updates in real-time', module: 'Orders', priority: 'high', estimatedDuration: 30 },
  { id: '10', testCaseId: 'TC-015', title: 'Payment processing integration', module: 'Payments', priority: 'critical', estimatedDuration: 45 },
  { id: '11', testCaseId: 'TC-016', title: 'Refund is processed correctly', module: 'Payments', priority: 'high', estimatedDuration: 20 },
  { id: '12', testCaseId: 'TC-018', title: 'Report exports to PDF', module: 'Reports', priority: 'medium', estimatedDuration: 10 },
  { id: '13', testCaseId: 'TC-019', title: 'Report filters work correctly', module: 'Reports', priority: 'low', estimatedDuration: 15 },
  { id: '14', testCaseId: 'TC-020', title: 'Scheduled reports are sent', module: 'Reports', priority: 'medium', estimatedDuration: 30 },
];

export function useSmartAssignment(cycleId: string, testCaseIds: string[]) {
  const [weights, setWeights] = useState<AssignmentWeights>(DEFAULT_WEIGHTS);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [hasManualAdjustments, setHasManualAdjustments] = useState(false);

  // Mock cycle context
  const context: CycleContext = useMemo(() => ({
    cycleId,
    startDate: '2024-01-10',
    endDate: '2024-01-20',
    remainingDays: 5,
  }), [cycleId]);

  // Fetch team data
  const { data: team = MOCK_TEAM } = useQuery({
    queryKey: ['smart-assignment-team', cycleId],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      return MOCK_TEAM;
    },
  });

  // Get tests to assign
  const tests = useMemo(() => {
    if (testCaseIds.length > 0) {
      return MOCK_TESTS.filter(t => testCaseIds.includes(t.id));
    }
    return MOCK_TESTS;
  }, [testCaseIds]);

  // Calculate assignments
  const calculate = useCallback(async () => {
    setIsCalculating(true);
    setHasManualAdjustments(false);
    
    try {
      // Simulate calculation time
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const result = distributeTests(tests, team, weights, context);
      setAssignments(result);
    } finally {
      setIsCalculating(false);
    }
  }, [tests, team, weights, context]);

  // Recalculate when weights change
  useEffect(() => {
    if (tests.length > 0 && team.length > 0) {
      calculate();
    }
  }, [weights, calculate, tests.length, team.length]);

  // Adjust assignment manually
  const adjustAssignment = useCallback((testId: string, newAssigneeId: string) => {
    setAssignments(prev => prev.map(a =>
      a.testCaseId === testId
        ? { ...a, assigneeId: newAssigneeId, adjusted: true }
        : a
    ));
    setHasManualAdjustments(true);
  }, []);

  // Move test from one member to another
  const moveTest = useCallback((testId: string, fromMemberId: string, toMemberId: string) => {
    adjustAssignment(testId, toMemberId);
  }, [adjustAssignment]);

  // Get distribution summary per member
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

  // Calculate distribution score
  const distributionScore = useMemo(() => {
    return calculateDistributionScore(assignments, team);
  }, [assignments, team]);

  // Update a specific weight
  const updateWeight = useCallback((key: keyof AssignmentWeights, value: number) => {
    setWeights(prev => {
      const newWeights = { ...prev, [key]: value };
      return normalizeWeights(newWeights);
    });
  }, []);

  // Apply a preset
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
