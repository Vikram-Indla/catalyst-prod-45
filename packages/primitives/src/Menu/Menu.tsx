import * as RadixMenu from "@radix-ui/react-dropdown-menu";
import { Icon } from "@catylast/icons";
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ElementRef } from "react";

import { cx } from "../utils/classNames";
import * as styles from "../menuStyles.css";

export const Menu = RadixMenu.Root;
export const MenuTrigger = RadixMenu.Trigger;
export const MenuGroup = RadixMenu.Group;
export const MenuSub = RadixMenu.Sub;

export type MenuContentProps = ComponentPropsWithoutRef<
  typeof RadixMenu.Content
>;

export const MenuContent = forwardRef<
  ElementRef<typeof RadixMenu.Content>,
  MenuContentProps
>(function MenuContent(
  { className, sideOffset = 4, collisionPadding = 8, ...rest },
  ref,
) {
  return (
    <RadixMenu.Portal>
      <RadixMenu.Content
        ref={ref}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cx(styles.content, className)}
        {...rest}
      />
    </RadixMenu.Portal>
  );
});

export type MenuItemProps = ComponentPropsWithoutRef<typeof RadixMenu.Item> & {
  /** Visual treatment. `danger` colors the item for destructive actions. */
  variant?: "default" | "danger";
};

export const MenuItem = forwardRef<
  ElementRef<typeof RadixMenu.Item>,
  MenuItemProps
>(function MenuItem({ className, variant = "default", ...rest }, ref) {
  return (
    <RadixMenu.Item
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

export const MenuSeparator = forwardRef<
  ElementRef<typeof RadixMenu.Separator>,
  ComponentPropsWithoutRef<typeof RadixMenu.Separator>
>(function MenuSeparator({ className, ...rest }, ref) {
  return (
    <RadixMenu.Separator
      ref={ref}
      className={cx(styles.separator, className)}
      {...rest}
    />
  );
});

export const MenuLabel = forwardRef<
  ElementRef<typeof RadixMenu.Label>,
  ComponentPropsWithoutRef<typeof RadixMenu.Label>
>(function MenuLabel({ className, ...rest }, ref) {
  return (
    <RadixMenu.Label
      ref={ref}
      className={cx(styles.label, className)}
      {...rest}
    />
  );
});

export type MenuSubTriggerProps = ComponentPropsWithoutRef<
  typeof RadixMenu.SubTrigger
>;

export const MenuSubTrigger = forwardRef<
  ElementRef<typeof RadixMenu.SubTrigger>,
  MenuSubTriggerProps
>(function MenuSubTrigger({ className, children, ...rest }, ref) {
  return (
    <RadixMenu.SubTrigger
      ref={ref}
      className={cx(styles.item, className)}
      {...rest}
    >
      {children}
      <span className={styles.subTriggerArrow}>
        <Icon name="chevron-right" size={14} />
      </span>
    </RadixMenu.SubTrigger>
  );
});

export type MenuSubContentProps = ComponentPropsWithoutRef<
  typeof RadixMenu.SubContent
>;

export const MenuSubContent = forwardRef<
  ElementRef<typeof RadixMenu.SubContent>,
  MenuSubContentProps
>(function MenuSubContent(
  { className, sideOffset = 4, collisionPadding = 8, ...rest },
  ref,
) {
  return (
    <RadixMenu.Portal>
      <RadixMenu.SubContent
        ref={ref}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cx(styles.content, className)}
        {...rest}
      />
    </RadixMenu.Portal>
  );
});
