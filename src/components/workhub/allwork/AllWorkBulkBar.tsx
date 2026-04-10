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
      const { error } = await supabase
        .from('catalyst_issues')
        .delete()
        .in('id', ids);
      if (error) throw error;
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
