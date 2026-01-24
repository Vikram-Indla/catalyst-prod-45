/**
 * Adapter to convert Supabase TMTestCase → UI TestCase format
 * Used by TestCasesPage and related components
 * 
 * ID CONTRACT:
 * - id: ALWAYS the database UUID (for DB operations)
 * - key: ALWAYS the display key like "INV-0001" (for UI display)
 */

import type { TMTestCase } from '@/types/test-management';
import type { TestCase } from '@/types/test-cases';
import { formatDistanceToNow, format } from 'date-fns';

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

// Format relative time for "updated" column
function formatUpdated(updatedAt?: string | null): string {
  if (!updatedAt) return 'Unknown';
  try {
    return formatDistanceToNow(new Date(updatedAt), { addSuffix: true });
  } catch {
    return 'Unknown';
  }
}

// Format absolute timestamp for metadata display (e.g., "24 Jan 2026, 12:21")
function formatTimestamp(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    return format(new Date(isoString), 'd MMM yyyy, HH:mm');
  } catch {
    return '—';
  }
}

// Map last execution status to UI format
function mapLastRun(lastExecution: { status: string; executed_at: string | null } | null): 'passed' | 'failed' | 'not_run' {
  if (!lastExecution) return 'not_run';
  const status = lastExecution.status?.toLowerCase();
  if (status === 'passed' || status === 'pass') return 'passed';
  if (status === 'failed' || status === 'fail') return 'failed';
  return 'not_run';
}

/**
 * Convert a single TMTestCase to UI TestCase format
 */
export function tmToUITestCase(tc: TMTestCase): TestCase {
  // Get assigned user or fall back to creator
  const assignedUser = (tc as any).assigned_user;
  const assignee = assignedUser || tc.created_by_profile || tc.created_by_user;
  
  // Get creator profile for "Created by" display
  const creatorProfile = tc.created_by_profile || tc.created_by_user;
  
  // Extract folder information from the joined relation
  const folder = (tc as any).folder as { id: string; name: string; path?: string } | null;
  
  // Extract release information from the joined relation
  const release = (tc as any).release as { id: string; name: string; version?: string } | null;
  
  // Steps count from aggregated query (not from steps array which may not be loaded)
  const stepsCount = (tc as any).steps_count ?? (tc.steps?.length || 0);
  
  // Last execution from aggregated query
  const lastExecution = (tc as any).last_execution as { status: string; executed_at: string | null } | null;
  
  return {
    id: tc.id,   // Always use the actual database UUID
    key: tc.key || tc.id, // Display key like "INV-0001"
    title: tc.title,
    // Release from FK join - show version if available, else name, else "Unassigned"
    release: release ? (release.version || release.name) : 'Unassigned',
    type: mapType(tc.type),
    priority: mapPriority(tc.priority),
    status: mapStatus(tc.status),
    steps: stepsCount,
    lastRun: mapLastRun(lastExecution),
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
    // Created by: use profile name if available, otherwise show "Unknown"
    createdBy: creatorProfile?.full_name || 'Unknown',
    // Timestamps: format for human-readable display
    createdAt: formatTimestamp(tc.created_at),
    updatedAt: formatTimestamp(tc.updated_at),
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
