import React, { useEffect, useState } from 'react';
import { XIcon, FileGenericIcon } from '../shared/Icon';

export interface StagedAttachment {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  errorMessage?: string;
}

interface ComposerAttachmentChipProps {
  attachment: StagedAttachment;
  onRemove: () => void;
}

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'heic', 'heif', 'avif']);

function looksLikeImage(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.has(ext);
}

export function ComposerAttachmentChip({ attachment, onRemove }: ComposerAttachmentChipProps) {
  const isImage = looksLikeImage(attachment.file);
  const previewUrl = useImagePreview(isImage ? attachment.file : null);
  const [hover, setHover] = useState(false);
  const uploading = attachment.status === 'uploading' || attachment.status === 'pending';
  const errored = attachment.status === 'error';

  return (
    <div
      role="group"
      aria-label={attachment.file.name}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        width: 80,
        height: 80,
        flex: '0 0 auto',
        // Outer wrapper must NOT clip — the X button overflows the top-right corner.
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 8,
          background: 'var(--cv2-bg-input)',
          border: `1px solid ${errored ? 'var(--cv2-danger)' : 'var(--cv2-border)'}`,
          overflow: 'hidden',
        }}
      >
        {isImage && previewUrl ? (
          <img
            src={previewUrl}
            alt={attachment.file.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <FileCardThumb file={attachment.file} />
        )}
        {uploading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--ds-shadow-raised, rgba(0,0,0,0.35))',
            }}
          >
            <Spinner />
          </div>
        )}
        {errored && (
          <div
            title={attachment.errorMessage}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '2px 4px',
              background: 'var(--cv2-danger)',
              color: 'var(--ds-text-inverse)',
              fontSize: 'var(--ds-font-size-50)',
              fontWeight: 700,
              textAlign: 'center',
            }}
          >
            FAILED
          </div>
        )}
      </div>
      {hover && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${attachment.file.name}`}
          style={{
            position: 'absolute',
            top: -8,
            right: -8,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#1A1D21', // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
            color: 'var(--ds-text-inverse)',
            border: '2px solid var(--cv2-bg-panel)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            zIndex: 2,
          }}
        >
          <XIcon size={10} />
        </button>
      )}
    </div>
  );
}

function FileCardThumb({ file }: { file: File }) {
  const ext = (file.name.split('.').pop() ?? '').toUpperCase().slice(0, 4);
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        color: 'var(--cv2-text-subtle)',
        padding: 6,
        boxSizing: 'border-box',
      }}
    >
      <FileGenericIcon size={28} />
      <div
        style={{
          fontSize: 'var(--ds-font-size-50)',
          fontWeight: 700,
          color: 'var(--cv2-text)',
          textTransform: 'uppercase',
        }}
      >
        {ext || 'FILE'}
      </div>
      <div
        title={file.name}
        style={{
          fontSize: 'var(--ds-font-size-50)',
          color: 'var(--cv2-text-muted)',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textAlign: 'center',
        }}
      >
        {file.name}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        border: '2px solid var(--ds-surface, rgba(255,255,255,0.3))',
        borderTopColor: 'var(--ds-surface)',
        animation: 'cv2-attach-spin 0.8s linear infinite',
      }}
    />
  );
}

/**
 * Creates a stable object URL for the given file. Using useMemo + cleanup
 * effect breaks under React 18 strict-mode double-mount: the cleanup
 * revokes the URL, then re-mount returns the SAME memoized (now-dead) URL
 * because the file reference didn't change — the <img> renders as a
 * broken-image placeholder. Creating the URL inside useEffect with state
 * guarantees the URL we return is the same one we eventually revoke.
 */
function useImagePreview(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) { setUrl(null); return; }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}
