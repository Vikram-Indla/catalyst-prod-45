/**
 * DropdownMenu — ADS-canonical dropdown.
 * Plain HTML + ADS tokens. Preserves shadcn compound API.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

const DropdownMenu = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }>(
  ({ children, ...props }, ref) => <>{children}</>
);
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";
const DropdownMenuGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const DropdownMenuPortal = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const DropdownMenuSub = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const DropdownMenuRadioGroup = ({ children }: { children: React.ReactNode; value?: string; onValueChange?: (v: string) => void }) => <>{children}</>;

const DropdownMenuContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { sideOffset?: number; align?: string }>(
  ({ className, children, sideOffset, align, ...props }, ref) => (
    <div ref={ref} className={cn("z-50 min-w-[8rem] overflow-hidden rounded-md border border-[var(--ds-border,#DFE1E6)] bg-[var(--ds-surface-overlay,#fff)] p-1 shadow-md", className)} {...props}>
      {children}
    </div>
  )
);
DropdownMenuContent.displayName = "DropdownMenuContent";

const DropdownMenuItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }>(
  ({ className, inset, children, ...props }, ref) => (
    <div ref={ref} className={cn("relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm text-[var(--ds-text,#172B4D)] hover:bg-[var(--ds-background-neutral-subtle-hovered,rgba(9,30,66,0.06))] focus:bg-[var(--ds-background-neutral-subtle-hovered,rgba(9,30,66,0.06))] outline-none", inset && "pl-8", className)} role="menuitem" tabIndex={0} {...props}>
      {children}
    </div>
  )
);
DropdownMenuItem.displayName = "DropdownMenuItem";

const DropdownMenuCheckboxItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { checked?: boolean; onCheckedChange?: (c: boolean) => void }>(
  ({ className, children, checked, ...props }, ref) => (
    <div ref={ref} className={cn("relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm text-[var(--ds-text,#172B4D)] hover:bg-[var(--ds-background-neutral-subtle-hovered,rgba(9,30,66,0.06))]", className)} role="menuitemcheckbox" {...props}>
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">{checked && "✓"}</span>
      {children}
    </div>
  )
);
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

const DropdownMenuRadioItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value?: string }>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm text-[var(--ds-text,#172B4D)] hover:bg-[var(--ds-background-neutral-subtle-hovered,rgba(9,30,66,0.06))]", className)} role="menuitemradio" {...props}>
      {children}
    </div>
  )
);
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";

const DropdownMenuLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }>(
  ({ className, inset, ...props }, ref) => (
    <div ref={ref} className={cn("px-2 py-1.5 text-xs font-semibold text-[var(--ds-text-subtlest,#6B778C)]", inset && "pl-8", className)} {...props} />
  )
);
DropdownMenuLabel.displayName = "DropdownMenuLabel";

const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("-mx-1 my-1 h-px bg-[var(--ds-border,#DFE1E6)]", className)} {...props} />
  )
);
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn("ml-auto text-xs tracking-widest text-[var(--ds-text-subtlest,#6B778C)]", className)} {...props} />
);

const DropdownMenuSubTrigger = DropdownMenuItem;
const DropdownMenuSubContent = DropdownMenuContent;

export {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuCheckboxItem, DropdownMenuRadioItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuGroup,
  DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent,
  DropdownMenuSubTrigger, DropdownMenuRadioGroup,
};
