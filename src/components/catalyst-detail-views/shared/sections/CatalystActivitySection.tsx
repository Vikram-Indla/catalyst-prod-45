/**
 * CANONICAL — Activity section (Comments + History tabs) for all CatalystView* components.
 * Change here → updates all 7 work item types.
 *
 * This component owns its own data fetching via canonical hooks.
 */
import React, { useState } from 'react';
import { MessageSquare, Clock } from 'lucide-react';
import { useCatalystComments } from '../hooks/useCatalystComments';
import { useCatalystActivity } from '../hooks/useCatalystActivity';
import {
  fmtDate, getInitials, getAvatarColor,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/helpers';

interface CatalystActivitySectionProps {
  itemId: string;
  isOpen: boolean;
}

export function CatalystActivitySection({ itemId, isOpen }: CatalystActivitySectionProps) {
  const { data: comments = [] } = useCatalystComments(itemId, isOpen);
  const { data: activityLog = [] } = useCatalystActivity(itemId, isOpen);
  const [activeTab, setActiveTab] = useState<'comments' | 'history'>('comments');

  return (
    <div style={{ borderTop: '1px solid #EBECF0', paddingTop: 20, marginTop: 8 }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16 }}>
        {(['comments', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '6px 12px', fontSize: 14,
              fontWeight: activeTab === tab ? 700 : 400,
              color: activeTab === tab ? '#172B4D' : '#5E6C84',
              background: 'none', border: 'none',
              borderBottom: activeTab === tab ? '2px solid #0052CC' : '2px solid transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {tab === 'comments' ? <MessageSquare size={14} /> : <Clock size={14} />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Comments tab */}
      {activeTab === 'comments' && (
        <div>
          {comments.length === 0 && (
            <div style={{ padding: '24px 0', color: '#97A0AF', fontSize: 14, textAlign: 'center' }}>
              No comments yet
            </div>
          )}
          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              {c.author?.avatar_url ? (
                <img
                  src={c.author.avatar_url} alt=""
                  style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: getAvatarColor(c.author_id), color: '#FFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {getInitials(c.author?.full_name)}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#172B4D' }}>
                    {c.author?.full_name ?? 'Unknown'}
                  </span>
                  <span style={{ fontSize: 13, color: '#6B778C', marginLeft: 8 }}>
                    {fmtDate(c.created_at)}
                  </span>
                </div>
                <div
                  style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.6 }}
                  dangerouslySetInnerHTML={{ __html: c.body }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        <div>
          {activityLog.length === 0 && (
            <div style={{ padding: '24px 0', color: '#97A0AF', fontSize: 14, textAlign: 'center' }}>
              No activity recorded
            </div>
          )}
          {activityLog.map(entry => (
            <div key={entry.id} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              {entry.actor?.avatar_url ? (
                <img
                  src={entry.actor.avatar_url} alt=""
                  style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: '#0052CC', color: '#FFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2">
                    <rect x="8" y="2" width="8" height="4" rx="1" />
                    <rect x="4" y="4" width="16" height="18" rx="2" />
                  </svg>
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: '#172B4D', lineHeight: 1.5, marginBottom: 2 }}>
                  <span style={{ fontWeight: 600 }}>{entry.actor?.full_name ?? 'System'}</span>{' '}
                  {entry.action === 'field_updated' ? (
                    <>changed the <span style={{ fontWeight: 600 }}>{entry.field_name}</span></>
                  ) : entry.action}
                </div>
                <div style={{ fontSize: 13, color: '#6B778C' }}>{fmtDate(entry.created_at)}</div>
                {(entry.old_value || entry.new_value) && (
                  <div style={{
                    marginTop: 8, fontSize: 14, color: '#172B4D',
                    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                  }}>
                    <span style={{ color: '#6B778C' }}>{entry.old_value || 'None'}</span>
                    <span style={{ color: '#97A0AF' }}>→</span>
                    <span style={{ fontWeight: 500 }}>{entry.new_value || 'None'}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
