import { useState, useCallback } from "react";
import type React from "react";
import { useNavigate } from "react-router-dom";
import CatalystAvatar from "@/components/shared/CatalystAvatar";
import { resolveAvatarUrl } from "@/lib/avatars";
import PersonCircleIcon from "@atlaskit/icon/glyph/person-circle";
import { Box, xcss } from "@atlaskit/primitives";
import { token } from "@atlaskit/tokens";
import type { DirectNotification } from "../types";
import DirectWorkItemIcon from "./DirectWorkItemIcon";
import { formatRelativeTime, getVerbText } from "../utils/date";
import { Star } from "@/lib/atlaskit-icons";
import { useStarredItemIds, useToggleStar } from "@/hooks/home/useStarredItems";
import { workItemStarType } from "@/lib/starType";

interface Props {
  notification: DirectNotification;
  isRead: boolean;
  onMarkRead: (id: string) => void;
  isDark: boolean;
}

const CONTENT_STYLE: React.CSSProperties = { flex: 1, minWidth: 0 };

const entityRowXcss = xcss({
  display: "flex",
  alignItems: "flex-start",
  gap: "space.075",
  marginBlockStart: "space.050",
});

const metaRowXcss = xcss({
  display: "flex",
  alignItems: "center",
  gap: "space.075",
  marginBlockStart: "space.050",
});

// ─── Emoji reaction emojis (canonical Jira set) ──────────────────────────────
const REACTION_EMOJIS = ["👍", "👏", "🔥", "❤️", "😊"];

export default function DirectNotificationRow({
  notification,
  isRead,
  onMarkRead,
  isDark,
}: Props) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);

  const { target, aggregation, thread } = notification;
  const actorName = notification.actor?.displayName ?? null;
  const avatarDisplayName = actorName;
  const verbText  = getVerbText(notification.verb, actorName, target.iconType, target.issueTypeName);
  const relTime   = formatRelativeTime(notification.createdAt);

  // Hover-revealed star → unified user_starred_items store. The row is a
  // <button>, so the star is a role="button" span (a nested <button> would be
  // invalid HTML). Visible on row hover/focus and stays gold once starred.
  const { data: starredIds } = useStarredItemIds();
  const toggleStar = useToggleStar();
  const isStarred = !!target.key && (starredIds?.has(target.key) ?? false);
  const handleToggleStar = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent) => {
      e.stopPropagation();
      if (!target.key) return;
      toggleStar.mutate({
        itemId: target.key,
        itemType: workItemStarType(target.iconType),
        isCurrentlyStarred: isStarred,
      });
    },
    [target.key, target.iconType, isStarred, toggleStar]
  );
  const STAR_GOLD = "var(--ds-icon-accent-yellow)";

  const idleBg = isDark
    ? "var(--ds-surface)"
    : "var(--ds-surface-overlay)";
  const hoverBg = isDark
    ? "var(--ds-surface-overlay)"
    : token(
        "color.background.neutral.hovered",
        "var(--ds-background-neutral-subtle-hovered)"
      );
  const pressBg = isDark
    ? "var(--ds-border, var(--cp-ink-1))"
    : token("color.background.neutral.pressed", "rgba(9,30,66,0.10)");
  const rowBg = pressed ? pressBg : hovered ? hoverBg : idleBg;

  const text1 = isDark
    ? "var(--ds-text)"
    : token("color.text", "#292A2E");
  const text2 = isDark
    ? "var(--ds-text-subtlest)"
    : token("color.text.subtle", "var(--ds-text-subtlest)");
  const text3 = isDark
    ? "var(--ds-text-subtlest, var(--cp-text-secondary))"
    : token("color.text.subtlest", "var(--ds-text-disabled)");
  const linkClr = isDark
    ? "var(--ds-link)"
    : token("color.link", "var(--ds-link)");
  const dotColor =
    "var(--ds-text-brand, var(--cp-workstream-catalyst-primary))";

  const threadBorderColor = isDark
    ? "var(--ds-surface)"
    : "var(--ds-text)";
  const threadBg = "transparent";

  const handleClick = useCallback(() => {
    if (!isRead) onMarkRead(notification.id);
    const projectKey = notification.target.key.split("-")[0];
    if (notification.target.iconType === "incident") {
      navigate(`/incident-hub/view/${notification.target.key}`);
    } else {
      navigate(`/project-hub/${projectKey}/allwork/${notification.target.key}`);
    }
  }, [
    isRead,
    notification.id,
    onMarkRead,
    notification.target.key,
    notification.target.iconType,
    navigate,
  ]);

  const handleMarkReadBtn = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onMarkRead(notification.id);
    },
    [notification.id, onMarkRead]
  );

  // Build avatar src — priority: notification.actor.avatarUrl > bundled photo > undefined.
  // Only used when notification.actor is non-null (actor=null rows render a person-circle placeholder).
  const avatarSrc = notification.actor?.avatarUrl
    ?? resolveAvatarUrl(avatarDisplayName)
    ?? undefined;

  return (
    <button
      type="button"
      aria-label={`Notification: ${verbText} ${target.title}`}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
        if ((e.key === "r" || e.key === "R") && !isRead)
          onMarkRead(notification.id);
      }}
      style={{
        display: "flex",
        width: "100%",
        padding: "8px 16px",
        background: rowBg,
        border: "none",
        borderBottom: `1px solid ${isDark ? 'var(--ds-border)' : 'var(--ds-border)'}`,
        borderRadius: 0,
        boxShadow: "none",
        cursor: "pointer",
        textAlign: "left",
        transition: "background 100ms ease",
        outline: focused ? "2px solid var(--ds-border-focused)" : "none",
        outlineOffset: "-2px",
        gap: 8,
        alignItems: "flex-start",
        opacity: isRead ? 0.8 : 1,
        marginBottom: 0,
      }}
      onFocus={() => { setHovered(true); setFocused(true); }}
      onBlur={() => { setHovered(false); setFocused(false); }}
    >
      {/* Avatar slot:
          - 'user': CatalystAvatar with initials/photo
          - 'system': muted circle with sync icon (Jira-assigned)
          - null/unknown: grey person-circle placeholder */}
      <div style={{ flexShrink: 0, marginTop: 0 }}>
        {notification.actor?.actorType === 'user' ? (
          <CatalystAvatar
            name={avatarDisplayName}
            src={avatarSrc}
            size="large"
            appearance="circle"
          />
        ) : notification.actor?.actorType === 'system' ? (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: isDark
                ? 'var(--ds-surface-overlay)'
                : 'var(--ds-background-neutral)',
              border: `1.5px dashed ${isDark ? 'var(--ds-border)' : 'var(--ds-border)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            title="Jira Sync"
          >
            {/* Sync icon */}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path
                d="M2.5 9a6.5 6.5 0 0 1 11.1-4.6M15.5 9a6.5 6.5 0 0 1-11.1 4.6"
                stroke={isDark ? 'var(--ds-icon-subtle)' : 'var(--ds-icon-subtle)'}
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <polyline
                points="13.5,4 15.5,4.4 15.1,6.4"
                stroke={isDark ? 'var(--ds-icon-subtle)' : 'var(--ds-icon-subtle)'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points="4.5,14 2.5,13.6 2.9,11.6"
                stroke={isDark ? 'var(--ds-icon-subtle)' : 'var(--ds-icon-subtle)'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        ) : (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'var(--ds-background-neutral)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <PersonCircleIcon
              label=""
              size="medium"
              primaryColor={isDark
                ? 'var(--ds-icon-subtle)'
                : 'var(--ds-icon-subtle)'}
            />
          </div>
        )}
      </div>

      {/* Text content */}
      <Box style={CONTENT_STYLE}>
        {/* Verb + timestamp row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <span
            style={{
              fontFamily: "var(--cp-font-body)",
              fontSize: 'var(--ds-font-size-400)',
              lineHeight: "20px",
              color: text1,
              flex: 1,
              minWidth: 0,
            }}
          >
            {actorName && notification.actor?.actorType === 'user' && (
              <span style={{ fontWeight: 600 }}>{actorName} </span>
            )}
            {actorName && notification.actor?.actorType === 'system' && (
              <span style={{ fontWeight: 400, fontStyle: 'italic', color: text3 }}>{actorName} </span>
            )}
            <span style={{ fontWeight: 500 }}>
              {actorName ? verbText.replace(`${actorName} `, "") : verbText}
            </span>
          </span>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: "var(--cp-font-body)",
                fontSize: 'var(--ds-font-size-400)',
                color: text3,
                whiteSpace: "nowrap",
              }}
            >
              {relTime}
            </span>

            {/* Unread dot — swap to mark-read button on hover */}
            {!isRead && !hovered && (
              <div
                aria-label="Unread"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: dotColor,
                  flexShrink: 0,
                }}
              />
            )}
            {!isRead && hovered && (
              <button
                type="button"
                onClick={handleMarkReadBtn}
                title="Mark as read"
                aria-label="Mark as read"
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  border: `1.5px solid ${text3}`,
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M1.5 5L4 7.5L8.5 2.5"
                    stroke={text2}
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Work item icon + title */}
        <Box xcss={entityRowXcss}>
          <div style={{ flexShrink: 0, display: "flex" }}>
            <DirectWorkItemIcon type={target.iconType} />
          </div>
          <span
            style={{
              fontFamily: "var(--cp-font-body)",
              fontSize: 'var(--ds-font-size-400)',
              lineHeight: "20px",
              color: text1,
              flex: 1,
              minWidth: 0,
            }}
          >
            {target.title}
          </span>
        </Box>

        {/* Key + status — plain text like Jira (no Lozenge) */}
        <Box xcss={metaRowXcss}>
          <span
            style={{
              fontFamily: "var(--cp-font-body)",
              fontSize: 'var(--ds-font-size-400)',
              fontWeight: 400,
              color: linkClr,
              flexShrink: 0,
            }}
          >
            {target.key}
          </span>
          <span
            style={{
              color: text3,
              fontSize: 'var(--ds-font-size-400)',
              lineHeight: "20px",
              flexShrink: 0,
            }}
          >
            •
          </span>
          {/* Plain grey status text — sentence case, matching Jira */}
          <span
            style={{
              fontFamily: "var(--cp-font-body)",
              fontSize: 'var(--ds-font-size-400)',
              fontWeight: 400,
              color: text2,
              flexShrink: 0,
            }}
          >
            {target.statusLabel}
          </span>

          {/* Hover-revealed star — pinned right. role="button" span (the row
              itself is a <button>). Gold + visible when starred. */}
          {target.key && (
            <span
              role="button"
              tabIndex={0}
              aria-label={isStarred ? "Remove from starred" : "Add to starred"}
              onClick={handleToggleStar}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleToggleStar(e);
              }}
              style={{
                marginLeft: "auto",
                display: "inline-flex",
                alignItems: "center",
                cursor: "pointer",
                flexShrink: 0,
                opacity: isStarred || hovered ? 1 : 0,
                transition: "opacity 120ms ease",
              }}
            >
              <Star
                size={16}
                color={STAR_GOLD}
                fill={isStarred ? STAR_GOLD : "none"}
              />
            </span>
          )}
        </Box>

        {/* Thread preview card — shown when notification has a comment thread */}
        {thread && (
          <div
            style={{
              marginTop: 8,
              padding: "8px 10px",
              borderRadius: 4,
              border: `1px solid ${threadBorderColor}`,
              background: threadBg,
            }}
          >
            {/* Comment preview text (or placeholder when preview not yet stored) */}
            {thread.commentPreview ? (
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--cp-font-body)",
                  fontSize: 'var(--ds-font-size-400)',
                  lineHeight: "20px",
                  color: text1,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical" as const,
                }}
              >
                {thread.commentPreview}
              </p>
            ) : (
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--cp-font-body)",
                  fontSize: 'var(--ds-font-size-400)',
                  lineHeight: "20px",
                  color: text3,
                  fontStyle: "italic",
                }}
              >
                View the full thread for context
              </p>
            )}

            {/* Reactions + Reply + View thread */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginTop: 4,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Emoji reactions */}
              {REACTION_EMOJIS.map((emoji) => {
                const count = thread.reactions[emoji] ?? 0;
                return (
                  <button
                    key={emoji}
                    type="button"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0,
                      padding: "0px 5px",
                      borderRadius: 10,
                      border: `1px solid ${threadBorderColor}`,
                      background:
                        count > 0
                          ? "var(--cp-interact-selected, rgba(37,99,235,0.06))"
                          : "transparent",
                      cursor: "pointer",
                      fontFamily: "var(--cp-font-body)",
                      fontSize: 'var(--ds-font-size-100)',
                      color: text2,
                      lineHeight: "16px",
                    }}
                    title={`React with ${emoji}`}
                    aria-label={`${emoji} reaction${
                      count > 0 ? `, ${count}` : ""
                    }`}
                  >
                    <span style={{ fontSize: 'var(--ds-font-size-200)', lineHeight: 1 }}>{emoji}</span>
                    {count > 0 && (
                      <span style={{ fontWeight: 500 }}>{count}</span>
                    )}
                  </button>
                );
              })}

              {/* Add reaction */}
              <button
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 22,
                  height: 22,
                  borderRadius: 10,
                  border: `1px solid ${threadBorderColor}`,
                  background: "transparent",
                  cursor: "pointer",
                  color: text3,
                  fontSize: 'var(--ds-font-size-300)',
                  lineHeight: 1,
                  padding: 0,
                }}
                title="Add reaction"
                aria-label="Add reaction"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="6"
                    cy="6"
                    r="5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M4 7c.5.8 1.5 1.3 2 1.3s1.5-.5 2-1.3"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  <circle cx="4.5" cy="4.5" r=".7" fill="currentColor" />
                  <circle cx="7.5" cy="4.5" r=".7" fill="currentColor" />
                </svg>
              </button>

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Reply */}
              <button
                type="button"
                style={{
                  fontFamily: "var(--cp-font-body)",
                  fontSize: 'var(--ds-font-size-200)',
                  fontWeight: 500,
                  color: linkClr,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0 4px",
                  lineHeight: "16px",
                }}
              >
                Reply
              </button>

              {/* View thread */}
              <button
                type="button"
                style={{
                  fontFamily: "var(--cp-font-body)",
                  fontSize: 'var(--ds-font-size-200)',
                  fontWeight: 500,
                  color: linkClr,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0 4px",
                  lineHeight: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                View thread
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 5h6M5.5 2.5L8 5l-2.5 2.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Aggregation row (multiple updates from same person) */}
        {aggregation && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              marginTop: 4,
            }}
          >
            <CatalystAvatar
              name={aggregation.actor.displayName}
              size="xsmall"
              appearance="circle"
              src={
                resolveAvatarUrl(aggregation.actor.displayName) ??
                aggregation.actor.avatarUrl
              }
            />
            <span
              style={{
                fontFamily: "var(--cp-font-body)",
                fontSize: 'var(--ds-font-size-400)',
                fontWeight: 400,
                color: linkClr,
              }}
            >
              +{aggregation.count} update{aggregation.count !== 1 ? "s" : ""}{" "}
              from {aggregation.actor.displayName}
            </span>
          </div>
        )}
      </Box>
    </button>
  );
}
