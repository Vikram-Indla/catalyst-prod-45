/**
 * AttachWikiPageDialog — link an existing Wiki page (or create a new one)
 * to any work item (CAT-DOCS-NOTION-20260704-001).
 *
 * Confluence↔Jira parity: attaching from the work item side creates the
 * link and, for new pages, creates the page inside the chosen workspace.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Search } from '@/lib/atlaskit-icons';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { Routes } from '@/lib/routes';
import {
  useCreateWikiPage,
  useLinkPageToWorkItem,
  useWikiWorkspaces,
  type WikiEntityType,
} from '@/hooks/useWiki';

export interface AttachWikiPageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: WikiEntityType;
  entityId: string;
  /** Display key (e.g. BAU-5389) used to seed new page titles. */
  entityLabel?: string | null;
}

export function AttachWikiPageDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityLabel,
}: AttachWikiPageDialogProps) {
  const navigate = useNavigate();
  const { data: workspaces } = useWikiWorkspaces();
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');

  const linkPage = useLinkPageToWorkItem();
  const createPage = useCreateWikiPage();

  const effectiveWorkspaceId = workspaceId ?? workspaces?.[0]?.id;
  const effectiveWorkspace = useMemo(
    () => workspaces?.find((w) => w.id === effectiveWorkspaceId),
    [workspaces, effectiveWorkspaceId],
  );

  const { data: candidates, isLoading } = useQuery({
    queryKey: ['wiki', 'attach-candidates', effectiveWorkspaceId, search],
    enabled: open && !!effectiveWorkspaceId,
    queryFn: async () => {
      let q = (supabase as never as { from: (t: string) => any })
        .from('kb_documents')
        .select('id, title, slug, icon, space_id')
        .eq('space_id', effectiveWorkspaceId)
        .eq('is_template', false)
        .order('updated_at', { ascending: false })
        .limit(20);
      if (search.trim()) q = q.ilike('title', `%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; title: string; slug: string; icon: string | null }>;
    },
  });

  const attach = (documentId: string, title: string) => {
    linkPage.mutate(
      { documentId, entityType, entityId, origin: 'manual' },
      {
        onSuccess: () => {
          catalystToast.success(`Linked "${title}"`);
          onOpenChange(false);
        },
        onError: () => catalystToast.error('Could not link the page'),
      },
    );
  };

  // "Convert" seeding (Vikram 2026-07-06): a page created FROM a work item
  // starts with the item's summary + description, not blank.
  const fetchSeedBlocks = async (): Promise<unknown[] | undefined> => {
    try {
      const source =
        entityType === 'business_request'
          ? await (supabase as any)
              .from('business_requests')
              .select('title, description, request_key')
              .eq('id', entityId)
              .maybeSingle()
          : await (supabase as any)
              .from('ph_issues')
              .select('summary, description_text, issue_key')
              .eq('id', entityId)
              .maybeSingle();
      const row = source.data;
      if (!row) return undefined;
      const summary: string = row.title ?? row.summary ?? '';
      const body: string = row.description ?? row.description_text ?? '';
      const blocks: unknown[] = [];
      if (summary) blocks.push({ type: 'heading', props: { level: 2 }, content: summary });
      for (const para of String(body).split(/\n{2,}/).map((s) => s.trim()).filter(Boolean)) {
        blocks.push({ type: 'paragraph', content: para });
      }
      return blocks.length ? blocks : undefined;
    } catch {
      return undefined; // seeding is best-effort — a blank page still links
    }
  };

  const createAndAttach = async () => {
    if (!effectiveWorkspaceId || !effectiveWorkspace) return;
    const title = search.trim() || (entityLabel ? `${entityLabel} — notes` : 'Untitled');
    const seed = await fetchSeedBlocks();
    createPage.mutate(
      { spaceId: effectiveWorkspaceId, title, parentId: null, content: seed as never },
      {
        onSuccess: (page) => {
          linkPage.mutate(
            { documentId: page.id, entityType, entityId, origin: 'manual' },
            {
              onSuccess: () => {
                catalystToast.success(`Created and linked "${title}"`);
                onOpenChange(false);
                navigate(Routes.wiki.page(effectiveWorkspace.slug, page.slug));
              },
            },
          );
        },
        onError: () => catalystToast.error('Could not create the page'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 520 }}>
        <DialogHeader>
          <DialogTitle>Link a wiki page</DialogTitle>
        </DialogHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Select value={effectiveWorkspaceId} onValueChange={setWorkspaceId}>
            <SelectTrigger aria-label="Workspace">
              <SelectValue placeholder="Choose a workspace" />
            </SelectTrigger>
            <SelectContent>
              {(workspaces ?? []).map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div style={{ position: 'relative' }}>
            <Search
              style={{
                position: 'absolute',
                insetInlineStart: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 15,
                height: 15,
                color: 'var(--ds-icon-subtle)',
              }}
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pages, or type a new page title"
              style={{ paddingInlineStart: 32 }}
              aria-label="Search pages"
            />
          </div>

          <div
            style={{
              maxHeight: 260,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              border: '1px solid var(--ds-border)',
              borderRadius: 6,
              padding: 4,
              minHeight: 80,
            }}
          >
            {isLoading ? (
              <p style={{ color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body-small)', padding: 10, margin: 0 }}>
                Loading pages…
              </p>
            ) : (candidates ?? []).length === 0 ? (
              <p style={{ color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body-small)', padding: 10, margin: 0 }}>
                {search ? 'No matching pages — create one below.' : 'No pages in this workspace yet.'}
              </p>
            ) : (
              (candidates ?? []).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => attach(c.id, c.title)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 10px',
                    border: 'none',
                    borderRadius: 4,
                    background: 'transparent',
                    color: 'var(--ds-text)',
                    font: 'var(--ds-font-body)',
                    cursor: 'pointer',
                    textAlign: 'start',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-background-neutral-subtle)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  {c.icon ? (
                    <span aria-hidden style={{ width: 16, textAlign: 'center' }}>{c.icon}</span>
                  ) : (
                    <FileText aria-hidden style={{ width: 14, height: 14, color: 'var(--ds-icon-subtle)' }} />
                  )}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.title || 'Untitled'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={createAndAttach} disabled={!effectiveWorkspaceId || createPage.isPending}>
            {search.trim() ? `Create "${search.trim()}"` : 'Create new page'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AttachWikiPageDialog;
