import * as React from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
import type { CdsComment } from '../types';

// ─── Geometry constants ──────────────────────────────────────────────
//
// All values are CSS pixels. Tuned to the small Avatar (24px) used by
// Comment.tsx with `py-3` (12px) top padding.
//
// Within ANY comment's wrapper:
//   * Avatar starts at y=12, bottom at y=36, vertical center at y=24.
//   * Avatar horizontal center at x=12 (size=small, 24px wide, starts at x=0).
//
// We draw, for any comment that has replies:
//   * A single continuous vertical TRUNK at x=12 — starts just below
//     the parent's avatar (y=36), ends exactly at the TOP of the LAST
//     reply's wrapper. The last reply's curve picks up from there.
// And for each reply:
//   * A single quadratic BEZIER curve from (12, 0) tangent-vertical
//     down-and-right to (40, 24) tangent-horizontal at the reply's
//     avatar. No vertical or horizontal stubs — pure curve.
//
// Replies of replies: each level draws its own trunk for ITS own
// children. The grand-trunk does NOT inherit downward — Jira parity.
// Geometry constants — exported so the For You reply tree can reuse
// the exact same numbers (single source of truth for the trunk +
// branch alignment).
export const TRUNK_X = 12;
// Parent avatar BOTTOM (avatar 24px starts at y=12 via py-3 padding,
// bottom at y=36). Trunk emerges from BELOW the avatar at its
// horizontal center — Jira parity.
export const TRUNK_TOP = 36;
export const BRANCH_WIDTH = 28; // x=12 → x=40, aligns with reply paddingLeft
export const BRANCH_HEIGHT = 24; // bottom at y=24 (avatar center)
export const REPLY_INDENT = 40;
export const REPLY_GAP = 12;
export const LINE_COLOR = 'var(--ds-border)';
export const LINE_WIDTH = 1.5;

export interface CommentNodeProps {
  comment: CdsComment;
  /** Pre-grouped: parentId → ordered list of immediate child comments. */
  childrenByParentId: Record<string, CdsComment[]>;
  /** Renders one comment (Comment + toolbar + any inline editor / reply
   *  composer the parent owns). */
  renderComment: (comment: CdsComment) => React.ReactNode;
  /** True when this node is a reply — draws the curved branch + indent. */
  isReply?: boolean;
}

export function CommentNode({
  comment,
  childrenByParentId,
  renderComment,
  isReply = false,
}: CommentNodeProps) {
  const children = childrenByParentId[comment.id] ?? [];
  const hasChildren = children.length > 0;

  // Measure the last reply's branch corner so the trunk terminates
  // exactly there instead of overshooting into the reply's body.
  const wrapperRef = useRef<HTMLDivElement>(null);
  const lastChildRef = useRef<HTMLDivElement>(null);
  const [trunkBottom, setTrunkBottom] = useState(60);

  useLayoutEffect(() => {
    if (!hasChildren) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const update = () => {
      const lastChild = lastChildRef.current;
      if (!wrapper || !lastChild) return;
      const wRect = wrapper.getBoundingClientRect();
      const cRect = lastChild.getBoundingClientRect();
      // The last reply's curve begins at the TOP of its wrapper
      // (the SVG sits at top: 0). End the trunk exactly there so the
      // Bezier picks up where the straight line leaves off — no
      // overshoot past the curve start.
      const branchY = cRect.top;
      const distance = wRect.bottom - branchY;
      setTrunkBottom(distance > 0 ? distance : 0);
    };
    update();
    // Re-measure whenever ANY descendant resizes (inline composer
    // opens, translate bar toggles, edit editor expands, etc.).
    const ro = new ResizeObserver(update);
    ro.observe(wrapper);
    window.addEventListener('resize', update);
    const raf = requestAnimationFrame(update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
      cancelAnimationFrame(raf);
    };
  }, [hasChildren, children.length, children.map((c) => c.id).join('|')]);

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'relative',
        paddingLeft: isReply ? REPLY_INDENT : 0,
        marginTop: isReply ? REPLY_GAP : 0,
      }}
    >
      {/* Curved branch — only when this node is a reply. A single
          quadratic Bezier from (0,0) tangent-vertical, curving down
          and right to the reply's avatar at (28,24). No vertical or
          horizontal stubs — pure curve picks up where the parent's
          trunk ends and lands directly on the avatar. */}
      {isReply && (
        <svg
          aria-hidden
          width={BRANCH_WIDTH}
          height={BRANCH_HEIGHT}
          viewBox={`0 0 ${BRANCH_WIDTH} ${BRANCH_HEIGHT}`}
          style={{
            position: 'absolute',
            left: TRUNK_X,
            top: 0,
            overflow: 'visible',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          <path
            d={`M 0 0 Q 0 ${BRANCH_HEIGHT} ${BRANCH_WIDTH} ${BRANCH_HEIGHT}`}
            fill="none"
            stroke={LINE_COLOR}
            strokeWidth={LINE_WIDTH}
          />
        </svg>
      )}

      {/* Single trunk for THIS comment's own replies — starts at
          parent avatar bottom, ends at last reply branch corner. */}
      {hasChildren && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: TRUNK_X,
            top: TRUNK_TOP,
            bottom: trunkBottom,
            width: 0,
            borderLeft: `${LINE_WIDTH}px solid ${LINE_COLOR}`,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}

      {renderComment(comment)}

      {children.map((child, idx) => (
        <div
          key={child.id}
          ref={idx === children.length - 1 ? lastChildRef : undefined}
        >
          <CommentNode
            comment={child}
            childrenByParentId={childrenByParentId}
            renderComment={renderComment}
            isReply
          />
        </div>
      ))}
    </div>
  );
}
