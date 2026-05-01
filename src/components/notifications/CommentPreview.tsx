import { useState } from "react";
import { Paperclip } from "lucide-react";
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
      background: 'var(--cp-bg-page, #F8FAFC)',
      border: `0.5px solid ${isDark ? 'var(--ds-border, var(--ds-border, #2E2E2E))' : 'rgba(15,23,42,.08)'}`,
      borderRadius: 4,
      padding: '10px 12px',
      marginTop: 8,
      fontFamily: 'var(--cp-font-body)',
      fontSize: 13,
      color: 'var(--cp-text-primary, #0F172A)',
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
            color: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))', fontSize: 12, fontFamily: 'var(--cp-font-body)', fontWeight: 500,
          }}
        >
          Show more
        </button>
      )}
      {attachmentFilename && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, color: 'var(--cp-text-tertiary, #64748B)', fontSize: 12 }}>
          <Paperclip size={13} />
          <span>{attachmentFilename}</span>
        </div>
      )}
    </div>
  );
}
