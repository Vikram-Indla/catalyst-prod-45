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
import { useQuery } from '@tanstack/react-query';
import type { Block } from '@blocknote/core';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { CatyPulseIcon } from '@/components/ui/CatyPulseIcon';
import { useWikiPageWorkItemLinks } from '@/hooks/useWiki';
import { blocksToText } from './editor/blocksToText';

const db = supabase as unknown as { from: (t: string) => any };

export interface GenerateStoriesFromPageProps {
  pageId: string;
  title: string;
  getBlocks: () => Block[];
}

export function GenerateStoriesFromPage({ pageId, title, getBlocks }: GenerateStoriesFromPageProps) {
  const { data: links } = useWikiPageWorkItemLinks(pageId);
  const epicLinks = useMemo(() => (links ?? []).filter((l) => l.entity_type === 'epic'), [links]);
  const [running, setRunning] = useState(false);

  // Resolve the epic's display key from its row UUID.
  const { data: epic } = useQuery({
    queryKey: ['wiki', 'epic-key', epicLinks[0]?.entity_id],
    enabled: epicLinks.length === 1 && !!epicLinks[0]?.entity_id,
    queryFn: async () => {
      const { data } = await db
        .from('catalyst_issues')
        .select('id, issue_key, title')
        .eq('id', epicLinks[0].entity_id)
        .maybeSingle();
      return (data as { id: string; issue_key: string; title: string | null } | null) ?? null;
    },
  });

  if (epicLinks.length !== 1 || !epic) return null;

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
        const n = Array.isArray(data?.stories) ? data.stories.length : (data?.created ?? 0);
        catalystToast.success(
          n ? `Generated ${n} stories under ${epic.issue_key}.` : `Stories generated under ${epic.issue_key}.`,
        );
      }
    } catch {
      catalystToast.error('Could not generate stories from this page.');
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
