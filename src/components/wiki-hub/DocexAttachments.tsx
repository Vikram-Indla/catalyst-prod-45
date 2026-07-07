/**
 * DocexAttachments — the page's Attachments section (CAT-DOCEX-DB-COEDIT-
 * 20260705-001 V4, Vikram 2026-07-06: "It has to be attachment heavy").
 * Rows = kb_document_attachments; files live in the public wiki-media bucket.
 */
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paperclip, X, Upload } from '@/lib/atlaskit-icons';
import {
  useDocexAttachments,
  useUploadDocexAttachment,
  useDeleteDocexAttachment,
  wikiAttachmentUrl,
  type WikiAttachment,
} from '@/hooks/useWiki';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip } from '@/components/ads';
import { catalystToast } from '@/lib/catalystToast';
import { Routes } from '@/lib/routes';
import { docintelApi } from '@/modules/docintel/domain';

const WIKI_MEDIA_BUCKET = 'wiki-media';

/** True for PDF / DOCX attachments — the doc types docintel can ingest. */
function isAnalyzable(a: WikiAttachment): boolean {
  const mime = (a.mime_type || '').toLowerCase();
  const name = (a.filename || '').toLowerCase();
  return (
    mime === 'application/pdf' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'application/msword' ||
    name.endsWith('.pdf') ||
    name.endsWith('.docx') ||
    name.endsWith('.doc')
  );
}

/**
 * Resolve the Catalyst project (ph_projects.id) that owns a wiki document, via
 * its space's container. Project-scoped spaces carry container_type='project'
 * and container_id = the project id. Returns null when the doc lives in a
 * non-project space (My Space / product / org) — caller then deep-links to the
 * Doc Intelligence upload page instead of blocking.
 */
async function resolveDocProjectId(documentId: string): Promise<string | null> {
  const db = supabase as unknown as { from: (t: string) => any };
  const { data: doc } = await db
    .from('kb_documents')
    .select('space_id')
    .eq('id', documentId)
    .maybeSingle();
  const spaceId = doc?.space_id as string | undefined;
  if (!spaceId) return null;
  const { data: space } = await db
    .from('kb_doc_spaces')
    .select('container_type, container_id')
    .eq('id', spaceId)
    .maybeSingle();
  if (space?.container_type === 'project' && space?.container_id) {
    return space.container_id as string;
  }
  return null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocexAttachments({ documentId }: { documentId: string }) {
  const { data: attachments } = useDocexAttachments(documentId);
  const upload = useUploadDocexAttachment();
  const remove = useDeleteDocexAttachment();
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) upload.mutate({ documentId, file });
    if (inputRef.current) inputRef.current.value = '';
  };

  /**
   * Send an attachment to Doc Intelligence: resolve the owning project, download
   * the file, upload+ingest it, then open the new document's workspace. If the
   * project can't be resolved (non-project space), deep-link to the upload page.
   */
  const onAnalyze = async (a: WikiAttachment) => {
    if (analyzingId) return;
    setAnalyzingId(a.id);
    try {
      const projectId = await resolveDocProjectId(documentId);
      if (!projectId) {
        navigate(Routes.docintel.upload());
        return;
      }
      const { data: blob, error: dlErr } = await supabase.storage
        .from(WIKI_MEDIA_BUCKET)
        .download(a.file_path);
      if (dlErr || !blob) {
        navigate(Routes.docintel.upload());
        return;
      }
      const file = new File([blob], a.filename, {
        type: a.mime_type || 'application/octet-stream',
      });
      catalystToast.info('Analyzing in Document Intelligence', a.filename);
      const results = await docintelApi.uploadAndIngest({ projectId, files: [file] });
      const slug = results[0]?.slug ?? null;
      navigate(slug ? Routes.docintel.workspace(slug) : Routes.docintel.list());
    } catch (e) {
      catalystToast.error(
        'Could not analyze attachment',
        e instanceof Error ? e.message : 'Please try again.',
      );
    } finally {
      setAnalyzingId(null);
    }
  };

  return (
    <div className="wiki-no-print" role="group" aria-label="Attachments" style={{ marginTop: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Paperclip style={{ width: 16, height: 16, color: 'var(--ds-icon)' }} />
        <h2 style={{ font: 'var(--ds-font-heading-small)', color: 'var(--ds-text)', margin: 0 }}>
          Attachments{attachments?.length ? ` (${attachments.length})` : ''}
        </h2>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginInlineStart: 'auto',
            padding: '4px 10px',
            border: '1px solid var(--ds-border)',
            borderRadius: 6,
            background: 'var(--ds-surface)',
            color: 'var(--ds-text)',
            font: 'var(--ds-font-body-small)',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <Upload style={{ width: 13, height: 13 }} />
          {upload.isPending ? 'Uploading…' : 'Upload'}
        </button>
        <input ref={inputRef} type="file" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      </div>

      {attachments && attachments.length > 0 ? (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {attachments.map((a: WikiAttachment) => (
            <li
              key={a.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid var(--ds-border)',
                background: 'var(--ds-surface)',
              }}
            >
              <Paperclip style={{ width: 14, height: 14, color: 'var(--ds-icon-subtle)', flexShrink: 0 }} />
              <a
                href={wikiAttachmentUrl(a)}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: 'var(--ds-text-brand)',
                  font: 'var(--ds-font-body)',
                  textDecoration: 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {a.filename}
              </a>
              <span style={{ color: 'var(--ds-text-subtlest)', font: 'var(--ds-font-body-small)', flexShrink: 0 }}>
                {formatSize(a.file_size)}
              </span>
              {isAnalyzable(a) && (
                <span style={{ marginInlineStart: 'auto', flexShrink: 0 }}>
                  <Tooltip content="Analyze in Document Intelligence">
                    <button
                      type="button"
                      aria-label={`Analyze ${a.filename} in Document Intelligence`}
                      onClick={() => onAnalyze(a)}
                      disabled={analyzingId === a.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '3px 8px',
                        border: '1px solid var(--ds-border)',
                        borderRadius: 6,
                        background: 'var(--ds-surface)',
                        color: 'var(--ds-text)',
                        font: 'var(--ds-font-body-small)',
                        fontWeight: 500,
                        cursor: analyzingId === a.id ? 'default' : 'pointer',
                        opacity: analyzingId === a.id ? 0.6 : 1,
                      }}
                    >
                      {analyzingId === a.id ? 'Analyzing…' : 'Analyze'}
                    </button>
                  </Tooltip>
                </span>
              )}
              <button
                type="button"
                aria-label={`Remove ${a.filename}`}
                onClick={() => remove.mutate(a)}
                style={{
                  marginInlineStart: isAnalyzable(a) ? undefined : 'auto',
                  display: 'inline-flex',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--ds-icon-subtle)',
                  cursor: 'pointer',
                  padding: 2,
                }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: 'var(--ds-text-subtlest)', font: 'var(--ds-font-body-small)', margin: 0 }}>
          No attachments yet.
        </p>
      )}
    </div>
  );
}
