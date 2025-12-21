/**
 * Change Number Types
 * Format: CHG-YYYY-NNNN (e.g., CHG-2025-0043)
 */

export interface ChangeNumber {
  id: string;
  number: string;           // e.g., "CHG-2025-0043"
  description: string | null;
  status: 'open' | 'in_progress' | 'closed' | 'cancelled';
  release_id: string | null;
  scheduled_date: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  release?: {
    id: string;
    name: string;
  } | null;
}
