/**
 * LinkUnfurl — compact Slack-style preview card rendered below a message
 * for every URL detected in body_text (cap 4). Reads cached OG metadata
 * from chat_link_previews; falls back to a domain-only stub when the
 * cache row is missing (edge function not yet wired). Always opens in a
 * new tab with rel=noopener noreferrer.
 */
import React, { useMemo } from 'react';
import { extractUrls, useLinkPreviews } from '@/hooks/chat/useLinkPreview';

export interface LinkUnfurlProps {
  bodyText: string;
}

export function LinkUnfurl({ bodyText }: LinkUnfurlProps) {
  const urls = useMemo(() => extractUrls(bodyText), [bodyText]);
  const { data: previews = [] } = useLinkPreviews(urls);

  if (urls.length === 0) return null;

  return (
    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {previews.map((p) => (
        <a
          key={p.url}
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            gap: 10,
            padding: 10,
            border: '1px solid var(--ds-border)',
            borderLeft: '4px solid var(--ds-border-brand)',
            borderRadius: 4,
            background: 'var(--ds-surface)',
            textDecoration: 'none',
            color: 'var(--ds-text)',
            maxWidth: 480,
          }}
        >
          {p.imageUrl && (
            <img
              src={p.imageUrl}
              alt=""
              loading="lazy"
              style={{
                width: 56,
                height: 56,
                objectFit: 'cover',
                borderRadius: 3,
                flexShrink: 0,
              }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 'var(--ds-font-size-100)', color: 'var(--ds-text-subtle)' }}>
              {p.domain}
            </div>
            <div
              style={{
                fontSize: 'var(--ds-font-size-300)',
                fontWeight: 500,
                color: 'var(--ds-text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {p.title ?? p.url}
            </div>
            {p.description && (
              <div
                style={{
                  fontSize: 'var(--ds-font-size-200)',
                  color: 'var(--ds-text-subtle)',
                  marginTop: 2,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {p.description}
              </div>
            )}
          </div>
        </a>
      ))}
    </div>
  );
}

export default LinkUnfurl;
