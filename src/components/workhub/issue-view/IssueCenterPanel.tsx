/**
 * IssueCenterPanel — Flat center panel: header + description + activity
 * Renders description with proper paragraph breaks.
 * Breadcrumb parent is clickable. Status pill + Link/Move actions.
 */
import { useState, useMemo } from 'react';
import { Link2, ArrowRightLeft, MoreHorizontal, Pencil, MessageSquare, History, Clock, FileText } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { StatusLozenge } from '@/components/ui/StatusLozenge';
import type { AllWorkItem } from '@/types/allwork.types';

interface Props {
  issueKey: string | null;
  item?: AllWorkItem | null;
  parentItem?: AllWorkItem | null;
  loading?: boolean;
}

type ActivityTab = 'all' | 'comments' | 'history' | 'worklog';

/** Split raw description into logical paragraphs for readable rendering */
function DescriptionRenderer({ text }: { text: string }) {
  const paragraphs = useMemo(() => {
    // Split on double newlines or common section markers
    return text
      .split(/\n{2,}/)
      .map(p => p.trim())
      .filter(Boolean);
  }, [text]);

  if (paragraphs.length === 0) return null;

  return (
    <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--aw-text)' }}>
      {paragraphs.map((para, i) => {
        // Detect header-like lines (e.g. "Issue Type:", "Module:", "Summary-Steps to Reproduce")
        const isHeader = /^[A-Z][A-Za-z\s\-]+:/.test(para) && para.length < 80;
        // Detect bullet/list items
        const hasBullets = para.includes('\n-') || para.includes('\n•') || para.includes('\n*');

        if (isHeader && !hasBullets) {
          const [label, ...rest] = para.split(':');
          const value = rest.join(':').trim();
          return (
            <div key={i} style={{ marginBottom: 8 }}>
              <strong style={{ fontWeight: 600, color: 'var(--aw-text)' }}>{label}:</strong>
              {value && <span style={{ marginLeft: 6 }}>{value}</span>}
            </div>
          );
        }

        if (hasBullets) {
          const lines = para.split('\n').map(l => l.trim()).filter(Boolean);
          return (
            <ul key={i} style={{ margin: '8px 0', paddingLeft: 20, listStyle: 'disc' }}>
              {lines.map((line, j) => (
                <li key={j} style={{ marginBottom: 4 }}>{line.replace(/^[-•*]\s*/, '')}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={i} style={{ margin: '0 0 10px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {para}
          </p>
        );
      })}
    </div>
  );
}

export function IssueCenterPanel({ issueKey, item, parentItem, loading = false }: Props) {
  const [activityTab, setActivityTab] = useState<ActivityTab>('all');

  if (!issueKey) {
    return (
      <div className="awBody" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--aw-text-subtle)', fontSize: 13 }}>Select an issue to view details</span>
      </div>
    );
  }

  if (loading) {
    return (
      <>
        <div className="awHeader">
          <div className="awCenterHeader">
            <div style={{ width: 80, height: 12, borderRadius: 3, background: '#E2E8F0', marginBottom: 8 }} />
            <div style={{ width: '60%', height: 18, borderRadius: 3, background: '#E2E8F0' }} />
          </div>
        </div>
        <div className="awBody" style={{ padding: 16 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ width: `${80 - i * 15}%`, height: 14, borderRadius: 3, background: '#E2E8F0', marginBottom: 10 }} />
          ))}
        </div>
      </>
    );
  }

  const TABS: { key: ActivityTab; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All', icon: <FileText style={{ width: 14, height: 14 }} /> },
    { key: 'comments', label: 'Comments', icon: <MessageSquare style={{ width: 14, height: 14 }} /> },
    { key: 'history', label: 'History', icon: <History style={{ width: 14, height: 14 }} /> },
    { key: 'worklog', label: 'Work log', icon: <Clock style={{ width: 14, height: 14 }} /> },
  ];

  return (
    <>
      {/* ── Sticky header ── */}
      <div className="awHeader">
        <div className="awCenterHeader">
          {/* Breadcrumb — clickable parent */}
          {(parentItem || item?.parent_key) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 12 }}>
              {parentItem && <JiraIssueTypeIcon type={parentItem.issue_type} size={14} />}
              <span style={{ color: 'var(--aw-blue)', fontWeight: 600, cursor: 'pointer' }}>
                {item?.parent_key ?? parentItem?.issue_key}
              </span>
              <span style={{ color: 'var(--aw-text-subtle)' }}>/</span>
              <span style={{ color: 'var(--aw-text-subtle)', fontWeight: 500 }}>{issueKey}</span>
            </div>
          )}

          {/* Title row */}
          <div className="awCenterTitleRow">
            {item && <JiraIssueTypeIcon type={item.issue_type} size={20} />}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="awCenterSummary">{item?.summary ?? 'Untitled'}</div>
            </div>
            <button className="awPill" style={{ marginLeft: 'auto', flexShrink: 0 }}>
              <MoreHorizontal style={{ width: 14, height: 14 }} />
            </button>
          </div>

          {/* Action pills */}
          <div className="awPills">
            {item && <StatusLozenge status={item.status} />}
            <button className="awPill"><Link2 style={{ width: 14, height: 14 }} /> Link</button>
            <button className="awPill"><ArrowRightLeft style={{ width: 14, height: 14 }} /> Move</button>
          </div>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="awBody">
        {/* Description */}
        <div className="awSectionTitle">
          Description
          <button className="awPill" style={{ height: 22 }}>
            <Pencil style={{ width: 12, height: 12 }} />
          </button>
        </div>
        <div className="awSectionBody">
          {item?.description_text ? (
            <DescriptionRenderer text={item.description_text} />
          ) : (
            <div style={{ color: 'var(--aw-text-subtle)', fontStyle: 'italic' }}>No description provided.</div>
          )}
        </div>

        <hr className="awSectionDivider" />

        {/* Activity */}
        <div className="awSectionTitle" style={{ justifyContent: 'flex-start', gap: 16 }}>
          Activity
          <div style={{ display: 'flex', gap: 2, marginLeft: 'auto' }}>
            {TABS.map(t => (
              <button
                key={t.key}
                className={`awFilterPill ${activityTab === t.key ? 'awFilterPillActive' : ''}`}
                onClick={() => setActivityTab(t.key)}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="awSectionBody">
          {/* Comment composer */}
          <div className="awCommentRow" style={{ marginBottom: 16 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', background: '#DFE1E6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#505258', flexShrink: 0,
            }}>
              Y
            </div>
            <input className="awCommentInput" placeholder="Add a comment..." />
          </div>

          <div className="awEmpty">No activity yet</div>
        </div>
      </div>
    </>
  );
}
