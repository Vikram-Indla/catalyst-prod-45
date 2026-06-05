import React from 'react';
import { token } from '@atlaskit/tokens';
import Lozenge from '@atlaskit/lozenge';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { resolveAvatarUrl } from '@/lib/avatars';

export interface Card {
  key: string; title: string; type: string; assignee: string;
  label?: string; labelAppearance?: 'default' | 'inprogress' | 'success' | 'moved' | 'removed';
}

export function BoardCard({ card }: { card: Card }) {
  return (
    <div style={{
      padding: 12, borderRadius: 8, marginBlockEnd: 8,
      background: token('elevation.surface', '#FFFFFF'),
      border: `1px solid ${token('color.border', '#DFE1E6')}`,
      boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9,30,66,0.25)'),
    }}>
      <div style={{ font: `400 14px/20px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text', '#172B4D'), marginBlockEnd: 8 }}>
        {card.title}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <JiraIssueTypeIcon type={card.type} size={14} />
        <span style={{ font: `500 12px/16px var(--ds-font-family-code, monospace)`, color: token('color.link', '#0052CC') }}>{card.key}</span>
        {card.label && <Lozenge appearance={card.labelAppearance ?? 'default'}>{card.label}</Lozenge>}
        <span style={{ flex: 1 }} />
        <CatalystAvatar size="xsmall" src={resolveAvatarUrl(card.assignee) || undefined} name={card.assignee} />
      </div>
    </div>
  );
}

export function BoardColumn({ name, count, dotColor, children }: { name: string; count: number; dotColor: string; children: React.ReactNode }) {
  return (
    <div style={{
      width: 280, flexShrink: 0, borderRadius: 8, padding: 12,
      background: token('color.background.neutral.subtle', '#F7F8F9'),
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBlockEnd: 12 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} />
        <span style={{ font: `600 13px/16px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text', '#172B4D') }}>{name}</span>
        <span style={{ font: `400 12px/16px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text.subtlest', '#6B778C') }}>{count}</span>
      </div>
      {children}
    </div>
  );
}
