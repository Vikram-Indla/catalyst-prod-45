/**
 * KeyDetailsStrip — Horizontal key details strip (Type, Priority, Assignee, Reporter, Parent)
 */
import React from 'react';
import { ChevronDown } from 'lucide-react';
import { V } from './tokens';
import { IssueTypeIcon } from './IssueTypeIcon';
import { PriorityIcon } from './PriorityIcon';
import { AvatarCircle } from './AvatarCircle';

function StripField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '10px 16px', minWidth: 120, flex: '1 0 auto', borderRight: `0.75px solid ${V.borderSubtle}` }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: V.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

export function KeyDetailsStrip({ story, onAssigneeClick }: {
  story: any;
  onAssigneeClick?: () => void;
}) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 0,
      background: V.surfaceBg, borderRadius: 8,
      border: `0.75px solid ${V.borderSubtle}`,
      marginTop: 16, overflow: 'hidden',
    }}>
      <StripField label="Type">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IssueTypeIcon type={story.issue_type} size={16} />
          <span style={{ fontSize: 13, fontWeight: 500, color: V.textPrimary }}>{story.issue_type || 'Story'}</span>
        </div>
      </StripField>
      <StripField label="Priority">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <PriorityIcon priority={story.priority} />
          <span style={{ fontSize: 13, fontWeight: 500, color: V.textPrimary }}>{story.priority || 'Medium'}</span>
        </div>
      </StripField>
      <StripField label="Assignee">
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', borderRadius: 4, padding: '2px 4px', margin: '-2px -4px', transition: 'background 120ms' }}
          onClick={onAssigneeClick}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          title="Click to change assignee"
        >
          <AvatarCircle name={story.assignee_display_name} size={20} />
          <span style={{ fontSize: 13, fontWeight: 500, color: story.assignee_display_name ? V.textPrimary : V.textMuted }}>
            {story.assignee_display_name || 'Unassigned'}
          </span>
          <ChevronDown size={12} style={{ color: V.textMuted, marginLeft: 2 }} />
        </div>
      </StripField>
      <StripField label="Reporter">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <AvatarCircle name={story.reporter_display_name} size={20} />
          <span style={{ fontSize: 13, fontWeight: 500, color: V.textPrimary }}>{story.reporter_display_name || '—'}</span>
        </div>
      </StripField>
      {story.parent_key && (
        <StripField label="Parent">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: '100%' }}>
            <IssueTypeIcon type="epic" size={14} />
            <span
              title={`${story.parent_key}${story.parent_summary ? ' ' + story.parent_summary : ''}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#E97B2C',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 500,
                padding: '2px 8px',
                borderRadius: 4,
                maxWidth: 280,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{story.parent_key}</span>
              {story.parent_summary && (
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {story.parent_summary}
                </span>
              )}
            </span>
          </div>
        </StripField>
      )}
    </div>
  );
}
