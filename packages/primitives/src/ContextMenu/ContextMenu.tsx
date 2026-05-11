import * as RadixContextMenu from "@radix-ui/react-context-menu";
import { Icon } from "@catylast/icons";
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ElementRef } from "react";

import { cx } from "../utils/classNames";
import * as styles from "../menuStyles.css";

export const ContextMenu = RadixContextMenu.Root;
export const ContextMenuTrigger = RadixContextMenu.Trigger;
export const ContextMenuGroup = RadixContextMenu.Group;
export const ContextMenuSub = RadixContextMenu.Sub;

export type ContextMenuContentProps = ComponentPropsWithoutRef<
  typeof RadixContextMenu.Content
>;

export const ContextMenuContent = forwardRef<
  ElementRef<typeof RadixContextMenu.Content>,
  ContextMenuContentProps
>(function ContextMenuContent(
  { className, collisionPadding = 8, ...rest },
  ref,
) {
  return (
    <RadixContextMenu.Portal>
      <RadixContextMenu.Content
        ref={ref}
        collisionPadding={collisionPadding}
        className={cx(styles.content, className)}
        {...rest}
      />
    </RadixContextMenu.Portal>
  );
});

export type ContextMenuItemProps = ComponentPropsWithoutRef<
  typeof RadixContextMenu.Item
> & {
  /** Visual treatment. `danger` colors the item for destructive actions. */
  variant?: "default" | "danger";
};

export const ContextMenuItem = forwardRef<
  ElementRef<typeof RadixContextMenu.Item>,
  ContextMenuItemProps
>(function ContextMenuItem({ className, variant = "default", ...rest }, ref) {
  return (
    <RadixContextMenu.Item
      ref={ref}
      className={cx(
        styles.item,
        variant === "danger" && styles.itemDanger,
        className,
      )}
      {...rest}
    />
  );
});

export const ContextMenuSeparator = forwardRef<
  ElementRef<typeof RadixContextMenu.Separator>,
  ComponentPropsWithoutRef<typeof RadixContextMenu.Separator>
>(function ContextMenuSeparator({ className, ...rest }, ref) {
  return (
    <RadixContextMenu.Separator
      ref={ref}
      className={cx(styles.separator, className)}
      {...rest}
    />
  );
});

export const ContextMenuLabel = forwardRef<
  ElementRef<typeof RadixContextMenu.Label>,
  ComponentPropsWithoutRef<typeof RadixContextMenu.Label>
>(function ContextMenuLabel({ className, ...rest }, ref) {
  return (
    <RadixContextMenu.Label
      ref={ref}
      className={cx(styles.label, className)}
      {...rest}
    />
  );
});

export type ContextMenuSubTriggerProps = ComponentPropsWithoutRef<
  typeof RadixContextMenu.SubTrigger
>;

export const ContextMenuSubTrigger = forwardRef<
  ElementRef<typeof RadixContextMenu.SubTrigger>,
  ContextMenuSubTriggerProps
>(function ContextMenuSubTrigger({ className, children, ...rest }, ref) {
  return (
    <RadixContextMenu.SubTrigger
      ref={ref}
      className={cx(styles.item, className)}
      {...rest}
    >
      {children}
      <span className={styles.subTriggerArrow}>
        <Icon name="chevron-right" size={14} />
      </span>
    </RadixContextMenu.SubTrigger>
  );
});

export type ContextMenuSubContentProps = ComponentPropsWithoutRef<
  typeof RadixContextMenu.SubContent
>;

export const ContextMenuSubContent = forwardRef<
  ElementRef<typeof RadixContextMenu.SubContent>,
  ContextMenuSubContentProps
>(function ContextMenuSubContent(
  { className, collisionPadding = 8, ...rest },
  ref,
) {
  return (
    <RadixContextMenu.Portal>
      <RadixContextMenu.SubContent
        ref={ref}
        collisionPadding={collisionPadding}
        className={cx(styles.content, className)}
        {...rest}
      />
    </RadixContextMenu.Portal>
  );
});
