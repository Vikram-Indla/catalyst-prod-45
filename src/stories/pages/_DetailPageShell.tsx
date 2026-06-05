import React from 'react';
import { token } from '@atlaskit/tokens';
import Lozenge from '@atlaskit/lozenge';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { CatalystStatusPill } from '@/components/catalyst-detail-views/shared/sections/CatalystStatusPill';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { resolveAvatarUrl } from '@/lib/avatars';

export interface DetailPageProps {
  issueType: string;
  issueKey: string;
  title: string;
  status: string;
  statusCategory: 'new' | 'indeterminate' | 'done';
  description: React.ReactNode;
  assignee: string;
  reporter: string;
  priority: string;
  labels?: string[];
  parentKey?: string;
  parentSummary?: string;
}

const sectionLabel: React.CSSProperties = {
  font: `600 11px/14px var(--ds-font-family-body, "Atlassian Sans")`,
  color: token('color.text.subtlest', '#6B778C'),
  textTransform: 'none', letterSpacing: 0,
};
const railLabel: React.CSSProperties = { ...sectionLabel, marginBlockEnd: 4 };

function RailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBlockEnd: 16 }}>
      <div style={railLabel}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

export function DetailPageShell(p: DetailPageProps) {
  return (
    <div style={{
      display: 'flex', gap: 24, padding: 24, maxWidth: 1100, margin: '0 auto',
      background: token('elevation.surface', '#FFFFFF'),
      font: 'var(--ds-font-body, 14px/20px "Atlassian Sans")',
    }}>
      {/* Main column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Breadcrumb */}
        {p.parentKey && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBlockEnd: 8 }}>
            <span style={{ font: `400 14px/20px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.link', '#0052CC') }}>{p.parentKey}</span>
            <span style={{ color: token('color.text.subtlest', '#6B778C') }}>/</span>
            <span style={{ font: `400 14px/20px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text.subtle', '#44546F') }}>{p.parentSummary}</span>
          </div>
        )}
        {/* Key + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBlockEnd: 8 }}>
          <JiraIssueTypeIcon type={p.issueType} size={20} />
          <span style={{ font: `500 14px/20px var(--ds-font-family-code, monospace)`, color: token('color.link', '#0052CC') }}>{p.issueKey}</span>
        </div>
        <h1 style={{ font: `653 24px/28px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text', '#172B4D'), margin: '0 0 12px' }}>
          {p.title}
        </h1>
        <div style={{ marginBlockEnd: 24 }}>
          <CatalystStatusPill status={p.status} statusCategory={p.statusCategory} issueType={p.issueType} />
        </div>

        {/* Description */}
        <h2 style={{ font: `500 14px/20px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text.subtle', '#505258'), margin: '0 0 8px' }}>
          Description
        </h2>
        <div style={{ font: `400 14px/22px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text', '#172B4D') }}>
          {p.description}
        </div>
      </div>

      {/* Right rail */}
      <div style={{
        width: 280, flexShrink: 0,
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        borderRadius: 8, padding: 16,
        background: token('elevation.surface', '#FFFFFF'),
        alignSelf: 'flex-start',
      }}>
        <div style={{ ...sectionLabel, fontSize: 14, fontWeight: 653, color: token('color.text', '#292A2E'), marginBlockEnd: 16 }}>
          Details
        </div>
        <RailField label="Assignee">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CatalystAvatar size="xsmall" src={resolveAvatarUrl(p.assignee) || undefined} name={p.assignee} />
            <span style={{ font: `400 14px/20px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text', '#172B4D') }}>{p.assignee}</span>
          </span>
        </RailField>
        <RailField label="Priority">
          <span style={{ font: `400 14px/20px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text', '#172B4D') }}>{p.priority}</span>
        </RailField>
        <RailField label="Reporter">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CatalystAvatar size="xsmall" src={resolveAvatarUrl(p.reporter) || undefined} name={p.reporter} />
            <span style={{ font: `400 14px/20px var(--ds-font-family-body, "Atlassian Sans")`, color: token('color.text', '#172B4D') }}>{p.reporter}</span>
          </span>
        </RailField>
        {p.labels && p.labels.length > 0 && (
          <RailField label="Labels">
            <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
              {p.labels.map((l) => <Lozenge key={l}>{l}</Lozenge>)}
            </span>
          </RailField>
        )}
      </div>
    </div>
  );
}
