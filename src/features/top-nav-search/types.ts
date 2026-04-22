export type SearchItemType = 'work_item' | 'person' | 'page';

export interface SearchItem {
  id: string;
  type: SearchItemType;
  label: string;
  meta?: string;
  href: string;
  itemKey?: string;
  workItemType?: string;
}

export type SearchState = 'idle' | 'active' | 'loading' | 'results' | 'empty';
