/**
 * StoryDetailModal — Helper Functions
 * Pure utility functions shared across sub-components.
 */
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { V, FIELD_LABELS } from './tokens';

export function getStatusCategory(s: string): string {
  const lower = s.toLowerCase();
  if (['done', 'completed', 'approved', 'closed', 'released'].some(k => lower.includes(k))) return 'done';
  if (['progress', 'review', 'beta', 'active', 'development', 'requirements'].some(k => lower.includes(k))) return 'in_progress';
  return 'todo';
}

export function getLozengeColors(status: string, category?: string | null) {
  const cat = category?.toLowerCase() || getStatusCategory(status);
  if (cat === 'done' || cat === 'complete') return { bg: V.lozengeGreenBg, color: V.lozengeGreenText };
  if (cat === 'in_progress' || cat === 'inprogress') return { bg: V.lozengeBlueBg, color: V.lozengeBlueText };
  return { bg: V.lozengeGreyBg, color: V.lozengeGreyText };
}

export function getInitials(name?: string | null): string {
  if (!name?.trim()) return '?';
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

export function relTime(d: string | null | undefined): string {
  if (!d) return '';
  try { return formatDistanceToNow(new Date(d), { addSuffix: true }); } catch { return ''; }
}

export function formatFullDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    }).format(new Date(d));
  } catch { return '—'; }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function humanFieldName(raw: string | null | undefined): string {
  if (!raw) return 'field';
  return FIELD_LABELS[raw] || raw.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
}

export async function enqueueWriteBack(phIssueId: string, fieldName: string, newValue: string) {
  try {
    await supabase.from('jira_write_back_queue').insert({
      ph_issue_id: phIssueId,
      field_name: fieldName,
      new_value: newValue,
      operation: 'UPDATE',
      status: 'approved',
      approved_at: new Date().toISOString(),
    });
  } catch { /* non-critical */ }
}
