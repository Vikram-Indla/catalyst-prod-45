// Task10 TypeScript Types

export interface T10List {
  id: string;
  key: string; // T10-001
  name: string;
  status: 'active' | 'inactive';
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface T10Week {
  id: string;
  list_id: string;
  week_start_date: string;
  is_checked_out: boolean;
  checked_out_by?: string;
  checked_out_by_name?: string;
  checked_out_at?: string;
  closed_count?: number;
  carried_count?: number;
}

export interface T10Item {
  id: string;
  week_id: string;
  rank: number;
  title: string;
  taskhub_key?: string;
  assignee_id?: string;
  assignee_name?: string;
  assignee_initials?: string;
  due_date?: string;
  label?: string;
  description?: string;
  status: 'todo' | 'done';
  carryover_count: number;
  created_at: string;
  updated_at: string;
}

export interface T10Activity {
  id: string;
  item_id: string;
  type: 'created' | 'updated' | 'completed' | 'ranked' | 'assigned' | 'carried';
  description: string;
  actor_name: string;
  created_at: string;
}

export interface T10CheckoutDecision {
  itemId: string;
  rank: number;
  title: string;
  decision: 'resolved' | 'carry' | 'remove';
}

export interface T10AITask {
  id: string;
  key: string;
  title: string;
  priority: 'critical' | 'high';
  assignee_name: string;
  due_date: string;
}
