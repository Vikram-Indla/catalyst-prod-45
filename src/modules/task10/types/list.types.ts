// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ LIST TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type T10ListStatus = 'active' | 'inactive' | 'archived';

export interface T10ListRow {
  id: string;
  list_key: string; // e.g., T10-001
  name: string;
  description: string | null;
  status: T10ListStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface T10ListWithStats extends T10ListRow {
  item_count: number;
  completed_count: number;
  slots_available: number;
  current_week_id: string | null;
  creator?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface T10ListInsert {
  name: string;
  description?: string;
  status?: T10ListStatus;
}

export type T10ListUpdate = Partial<T10ListInsert>;
