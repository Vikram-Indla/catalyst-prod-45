/**
 * StoryDetailHeader — Back nav, issue key, type, prev/next arrows
 * Jira-style "Add parent" dropdown with recent epics
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronUp, ChevronDown, SquarePen } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ParentCandidate {
  id: string;
  issue_key: string;
  summary: string;
  issue_type: string;
  status_category?: string | null;
  status?: string | null;
}

interface StoryDetailHeaderProps {
  projectKey: string;
  issueKey: string | null;
  issueType: string | null;
  parentEpic: { id: string; epic_key: string | null; name: string } | null;
  parentCandidates?: ParentCandidate[];
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  onAddParent: () => void;
  onSelectParent?: (issueKey: string) => void;
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
  projectKey, issueKey, issueType, parentEpic, parentCandidates = [], onPrev, onNext, onAddParent, onSelectParent,
}: StoryDetailHeaderProps) {
  const navigate = useNavigate();
  const [addParentOpen, setAddParentOpen] = useState(false);

  // Show top 5 recent epics (non-done)
  const recentEpics = parentCandidates
    .filter(p => p.status_category?.toLowerCase() !== 'done')
    .slice(0, 5);

  const handleSelectEpic = (epicKey: string) => {
    setAddParentOpen(false);
    onSelectParent?.(epicKey);
  };

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

      {/* Parent link or Add parent dropdown */}
      {parentEpic ? (
        <>
          <JiraIssueTypeIcon type="epic" size={16} />
          <span style={{ fontSize: 13, color: '#1868DB', fontWeight: 500, cursor: 'default' }}>
            {parentEpic.epic_key || parentEpic.name}
          </span>
        </>
      ) : (
        <Popover open={addParentOpen} onOpenChange={setAddParentOpen}>
          <PopoverTrigger asChild>
            <button
              style={{
                ...NAV_BTN,
                fontSize: 13, color: '#1868DB', fontWeight: 500, gap: 4,
                border: '1px solid transparent', borderRadius: 4, padding: '4px 8px',
                transition: 'border-color 150ms, background 150ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#DEEBFF'; e.currentTarget.style.background = '#F4F5F7'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'none'; }}
            >
              <SquarePen size={14} />
              Add parent
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={4}
            style={{ width: 380, padding: 0, borderRadius: 8, boxShadow: '0 8px 16px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.12)' }}
          >
            {/* Recent epics heading */}
            <div style={{ padding: '10px 16px 6px', fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Recent epics
            </div>

            {/* Epic list */}
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              {recentEpics.map(epic => (
                <button
                  key={epic.id}
                  onClick={() => handleSelectEpic(epic.issue_key)}
                  style={{
                    width: '100%', padding: '8px 16px', border: 'none', background: 'transparent',
                    textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 14, color: '#172B4D', transition: 'background 100ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <JiraIssueTypeIcon type="epic" size={16} />
                  <span>{epic.issue_key} {epic.summary}</span>
                </button>
              ))}
              {recentEpics.length === 0 && (
                <div style={{ padding: '12px 16px', fontSize: 13, color: '#6B778C' }}>No epics found</div>
              )}
            </div>

            {/* View all epics */}
            <div style={{ borderTop: '1px solid #EBECF0' }}>
              <button
                onClick={() => { setAddParentOpen(false); onAddParent(); }}
                style={{
                  width: '100%', padding: '10px 16px', border: 'none', background: 'transparent',
                  textAlign: 'left', cursor: 'pointer', fontSize: 14, color: '#172B4D', fontWeight: 500,
                  transition: 'background 100ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                View all epics
              </button>
            </div>
          </PopoverContent>
        </Popover>
      )}

      <span style={{ color: '#94A3B8', fontSize: 13 }}>/</span>

      {/* Issue type + key */}
      <JiraIssueTypeIcon type={issueType || 'story'} size={16} />
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
