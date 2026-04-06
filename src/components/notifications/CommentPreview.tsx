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
      background: isDark ? '#232019' : '#1A1A1A',
      border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,.08)'}`,
      borderRadius: 4,
      padding: '10px 12px',
      marginTop: 8,
      fontFamily: 'Geist, -apple-system, sans-serif',
      fontSize: 13,
      color: isDark ? '#F5F3F0' : 'rgba(237,237,237,0.93)',
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
            color: '#2563EB', fontSize: 12, fontFamily: 'Geist, -apple-system, sans-serif', fontWeight: 500,
          }}
        >
          Show more
        </button>
      )}
      {attachmentFilename && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, color: isDark ? '#6B6560' : 'rgba(237,237,237,0.40)', fontSize: 12 }}>
          <Paperclip size={13} />
          <span>{attachmentFilename}</span>
        </div>
      )}
    </div>
  );
}
