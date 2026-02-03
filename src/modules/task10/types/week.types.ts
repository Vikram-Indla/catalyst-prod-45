// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ WEEK TYPES
// ═══════════════════════════════════════════════════════════════════════════

import { T10ItemRow } from './item.types';

export interface T10WeekRow {
  id: string;
  list_id: string;
  week_start_date: string; // Always Sunday
  week_end_date: string;
  is_checked_out: boolean;
  checked_out_by: string | null;
  checked_out_at: string | null;
  closed_count: number;
  carried_count: number;
  removed_count: number;
  created_at: string;
  updated_at: string;
}

export interface T10WeekWithItems extends T10WeekRow {
  items: T10ItemRow[];
  buffer_items: T10ItemRow[];
  checked_out_user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface T10WeekHistory {
  id: string;
  week_start_date: string;
  week_end_date: string;
  is_checked_out: boolean;
  checked_out_by: string | null;
  checked_out_at: string | null;
  closed_count: number;
  carried_count: number;
  removed_count: number;
  checked_out_user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export type CheckoutDecision = 'resolved' | 'carry' | 'remove';

export interface CheckoutRequest {
  decisions: Record<string, CheckoutDecision>; // itemId -> decision
}

export interface CheckoutSummary {
  resolved_count: number;
  carry_count: number;
  remove_count: number;
}
