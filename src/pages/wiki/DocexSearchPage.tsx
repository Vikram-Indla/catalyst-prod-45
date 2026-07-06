/**
 * DocexSearchPage — cross-workspace full-text search (/docex/search,
 * CAT-DOCS-NOTION-20260704-001 Pass D). tsvector websearch + title/body
 * ilike merged in useDocexSearch; results grouped by workspace with a
 * snippet around the first match.
 */
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from '@/lib/atlaskit-icons';
import { Input } from '@/components/ui/input';
import { Routes } from '@/lib/routes';
import {
  useDocexSearch,
  useWikiWorkspaces,
  type DocexSearchHit,
} from '@/hooks/useWiki';

/** ~140-char window of body text centred on the first query hit. */
function snippet(text: string | null, q: string): string {
  if (!text) return '';
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text.slice(0, 140);
  const start = Math.max(0, idx - 50);
  const end = Math.min(text.length, idx + 90);
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

export default function DocexSearchPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const { data: hits, isFetching } = useDocexSearch(query);
  const { data: workspaces } = useWikiWorkspaces();

  const wsById = useMemo(
    () => new Map((workspaces ?? []).map((w) => [w.id, w])),
    [workspaces],
  );

  const grouped = useMemo(() => {
    const groups = new Map<string, DocexSearchHit[]>();
    for (const hit of hits ?? []) {
      const list = groups.get(hit.space_id) ?? [];
      list.push(hit);
      groups.set(hit.space_id, list);
    }
    return [...groups.entries()];
  }, [hits]);

  const open = (hit: DocexSearchHit) => {
    const ws = wsById.get(hit.space_id);
    if (ws) navigate(Routes.docex.page(ws.slug, hit.slug));
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px' }}>
      <style>{`
        .docex-search-input { position: relative; }
        .docex-search-input svg { position: absolute; inset-inline-start: 12px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: var(--ds-icon-subtle); pointer-events: none; }
        .docex-search-input input { padding-inline-start: 36px; height: 44px; font: var(--ds-font-body-large); }
        .docex-hit { display: block; width: 100%; text-align: start; padding: 12px; border: none; border-radius: 8px; background: transparent; cursor: pointer; }
        .docex-hit:hover, .docex-hit:focus-visible { background: var(--ds-background-neutral-subtle); }
      `}</style>

      {/* ads-scanner:ignore-next-line — ADS heading token shorthand (font:) */}
      <h1 style={{ font: 'var(--ds-font-heading-large)', color: 'var(--ds-text)', margin: '0 0 16px' }}>
        Search Docex
      </h1>

      <div className="docex-search-input" style={{ marginBottom: 24 }}>
        <Search />
        <Input
          autoFocus
          value={query}
          placeholder="Search pages — title, content, DOC-n, or a work-item key (ICP-415)"
          onChange={(e) => {
            setQuery(e.target.value);
            setParams(e.target.value ? { q: e.target.value } : {}, { replace: true });
          }}
        />
      </div>

      {query.trim().length >= 2 && !isFetching && (hits?.length ?? 0) === 0 && (
        <p style={{ color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body)' }}>
          No pages match “{query.trim()}”.
        </p>
      )}

      {grouped.map(([spaceId, rows]) => {
        const ws = wsById.get(spaceId);
        return (
          <section key={spaceId} style={{ marginBottom: 24 }}>
            <h2
              style={{
                font: 'var(--ds-font-heading-xsmall)',
                color: 'var(--ds-text-subtle)',
                margin: '0 0 4px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {ws?.name ?? 'Workspace'}
            </h2>
            {rows.map((hit) => (
              <button key={hit.id} type="button" className="docex-hit" onClick={() => open(hit)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span aria-hidden style={{ fontSize: 16 }}>{hit.icon || '📄'}</span>
                  <span style={{ color: 'var(--ds-text)', font: 'var(--ds-font-body)', fontWeight: 600 }}>
                    {hit.title || 'Untitled'}
                  </span>
                </span>
                {hit.content_text && (
                  <span
                    dir="auto"
                    style={{
                      display: 'block',
                      marginTop: 2,
                      color: 'var(--ds-text-subtle)',
                      font: 'var(--ds-font-body-small)',
                      unicodeBidi: 'plaintext',
                    }}
                  >
                    {snippet(hit.content_text, query.trim())}
                  </span>
                )}
              </button>
            ))}
          </section>
        );
      })}
    </div>
  );
}
