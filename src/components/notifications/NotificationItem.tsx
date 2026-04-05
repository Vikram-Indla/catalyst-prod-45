import { memo, useState } from "react";
import type { Notification } from "@/types/notifications";
import { COMMENT_PREVIEW_TYPES, DUE_DATE_TYPES } from "@/constants/notificationConstants";
import { getAvatarColor, getUserInitials } from "@/utils/avatarColor";
import { WorkItemIcon } from "./WorkItemIcons";
import StatusLozenge from "./StatusLozenge";
import CommentPreview from "./CommentPreview";
import ReactionBar from "./ReactionBar";
import { Clock, UserCheck } from "lucide-react";

interface NotificationItemProps {
  notification: Notification;
  onMarkRead?: (id: string) => void;
  onClick?: (notification: Notification) => void;
}

function getActionVerb(type: string, isSystemAssign: boolean): string {
  if (isSystemAssign && type === 'unassigned') return 'You were removed from';
  if (isSystemAssign) return 'You were assigned to';
  const map: Record<string, string> = {
    assigned_work_item: 'assigned you to',
    assigned: 'assigned you to',
    assigned_story: 'assigned you a story in',
    mentioned_in_comment: 'mentioned you in a comment on',
    commented_on_work_item: 'commented on',
    updated_work_item: 'updated',
    status_changed: 'changed status of',
    reassigned_work_item: 'reassigned',
    created_work_item: 'created',
    release_approval_requested: 'requested approval for',
    incident_escalated: 'escalated',
    test_case_failed: 'marked as failed:',
    due_date_approaching: 'due date approaching for',
    ai_insight_generated: 'AI generated insight for',
  };
  return map[type] || 'updated';
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? 's' : ''} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return '1 day ago';
  return `${diffDay} days ago`;
}

function NotificationItemInner({ notification, onMarkRead, onClick }: NotificationItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const isUnread = !notification.read_at;
  const isDueDate = DUE_DATE_TYPES.some(t => t === notification.notification_type);
  const isComment = COMMENT_PREVIEW_TYPES.some(t => t === notification.notification_type);
  const isDeleted = notification.entity_deleted;

  // Determine if this is a system-generated assignment (no actor)
  const isSystemAssign = !notification.actor_user_id
    && (notification.notification_type === 'assigned' || notification.notification_type === 'unassigned' || notification.notification_type === 'status_changed');

  const actorName = isSystemAssign
    ? ''
    : (notification.actor?.full_name || (notification.metadata as any)?.actor_display_name || 'Unknown');
  const actorId = notification.actor?.id || notification.actor_user_id || 'system';
  const avatarColor = isSystemAssign ? '#6B7280' : getAvatarColor(actorId);
  const initials = isSystemAssign ? '' : getUserInitials(actorName);

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
        background: isPressed ? 'rgba(15,23,42,.08)' : isHovered ? 'rgba(15,23,42,.04)' : 'transparent',
        borderLeft: isDueDate ? '3px solid #D97706' : '3px solid transparent',
        transition: 'background 150ms ease',
        outline: 'none',
      }}
    >
      <div style={{ display: 'flex', gap: 12 }}>
        {/* Avatar — always full opacity per m-15 */}
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: avatarColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#FFFFFF', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 700,
        }}>
          {isSystemAssign ? <UserCheck size={20} color="#FFFFFF" /> : initials}
        </div>

        {/* Body — text opacity for read items */}
        <div style={{ flex: 1, minWidth: 0, opacity: textOpacity }}>
          {/* Action text + timestamp */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <span style={{
              fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#0F172A', lineHeight: '18px',
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
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#64748B', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {formatTimestamp(notification.created_at)}
            </span>
          </div>

          {/* Entity row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <WorkItemIcon type={notification.entity_icon_type} />
            <span style={{
              fontFamily: 'Inter, sans-serif', fontSize: 13,
              color: isDeleted ? '#94A3B8' : '#0F172A',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 360,
              fontStyle: isDeleted ? 'italic' : 'normal',
            }}>
              {isDeleted ? 'This item no longer exists' : notification.entity_title}
            </span>
          </div>

          {/* Meta row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span style={{
              fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500,
              color: isDeleted ? '#94A3B8' : '#2563EB',
              textDecoration: isDeleted ? 'line-through' : 'none',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200,
            }}>
              {notification.entity_key}
            </span>
            <span style={{ color: '#94A3B8', fontSize: 10 }}>•</span>
            <StatusLozenge label={notification.status} type={notification.status_type} />
          </div>

          {/* Due date alert */}
          {isDueDate && daysUntilDue !== null && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginTop: 8,
              background: 'rgba(217,119,6,.08)', borderRadius: 4, padding: '6px 10px',
            }}>
              <Clock size={14} color="#D97706" />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#92400E' }}>
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
            border: '1.5px solid rgba(15,23,42,.2)',
            background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'opacity 150ms ease',
          }}
          title="Mark as read"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6L5 9L10 3" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  );
}

const NotificationItem = memo(NotificationItemInner);
export default NotificationItem;
