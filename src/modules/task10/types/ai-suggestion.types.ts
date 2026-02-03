// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ AI SUGGESTION TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type T10AISuggestionPriority = 'critical' | 'high' | 'medium' | 'low';

export interface T10AISuggestionRow {
  id: string;
  list_id: string;
  taskhub_key: string | null;
  title: string;
  assignee_id: string | null;
  priority: T10AISuggestionPriority;
  due_date: string | null;
  is_added: boolean;
  created_at: string;
  updated_at: string;
}

export interface T10AISuggestionWithAssignee extends T10AISuggestionRow {
  assignee?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function getPriorityColor(priority: T10AISuggestionPriority): string {
  switch (priority) {
    case 'critical':
      return '#ef4444'; // red
    case 'high':
      return '#f59e0b'; // amber
    case 'medium':
      return '#3b82f6'; // blue
    case 'low':
      return '#6b7280'; // gray
    default:
      return '#6b7280';
  }
}

export function getPriorityBgColor(priority: T10AISuggestionPriority): string {
  switch (priority) {
    case 'critical':
      return '#fef2f2'; // red-50
    case 'high':
      return '#fffbeb'; // amber-50
    case 'medium':
      return '#eff6ff'; // blue-50
    case 'low':
      return '#f9fafb'; // gray-50
    default:
      return '#f9fafb';
  }
}
