/**
 * MentionSuggestionPill — horizontal pill that surfaces relevant users
 * to @-mention in a comment. Mirrors Jira's pattern:
 *
 *   [+person] [chevron-left]  [<chip><chip><chip>...]  [chevron-right]
 *
 * Behaviour:
 *   - Sources users from useMentionSuggestions (issue participants +
 *     project members + recent activity).
 *   - Live-filters out users already @-mentioned in the editor doc —
 *     so the chips disappear as the user mentions them, and reappear
 *     if the user deletes the mention.
 *   - Click a chip → inserts a mention node at the current cursor
 *     position followed by a space.
 *   - Chevrons scroll the chip strip horizontally; they hide when
 *     there's nothing to scroll in that direction.
 *   - On save → next render parses the saved ADF and excludes those
 *     users naturally; on unsaved-refresh the chips reappear.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
// eslint-disable-next-line no-restricted-imports
import PersonAddIcon from "@atlaskit/icon/core/person-add";
// eslint-disable-next-line no-restricted-imports
import ChevronLeftIcon from "@atlaskit/icon/glyph/chevron-left";
// eslint-disable-next-line no-restricted-imports
import ChevronRightIcon from "@atlaskit/icon/glyph/chevron-right";
import {
  useMentionSuggestions,
  type MentionUser,
} from "../../hooks/useMentionSuggestions";

interface Props {
  editor: Editor;
  workItemId: string | undefined;
}

function extractMentionIds(doc: PMNode): Set<string> {
  const ids = new Set<string>();
  doc.descendants((node) => {
    if (node.type.name === "mention") {
      const id = node.attrs.id;
      if (id) ids.add(String(id));
    }
    return true;
  });
  return ids;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function MentionSuggestionPill({ editor, workItemId }: Props) {
  const { data: allSuggestions = [] } = useMentionSuggestions(workItemId);
  const [mentioned, setMentioned] = useState<Set<string>>(() =>
    extractMentionIds(editor.state.doc),
  );

  useEffect(() => {
    const update = () => {
      const next = extractMentionIds(editor.state.doc);
      setMentioned((prev) => {
        if (prev.size !== next.size) return next;
        for (const id of next) if (!prev.has(id)) return next;
        return prev;
      });
    };
    editor.on("update", update);
    editor.on("transaction", update);
    return () => {
      editor.off("update", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  const visible = useMemo(
    () => allSuggestions.filter((u) => !mentioned.has(u.id)),
    [allSuggestions, mentioned],
  );

  // ── Scroll arrow visibility ──
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const recalcArrows = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    recalcArrows();
    el.addEventListener("scroll", recalcArrows);
    const ro = new ResizeObserver(recalcArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", recalcArrows);
      ro.disconnect();
    };
  }, [recalcArrows, visible.length]);

  const scrollBy = (delta: number) => {
    stripRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  const insertMention = (user: MentionUser) => {
    editor
      .chain()
      .focus()
      .insertContent([
        { type: "mention", attrs: { id: user.id, label: user.full_name } },
        { type: "text", text: " " },
      ])
      .run();
  };

  if (visible.length === 0) return null;

  return (
    <div
      role="toolbar"
      aria-label="Mention suggestions"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px",
        background: "var(--ds-surface, #FFFFFF)",
        border: "1px solid var(--ds-border, #DFE1E6)",
        borderRadius: 6,
        maxWidth: "100%",
        minWidth: 0,
      }}
    >
      <button
        type="button"
        title="Add people"
        aria-label="Add people"
        style={iconBtnStyle}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          /* Future: open user-search popover. */
        }}
      >
        <PersonAddIcon label="" />
      </button>

      {canLeft && (
        <button
          type="button"
          aria-label="Scroll left"
          style={iconBtnStyle}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => scrollBy(-180)}
        >
          <ChevronLeftIcon label="" size="small" />
        </button>
      )}

      <div
        ref={stripRef}
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          maxWidth: 540,
          minWidth: 0,
        }}
        className="catalyst-mention-pill-strip"
      >
        {visible.map((u) => (
          <UserChip key={u.id} user={u} onClick={() => insertMention(u)} />
        ))}
      </div>

      {canRight && (
        <button
          type="button"
          aria-label="Scroll right"
          style={iconBtnStyle}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => scrollBy(180)}
        >
          <ChevronRightIcon label="" size="small" />
        </button>
      )}
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  borderRadius: 4,
  background: "transparent",
  color: "var(--ds-text, #292A2E)",
  cursor: "pointer",
  flexShrink: 0,
};

function UserChip({
  user,
  onClick,
}: {
  user: MentionUser;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={`Mention ${user.full_name}`}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "1px 10px 1px 3px",
        height: 24,
        border: "1px solid var(--ds-border, #DFE1E6)",
        borderRadius: 4,
        background: "var(--ds-surface, #FFFFFF)",
        color: "var(--ds-text, #292A2E)",
        fontSize: 12,
        fontWeight: 500,
        cursor: "pointer",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background =
          "var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--ds-surface, #FFFFFF)";
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "var(--ds-background-accent-blue-subtler, #CCE0FF)",
          color: "var(--ds-text-information, #0C66E4)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 600,
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          initialsFromName(user.full_name)
        )}
      </span>
      <span
        aria-hidden
        style={{
          color: "var(--ds-text-subtle, #44546F)",
          fontSize: 16,
          fontWeight: 600,
          lineHeight: 1,
        }}
      >
        +
      </span>
      <span
        style={{
          maxWidth: 180,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {user.full_name}
      </span>
    </button>
  );
}
