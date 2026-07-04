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
import { Lozenge } from '@/components/ads';
import { Button } from '@/components/ui/button';
import { Routes } from '@/lib/routes';
import AttachWikiPageDialog from '@/components/wiki-hub/AttachWikiPageDialog';
import {
  useUnlinkPageFromWorkItem,
  useWikiPagesForWorkItem,
  type WikiEntityType,
} from '@/hooks/useWiki';

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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDialogOpen(true)}
          aria-label="Link a wiki page"
          style={{ marginInlineStart: 'auto', height: 28 }}
        >
          <Plus style={{ width: 14, height: 14, marginInlineEnd: 4 }} /> Add
        </Button>
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
