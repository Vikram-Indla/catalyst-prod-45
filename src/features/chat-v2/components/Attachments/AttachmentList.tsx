import React from 'react';
import { ChevronDownIcon, FileGenericIcon } from '../shared/Icon';
import type { ChatAttachment } from '@/hooks/chat/useChatAttachments';

interface AttachmentListProps {
  attachments: ChatAttachment[];
}

export function AttachmentList({ attachments }: AttachmentListProps) {
  if (attachments.length === 0) return null;
  // align-items:flex-start guarantees every chip/image hugs the left edge
  // of the message body column instead of inheriting any centered text
  // alignment that might leak in from a parent.
  return (
    <div
      style={{
        marginTop: 6,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 8,
      }}
    >
      {attachments.map(a => (
        <AttachmentItem key={a.id} attachment={a} />
      ))}
    </div>
  );
}

function looksLikeImageMime(mime: string | null, filename: string): boolean {
  if (mime?.startsWith('image/')) return true;
  // Fallback for files saved with empty MIME type (some Mac drag flows).
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'heic', 'heif', 'avif'].includes(ext);
}

function AttachmentItem({ attachment }: { attachment: ChatAttachment }) {
  const isImage = looksLikeImageMime(attachment.mimeType, attachment.filename);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
      <a
        href={attachment.signedUrl ?? '#'}
        target="_blank"
        rel="noopener noreferrer"
        download={attachment.filename}
        aria-label={`Open ${attachment.filename}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 13,
          fontWeight: 400,
          color: 'var(--cv2-text-strong)',
          textDecoration: 'none',
          maxWidth: 360,
          minWidth: 0,
        }}
      >
        <span
          title={attachment.filename}
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {attachment.filename}
        </span>
        <ChevronDownIcon size={14} />
      </a>
      {isImage ? <ImagePreview attachment={attachment} /> : <FileCard attachment={attachment} />}
    </div>
  );
}

function ImagePreview({ attachment }: { attachment: ChatAttachment }) {
  if (!attachment.signedUrl) {
    return (
      <div
        style={{
          width: 240,
          height: 160,
          borderRadius: 8,
          background: 'var(--cv2-bg-row-hover)',
        }}
      />
    );
  }
  return (
    <a
      href={attachment.signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: 'inline-block', alignSelf: 'flex-start' }}
    >
      <img
        src={attachment.signedUrl}
        alt={attachment.filename}
        loading="lazy"
        style={{
          display: 'block',
          maxWidth: 360,
          maxHeight: 320,
          borderRadius: 8,
          border: '1px solid var(--cv2-border-strong)',
          objectFit: 'contain',
        }}
      />
    </a>
  );
}

function FileCard({ attachment }: { attachment: ChatAttachment }) {
  return (
    <a
      href={attachment.signedUrl ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      download={attachment.filename}
      style={{
        marginTop: 4,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        maxWidth: 360,
        padding: '10px 12px',
        borderRadius: 8,
        border: '1px solid var(--cv2-border-strong)',
        background: 'var(--cv2-bg-input)',
        color: 'var(--cv2-text)',
        textDecoration: 'none',
      }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 6,
          background: 'var(--cv2-bg-row-hover)',
          color: 'var(--cv2-text-subtle)',
          flex: '0 0 auto',
        }}
      >
        <FileGenericIcon size={16} />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--cv2-text-strong)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {attachment.filename}
        </span>
        <span style={{ fontSize: 12, color: 'var(--cv2-text-muted)' }}>
          {formatBytes(attachment.byteSize)}
        </span>
      </span>
    </a>
  );
}

function formatBytes(n: number | null): string {
  if (n == null) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
