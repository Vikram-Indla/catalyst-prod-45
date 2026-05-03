import { supabase } from '@/integrations/supabase/client';
import type { WorkItemType } from '@/components/shared/CanonicalDescriptionField/description.types';

export const descriptionApi = {
  async fetch(workItemId: string, workItemType: WorkItemType): Promise<string> {
    const table = getTableName(workItemType);
    const { data, error } = await supabase
      .from(table)
      .select('description')
      .eq('id', workItemId)
      .single();

    if (error) throw error;
    return data?.description || '';
  },

  async update(
    workItemId: string,
    workItemType: WorkItemType,
    description: string
  ): Promise<void> {
    const table = getTableName(workItemType);
    const { error } = await supabase
      .from(table)
      .update({
        description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', workItemId);

    if (error) throw error;
  },
};

function getTableName(workItemType: WorkItemType): string {
  const tableMap: Record<WorkItemType, string> = {
    task: 'planner_tasks',
    feature: 'features',
    incident: 'incidents',
    epic: 'epics',
    story: 'stories',
  };

  return tableMap[workItemType];
}
