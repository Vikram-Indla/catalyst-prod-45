/**
 * GenerateStoriesFromPage — bonus feature (CAT-DOCS-NOTION-20260704-001):
 * turn a BRD/spec page into Jira stories using the existing
 * ai-generate-stories engine.
 *
 * Requires the page to be linked to exactly one epic (via the Pages
 * section or an @-mention). The page's text becomes the epic's
 * description_text input; the generator writes real stories under that
 * epic and enforces its own dedup + hard cap.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { Block } from '@blocknote/core';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { CatyPulseIcon } from '@/components/ui/CatyPulseIcon';
import { useWikiPageWorkItemLinks } from '@/hooks/useWiki';
import { browseRoutes } from '@/lib/routes';
import { blocksToText } from './editor/blocksToText';

/** A page needs real prose before "generate stories" makes sense — below this
 *  it has no information to work from, so the chip is hidden entirely. */
const MIN_CONTENT_CHARS = 30;

const db = supabase as unknown as { from: (t: string) => any };

export interface GenerateStoriesFromPageProps {
  pageId: string;
  title: string;
  getBlocks: () => Block[];
}

export function GenerateStoriesFromPage({ pageId, title, getBlocks }: GenerateStoriesFromPageProps) {
  const navigate = useNavigate();
  const { data: links } = useWikiPageWorkItemLinks(pageId);
  const epicLinks = useMemo(() => (links ?? []).filter((l) => l.entity_type === 'epic'), [links]);
  const [running, setRunning] = useState(false);

  // Hidden when the page has no information to generate from (Vikram
  // 2026-07-06). Empty/near-empty pages produce nothing useful, so the CTA
  // shouldn't be there to fail against.
  const hasContent = blocksToText(getBlocks()).trim().length >= MIN_CONTENT_CHARS;

  // Resolve the epic's display key from its row UUID.
  const { data: epic } = useQuery({
    queryKey: ['wiki', 'epic-key', epicLinks[0]?.entity_id],
    enabled: epicLinks.length === 1 && !!epicLinks[0]?.entity_id,
    queryFn: async () => {
      // ph_issues is the app's issue spine (catalyst_issues is empty on
      // staging — live-probed 2026-07-05). Column is `summary`, not title.
      const { data } = await db
        .from('ph_issues')
        .select('id, issue_key, summary')
        .eq('id', epicLinks[0].entity_id)
        .maybeSingle();
      const row = data as { id: string; issue_key: string; summary: string | null } | null;
      return row ? { id: row.id, issue_key: row.issue_key, title: row.summary } : null;
    },
  });

  if (epicLinks.length !== 1 || !epic || !hasContent) return null;

  const viewEpic = { label: `View ${epic.issue_key}`, onClick: () => navigate(browseRoutes.issue(epic.issue_key)) };

  const run = async () => {
    setRunning(true);
    try {
      const descriptionText = `${title}\n\n${blocksToText(getBlocks())}`.trim();
      const { data, error } = await supabase.functions.invoke('ai-generate-stories', {
        body: {
          epic_key: epic.issue_key,
          epic_summary: epic.title ?? title,
          description_text: descriptionText,
          selected_sources: ['wiki_page'],
        },
      });
      if (error) throw error;
      if (data?.disabled) {
        catalystToast.info('This epic already has the maximum number of stories.');
      } else if (data?.noContent) {
        catalystToast.warning('Not enough detail on this page to generate stories.');
      } else {
        // Success MUST carry an action or the platform suppresses success
        // flags (catalystToast guard). The action doubles as the "which epic"
        // confirmation the user asked for — parent key named in title, body,
        // and the button. Count reflects the drafted stories returned.
        const n = Array.isArray(data?.stories) ? data.stories.length : (data?.created ?? 0);
        catalystToast.success(
          n ? `${n} stories drafted under ${epic.issue_key}` : `Stories drafted under ${epic.issue_key}`,
          `Generated from “${title}” and linked to epic ${epic.issue_key}.`,
          viewEpic,
        );
      }
    } catch {
      // Gentle, actionable warning flag — not a red error slab (Vikram
      // 2026-07-06: "atlaskit flag message format, not scary redcards").
      catalystToast.warning(
        'Couldn’t generate stories',
        'Something went wrong generating stories from this page. Please try again.',
        { label: 'Retry', onClick: () => { void run(); } },
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={running}
      aria-label={`Generate stories under ${epic.issue_key}`}
      className="wiki-no-print"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        border: '1px solid var(--ds-border)',
        borderRadius: 6,
        background: 'var(--ds-surface)',
        color: 'var(--ds-text-subtle)',
        font: 'var(--ds-font-body-small)',
        cursor: running ? 'default' : 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      <CatyPulseIcon size={14} />
      {running ? 'Generating…' : `Generate stories · ${epic.issue_key}`}
    </button>
  );
}

export default GenerateStoriesFromPage;
