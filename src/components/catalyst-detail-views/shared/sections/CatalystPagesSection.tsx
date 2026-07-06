/**
 * CatalystPagesSection — "Pages" section for every work item detail view
 * (CAT-DOCS-NOTION-20260704-001, Confluence↔Jira parity).
 *
 * Shows Wiki pages linked to this work item (manual attach or automatic
 * @-mention links), lets the user attach an existing page or create a new
 * one in any workspace. Mounted across business request, epic, feature,
 * story, task, defect, incident, test case and idea views (not subtask).
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, X } from '@/lib/atlaskit-icons';
import { DropdownMenu, Lozenge } from '@/components/ads';
import { Button } from '@/components/ui/button';
import { Routes } from '@/lib/routes';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import AttachWikiPageDialog from '@/components/wiki-hub/AttachWikiPageDialog';
import {
  useCreateWikiPage,
  useLinkPageToWorkItem,
  useMySpace,
  useUnlinkPageFromWorkItem,
  useWikiPagesForWorkItem,
  useWikiWorkspaces,
  type WikiEntityType,
} from '@/hooks/useWiki';

const db = supabase as unknown as { from: (t: string) => any };

export interface CatalystPagesSectionProps {
  entityType: WikiEntityType;
  /** Underlying row UUID (as text). Null while the item is loading. */
  entityId: string | null | undefined;
  /** Display key (e.g. BAU-5389) — seeds new page titles. */
  entityLabel?: string | null;
  /** Mirror CatalystActivitySection: only fetch while the view is open. */
  isOpen?: boolean;
}

export function CatalystPagesSection({
  entityType,
  entityId,
  entityLabel,
  isOpen = true,
}: CatalystPagesSectionProps) {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: links } = useWikiPagesForWorkItem(
    isOpen && entityId ? entityType : undefined,
    entityId,
  );
  const unlink = useUnlinkPageFromWorkItem();

  // "Convert to Folio document" (design-critique F6, Vikram 2026-07-06):
  // one click from the + menu creates a page SEEDED from this work item in
  // the RECOMMENDED workspace (the item's own project/product; falls back to
  // My Space), links it both ways, and opens it.
  const { data: workspaces } = useWikiWorkspaces();
  const { mySpace } = useMySpace();
  const createPage = useCreateWikiPage();
  const linkPage = useLinkPageToWorkItem();
  const [converting, setConverting] = useState(false);
  const convertToFolio = async () => {
    if (!entityId || converting) return;
    setConverting(true);
    try {
      // Source row → title/body + owning project/product.
      const src =
        entityType === 'business_request'
          ? await db.from('business_requests').select('title, description, product_id').eq('id', entityId).maybeSingle()
          : await db.from('ph_issues').select('summary, description_text, project_key').eq('id', entityId).maybeSingle();
      const row = src.data ?? {};
      const summary: string = row.title ?? row.summary ?? '';
      const body: string = row.description ?? row.description_text ?? '';

      // Recommended workspace: the item's own container, else My Space.
      let ws = null as null | { id: string; slug: string; name: string };
      if (entityType === 'business_request' && row.product_id) {
        ws = (workspaces ?? []).find((w) => w.container_type === 'product' && w.container_id === row.product_id) ?? null;
      } else if (row.project_key) {
        const { data: proj } = await supabase.from('v_project_list').select('id').eq('project_key', row.project_key).maybeSingle();
        if (proj) ws = (workspaces ?? []).find((w) => w.container_type === 'project' && w.container_id === (proj as { id: string }).id) ?? null;
      }
      ws = ws ?? mySpace ?? (workspaces ?? [])[0] ?? null;
      if (!ws) throw new Error('No Folio workspace available');

      const blocks: unknown[] = [];
      if (summary) blocks.push({ type: 'heading', props: { level: 2 }, content: summary });
      for (const para of String(body).split(/\n{2,}/).map((s) => s.trim()).filter(Boolean)) {
        blocks.push({ type: 'paragraph', content: para });
      }
      const title = entityLabel ? `${entityLabel} — ${summary || 'document'}` : summary || 'Untitled';
      const target = ws;
      createPage.mutate(
        { spaceId: target.id, title, content: blocks as never },
        {
          onSuccess: (page) => {
            linkPage.mutate(
              { documentId: page.id, entityType, entityId, origin: 'manual' },
              {
                onSuccess: () => {
                  catalystToast.success(`Folio document created in ${target.name}`);
                  navigate(Routes.folio.page(target.slug, page.slug));
                },
              },
            );
          },
          onSettled: () => setConverting(false),
        },
      );
    } catch (e) {
      setConverting(false);
      catalystToast.error(`Convert failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  if (!entityId) return null;

  const rows = (links ?? []).filter((l) => l.document);

  return (
    <section aria-label="Pages" style={{ marginTop: 20 }} data-testid="catalyst-pages-section">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <FileText aria-hidden style={{ width: 15, height: 15, color: 'var(--ds-icon)' }} />
        {/* ads-scanner:ignore-next-line — ADS heading token shorthand (font:), not split fontSize/fontWeight */}
        <h3 style={{ font: 'var(--ds-font-heading-xsmall)', color: 'var(--ds-text)', margin: 0 }}>
          Pages
        </h3>
        {rows.length > 0 && (
          <span style={{ color: 'var(--ds-text-subtlest)', font: 'var(--ds-font-body-small)' }}>
            {rows.length}
          </span>
        )}
        <div style={{ marginInlineStart: 'auto' }}>
          <DropdownMenu
            aria-label="Add a page"
            placement="bottom-end"
            shouldRenderToParent={false}
            trigger={() => (
              <Button variant="ghost" size="sm" aria-label="Add a page" style={{ height: 28 }}>
                <Plus style={{ width: 14, height: 14, marginInlineEnd: 4 }} /> Add
              </Button>
            )}
            groups={[
              {
                key: 'pages-add',
                items: [
                  {
                    key: 'convert',
                    label: converting ? 'Creating Folio document…' : 'Convert to Folio document',
                    isDisabled: converting,
                    onClick: () => void convertToFolio(),
                  },
                  {
                    key: 'link',
                    label: 'Link or create a page…',
                    onClick: () => setDialogOpen(true),
                  },
                ],
              },
            ]}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <p style={{ color: 'var(--ds-text-subtlest)', font: 'var(--ds-font-body-small)', margin: '2px 0 0 23px' }}>
          No pages linked yet.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {rows.map((link) => {
            const doc = link.document!;
            const space = (doc as { space?: { slug: string; name: string } | null }).space;
            return (
              <li
                key={link.id}
                className="catalyst-pages-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  borderRadius: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() => space && navigate(Routes.wiki.page(space.slug, doc.slug))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flex: 1,
                    minWidth: 0,
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--ds-text)',
                    font: 'var(--ds-font-body)',
                    cursor: 'pointer',
                    padding: 0,
                    textAlign: 'start',
                  }}
                >
                  {doc.icon ? (
                    <span aria-hidden style={{ width: 16, textAlign: 'center', flexShrink: 0 }}>{doc.icon}</span>
                  ) : (
                    <FileText aria-hidden style={{ width: 14, height: 14, color: 'var(--ds-icon-subtle)', flexShrink: 0 }} />
                  )}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.title || 'Untitled'}
                  </span>
                  {space ? (
                    <span style={{ color: 'var(--ds-text-subtlest)', font: 'var(--ds-font-body-small)', flexShrink: 0 }}>
                      {space.name}
                    </span>
                  ) : null}
                  {link.link_origin === 'mention' && <Lozenge appearance="new">Mentioned</Lozenge>}
                </button>
                <button
                  type="button"
                  aria-label={`Unlink ${doc.title || 'page'}`}
                  onClick={() =>
                    unlink.mutate({
                      linkId: link.id,
                      documentId: doc.id,
                      entityType,
                      entityId,
                    })
                  }
                  className="catalyst-pages-unlink"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 22,
                    height: 22,
                    border: 'none',
                    borderRadius: 4,
                    background: 'transparent',
                    color: 'var(--ds-icon-subtle)',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <X style={{ width: 13, height: 13 }} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <style>{`
        .catalyst-pages-row .catalyst-pages-unlink { visibility: hidden; }
        .catalyst-pages-row:hover .catalyst-pages-unlink { visibility: visible; }
        .catalyst-pages-row:hover { background: var(--ds-background-neutral-subtle); }
      `}</style>

      {dialogOpen && (
        <AttachWikiPageDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          entityType={entityType}
          entityId={entityId}
          entityLabel={entityLabel}
        />
      )}
    </section>
  );
}

export default CatalystPagesSection;
