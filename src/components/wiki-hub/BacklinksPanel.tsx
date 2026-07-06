/**
 * BacklinksPanel — "Linked from N pages" list rendered under a wiki page.
 * Sources kb_page_links rows targeting this page (written by
 * syncMentionLinks on autosave). Renders nothing when there are no backlinks.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Routes } from '@/lib/routes';

// kb_* tables postdate the generated Supabase types (same escape hatch as useWiki.ts).
const db = supabase as unknown as {
  from: (table: string) => any;
};

interface BacklinkRow {
  id: string;
  source: {
    id: string;
    title: string | null;
    slug: string;
    icon: string | null;
    space: { slug: string } | null;
  } | null;
}

export interface BacklinksPanelProps {
  pageId: string;
}

export function BacklinksPanel({ pageId }: BacklinksPanelProps) {
  const { data: backlinks } = useQuery({
    queryKey: ['wiki', 'backlinks', pageId],
    enabled: !!pageId,
    queryFn: async (): Promise<BacklinkRow[]> => {
      const { data, error } = await db
        .from('kb_page_links')
        .select('id, source:kb_documents!source_page_id (id, title, slug, icon, space:kb_doc_spaces (slug))')
        .eq('target_page_id', pageId)
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as BacklinkRow[];
    },
  });

  const rows = (backlinks ?? []).filter((b) => b.source && b.source.space);
  if (rows.length === 0) return null;

  return (
    <nav aria-label="Pages linking here" style={{ marginTop: 40 }}>
      <style>{`
        .wiki-backlink-row:hover { background: var(--ds-background-neutral-subtle); }
        .wiki-backlink-row:focus-visible { outline: 2px solid var(--ds-border-focused); outline-offset: -2px; }
      `}</style>
      <h2
        style={{
          margin: '0 0 6px',
          color: 'var(--ds-text-subtle)',
          font: 'var(--ds-font-heading-xsmall)',
        }}
      >
        Linked from {rows.length} {rows.length === 1 ? 'page' : 'pages'}
      </h2>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {rows.map((b) => (
          <li key={b.id}>
            <a
              className="wiki-backlink-row"
              href={Routes.wiki.page(b.source!.space!.slug, b.source!.slug)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 6px',
                borderRadius: 4,
                color: 'var(--ds-text)',
                font: 'var(--ds-font-body)',
                textDecoration: 'none',
              }}
            >
              <span aria-hidden style={{ flexShrink: 0 }}>{b.source!.icon || '📄'}</span>
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {b.source!.title || 'Untitled'}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default BacklinksPanel;
