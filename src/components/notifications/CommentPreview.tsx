import { useState } from "react";
import { COMMENT_PREVIEW_MAX_CHARS } from "@/constants/notificationConstants";
import { useTheme } from "@/hooks/useTheme";

interface CommentPreviewProps {
  text: string;
  attachmentFilename?: string;
}

export default function CommentPreview({ text, attachmentFilename }: CommentPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const { isDark } = useTheme();
  const isTruncated = text.length > COMMENT_PREVIEW_MAX_CHARS;
  const displayText = expanded || !isTruncated ? text : text.slice(0, COMMENT_PREVIEW_MAX_CHARS) + '…';

  return (
    <div style={{
      background: 'var(--ds-surface-sunken, #F7F8F9)',
      border: `1px solid ${isDark ? 'var(--ds-border, #2C3E50)' : 'var(--ds-border, #DFE1E6)'}`,
      borderRadius: 4,
      padding: '8px 12px',
      marginTop: 8,
      fontFamily: 'var(--cp-font-body)',
      fontSize: 13,
      color: 'var(--cp-text-primary, var(--cp-ink-1, var(--cp-ink-1, #0F172A)))',
      lineHeight: '18px',
      maxHeight: expanded ? 'none' : 80,
      overflow: 'hidden',
    }}>
      <span>{displayText}</span>
      {isTruncated && !expanded && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 4,
            color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))', fontSize: 12, fontFamily: 'var(--cp-font-body)', fontWeight: 500,
          }}
        >
          Show more
        </button>
      )}
      {attachmentFilename && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, color: 'var(--ds-text-subtlest, #6B778C)', fontSize: 12 }}>
          {/* attachment glyph — mirrors @atlaskit/icon/glyph/attachment */}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
          <span>{attachmentFilename}</span>
        </div>
      )}
    </div>
  );
}
