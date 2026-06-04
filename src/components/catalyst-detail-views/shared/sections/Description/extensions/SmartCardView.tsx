import * as React from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { TicketLinkCard, extractIssueKey } from '@/components/shared/TicketLinkCard';
import { token } from '@atlaskit/tokens';

/**
 * Inline NodeView for the InlineCard Tiptap node. When the stored URL
 * resolves to a Jira-style ticket key, render our internal
 * TicketLinkCard (icon + key + summary + status pill). Otherwise fall
 * back to a plain link so the user still sees what was referenced.
 *
 * The NodeView is rendered inside the editor's contentEditable. We
 * disable text input on the wrapper so users can't accidentally type
 * inside the card; selection / delete via keyboard still works because
 * the card is an `atom`.
 */
export function InlineCardView({ node }: NodeViewProps) {
  const url = String(node.attrs.url ?? '');
  const issueKey = extractIssueKey(url);

  if (!issueKey) {
    return (
      <NodeViewWrapper
        as="span"
        contentEditable={false}
        style={{ display: 'inline-block', userSelect: 'none' }}
      >
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: token('color.link', '#0052CC'),
            textDecoration: 'none',
            background: token('color.background.neutral.subtle', '#F7F8F9'),
            padding: '1px 6px',
            borderRadius: 3,
            fontSize: 13,
          }}
        >
          {url || 'Link'}
        </a>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      as="span"
      contentEditable={false}
      style={{ display: 'inline-block', userSelect: 'none' }}
    >
      <TicketLinkCard issueKey={issueKey} />
    </NodeViewWrapper>
  );
}

/**
 * Block NodeView — same data model, but rendered as a block-level
 * card with vertical margin so it stands apart from surrounding
 * paragraphs.
 */
export function BlockCardView({ node }: NodeViewProps) {
  const url = String(node.attrs.url ?? '');
  const issueKey = extractIssueKey(url);

  if (!issueKey) {
    return (
      <NodeViewWrapper
        as="div"
        contentEditable={false}
        style={{ margin: '8px 0', userSelect: 'none' }}
      >
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: token('color.link', '#0052CC'),
            textDecoration: 'none',
          }}
        >
          {url || 'Link'}
        </a>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      as="div"
      contentEditable={false}
      style={{ margin: '8px 0', userSelect: 'none' }}
    >
      <TicketLinkCard issueKey={issueKey} block />
    </NodeViewWrapper>
  );
}
