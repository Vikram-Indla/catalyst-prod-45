/**
 * DocexVersionHistory — version list + restore for a Docex page
 * (CAT-DOCS-NOTION-20260704-001 Pass D, P1-2). Rows come from
 * kb_document_versions (snapshots written on a 10-minute autosave throttle
 * and via "Save version now"). Restoring snapshots the CURRENT state first,
 * so a restore is itself always reversible.
 */
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { catalystToast } from '@/lib/catalystToast';
import {
  useDocexVersions,
  useSaveVersion,
  useUpdateWikiPage,
  type DocexVersion,
  type WikiPage,
} from '@/hooks/useWiki';
import { blocksToText } from './editor/blocksToText';
import type { Block } from '@blocknote/core';

export interface DocexVersionHistoryProps {
  page: WikiPage;
  open: boolean;
  onClose: () => void;
  /** Current editor blocks (pending edits included) — snapshotted pre-restore. */
  getBlocks: () => Block[];
}

export function DocexVersionHistory({ page, open, onClose, getBlocks }: DocexVersionHistoryProps) {
  const { data: versions, isLoading } = useDocexVersions(open ? page.id : '');
  const saveVersion = useSaveVersion();
  const updatePage = useUpdateWikiPage();
  const [restoring, setRestoring] = useState<string | null>(null);

  const restore = async (v: DocexVersion) => {
    setRestoring(v.id);
    try {
      // Safety net: the state being replaced becomes a version itself.
      const currentDoc = getBlocks();
      await saveVersion.mutateAsync({
        documentId: page.id,
        title: page.title,
        content: currentDoc,
        contentText: blocksToText(currentDoc),
        changeSummary: `Before restoring v${v.version_number}`,
      });
      await updatePage.mutateAsync({
        id: page.id,
        spaceId: page.space_id,
        patch: {
          content: v.content,
          content_text: blocksToText((v.content as Block[]) ?? []),
          content_format: 'blocknote',
          ...(v.title ? { title: v.title } : {}),
        },
      });
      // Remount the editor with the restored content.
      window.location.reload();
    } catch (e) {
      setRestoring(null);
      catalystToast.error('Restore failed', e instanceof Error ? e.message : undefined);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent style={{ maxWidth: 560 }}>
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <Skeleton style={{ height: 120, borderRadius: 8 }} />
        ) : (versions?.length ?? 0) === 0 ? (
          <p style={{ color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body)', margin: 0 }}>
            No versions yet. A snapshot is saved automatically every 10 minutes of
            editing, or on demand via “Save version now”.
          </p>
        ) : (
          <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {(versions ?? []).map((v) => (
              <div
                key={v.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--ds-border)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--ds-text)', font: 'var(--ds-font-body)', fontWeight: 600 }}>
                    v{v.version_number}
                    {v.change_summary ? ` — ${v.change_summary}` : ''}
                  </div>
                  <div style={{ color: 'var(--ds-text-subtle)', font: 'var(--ds-font-body-small)' }}>
                    {new Date(v.created_at).toLocaleString()}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={restoring !== null}
                  onClick={() => restore(v)}
                >
                  {restoring === v.id ? 'Restoring…' : 'Restore'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
