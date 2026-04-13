/**
 * AllWorkBulkBar — Jira-style fixed bottom bar when items selected
 * Re-exports shared JiraBulkActionBar with AllWork-specific wiring
 * Only Catalyst-native items can be deleted; Jira items are read-only.
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
      // Only delete Catalyst-native items (UUID ids). Jira items are read-only.
      const catIds = ids.filter(id => /^[0-9a-f]{8}-/.test(id));
      const jiraCount = ids.length - catIds.length;

      if (catIds.length > 0) {
        const { error } = await supabase.from('catalyst_issues').delete().in('id', catIds);
        if (error) throw error;
      }

      if (catIds.length > 0 && jiraCount > 0) {
        toast.success(`${catIds.length} item${catIds.length !== 1 ? 's' : ''} deleted. ${jiraCount} Jira-synced item${jiraCount !== 1 ? 's' : ''} skipped (delete in Jira).`);
      } else if (catIds.length > 0) {
        toast.success(`${catIds.length} item${catIds.length !== 1 ? 's' : ''} deleted`);
      } else {
        toast.info('Jira-synced items cannot be deleted from Catalyst. Delete them in Jira instead.');
      }
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
