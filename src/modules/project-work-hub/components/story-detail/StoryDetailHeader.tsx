/**
 * StoryDetailHeader — Back nav, issue key, type, prev/next arrows
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronUp, ChevronDown } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

interface StoryDetailHeaderProps {
  projectKey: string;
  issueKey: string | null;
  issueType: string | null;
  parentEpic: { id: string; epic_key: string | null; name: string } | null;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  onAddParent: () => void;
}

const HEADER: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  height: 48, padding: '0 24px',
  borderBottom: '1px solid #E0E0E0', background: '#FFFFFF',
  fontSize: 14, color: '#505258', flexShrink: 0,
};

const NAV_BTN: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', padding: 4, borderRadius: 4,
  color: '#505258',
};

export function StoryDetailHeader({
  projectKey, issueKey, issueType, parentEpic, onPrev, onNext, onAddParent,
}: StoryDetailHeaderProps) {
  const navigate = useNavigate();

  return (
    <div style={HEADER}>
      {/* Back */}
      <button
        onClick={() => navigate(`/project-hub/${projectKey}/story-backlog`)}
        style={{ ...NAV_BTN, gap: 4, marginRight: 8 }}
        title="Back to backlog"
      >
        <ArrowLeft size={16} />
        <span style={{ fontSize: 13, fontWeight: 500 }}>Back</span>
      </button>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: '#E0E0E0' }} />

      {/* Parent link */}
      {parentEpic ? (
        <span style={{ fontSize: 13, color: '#1868DB', fontWeight: 500, cursor: 'default' }}>
          {parentEpic.epic_key || parentEpic.name}
        </span>
      ) : (
        <button onClick={onAddParent} style={{ ...NAV_BTN, fontSize: 13, color: '#1868DB', fontWeight: 500, gap: 2 }}>
          Add parent
        </button>
      )}

      <span style={{ color: '#94A3B8', fontSize: 13 }}>/</span>

      {/* Issue type + key */}
      <JiraIssueTypeIcon type={issueType || 'story'} size={16} />
      <span style={{ fontSize: 13, color: '#505258' }}>{issueType || 'Story'}</span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600, color: '#292A2E',
      }}>
        {issueKey || '—'}
      </span>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Prev / Next */}
      <button
        onClick={onPrev || undefined}
        disabled={!onPrev}
        style={{ ...NAV_BTN, opacity: onPrev ? 1 : 0.35 }}
        title="Previous story"
      >
        <ChevronUp size={18} />
      </button>
      <button
        onClick={onNext || undefined}
        disabled={!onNext}
        style={{ ...NAV_BTN, opacity: onNext ? 1 : 0.35 }}
        title="Next story"
      >
        <ChevronDown size={18} />
      </button>
    </div>
  );
}
