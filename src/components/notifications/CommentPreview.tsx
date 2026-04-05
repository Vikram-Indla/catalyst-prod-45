import { useState } from "react";
import { Paperclip } from "lucide-react";
import { COMMENT_PREVIEW_MAX_CHARS } from "@/constants/notificationConstants";

interface CommentPreviewProps {
  text: string;
  attachmentFilename?: string;
}

export default function CommentPreview({ text, attachmentFilename }: CommentPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const isTruncated = text.length > COMMENT_PREVIEW_MAX_CHARS;
  const displayText = expanded || !isTruncated ? text : text.slice(0, COMMENT_PREVIEW_MAX_CHARS) + '…';

  return (
    <div style={{
      background: '#F8FAFC',
      border: '0.5px solid rgba(15,23,42,.08)',
      borderRadius: 4,
      padding: '10px 12px',
      marginTop: 8,
      fontFamily: 'Inter, sans-serif',
      fontSize: 13,
      color: '#0F172A',
      lineHeight: '18px',
      // m-11: max-height before "Show more"
      maxHeight: expanded ? 'none' : 80,
      overflow: 'hidden',
    }}>
      <span>{displayText}</span>
      {isTruncated && !expanded && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 4,
            color: '#2563EB', fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 500,
          }}
        >
          Show more
        </button>
      )}
      {attachmentFilename && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, color: '#64748B', fontSize: 12 }}>
          <Paperclip size={13} />
          <span>{attachmentFilename}</span>
        </div>
      )}
    </div>
  );
}
