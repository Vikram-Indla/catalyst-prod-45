// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ ITEM TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type T10ItemStatus = 'todo' | 'done' | 'resolved' | 'removed';

export interface T10ItemRow {
  id: string;
  week_id: string;
  rank: number; // 1-20
  title: string;
  taskhub_key: string | null; // e.g., TSK-142
  assignee_id: string | null;
  due_date: string | null;
  label: string | null;
  description: string | null;
  status: T10ItemStatus;
  carryover_count: number;
  created_by: string | null;
  updated_by: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface T10ItemWithAssignee extends T10ItemRow {
  assignee?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface T10ItemInsert {
  week_id: string;
  rank?: number;
  title: string;
  taskhub_key?: string;
  assignee_id?: string;
  due_date?: string;
  label?: string;
  description?: string;
}

export interface T10ItemUpdate {
  title?: string;
  taskhub_key?: string;
  assignee_id?: string | null;
  due_date?: string | null;
  label?: string | null;
  description?: string | null;
}

export interface T10ItemStatusUpdate {
  status: 'todo' | 'done';
}

export interface T10ItemRankUpdate {
  new_rank: number; // 1-20
}

export type RankStyle = 'blue-gradient' | 'gray' | 'dashed';

export function getRankStyle(rank: number): RankStyle {
  if (rank >= 1 && rank <= 5) return 'blue-gradient';
  if (rank >= 6 && rank <= 10) return 'gray';
  return 'dashed';
}
