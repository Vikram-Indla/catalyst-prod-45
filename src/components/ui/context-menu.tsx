/**
 * ContextMenu — plain HTML right-click menu. No radix dependency.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

const ContextMenu = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const ContextMenuTrigger = ({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={className} {...props}>{children}</span>
);

const ContextMenuContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("z-50 min-w-[8rem] rounded-md border border-[var(--ds-border,#DFE1E6)] bg-[var(--ds-surface-overlay,#fff)] p-1 shadow-md", className)} {...props}>
      {children}
    </div>
  )
);
ContextMenuContent.displayName = "ContextMenuContent";

const ContextMenuItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }>(
  ({ className, inset, children, ...props }, ref) => (
    <div ref={ref} className={cn("relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm text-[var(--ds-text,#172B4D)] hover:bg-[var(--ds-background-neutral-subtle-hovered,rgba(9,30,66,0.06))]", inset && "pl-8", className)} {...props}>
      {children}
    </div>
  )
);
ContextMenuItem.displayName = "ContextMenuItem";

const ContextMenuSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("-mx-1 my-1 h-px bg-[var(--ds-border,#DFE1E6)]", className)} {...props} />
  )
);
ContextMenuSeparator.displayName = "ContextMenuSeparator";

const ContextMenuLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }>(
  ({ className, inset, ...props }, ref) => (
    <div ref={ref} className={cn("px-2 py-1.5 text-xs font-semibold text-[var(--ds-text-subtlest,#6B778C)]", inset && "pl-8", className)} {...props} />
  )
);
ContextMenuLabel.displayName = "ContextMenuLabel";

const ContextMenuSub = ContextMenu;
const ContextMenuSubTrigger = ContextMenuItem;
const ContextMenuSubContent = ContextMenuContent;
const ContextMenuCheckboxItem = ContextMenuItem;
const ContextMenuRadioGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const ContextMenuRadioItem = ContextMenuItem;
const ContextMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn("ml-auto text-xs tracking-widest text-[var(--ds-text-subtlest,#6B778C)]", className)} {...props} />
);
const ContextMenuGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const ContextMenuPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export {
  ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuLabel, ContextMenuSub, ContextMenuSubTrigger,
  ContextMenuSubContent, ContextMenuCheckboxItem, ContextMenuRadioGroup,
  ContextMenuRadioItem, ContextMenuShortcut, ContextMenuGroup, ContextMenuPortal,
};
