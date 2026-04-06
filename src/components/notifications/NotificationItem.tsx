import { memo, useState } from "react";
import type { Notification } from "@/types/notifications";
import type { ActorProfile } from "@/hooks/useActorProfiles";
import { COMMENT_PREVIEW_TYPES, DUE_DATE_TYPES } from "@/constants/notificationConstants";
import { getAvatarColor, getUserInitials } from "@/utils/avatarColor";
import { WorkItemIcon } from "./WorkItemIcons";
import StatusLozenge from "./StatusLozenge";
import CommentPreview from "./CommentPreview";
import ReactionBar from "./ReactionBar";
import { Clock, UserCheck } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

interface NotificationItemProps {
  notification: Notification;
  actorProfile?: ActorProfile;
  onMarkRead?: (id: string) => void;
  onClick?: (notification: Notification) => void;
}

function getActionVerb(type: string, isSystemAssign: boolean): string {
  if (isSystemAssign && type === 'unassigned') return 'You have been unassigned from';
  if (isSystemAssign && type === 'assigned') return 'You have been assigned to';
  if (isSystemAssign) return 'You have been assigned to';
  const map: Record<string, string> = {
    assigned_work_item: 'assigned you to',
    assigned: 'assigned you to',
    assigned_story: 'assigned you a story in',
    mentioned_in_comment: 'mentioned you in a comment on',
    commented_on_work_item: 'commented on',
    updated_work_item: 'updated',
    status_changed: 'changed the status of',
    reassigned_work_item: 'reassigned',
    unassigned: 'unassigned you from',
    created_work_item: 'created',
    release_approval_requested: 'requested approval for',
    incident_escalated: 'escalated',
    test_case_failed: 'marked as failed:',
    due_date_approaching: 'due date approaching for',
    ai_insight_generated: 'AI generated insight for',
  };
  return map[type] || 'updated';
}

const normaliseStatus = (raw: string | null | undefined): {
  label: string;
  type: 'gray' | 'blue' | 'green';
} => {
  if (!raw) return { label: 'UNKNOWN', type: 'gray' };
  const s = raw.toLowerCase().replace(/_/g, ' ').trim();
  if (s === 'not run')     return { label: 'NOT RUN',     type: 'gray'  };
  if (s === 'passed')      return { label: 'PASSED',      type: 'green' };
  if (s === 'failed')      return { label: 'FAILED',      type: 'gray'  };
  if (s === 'blocked')     return { label: 'BLOCKED',     type: 'gray'  };
  if (s === 'in progress') return { label: 'IN PROGRESS', type: 'blue'  };
  if (s === 'done')        return { label: 'DONE',        type: 'green' };
  if (s === 'active')      return { label: 'ACTIVE',      type: 'blue'  };
  if (s === 'open')        return { label: 'OPEN',        type: 'blue'  };
  if (s === 'closed')      return { label: 'CLOSED',      type: 'green' };
  if (s === 'resolved')    return { label: 'RESOLVED',    type: 'green' };
  if (s === 'to do')       return { label: 'TO DO',       type: 'gray'  };
  if (s === 'backlog')     return { label: 'BACKLOG',     type: 'gray'  };
  return { label: raw.toUpperCase(), type: 'gray' };
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} hour${diffH !== 1 ? 's' : ''} ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD} day${diffD !== 1 ? 's' : ''} ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function NotificationItemInner({ notification, actorProfile, onMarkRead, onClick }: NotificationItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const { isDark } = useTheme();
  const isUnread = !notification.read_at;
  const isDueDate = DUE_DATE_TYPES.some(t => t === notification.notification_type);
  const isComment = COMMENT_PREVIEW_TYPES.some(t => t === notification.notification_type);
  const isDeleted = notification.entity_deleted;

  // Dark mode tokens
  const T = {
    text1: isDark ? '#F5F3F0' : 'rgba(237,237,237,0.93)',
    text2: isDark ? '#A09890' : 'rgba(237,237,237,0.40)',
    text3: isDark ? '#6B6560' : 'rgba(237,237,237,0.40)',
    hover: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)',
    press: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
    borderStrong: isDark ? 'rgba(255,255,255,0.20)' : 'rgba(15,23,42,0.2)',
    entityKey: isDark ? '#60A5FA' : '#2563EB',
    checkStroke: isDark ? '#A09890' : 'rgba(237,237,237,0.40)',
  };

  // Determine if this is a system-generated assignment (no actor at all)
  const hasActor = !!(notification.actor_user_id && (actorProfile || notification.actor));
  const isSystemAssign = !hasActor
    && (notification.notification_type === 'assigned' || notification.notification_type === 'unassigned' || notification.notification_type === 'status_changed');

  const actorName = isSystemAssign
    ? ''
    : (actorProfile?.full_name || notification.actor?.full_name || (notification.metadata as any)?.actor_display_name || 'Unknown');
  const actorId = notification.actor?.id || notification.actor_user_id || 'system';
  const avatarColor = isSystemAssign ? '#6B7280' : getAvatarColor(actorId);
  const initials = isSystemAssign ? '' : getUserInitials(actorName);
  const avatarUrl = actorProfile?.avatar_url || notification.actor?.avatar_url || null;

  // m-15: read item opacity on text only, not avatar
  const textOpacity = isUnread ? 1 : 0.8;

  const daysUntilDue = notification.metadata?.due_date
    ? Math.ceil((new Date(notification.metadata.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const handleClick = () => {
    if (isDeleted) return; // entity_deleted — no navigation
    onClick?.(notification);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); }
        if (e.key === 'r' || e.key === 'R') { if (isUnread) onMarkRead?.(notification.id); }
      }}
      style={{
        padding: '12px 20px',
        cursor: isDeleted ? 'default' : 'pointer',
        position: 'relative',
        background: isPressed ? T.press : isHovered ? T.hover : 'transparent',
        borderLeft: isDueDate ? '3px solid #D97706' : '3px solid transparent',
        transition: 'background 150ms ease',
        outline: 'none',
      }}
    >
      <div style={{ display: 'flex', gap: 12 }}>
        {/* Avatar — always full opacity per m-15 */}
        {avatarUrl && !isSystemAssign ? (
          <img
            src={avatarUrl}
            alt={actorName}
            style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              objectFit: 'cover',
            }}
          />
        ) : (
          <div style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            background: avatarColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#FFFFFF', fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 14, fontWeight: 700,
          }}>
            {isSystemAssign ? <UserCheck size={20} color="#FFFFFF" /> : initials}
          </div>
        )}

        {/* Body — text opacity for read items */}
        <div style={{ flex: 1, minWidth: 0, opacity: textOpacity }}>
          {/* Action text + timestamp */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <span style={{
              fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 13, color: T.text1, lineHeight: '18px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 360,
            }}>
              {isSystemAssign ? (
                <span style={{ fontWeight: 600 }}>{getActionVerb(notification.notification_type, true)}</span>
              ) : (
                <>
                  <span style={{ fontWeight: 650 }}>{actorName}</span>{' '}
                  <span style={{ fontWeight: 500 }}>{getActionVerb(notification.notification_type, false)}</span>
                </>
              )}
            </span>
            <span style={{ fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 12, color: T.text2, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {formatTimestamp(notification.created_at)}
            </span>
          </div>

          {/* Entity row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <WorkItemIcon type={notification.entity_icon_type} />
            <span style={{
              fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 13,
              color: isDeleted ? T.text3 : T.text1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 360,
              fontStyle: isDeleted ? 'italic' : 'normal',
            }}>
              {isDeleted ? 'This item no longer exists' : notification.entity_title}
            </span>
          </div>

          {/* Meta row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span style={{
              fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 12, fontWeight: 500,
              color: isDeleted ? T.text3 : T.entityKey,
              textDecoration: isDeleted ? 'line-through' : 'none',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200,
            }}>
              {notification.entity_key}
            </span>
            <span style={{ color: T.text3, fontSize: 10 }}>•</span>
            <StatusLozenge label={normaliseStatus(notification.status).label} type={normaliseStatus(notification.status).type} />
          </div>

          {/* Due date alert */}
          {isDueDate && daysUntilDue !== null && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginTop: 8,
              background: 'rgba(217,119,6,.08)', borderRadius: 4, padding: '6px 10px',
            }}>
              <Clock size={14} color="#D97706" />
              <span style={{ fontFamily: 'Geist, -apple-system, sans-serif', fontSize: 12, color: isDark ? '#FCD34D' : '#FBBF24' }}>
                Due in {daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''} — {notification.metadata.due_date}
              </span>
            </div>
          )}

          {/* Comment preview */}
          {isComment && notification.metadata?.comment_preview && (
            <CommentPreview
              text={notification.metadata.comment_preview}
              attachmentFilename={notification.metadata.attachment_filename}
            />
          )}

          {/* Reaction bar for comment types */}
          {isComment && (
            <ReactionBar
              reactions={notification.metadata?.reactions}
              onReply={() => {}}
              onViewThread={() => {}}
            />
          )}
        </div>
      </div>

      {/* Unread dot */}
      {isUnread && !isHovered && (
        <div style={{
          position: 'absolute', top: 16, right: 20,
          width: 8, height: 8, borderRadius: '50%',
          background: isDueDate ? '#D97706' : '#2563EB',
        }} />
      )}

      {/* Mark-read circle on hover */}
      {isUnread && isHovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onMarkRead?.(notification.id); }}
          style={{
            position: 'absolute', top: 12, right: 16,
            width: 28, height: 28, borderRadius: '50%',
            border: `1.5px solid ${T.borderStrong}`,
            background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'opacity 150ms ease',
          }}
          title="Mark as read"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6L5 9L10 3" stroke={T.checkStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  );
}

const NotificationItem = memo(NotificationItemInner);
export default NotificationItem;
