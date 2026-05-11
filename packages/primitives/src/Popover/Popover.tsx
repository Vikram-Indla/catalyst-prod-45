import * as RadixPopover from "@radix-ui/react-popover";
import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ElementRef } from "react";

import { cx } from "../utils/classNames";
import * as styles from "./Popover.css";

export const Popover = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;
export const PopoverAnchor = RadixPopover.Anchor;
export const PopoverClose = RadixPopover.Close;

export type PopoverContentProps = ComponentPropsWithoutRef<
  typeof RadixPopover.Content
>;

export const PopoverContent = forwardRef<
  ElementRef<typeof RadixPopover.Content>,
  PopoverContentProps
>(function PopoverContent({ className, sideOffset = 6, ...rest }, ref) {
  return (
    <RadixPopover.Portal>
      <RadixPopover.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cx(styles.content, className)}
        {...rest}
      />
    </RadixPopover.Portal>
  );
});
