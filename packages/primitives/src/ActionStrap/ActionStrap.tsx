import { Icon } from "@catylast/icons";
import type { IconName } from "@catylast/icons";
import type { CSSProperties, MouseEvent, ReactNode } from "react";

import * as styles from "./ActionStrap.css";

/**
 * One actionable item rendered in the strap. Either pass an `icon` name
 * from the `@catylast/icons` registry or a fully-custom `iconNode`
 * (e.g. a brand glyph that's not in the registry yet). The label is
 * always required so the button has accessible text.
 */
export type ActionStrapItem = {
  /** Stable identity. Used as the React key. */
  id: string;
  /** Visible button label. Also used as the accessible name. */
  label: string;
  /** Icon name from the `@catylast/icons` registry. */
  icon?: IconName;
  /** Custom icon node — wins over `icon` if both are passed. */
  iconNode?: ReactNode;
  /** Pixel size for the leading icon. @default 16 */
  iconSize?: number;
  /** Click handler. Called with the click event. */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Disable the button (greyed out, click ignored). */
  disabled?: boolean;
};

export type ActionStrapProps = {
  /**
   * Number shown in the leading badge (typically the selection count).
   * Renders with tabular nums so the badge width stays stable across
   * digit changes.
   */
  count: number;
  /**
   * Label after the count badge. Defaults to "selected".
   */
  countLabel?: string;
  /** Buttons rendered after the count, before the divider. */
  actions: ActionStrapItem[];
  /**
   * Called when the user dismisses the strap via the trailing close
   * button. The strap is uncontrolled — consumers wire this to whatever
   * state should be cleared (e.g. row selection).
   */
  onDismiss?: () => void;
  /** Accessible label for the close button. @default "Dismiss" */
  dismissLabel?: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * Floating dark action strap. Designed for surfaces that surface a set
 * of bulk actions when one or more items are selected (DynamicTable
 * row selection is the primary consumer; gallery / kanban surfaces can
 * reuse the same primitive).
 *
 * The strap renders inline-flex with no positioning of its own — the
 * caller decides where it floats (typically `position: absolute` at
 * the bottom of a container, or `position: fixed` near the viewport
 * edge). A built-in slide-up keyframe runs whenever the strap mounts.
 */
export function ActionStrap({
  count,
  countLabel = "selected",
  actions,
  onDismiss,
  dismissLabel = "Dismiss",
  className,
  style,
}: ActionStrapProps) {
  return (
    <div
      role="toolbar"
      aria-label={`${count} ${countLabel}`}
      className={[styles.strap, className].filter(Boolean).join(" ")}
      style={style}
    >
      <span className={styles.countBadge}>{count}</span>
      <span className={styles.selectedLabel}>{countLabel}</span>
      {actions.map((action) => {
        const iconSize = action.iconSize ?? 16;
        return (
          <button
            key={action.id}
            type="button"
            className={styles.actionButton}
            onClick={action.onClick}
            disabled={action.disabled}
            aria-label={action.label}
          >
            {action.iconNode ? (
              <span className={styles.actionIcon}>{action.iconNode}</span>
            ) : action.icon ? (
              <span className={styles.actionIcon}>
                <Icon name={action.icon} size={iconSize} />
              </span>
            ) : null}
            <span>{action.label}</span>
          </button>
        );
      })}
      {onDismiss && (
        <>
          <span className={styles.divider} aria-hidden="true" />
          <button
            type="button"
            className={styles.closeButton}
            onClick={onDismiss}
            aria-label={dismissLabel}
          >
            <Icon name="cross" size={12} />
          </button>
        </>
      )}
    </div>
  );
}
