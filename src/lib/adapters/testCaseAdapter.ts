/**
 * Adapter to convert Supabase TMTestCase → UI TestCase format
 * Used by TestCasesPage and related components
 */

import type { TMTestCase } from '@/types/test-management';
import type { TestCase } from '@/data/testCasesData';
import { formatDistanceToNow } from 'date-fns';

// Helper to get avatar color based on user ID hash - Catalyst V5 (Blue, Teal, Gray only)
function getAvatarColor(userId?: string): 'blue' | 'teal' | 'gray' {
  if (!userId) return 'blue';
  const colors: Array<'blue' | 'teal' | 'gray'> = ['blue', 'teal', 'gray'];
  // Simple hash to pick a color
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

// Helper to get initials from full name
function getInitials(fullName?: string | null): string {
  if (!fullName) return 'U';
  return fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// Map priority name to UI priority value
function mapPriority(priority?: { name?: string } | null): 'critical' | 'high' | 'medium' | 'low' {
  const name = priority?.name?.toLowerCase() || 'medium';
  if (name.includes('critical') || name.includes('p0')) return 'critical';
  if (name.includes('high') || name.includes('p1')) return 'high';
  if (name.includes('low') || name.includes('p3')) return 'low';
  return 'medium';
}

// Map type name to UI type value
function mapType(type?: { name?: string } | null): 'functional' | 'regression' | 'smoke' | 'integration' | 'e2e' {
  const name = type?.name?.toLowerCase() || 'functional';
  if (name.includes('regression')) return 'regression';
  if (name.includes('smoke')) return 'smoke';
  if (name.includes('integration')) return 'integration';
  if (name.includes('e2e') || name.includes('end-to-end')) return 'e2e';
  return 'functional';
}

// Map DB status to UI status
function mapStatus(status: string): 'draft' | 'ready' | 'approved' | 'deprecated' {
  const s = status.toLowerCase();
  if (s === 'review' || s === 'ready') return 'ready';
  if (s === 'approved') return 'approved';
  if (s === 'deprecated') return 'deprecated';
  return 'draft';
}

// Format relative time
function formatUpdated(updatedAt?: string | null): string {
  if (!updatedAt) return 'Unknown';
  try {
    return formatDistanceToNow(new Date(updatedAt), { addSuffix: true });
  } catch {
    return 'Unknown';
  }
}

/**
 * Convert a single TMTestCase to UI TestCase format
 */
export function tmToUITestCase(tc: TMTestCase): TestCase {
  // Get assigned user or fall back to creator
  const assignedUser = (tc as any).assigned_user;
  const assignee = assignedUser || tc.created_by_profile || tc.created_by_user;
  
  // Extract folder information from the joined relation
  const folder = (tc as any).folder as { id: string; name: string; path?: string } | null;
  
  return {
    id: tc.key || tc.id,
    dbId: tc.id, // Preserve the actual database UUID for operations
    title: tc.title,
    // Note: release field removed - no real data exists in tm_test_cases
    release: '', // Empty - will be hidden in UI
    type: mapType(tc.type),
    priority: mapPriority(tc.priority),
    status: mapStatus(tc.status),
    steps: tc.steps?.length || 0,
    lastRun: 'not_run', // Derived from execution data - shows "Not Run" when no executions exist
    assignee: {
      name: assignee?.full_name || 'Unassigned',
      avatar: getInitials(assignee?.full_name),
      color: getAvatarColor(assignee?.id),
    },
    updated: formatUpdated(tc.updated_at),
    folderId: tc.folder_id,
    folderName: folder?.name || null,
    folderPath: folder?.path || folder?.name || null,
    description: tc.objective,
    preconditions: tc.preconditions,
    createdBy: tc.created_by,
    createdAt: tc.created_at,
    updatedAt: tc.updated_at,
    testSteps: tc.steps?.map(s => ({
      id: s.id,
      step: s.step_number,
      action: s.action,
      expectedResult: s.expected_result,
      testData: s.test_data,
    })),
  };
}

/**
 * Convert array of TMTestCase to UI TestCase format
 */
export function tmToUITestCases(testCases: TMTestCase[]): TestCase[] {
  return testCases.map(tmToUITestCase);
}
