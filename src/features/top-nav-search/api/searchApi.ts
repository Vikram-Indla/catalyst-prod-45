import type { SearchResult } from '@/types/global-search';
import type { SearchItem } from '../types';

export function mapResultToItem(result: SearchResult): SearchItem {
  const projectKey = result.project_key ?? 'PROJ';
  const issueKey = result.item_key;
  return {
    id: result.id,
    type: 'work_item',
    label: result.title,
    meta: result.project_name ?? result.project_key ?? undefined,
    href: `/project/${projectKey}/issues/${issueKey}`,
    itemKey: issueKey,
    workItemType: result.item_type,
  };
}
