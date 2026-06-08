/**
 * AttachmentPreview — renders chat_attachments rows under a message:
 *   - image/*  → inline thumbnail (signed URL, lazy-loaded, click to open)
 *   - other    → file chip with filename + size + "Download" link
 *
 * Signed URLs come from chat-attachments Storage bucket (private). Each URL
 * is fetched on mount and cached for ~60 min (bucket TTL). Clicking the chip
 * or thumb opens the URL in a new tab.
 */
import React, { useEffect, useState } from 'react';
import { signAttachmentUrl, type ChatAttachment } from '@/hooks/chat/useChatAttachments';

export interface AttachmentPreviewProps {
  attachments: ChatAttachment[];
}

function formatBytes(n: number | null): string {
  if (n == null) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function isImageMime(mime: string | null): boolean {
  return !!mime && mime.startsWith('image/');
}

function AttachmentTile({ a }: { a: ChatAttachment }) {
  const [url, setUrl] = useState<string | null>(null);
  const [errored, setErrored] = useState(false);
  const image = isImageMime(a.mimeType);

  useEffect(() => {
    let cancelled = false;
    signAttachmentUrl(a.storagePath).then((u) => {
      if (!cancelled) {
        if (u) setUrl(u);
        else setErrored(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [a.storagePath]);

  if (image && url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-block',
          marginTop: 6,
          marginRight: 6,
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid var(--ds-border, #DFE1E6)',
          maxWidth: 320,
          maxHeight: 240,
        }}
        title={a.filename}
      >
        <img
          src={url}
          alt={a.filename}
          loading="lazy"
          style={{ display: 'block', maxWidth: '100%', maxHeight: 240, objectFit: 'cover' }}
        />
      </a>
    );
  }

  return (
    <a
      href={url ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        if (!url) e.preventDefault();
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 6,
        marginRight: 6,
        padding: '6px 10px',
        background: 'var(--ds-background-neutral, #F1F2F4)',
        border: '1px solid var(--ds-border, #DFE1E6)',
        borderRadius: 4,
        color: 'var(--ds-text, #172B4D)',
        fontSize: 13,
        textDecoration: 'none',
        maxWidth: 320,
      }}
      title={a.filename}
    >
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {a.filename}
      </span>
      <span style={{ color: 'var(--ds-text-subtle, #44546F)', fontSize: 12 }}>
        {formatBytes(a.byteSize)}
      </span>
      {errored && (
        <span style={{ color: 'var(--ds-text-danger, #AE2A19)', fontSize: 11 }}>error</span>
      )}
    </a>
  );
}

export function AttachmentPreview({ attachments }: AttachmentPreviewProps) {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 4 }}>
      {attachments.map((a) => (
        <AttachmentTile key={a.id} a={a} />
      ))}
    </div>
  );
}

export default AttachmentPreview;
