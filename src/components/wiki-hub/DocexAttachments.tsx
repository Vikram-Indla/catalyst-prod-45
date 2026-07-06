/**
 * DocexAttachments — the page's Attachments section (CAT-DOCEX-DB-COEDIT-
 * 20260705-001 V4, Vikram 2026-07-06: "It has to be attachment heavy").
 * Rows = kb_document_attachments; files live in the public wiki-media bucket.
 */
import { useRef } from 'react';
import { Paperclip, X, Upload } from '@/lib/atlaskit-icons';
import {
  useDocexAttachments,
  useUploadDocexAttachment,
  useDeleteDocexAttachment,
  wikiAttachmentUrl,
  type WikiAttachment,
} from '@/hooks/useWiki';

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

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) upload.mutate({ documentId, file });
    if (inputRef.current) inputRef.current.value = '';
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
              <button
                type="button"
                aria-label={`Remove ${a.filename}`}
                onClick={() => remove.mutate(a)}
                style={{
                  marginInlineStart: 'auto',
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
