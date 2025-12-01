import { EpicDetailsPanel as CanonicalEpicDetailsPanel } from '@/components/items/epics/EpicDetailsPanel';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EpicDetailsPanelProps {
  itemId: string;
  itemType: string;
  onClose: () => void;
}

export function EpicDetailsPanel({
  itemId,
  itemType,
  onClose,
}: EpicDetailsPanelProps) {
  const { data: item } = useQuery({
    queryKey: ['backlog-item', itemId, itemType],
    queryFn: async () => {
      const tableName = getTableName(itemType);
      const { data, error }: any = await supabase
        .from(tableName as any)
        .select('*')
        .eq('id', itemId)
        .single();

      if (error) throw error;
      return data as any;
    },
  });

  if (!item) {
    return null;
  }

  // Use the canonical EpicDetailsPanel from items/epics
  return (
    <CanonicalEpicDetailsPanel
      epic={item}
      open={true}
      onClose={onClose}
    />
  );
}

function getTableName(type: string): string {
  const tableMap: Record<string, string> = {
    theme: 'strategic_themes',
    epic: 'epics',
    capability: 'capabilities',
    feature: 'features',
    story: 'stories',
    defect: 'defects',
    objective: 'objectives',
  };
  return tableMap[type] || 'epics';
}
