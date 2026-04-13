/**
 * IssueCenterPanel — Flat center panel: header + description + activity
 * Matches Jira layout: key, title, status pill, Link/Move actions, description, activity
 */
import { useState } from 'react';
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
          {/* Breadcrumb */}
          {parentItem && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, fontSize: 12, color: 'var(--aw-text-subtle)' }}>
              <JiraIssueTypeIcon issueType={parentItem.issue_type} size={14} />
              <span>{parentItem.issue_key}</span>
              <span>/</span>
            </div>
          )}

          {/* Title row */}
          <div className="awCenterTitleRow">
            {item && <JiraIssueTypeIcon issueType={item.issue_type} size={18} />}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="awCenterKey">{issueKey}</div>
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
            <div style={{ whiteSpace: 'pre-wrap' }}>{item.description_text}</div>
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
