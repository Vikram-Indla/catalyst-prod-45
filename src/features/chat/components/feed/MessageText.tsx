import React, { useMemo } from 'react';
import { TicketKeyChip } from '@/components/chat/main/TicketKeyChip';
import { useIssueTypeMap } from '@/hooks/chat/useIssueTypeMap';

const ISSUE_KEY_RE = /\b([A-Z][A-Z0-9]+-\d+)\b/g;

function extractKeys(text: string): string[] {
  const keys: string[] = [];
  let m: RegExpExecArray | null;
  ISSUE_KEY_RE.lastIndex = 0;
  while ((m = ISSUE_KEY_RE.exec(text)) !== null) {
    keys.push(m[1]);
  }
  return keys;
}

interface MessageTextProps {
  text: string;
  className?: string;
}

/**
 * Renders chat message body text, replacing issue key references (e.g. BAU-5757)
 * with a clickable TicketKeyChip that opens the Catalyst detail view.
 * If a key has no entry in ph_issues, renders it as plain text — never lies with a fallback type.
 */
export function MessageText({ text, className }: MessageTextProps) {
  const keys = useMemo(() => extractKeys(text), [text]);
  const typeMap = useIssueTypeMap(keys);

  if (keys.length === 0) {
    return <p className={className} dir="auto">{text}</p>;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  ISSUE_KEY_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  while ((m = ISSUE_KEY_RE.exec(text)) !== null) {
    const key = m[1];
    const start = m.index;
    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }
    const issueType = typeMap.get(key);
    if (issueType) {
      parts.push(
        <TicketKeyChip key={`${key}-${i++}`} issueKey={key} issueType={issueType} />
      );
    } else {
      // Key not in ph_issues — plain text, never lie with a typed default
      parts.push(key);
    }
    lastIndex = start + m[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <p className={className} dir="auto">{parts}</p>;
}
