/**
 * Select — plain HTML select with ADS tokens.
 * Preserves shadcn compound API (Select, SelectTrigger, SelectContent, SelectItem, SelectValue).
 */
import * as React from "react";
import { cn } from "@/lib/utils";
import ChevronDownIcon from "@atlaskit/icon/utility/chevron-down";

const SelectContext = React.createContext<{
  value?: string; onValueChange?: (v: string) => void;
}>({});

const Select = ({ children, value, defaultValue, onValueChange, open, onOpenChange, disabled }: {
  children: React.ReactNode; value?: string; defaultValue?: string;
  onValueChange?: (value: string) => void; open?: boolean;
  onOpenChange?: (open: boolean) => void; disabled?: boolean;
}) => (
  <SelectContext.Provider value={{ value: value ?? defaultValue, onValueChange }}>
    {children}
  </SelectContext.Provider>
);

const SelectGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const { value } = React.useContext(SelectContext);
  return <span className={value ? "" : "text-[var(--ds-text-subtlest,#6B778C)]"}>{value || placeholder}</span>;
};

const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => (
    <button ref={ref} type="button" className={cn(
      "flex h-9 w-full items-center justify-between rounded-md border border-[var(--ds-border,#DFE1E6)] bg-[var(--ds-surface,#fff)] px-3 py-2 text-sm text-[var(--ds-text,#172B4D)]",
      "hover:bg-[var(--ds-background-neutral-subtle-hovered,rgba(9,30,66,0.06))]",
      "focus:outline-none focus:ring-1 focus:ring-[var(--ds-border-focused,#388BFF)]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )} {...props}>
      {children}
      <ChevronDownIcon label="" />
    </button>
  )
);
SelectTrigger.displayName = "SelectTrigger";

const SelectContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { position?: string }>(
  ({ className, children, position, ...props }, ref) => (
    <div ref={ref} className={cn("z-50 min-w-[8rem] overflow-hidden rounded-md border border-[var(--ds-border,#DFE1E6)] bg-[var(--ds-surface-overlay,#fff)] p-1 shadow-md", className)} {...props}>
      {children}
    </div>
  )
);
SelectContent.displayName = "SelectContent";

const SelectLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-2 py-1.5 text-xs font-semibold text-[var(--ds-text-subtlest,#6B778C)]", className)} {...props} />
  )
);
SelectLabel.displayName = "SelectLabel";

const SelectItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value: string }>(
  ({ className, children, value, ...props }, ref) => {
    const ctx = React.useContext(SelectContext);
    const isSelected = ctx.value === value;
    return (
      <div
        ref={ref}
        role="option"
        aria-selected={isSelected}
        className={cn(
          "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm text-[var(--ds-text,#172B4D)]",
          "hover:bg-[var(--ds-background-neutral-subtle-hovered,rgba(9,30,66,0.06))]",
          isSelected && "bg-[var(--ds-background-selected,#E9F2FE)]",
          className
        )}
        onClick={() => ctx.onValueChange?.(value)}
        {...props}
      >
        {children}
        {isSelected && <span className="absolute right-2 text-[var(--ds-icon-brand,#0C66E4)]">✓</span>}
      </div>
    );
  }
);
SelectItem.displayName = "SelectItem";

const SelectSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("-mx-1 my-1 h-px bg-[var(--ds-border,#DFE1E6)]", className)} {...props} />
  )
);
SelectSeparator.displayName = "SelectSeparator";

const SelectScrollUpButton = () => null;
const SelectScrollDownButton = () => null;

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator, SelectScrollUpButton, SelectScrollDownButton };
