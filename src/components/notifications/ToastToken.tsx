import { useState } from "react";
import { X, UserCheck } from "lucide-react";
import type { ToastNotification } from "@/types/notifications";
import { DUE_DATE_TYPES, TOAST_WIDTH } from "@/constants/notificationConstants";
import { getAvatarColor, getUserInitials } from "@/utils/avatarColor";
import { WorkItemIcon } from "./WorkItemIcons";

interface ToastTokenProps {
  toast: ToastNotification;
  onDismiss: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
}

function getActionVerb(type: string): string {
  const map: Record<string, string> = {
    assigned_work_item: 'assigned you to',
    assigned: 'assigned you to',
    unassigned: 'unassigned you from',
    mentioned_in_comment: 'mentioned you in',
    commented_on_work_item: 'commented on',
    commented: 'commented on',
    status_changed: 'changed status of',
    due_date_approaching: 'due date approaching for',
  };
  return map[type] || 'updated';
}

export default function ToastToken({ toast: t, onDismiss, onPause, onResume }: ToastTokenProps) {
  const [hovered, setHovered] = useState(false);
  const n = t.notification;
  const isDueDate = DUE_DATE_TYPES.some(dt => dt === n.notification_type);
  const accentColor = isDueDate ? '#D97706' : '#2563EB';
  const isSystemAssign = !n.actor_user_id && (n.notification_type === 'assigned' || n.notification_type === 'status_changed');
  const actorName = isSystemAssign ? 'You were assigned to' : (n.actor?.full_name || (n.metadata as any)?.actor_display_name || 'Unknown');
  const actorId = n.actor?.id || n.actor_user_id || 'system';
  const progress = t.remainingMs / t.dismissAfterMs;

  return (
    <div
      onMouseEnter={() => { setHovered(true); onPause(t.id); }}
      onMouseLeave={() => { setHovered(false); onResume(t.id); }}
      tabIndex={-1}
      style={{
        width: TOAST_WIDTH,
        background: 'var(--bg-app, #FFFFFF)',
        border: '0.5px solid rgba(15,23,42,.08)',
        borderRadius: 6,
        borderLeft: `3px solid ${accentColor}`,
        boxShadow: '0 4px 16px rgba(15,23,42,.12)',
        overflow: 'hidden',
        cursor: 'pointer',
        animation: 'toast-in 250ms cubic-bezier(0.16,1,0.3,1) forwards',
      }}
    >
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(24px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @media (max-width: 767px) {
          .toast-responsive {
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      <div style={{ padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        {/* Avatar */}
        <div style={{
          width: 36, height: 50, borderRadius: '50%', flexShrink: 0,
          background: isSystemAssign ? '#6B7280' : getAvatarColor(actorId),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ds-text-inverse, #FFFFFF)', fontFamily: 'var(--cp-font-body)', fontSize: 12, fontWeight: 700,
        }}>
          {isSystemAssign ? <UserCheck size={18} color="var(--ds-text-inverse, #FFFFFF)" /> : getUserInitials(actorName)}
        </div>

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--cp-font-body)', fontSize: 13, fontWeight: 500, color: 'var(--fg-1, #0F172A)', lineHeight: '18px' }}>
            <span style={{ fontWeight: 650 }}>{actorName}</span>{' '}
            {getActionVerb(n.notification_type)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <WorkItemIcon type={n.entity_icon_type} />
            {/* m-06: entity title truncation increased to 260px */}
            <span style={{
              fontFamily: 'var(--cp-font-body)', fontSize: 13, color: 'var(--fg-1, #0F172A)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxWidth: 260,
            }}>
              {n.entity_title}
            </span>
            <span style={{ fontFamily: 'var(--cp-font-body)', fontSize: 12, color: '#2563EB', fontWeight: 500, flexShrink: 0 }}>
              {n.entity_key}
            </span>
          </div>

          {/* Quick actions on hover */}
          {hovered && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {['✓ Mark read', '↗ Open'].map(label => (
                <button
                  key={label}
                  onClick={(e) => { e.stopPropagation(); if (label.includes('Mark')) onDismiss(t.id); }}
                  style={{
                    padding: '4px 10px', borderRadius: 4,
                    border: '0.5px solid rgba(15,23,42,.12)', background: 'transparent',
                    cursor: 'pointer', fontFamily: 'var(--cp-font-body)', fontSize: 12, fontWeight: 500,
                    color: '#475569',
                    minHeight: 44, // responsive: min tap target
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(t.id); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 2,
            color: '#94A3B8', flexShrink: 0, borderRadius: 4,
            minWidth: 44, minHeight: 44, // responsive: min tap target
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          aria-label="Dismiss notification"
        >
          <X size={16} />
        </button>
      </div>

      {/* Progress bar — JS-driven */}
      <div style={{ height: 2, background: 'rgba(15,23,42,.04)' }}>
        <div style={{
          height: '100%',
          width: `${progress * 100}%`,
          background: accentColor,
          transition: 'none',
        }} />
      </div>
    </div>
  );
}
