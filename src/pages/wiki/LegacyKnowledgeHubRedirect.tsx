/**
 * LegacyKnowledgeHubRedirect — UUID→slug redirects for the old
 * /knowledge-hub/* URLs (CAT-DOCS-NOTION-20260704-001, slug contract).
 *
 * The Knowledge Hub surfaces are absorbed into the Wiki hub; old bookmarks
 * and shared links resolve their UUID against kb_doc_spaces / kb_documents
 * and land on the canonical /wiki slug URL. Unresolvable ids fall back to
 * the Wiki home rather than a dead end.
 */
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Spinner from '@atlaskit/spinner';
import { supabase } from '@/integrations/supabase/client';
import { Routes } from '@/lib/routes';

const db = supabase as unknown as {
  from: (table: string) => any;
};

function Loading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <Spinner size="medium" label="Redirecting" />
    </div>
  );
}

/** /knowledge-hub/spaces/:spaceId → /wiki/:workspaceSlug */
export function LegacySpaceRedirect() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await db
        .from('kb_doc_spaces')
        .select('slug')
        .eq('id', spaceId)
        .maybeSingle();
      if (cancelled) return;
      navigate(data?.slug ? Routes.wiki.workspace(data.slug) : Routes.wiki.root(), {
        replace: true,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [spaceId, navigate]);

  return <Loading />;
}

/** /knowledge-hub/documents/:documentId → /wiki/:workspaceSlug/:pageSlug */
export function LegacyDocumentRedirect() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await db
        .from('kb_documents')
        .select('slug, space_id')
        .eq('id', documentId)
        .maybeSingle();
      let workspaceSlug: string | undefined;
      if (data?.space_id) {
        const { data: space } = await db
          .from('kb_doc_spaces')
          .select('slug')
          .eq('id', data.space_id)
          .maybeSingle();
        workspaceSlug = space?.slug;
      }
      if (cancelled) return;
      navigate(
        workspaceSlug && data?.slug
          ? Routes.wiki.page(workspaceSlug, data.slug)
          : Routes.wiki.root(),
        { replace: true },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [documentId, navigate]);

  return <Loading />;
}
