import * as RadixTooltip from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

import * as styles from "./Tooltip.css";

export type TooltipProps = {
  /** Element that owns the tooltip — typically a button or link. */
  children: ReactNode;
  /** Tooltip text content. */
  content: ReactNode;
  /**
   * Delay before showing on hover.
   * @default 200
   */
  delayDuration?: number;
  /** Side relative to the trigger. */
  side?: "top" | "right" | "bottom" | "left";
  /** Distance in px between the trigger and the tooltip. */
  sideOffset?: number;
};

/**
 * A small descriptive popup that appears on hover or focus. Wraps a single
 * child as the trigger.
 */
export function Tooltip({
  children,
  content,
  delayDuration = 200,
  side = "top",
  sideOffset = 6,
}: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={delayDuration}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={sideOffset}
            className={styles.content}
          >
            {content}
            <RadixTooltip.Arrow className={styles.arrow} />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
