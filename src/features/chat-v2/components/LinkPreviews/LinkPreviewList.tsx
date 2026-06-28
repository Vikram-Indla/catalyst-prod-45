import React from 'react';
import type { LinkPreviewRow } from '@/hooks/chat/useLinkPreview';

interface LinkPreviewListProps {
  previews: LinkPreviewRow[];
}

export function LinkPreviewList({ previews }: LinkPreviewListProps) {
  const renderable = previews.filter(p => p.title || p.description || p.imageUrl);
  if (renderable.length === 0) return null;
  return (
    <div
      style={{
        marginTop: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 520,
      }}
    >
      {renderable.map(p => (
        <LinkPreviewCard key={p.url} preview={p} />
      ))}
    </div>
  );
}

function LinkPreviewCard({ preview }: { preview: LinkPreviewRow }) {
  const accent = accentColorFor(preview.domain);
  const hasImage = !!preview.imageUrl;
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        textDecoration: 'none',
        color: 'inherit',
        borderLeft: `3px solid ${accent}`,
        paddingLeft: 10,
        background: 'transparent',
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 'var(--ds-font-size-200)',
            color: 'var(--cv2-text-subtle)',
          }}
        >
          <Favicon domain={preview.domain} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {preview.domain}
          </span>
        </div>
        {preview.title && (
          <div
            style={{
              fontSize: 'var(--ds-font-size-400)',
              fontWeight: 700,
              color: 'var(--cv2-link, var(--cv2-accent))',
              marginTop: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              wordBreak: 'break-word',
            }}
          >
            {preview.title}
          </div>
        )}
        {preview.description && (
          <div
            style={{
              fontSize: 'var(--ds-font-size-300)',
              color: 'var(--cv2-text)',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              wordBreak: 'break-word',
            }}
          >
            {preview.description}
          </div>
        )}
      </div>
      {hasImage && (
        <img
          src={preview.imageUrl ?? undefined}
          alt=""
          loading="lazy"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          style={{
            marginLeft: 12,
            width: 80,
            height: 80,
            objectFit: 'cover',
            borderRadius: 6,
            flex: '0 0 auto',
            background: 'var(--cv2-bg-row-hover)',
          }}
        />
      )}
    </a>
  );
}

function Favicon({ domain }: { domain: string }) {
  const src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
  return (
    <img
      src={src}
      alt=""
      width={14}
      height={14}
      loading="lazy"
      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      style={{ borderRadius: 3, flex: '0 0 auto' }}
    />
  );
}

// Stable accent color per domain — uses a tiny hash to pick from a fixed palette.
const ACCENT_PALETTE = [
  'var(--ds-link)', '#1D8DDA', '#36C5F0', '#2EB67D', // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
  '#7B61FF', 'var(--ds-background-danger-bold)', 'var(--ds-background-warning-bold)', '#9333EA', // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
];
function accentColorFor(domain: string): string {
  let h = 0;
  for (let i = 0; i < domain.length; i++) {
    h = (h * 31 + domain.charCodeAt(i)) >>> 0;
  }
  return ACCENT_PALETTE[h % ACCENT_PALETTE.length];
}
