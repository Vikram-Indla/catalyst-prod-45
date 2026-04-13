/**
 * AllWorkBulkBar — Jira-style fixed bottom bar when items selected
 * Re-exports shared JiraBulkActionBar with AllWork-specific wiring
 */
import { JiraBulkActionBar } from '@/components/shared/JiraBulkActionBar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  selectedIds: string[];
  items?: Array<{ id: string; issue_key?: string; title?: string; summary?: string; status?: string; priority?: string; assignee_name?: string }>;
  totalCount: number;
  onSelectAll: () => void;
  onClear: () => void;
  onDone: () => void;
  onEdit?: (ids: string[]) => void;
}

export function AllWorkBulkBar({ selectedIds, items = [], totalCount, onSelectAll, onClear, onDone, onEdit }: Props) {
  const handleDelete = async (ids: string[]) => {
    try {
      // Separate catalyst_issues items (UUID ids) from ph_issues items (issue_key ids)
      const catIds = ids.filter(id => /^[0-9a-f]{8}-/.test(id));
      const phKeys = ids.filter(id => !/^[0-9a-f]{8}-/.test(id));

      if (catIds.length > 0) {
        const { error } = await supabase.from('catalyst_issues').delete().in('id', catIds);
        if (error) throw error;
      }
      if (phKeys.length > 0) {
        const { error } = await supabase.from('ph_issues').delete().in('issue_key', phKeys);
        if (error) throw error;
      }

      toast.success(`${ids.length} item${ids.length !== 1 ? 's' : ''} deleted`);
      onDone();
    } catch (err: any) {
      toast.error(`Delete failed: ${err.message}`);
    }
  };

  return (
    <JiraBulkActionBar
      selectedIds={selectedIds}
      items={items}
      onClear={onClear}
      onDelete={handleDelete}
      onEdit={onEdit}
      entityLabel="work item"
    />
  );
}
