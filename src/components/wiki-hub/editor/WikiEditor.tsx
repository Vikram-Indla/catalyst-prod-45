/**
 * WikiEditor — Catalyst Wiki's block editor (CAT-DOCS-NOTION-20260704-001).
 *
 * BlockNote (MPL-2.0 core, pinned 0.51.4) themed entirely through ADS
 * tokens (see blocknote-ads.css — the only styling bridge). Loaded ONLY
 * via React.lazy from wiki routes so the editor stays out of the main
 * bundle, mirroring the AtlaskitEditor lazy-load discipline.
 *
 * Content contract:
 *   - `initialContent` IN  — BlockNote Block[] (kb_documents.content with
 *     content_format = 'blocknote'), or undefined for a new page.
 *   - `onChange` OUT — debounce lives with the caller (autosave owner);
 *     this component emits every document change.
 *
 * Schema: wikiSchema (defaults + workItemMention/pageLink inline chips).
 * The `@` suggestion menu searches wiki pages in the current workspace and
 * catalyst_issues work items, inserting the matching inline chip.
 */
import { useCallback, useMemo } from 'react';
import { BlockNoteView } from '@blocknote/mantine';
import {
  SuggestionMenuController,
  useCreateBlockNote,
  type DefaultReactSuggestionItem,
} from '@blocknote/react';
import type { Block, BlockNoteEditor } from '@blocknote/core';
import { supabase } from '@/integrations/supabase/client';
import { useThemeMode } from '@/providers/ThemeProvider';
import { wikiSchema } from './wikiSchema';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import './blocknote-ads.css';

// kb_* tables postdate the generated Supabase types (same escape hatch as useWiki.ts).
const db = supabase as unknown as {
  from: (table: string) => any;
};

/** catalyst_issues.issue_type → kb_document_links.entity_type. */
function toEntityType(issueType: string | null | undefined): string {
  const t = (issueType ?? '').toLowerCase();
  if (t === 'bug' || t === 'defect') return 'defect';
  if (t === 'story' || t === 'epic' || t === 'task') return t;
  return 'issue';
}

export interface WikiEditorProps {
  initialContent?: Block[];
  editable?: boolean;
  onChange?: (editor: BlockNoteEditor) => void;
  onReady?: (editor: BlockNoteEditor) => void;
  /** Register tag consumed by CatyFlow dictation for tone matching. */
  dictationStyle?: string;
  uploadFile?: (file: File) => Promise<string>;
  /** Scope for the `@` page-mention search; omit to disable page results. */
  workspaceId?: string;
  /** Used to build hrefs for inserted page-link chips. */
  workspaceSlug?: string;
}

export default function WikiEditor({
  initialContent,
  editable = true,
  onChange,
  onReady,
  dictationStyle = 'brd-page',
  uploadFile,
  workspaceId,
  workspaceSlug,
}: WikiEditorProps) {
  const { resolvedTheme } = useThemeMode();

  const editor = useCreateBlockNote(
    {
      schema: wikiSchema,
      initialContent:
        initialContent && initialContent.length > 0 ? (initialContent as never) : undefined,
      uploadFile,
    },
    // Re-create only when switching documents, never on theme changes.
    [initialContent],
  );

  useMemo(() => {
    if (editor && onReady) onReady(editor as unknown as BlockNoteEditor);
  }, [editor, onReady]);

  // `@` menu — wiki pages in this workspace + work items, server-filtered.
  const getMentionItems = useCallback(
    async (query: string): Promise<DefaultReactSuggestionItem[]> => {
      const q = query.trim();

      let issuesQuery = db
        .from('catalyst_issues')
        .select('id, issue_key, title, issue_type')
        .limit(6);
      issuesQuery = q
        ? issuesQuery.or(`issue_key.ilike.${q}%,title.ilike.%${q}%`)
        : issuesQuery.order('updated_at', { ascending: false });

      const [pagesRes, issuesRes] = await Promise.all([
        workspaceId
          ? db
              .from('kb_documents')
              .select('id, title, slug, icon, space_id')
              .eq('space_id', workspaceId)
              .eq('is_template', false)
              .ilike('title', `%${q}%`)
              .limit(6)
          : Promise.resolve({ data: [] }),
        issuesQuery,
      ]);

      const pageItems: DefaultReactSuggestionItem[] = (pagesRes.data ?? []).map(
        (p: { id: string; title: string | null; slug: string; icon: string | null }) => ({
          title: p.title || 'Untitled',
          subtext: 'Wiki page',
          group: 'Pages',
          icon: <span aria-hidden>{p.icon || '📄'}</span>,
          onItemClick: () => {
            editor.insertInlineContent([
              {
                type: 'pageLink',
                props: {
                  pageId: p.id,
                  slug: p.slug,
                  workspaceSlug: workspaceSlug ?? '',
                  title: p.title || 'Untitled',
                  icon: p.icon ?? '',
                },
              },
              ' ',
            ]);
          },
        }),
      );

      const issueItems: DefaultReactSuggestionItem[] = (issuesRes.data ?? []).map(
        (r: { id: string; issue_key: string; title: string | null; issue_type: string | null }) => ({
          title: r.issue_key,
          subtext: r.title ?? undefined,
          group: 'Work items',
          onItemClick: () => {
            editor.insertInlineContent([
              {
                type: 'workItemMention',
                props: {
                  entityType: toEntityType(r.issue_type),
                  entityId: r.id,
                  label: r.issue_key,
                  title: r.title ?? '',
                },
              },
              ' ',
            ]);
          },
        }),
      );

      return [...pageItems, ...issueItems];
    },
    [editor, workspaceId, workspaceSlug],
  );

  return (
    <div className="wiki-bn" data-dictation-style={dictationStyle} dir="auto">
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme={resolvedTheme}
        onChange={() => onChange?.(editor as unknown as BlockNoteEditor)}
      >
        <SuggestionMenuController triggerCharacter="@" getItems={getMentionItems} />
      </BlockNoteView>
    </div>
  );
}
