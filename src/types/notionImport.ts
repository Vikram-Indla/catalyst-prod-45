/**
 * Notion Import — TypeScript types for the Notion → Catalyst import pipeline.
 * Stage A: Types only — no UI, no edge function wiring.
 */

export interface NotionCredentials {
  integrationToken: string;
  databaseUrl: string;
}

export interface NotionProperty {
  id: string;
  name: string;
  type: string;
}

export interface NotionRow {
  notionPageId: string;
  notionPageUrl: string;
  properties: Record<string, string | null>;
}

export interface NotionFetchResponse {
  success: boolean;
  rows: NotionRow[];
  properties: NotionProperty[];
  databaseTitle: string;
  error?: string;
}

export interface NotionImportMapping {
  notionProp: string;
  catalystCol: keyof PhWorkItemInsert | null;
}

export interface PhWorkItemInsert {
  summary: string;
  item_type: string;
  status: string;
  priority: string | null;
  description: string | null;
  due_date: string | null;
  project_id: string;
  jira_issue_id: string;
  jira_url: string;
  sync_source: 'notion';
  created_at: string;
  updated_at: string;
}

export type NotionImportStep =
  | 'connect'
  | 'preview'
  | 'map'
  | 'validate'
  | 'confirm';
