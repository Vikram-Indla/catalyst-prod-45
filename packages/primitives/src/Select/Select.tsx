import * as RadixSelect from "@radix-ui/react-select";
import { Icon } from "@catylast/icons";
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ElementRef } from "react";

import { cx } from "../utils/classNames";
import * as styles from "./Select.css";

export const Select = RadixSelect.Root;
export const SelectGroup = RadixSelect.Group;
export const SelectValue = RadixSelect.Value;

export type SelectTriggerVariant = "default" | "ghost";
export type SelectTriggerSize = "sm" | "md";

export type SelectTriggerProps = ComponentPropsWithoutRef<
  typeof RadixSelect.Trigger
> & {
  size?: SelectTriggerSize;
  variant?: SelectTriggerVariant;
  /** Hide the chevron icon. Useful when wrapping a custom trigger like a Badge. */
  hideIcon?: boolean;
};

export const SelectTrigger = forwardRef<
  ElementRef<typeof RadixSelect.Trigger>,
  SelectTriggerProps
>(function SelectTrigger(
  { className, children, size = "md", variant = "default", hideIcon, ...rest },
  ref,
) {
  return (
    <RadixSelect.Trigger
      ref={ref}
      className={cx(
        styles.trigger,
        styles.triggerSize[size],
        styles.triggerVariant[variant],
        className,
      )}
      {...rest}
    >
      {children}
      {!hideIcon && (
        <RadixSelect.Icon className={styles.triggerIcon} asChild>
          <span>
            <Icon name="chevron-down" size={14} />
          </span>
        </RadixSelect.Icon>
      )}
    </RadixSelect.Trigger>
  );
});

export type SelectContentProps = ComponentPropsWithoutRef<
  typeof RadixSelect.Content
>;

export const SelectContent = forwardRef<
  ElementRef<typeof RadixSelect.Content>,
  SelectContentProps
>(function SelectContent(
  { className, position = "popper", sideOffset = 4, ...rest },
  ref,
) {
  return (
    <RadixSelect.Portal>
      <RadixSelect.Content
        ref={ref}
        position={position}
        sideOffset={sideOffset}
        className={cx(styles.content, className)}
        {...rest}
      >
        <RadixSelect.Viewport className={styles.viewport}>
          {rest.children}
        </RadixSelect.Viewport>
      </RadixSelect.Content>
    </RadixSelect.Portal>
  );
});

export type SelectItemProps = ComponentPropsWithoutRef<typeof RadixSelect.Item>;

export const SelectItem = forwardRef<
  ElementRef<typeof RadixSelect.Item>,
  SelectItemProps
>(function SelectItem({ className, children, ...rest }, ref) {
  return (
    <RadixSelect.Item
      ref={ref}
      className={cx(styles.item, className)}
      {...rest}
    >
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
      <RadixSelect.ItemIndicator className={styles.itemIndicator}>
        <Icon name="check" size={14} />
      </RadixSelect.ItemIndicator>
    </RadixSelect.Item>
  );
});

export const SelectSeparator = forwardRef<
  ElementRef<typeof RadixSelect.Separator>,
  ComponentPropsWithoutRef<typeof RadixSelect.Separator>
>(function SelectSeparator({ className, ...rest }, ref) {
  return (
    <RadixSelect.Separator
      ref={ref}
      className={cx(styles.separator, className)}
      {...rest}
    />
  );
});

export const SelectLabel = forwardRef<
  ElementRef<typeof RadixSelect.Label>,
  ComponentPropsWithoutRef<typeof RadixSelect.Label>
>(function SelectLabel({ className, ...rest }, ref) {
  return (
    <RadixSelect.Label
      ref={ref}
      className={cx(styles.label, className)}
      {...rest}
    />
  );
});
