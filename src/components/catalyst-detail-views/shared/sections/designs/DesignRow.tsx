/**
 * DesignRow — single saved Figma URL rendered inside DesignsSection.
 *
 * Visual contract mirrors WebLinkRow:
 *   - Bordered card with subtle shadow
 *   - Link icon + URL label (shortened to host + Figma file name)
 *   - Hover: gray bg + X icon to unlink
 *   - Anchor sized to content so the hover/underline hit-area is the
 *     text only, not the whole row
 *   - Click opens the Figma URL in a new tab
 */
import React, { useState } from 'react';
import LinkIcon from '@atlaskit/icon/core/link';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import type { DesignRow as DesignRowData } from './useDesigns';

function shortLabel(url: string): string {
  // Figma URL shape: https://www.figma.com/{file|design|proto}/<id>/<name>?...
  // We surface the trailing path segment (the file name) when present,
  // falling back to the full URL.
  try {
    const u = new URL(url);
    const segs = u.pathname.split('/').filter(Boolean);
    if (segs.length >= 3) {
      // segs[0] = file/design/proto, segs[1] = id, segs[2] = name slug
      return decodeURIComponent(segs[2]).replace(/-/g, ' ');
    }
    return u.hostname + u.pathname;
  } catch {
    return url;
  }
}

export interface DesignRowProps {
  design: DesignRowData;
  onUnlink: (id: string) => Promise<void> | void;
}

export function DesignRow({ design, onUnlink }: DesignRowProps) {
  const [rowHovered, setRowHovered] = useState(false);
  const [linkHovered, setLinkHovered] = useState(false);

  const label = shortLabel(design.url);

  return (
    <div
      onMouseEnter={() => setRowHovered(true)}
      onMouseLeave={() => setRowHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        borderRadius: 4,
        background: rowHovered
          ? 'var(--ds-background-neutral-hovered)'
          : 'var(--cp-bg-elevated)',
        border: '1px solid var(--ds-border)',
        boxShadow: '0 1px 2px var(--ds-background-neutral-subtle-pressed, rgba(9, 30, 66, 0.08))',
        transition: 'background 0.12s, box-shadow 0.12s',
        cursor: 'default',
      }}
    >
      <LinkIcon label="" color="var(--ds-text-subtle)" />
      <a
        href={design.url}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setLinkHovered(true)}
        onMouseLeave={() => setLinkHovered(false)}
        style={{
          flex: '0 1 auto',
          minWidth: 0,
          maxWidth: '100%',
          fontSize: 'var(--ds-font-size-400)',
          color: linkHovered
            ? 'var(--ds-text-subtle)'
            : 'var(--ds-text)',
          textDecoration: linkHovered ? 'underline' : 'none',
          textDecorationColor: linkHovered ? 'var(--ds-text)' : 'transparent',
          textUnderlineOffset: 2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--cp-font-body)',
        }}
      >
        {label}
      </a>
      <div style={{ flex: 1, minWidth: 0 }} />
      {rowHovered && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); void onUnlink(design.id); }}
          title="Remove design"
          aria-label="Remove design"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            borderRadius: 3,
            color: 'var(--ds-text-subtle)',
            padding: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <CrossIcon size="small" label="" primaryColor="var(--ds-text-subtle)" />
        </button>
      )}
    </div>
  );
}

export default DesignRow;
