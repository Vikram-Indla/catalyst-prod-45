import {
  forwardRef,
  Fragment,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Icon } from "@catylast/icons";

import { cx } from "../utils/classNames";
import * as styles from "./Comment.css";

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export type CommentSize = "small" | "medium" | "large";

export type CommentProps = Omit<
  ComponentPropsWithoutRef<"article">,
  "title" | "content" | "type" | "children"
> & {
  /**
   * Author name. Pass plain text or a node (e.g. a router-aware link to
   * the author's profile).
   */
  author: ReactNode;
  /** Avatar slot — typically an `<Avatar>` instance. */
  avatar?: ReactNode;
  /**
   * Optional badge after the author name — useful for "Author", "OP",
   * "Owner", or any role marker. Pass a string for the default tag style,
   * or a custom node for full control.
   */
  type?: ReactNode;
  /**
   * Timestamp slot. Pass a string ("2 hours ago"), a node (link, tooltip),
   * or a real `<time>` element.
   */
  time?: ReactNode;
  /** Comment body. Plain text, rich text, or any custom node. */
  content?: ReactNode;
  /**
   * Action items rendered after the body — typically Reply / Edit /
   * Delete buttons. Each entry becomes a separate item with a `·`
   * separator between siblings.
   */
  actions?: ReactNode[];
  /**
   * Visibility-restriction label — renders a lock icon and the supplied
   * text (e.g. "Restricted to Engineering"). Pass a string for the
   * default visual or a custom node for full control.
   */
  restrictedTo?: ReactNode;
  /** Highlight the comment — accent border on the leading edge. */
  highlighted?: boolean;
  /**
   * Show the saving spinner under the body. Disables interaction while
   * the comment is being persisted.
   */
  isSaving?: boolean;
  /** Override the default "Saving…" copy. */
  savingText?: ReactNode;
  /** Visual scale. @default "medium" */
  size?: CommentSize;
  /**
   * Heading level for the author name. Use to keep the document outline
   * consistent — e.g. `4` inside an article whose body is `<h3>`.
   * @default 4
   */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /**
   * Nested replies rendered inside an indented thread block beneath this
   * comment. Compose `<Comment>` instances inside.
   */
  children?: ReactNode;
};

// ----------------------------------------------------------------------------
// Implementation
// ----------------------------------------------------------------------------

export const Comment = forwardRef<HTMLElement, CommentProps>(function Comment(
  {
    author,
    avatar,
    type,
    time,
    content,
    actions,
    restrictedTo,
    highlighted = false,
    isSaving = false,
    savingText = "Saving…",
    size = "medium",
    headingLevel = 4,
    children,
    className,
    style,
    ...rest
  },
  ref,
) {
  const Heading = `h${headingLevel}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

  // Header pieces are joined with `·` separators. Keeping the joining
  // logic here (rather than baking dots into each element's CSS) means
  // the separators don't appear on the trailing element.
  const headerPieces: ReactNode[] = [];
  headerPieces.push(
    <Heading key="author" className={styles.author}>
      {author}
    </Heading>,
  );
  if (type) {
    headerPieces.push(
      typeof type === "string" ? (
        <span key="type" className={styles.typeTag}>
          {type}
        </span>
      ) : (
        <Fragment key="type-node">{type}</Fragment>
      ),
    );
  }
  if (restrictedTo) {
    headerPieces.push(
      <span
        key="restricted"
        className={styles.restricted}
        aria-label={
          typeof restrictedTo === "string"
            ? `Restricted: ${restrictedTo}`
            : undefined
        }
      >
        <Icon name="lock" size={12} aria-hidden />
        <span>{restrictedTo}</span>
      </span>,
    );
  }
  if (time) {
    headerPieces.push(
      <span key="time" className={styles.time}>
        {time}
      </span>,
    );
  }

  // Filter falsy values from `actions` so consumers can conditionally
  // render with `cond && <Button />` without leaving stray separators.
  const renderedActions = (actions ?? []).filter(
    (a) => a !== undefined && a !== null && a !== false,
  );

  return (
    <article
      ref={ref}
      className={cx(styles.root, styles.size[size], className)}
      data-highlighted={highlighted || undefined}
      data-saving={isSaving || undefined}
      style={style as CSSProperties}
      {...rest}
    >
      {avatar && <div className={styles.avatarSlot}>{avatar}</div>}
      <div className={styles.main}>
        <div className={styles.header}>
          {headerPieces.map((piece, idx) => (
            <Fragment key={idx}>
              {idx > 0 && (
                <span aria-hidden className={styles.headerSeparator} />
              )}
              {piece}
            </Fragment>
          ))}
        </div>
        {content !== undefined && content !== null && (
          <div className={styles.content}>{content}</div>
        )}
        {renderedActions.length > 0 && (
          <div className={styles.actions} role="group" aria-label="Comment actions">
            {renderedActions.map((action, idx) => (
              <Fragment key={idx}>
                {idx > 0 && (
                  <span aria-hidden className={styles.actionSeparator} />
                )}
                <span className={styles.actionItem}>{action}</span>
              </Fragment>
            ))}
          </div>
        )}
        {isSaving && (
          <div className={styles.savingOverlay} aria-live="polite">
            <span className={styles.savingDot} aria-hidden />
            <span>{savingText}</span>
          </div>
        )}
        {children && <div className={styles.nested}>{children}</div>}
      </div>
    </article>
  );
});
