import { memo, useState } from "react";
import type { Notification } from "@/types/notifications";
import type { ActorProfile } from "@/hooks/useActorProfiles";
import { COMMENT_PREVIEW_TYPES, DUE_DATE_TYPES } from "@/constants/notificationConstants";
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

/* ═══ C-04: normaliseStatus — complete V12 map ═══ */
const normaliseStatus = (raw: string | null | undefined): { label: string; type: 'gray' | 'blue' | 'green' } | null => {
  if (!raw) return null;
  const s = raw.toLowerCase().replace(/_/g, ' ').trim();
  if (s === 'not run')          return { label: 'NOT RUN',     type: 'gray'  };
  if (s === 'passed')           return { label: 'PASSED',      type: 'green' };
  if (s === 'failed')           return { label: 'FAILED',      type: 'gray'  };
  if (s === 'todo' || s === 'to do') return { label: 'TO DO',  type: 'gray'  };
  if (s === 'in progress')      return { label: 'IN PROGRESS', type: 'blue'  };
  if (s === 'in development')   return { label: 'IN PROGRESS', type: 'blue'  };
  if (s === 'in review')        return { label: 'IN REVIEW',   type: 'blue'  };
  if (s === 'ready for development') return { label: 'IN REVIEW', type: 'blue' };
  if (s === 'done')             return { label: 'DONE',        type: 'green' };
  if (s === 'completed')        return { label: 'COMPLETED',   type: 'green' };
  if (s === 'approved')         return { label: 'APPROVED',    type: 'green' };
  if (s === 'backlog')          return { label: 'BACKLOG',     type: 'gray'  };
  if (s === 'on hold')          return { label: 'ON HOLD',     type: 'gray'  };
  if (s === 'active')           return { label: 'ACTIVE',      type: 'blue'  };
  if (s === 'cancelled')        return { label: 'CANCELLED',   type: 'gray'  };
  if (s === 'open')             return { label: 'OPEN',        type: 'blue'  };
  if (s === 'closed')           return { label: 'CLOSED',      type: 'green' };
  if (s === 'resolved')         return { label: 'RESOLVED',    type: 'green' };
  if (s === 'blocked')          return { label: 'BLOCKED',     type: 'gray'  };
  return { label: raw.replace(/_/g, ' ').toUpperCase(), type: 'gray' };
};

/* ═══ C-02: WorkItemIcon — canonical inline SVGs ═══ */
function WorkItemIcon({ type }: { type: string }) {
  const t = (type || '').toLowerCase().trim();
  // Bug / Defect — red asterisk
  if (t === 'bug' || t === 'defect' || t === 'qa bug')
    return <svg width="16" height="16" viewBox="0 0 16 16"><path fill="#FF5630" fillRule="evenodd" d="M2,0 L14,0 C15.1045695,0 16,0.8954305 16,2 L16,14 C16,15.1045695 15.1045695,16 14,16 L2,16 C0.8954305,16 0,15.1045695 0,14 L0,2 C0,0.8954305 0.8954305,0 2,0 Z M8,12 C10.209139,12 12,10.209139 12,8 C12,5.790861 10.209139,4 8,4 C5.790861,4 4,5.790861 4,8 C4,10.209139 5.790861,12 8,12 Z"/></svg>;
  // Story — green bookmark
  if (t === 'story')
    return <svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#36B37E"/><path d="M4 3h8v10l-4-2.5L4 13V3z" fill="white"/></svg>;
  // Task variants — blue checkbox
  if (t === 'task' || t === 'catalyst_issue' || t === 'subtask' || t === 'sub-task'
      || t === 'frontend' || t === 'backend' || t === 'integration'
      || t === 'brd task' || t === 'change request' || t === 'figma'
      || t === 'entity figma' || t === 'issue')
    return <svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#2563EB"/><path d="M4 8.5l2.5 2.5 5.5-5.5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>;
  // Epic — purple lightning
  if (t === 'epic')
    return <svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#7C3AED"/><path d="M9.5 3L5.5 9h4L6.5 13l6-7H9l.5-3z" fill="white"/></svg>;
  // Business request / gap — green bookmark (story-like)
  if (t === 'business request' || t === 'business gap')
    return <svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#36B37E"/><path d="M4 3h8v10l-4-2.5L4 13V3z" fill="white"/></svg>;
  // Test case
  if (t === 'test_case' || t === 'tm_test_case')
    return <svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#0D9488"/><path d="M4 5h8M4 8h5M4 11h3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>;
  // Test plan
  if (t === 'test_plan')
    return <svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#0D9488"/><path d="M4 4h8v8H4z" fill="none" stroke="white" strokeWidth="1.2"/><path d="M6 7l1.5 1.5 3-3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>;
  // Incident / production incident — red warning
  if (t === 'incident' || t === 'production incident')
    return <svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#DC2626"/><path d="M8 4v5M8 10.5v1.5" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>;
  // Default — blue task (safe fallback for unknown Jira types)
  return <svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#2563EB"/><path d="M4 8.5l2.5 2.5 5.5-5.5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>;
}

/* ═══ M-03/M-04: getActionText — consistent grammar ═══ */
function getActionText(type: string, actorName: string | null): string {
  switch (type) {
    case 'assigned':
    case 'assigned_work_item':
    case 'assigned_story':
    case 'tester_assigned':
      return actorName ? `${actorName} assigned you to` : 'You have been assigned to';
    case 'unassigned':
      return actorName ? `${actorName} changed the assignee on` : 'Assignee changed on';
    case 'status_changed':
      return actorName ? `${actorName} transitioned` : 'Status changed on';
    case 'issue_resolved':
      return actorName ? `${actorName} resolved` : 'Issue resolved:';
    case 'issue_closed':
      return actorName ? `${actorName} closed` : 'Issue closed:';
    case 'issue_reopened':
      return actorName ? `${actorName} reopened` : 'Issue reopened:';
    case 'mentioned_in_comment':
      return actorName ? `${actorName} mentioned you in` : 'You were mentioned in';
    case 'commented_on_work_item':
    case 'commented':
      return actorName ? `${actorName} commented on` : 'New comment on';
    case 'reassigned_work_item':
      return actorName ? `${actorName} reassigned` : 'Reassignment on';
    case 'created_work_item':
      return actorName ? `${actorName} created` : 'New item created:';
    case 'due_date_approaching':
      return 'Due date approaching for';
    case 'incident_escalated':
      return actorName ? `${actorName} escalated` : 'Incident escalated:';
    default:
      return actorName ? `${actorName} updated` : 'Update on';
  }
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
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

  const T = {
    text1: isDark ? '#EDEDED' : '#0F172A',
    text2: isDark ? '#A1A1A1' : '#64748B',
    text3: isDark ? '#878787' : '#94A3B8',
    hover: isDark ? '#1F1F1F' : 'rgba(15,23,42,0.04)',
    press: isDark ? '#2E2E2E' : 'rgba(15,23,42,0.08)',
    borderStrong: isDark ? '#454545' : 'rgba(15,23,42,0.2)',
    checkStroke: isDark ? '#A1A1A1' : '#64748B',
  };

  /* ═══ C-03: Actor avatar logic ═══ */
  const metaActorName = (notification.metadata as any)?.actor_display_name || null;
  const metaActorAvatar = (notification.metadata as any)?.actor_avatar_url || null;
  const hasActor = !!notification.actor_user_id || !!metaActorName;
  const actorName = actorProfile?.full_name || notification.actor?.full_name || metaActorName || null;
  const avatarUrl = actorProfile?.avatar_url || notification.actor?.avatar_url || (metaActorAvatar || null);

  const renderAvatar = () => {
    if (!hasActor) {
      // System action — neutral grey circle with icon
      return (
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: isDark ? '#292929' : '#E2E8F0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <UserCheck size={16} color={isDark ? '#878787' : '#94A3B8'} />
        </div>
      );
    }
    if (avatarUrl) {
      return (
        <img
          src={avatarUrl}
          alt={actorName || ''}
          style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        />
      );
    }
    // Initials fallback
    const name = actorName || '?';
    const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
    const colours = ['#2563EB', '#0D9488', '#7C3AED', '#DC2626', '#D97706'];
    const bg = colours[(notification.actor_user_id || '').charCodeAt(0) % colours.length];
    return (
      <div style={{
        width: 36, height: 36, borderRadius: '50%', background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 650, color: '#FFFFFF',
        fontFamily: 'var(--cp-font-body)', flexShrink: 0,
      }}>
        {initials}
      </div>
    );
  };

  const textOpacity = isUnread ? 1 : 0.8;

  const daysUntilDue = notification.metadata?.due_date
    ? Math.ceil((new Date(notification.metadata.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const handleClick = () => {
    if (isDeleted) return;
    onClick?.(notification);
  };

  const actionText = getActionText(notification.notification_type, actorName);
  const statusProps = normaliseStatus(notification.status);

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
        /* P-02: tightened padding, NO left border/bar */
        padding: '12px 16px',
        cursor: isDeleted ? 'default' : 'pointer',
        position: 'relative',
        background: isPressed ? T.press : isHovered ? T.hover : 'transparent',
        transition: 'background 150ms ease',
        outline: 'none',
      }}
    >
      <div style={{ display: 'flex', gap: 10 }}>
        {/* C-03: Avatar */}
        {renderAvatar()}

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0, opacity: textOpacity }}>
          {/* Action text + timestamp + unread dot */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <span style={{
              fontFamily: 'var(--cp-font-body)', fontSize: 13, color: T.text1, lineHeight: '18px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0,
            }}>
              {/* M-03/M-04: consistent action text */}
              <span style={{ fontWeight: hasActor ? 400 : 600 }}>{actionText}</span>
            </span>
            {/* M-05: timestamp + unread indicator cluster (right-aligned) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400, whiteSpace: 'nowrap', fontFamily: 'var(--cp-font-body)' }}>
                {formatTimestamp(notification.created_at)}
              </span>
              {/* C-01: unread dot OR mark-read button — inline, no overlap */}
              {isUnread && !isHovered && (
                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#2563EB', flexShrink: 0 }} />
              )}
              {isUnread && isHovered && (
                <button
                  onClick={(e) => { e.stopPropagation(); onMarkRead?.(notification.id); }}
                  style={{
                    width: 24, height: 24, borderRadius: '50%',
                    border: `1.5px solid ${T.borderStrong}`,
                    background: 'transparent', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 0, flexShrink: 0,
                  }}
                  title="Mark as read"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke={T.checkStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Entity row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            {/* C-02: canonical SVG icon */}
            <span style={{ flexShrink: 0, display: 'inline-flex' }}>
              <WorkItemIcon type={notification.entity_icon_type || notification.entity_type} />
            </span>
            <span style={{
              fontFamily: 'var(--cp-font-body)', fontSize: 13,
              color: isDeleted ? T.text3 : T.text1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontStyle: isDeleted ? 'italic' : 'normal',
            }}>
              {isDeleted ? 'This item no longer exists' : notification.entity_title}
            </span>
          </div>

          {/* Meta row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            {/* M-06: entity key link — muted blue */}
            <span style={{
              fontFamily: 'var(--cp-font-body)', fontSize: 12, fontWeight: 500,
              color: isDeleted ? T.text3 : '#3B82F6',
              textDecoration: isDeleted ? 'line-through' : 'none',
              cursor: 'pointer',
            }}>
              {notification.entity_key}
            </span>
            {statusProps && (
              <>
                <span style={{ color: T.text3, fontSize: 10 }}>•</span>
                <StatusLozenge label={statusProps.label} type={statusProps.type} />
              </>
            )}
          </div>

          {/* Due date alert */}
          {isDueDate && daysUntilDue !== null && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginTop: 8,
              background: 'rgba(217,119,6,.08)', borderRadius: 4, padding: '6px 10px',
            }}>
              <Clock size={14} color="#D97706" />
              <span style={{ fontFamily: 'var(--cp-font-body)', fontSize: 12, color: isDark ? '#FCD34D' : '#92400E' }}>
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

          {/* Reaction bar */}
          {isComment && (
            <ReactionBar
              reactions={notification.metadata?.reactions}
              onReply={() => {}}
              onViewThread={() => {}}
            />
          )}
        </div>
      </div>

      {/* Mark-read button moved inline — see timestamp cluster above */}
    </div>
  );
}

const NotificationItem = memo(NotificationItemInner);
export default NotificationItem;
