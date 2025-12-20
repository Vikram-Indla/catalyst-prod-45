/**
 * CATALYST TYPOGRAPHY PRIMITIVES
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * ENFORCED TYPOGRAPHY CONTRACT:
 * - text-primary: Main readable text (highest contrast) - body, titles, values
 * - text-secondary: Normal UI labels, nav items, tabs, table headers
 * - text-tertiary: METADATA ONLY - timestamps, helper hints, placeholder text
 * - text-disabled: Disabled states only
 * 
 * RULES:
 * 1. Any interactive/control label MUST use primary OR secondary, NEVER tertiary
 * 2. Table headers and field labels MUST be at least secondary
 * 3. Table cell VALUES MUST be primary
 * 4. Tertiary is ONLY for timestamps, helper text, placeholders, "last updated"
 * 5. NO opacity-based text calming. Calmness comes from spacing/surfaces.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

// ════════════════════════════════════════════════════════════════════════════
// TEXT COMPONENT
// ════════════════════════════════════════════════════════════════════════════

type TextVariant = 
  | "pageTitle"
  | "sectionTitle"
  | "cardTitle"
  | "body"
  | "label"
  | "meta"
  | "value"
  | "code";

type TextTone =
  | "primary"    // Highest contrast - default body, titles, values
  | "secondary"  // Normal UI labels, nav items, tabs, table headers
  | "tertiary"   // METADATA ONLY: timestamps, hints, helper text
  | "disabled"   // Disabled states only
  | "danger"
  | "warning"
  | "success"
  | "link";

interface TextProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TextVariant;
  tone?: TextTone;
  as?: React.ElementType;
  children: React.ReactNode;
}

const variantStyles: Record<TextVariant, string> = {
  pageTitle: "text-3xl font-semibold leading-tight tracking-tighter",
  sectionTitle: "text-lg font-semibold leading-normal",
  cardTitle: "text-md font-semibold leading-snug",
  body: "text-base font-normal leading-normal",
  label: "text-xs font-semibold uppercase tracking-wide",
  meta: "text-xs font-normal leading-snug",
  value: "text-base font-normal leading-normal",
  code: "text-sm font-medium font-mono",
};

const toneStyles: Record<TextTone, string> = {
  primary: "text-[var(--text-primary)]",
  secondary: "text-[var(--text-secondary)]",
  tertiary: "text-[var(--text-tertiary)]",
  disabled: "text-[var(--text-disabled)]",
  danger: "text-[var(--text-danger)]",
  warning: "text-[var(--text-warning)]",
  success: "text-[var(--text-success)]",
  link: "text-[var(--text-link)] hover:text-[var(--text-link-hover)]",
};

const defaultToneForVariant: Record<TextVariant, TextTone> = {
  pageTitle: "primary",
  sectionTitle: "primary",
  cardTitle: "primary",
  body: "primary",
  label: "secondary",  // Labels are secondary, NEVER tertiary
  meta: "tertiary",    // Meta/timestamps can be tertiary
  value: "primary",    // Values MUST be primary
  code: "secondary",
};

const defaultElementForVariant: Record<TextVariant, React.ElementType> = {
  pageTitle: "h1",
  sectionTitle: "h2",
  cardTitle: "h3",
  body: "p",
  label: "span",
  meta: "span",
  value: "span",
  code: "code",
};

export const Text = React.forwardRef<HTMLElement, TextProps>(
  ({ variant = "body", tone, as, className, children, ...props }, ref) => {
    const Component = as || defaultElementForVariant[variant];
    const effectiveTone = tone || defaultToneForVariant[variant];
    
    return (
      <Component
        ref={ref}
        className={cn(variantStyles[variant], toneStyles[effectiveTone], className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
Text.displayName = "Text";

// ════════════════════════════════════════════════════════════════════════════
// TABLE PRIMITIVES
// ════════════════════════════════════════════════════════════════════════════

interface TableHeaderCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

/**
 * TableHeaderCell - ALWAYS uses text-secondary + weight 600
 * NEVER muted, NEVER tertiary
 */
export const TableHeaderCell = React.forwardRef<HTMLTableCellElement, TableHeaderCellProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <th
        ref={ref}
        className={cn(
          "text-left px-4 py-3",
          "text-xs font-semibold uppercase tracking-wide",
          "text-[var(--text-secondary)]",
          "bg-[var(--surface-bg)]",
          "border-b border-[var(--border-default)]",
          className
        )}
        {...props}
      >
        {children}
      </th>
    );
  }
);
TableHeaderCell.displayName = "TableHeaderCell";

interface TableValueCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

/**
 * TableValueCell - ALWAYS uses text-primary
 * Values MUST be readable
 */
export const TableValueCell = React.forwardRef<HTMLTableCellElement, TableValueCellProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <td
        ref={ref}
        className={cn(
          "px-4 py-3.5",
          "text-base",
          "text-[var(--text-primary)]",
          "border-b border-[var(--border-subtle)]",
          "align-middle",
          className
        )}
        {...props}
      >
        {children}
      </td>
    );
  }
);
TableValueCell.displayName = "TableValueCell";

// ════════════════════════════════════════════════════════════════════════════
// FILTER CHIP PRIMITIVE
// ════════════════════════════════════════════════════════════════════════════

interface FilterChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  count?: number;
  children: React.ReactNode;
}

/**
 * FilterChip - Label uses text-secondary (NEVER tertiary, NEVER muted)
 * Selected state uses text-primary + green-led border/indicator
 */
export const FilterChip = React.forwardRef<HTMLButtonElement, FilterChipProps>(
  ({ selected = false, count, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center gap-2",
          "px-3 py-1.5 rounded-md",
          "text-sm font-medium",
          "border transition-all duration-150",
          "cursor-pointer",
          selected
            ? [
                "bg-[var(--nav-active-bg)]",
                "text-[var(--text-primary)]",
                "border-[var(--secondary-green)]",
                "font-semibold",
              ]
            : [
                "bg-[var(--surface-subtle)]",
                "text-[var(--text-secondary)]",
                "border-[var(--border-default)]",
                "hover:border-[var(--brand-primary)]",
                "hover:text-[var(--text-primary)]",
              ],
          className
        )}
        {...props}
      >
        <span>{children}</span>
        {count !== undefined && (
          <span
            className={cn(
              "inline-flex items-center justify-center",
              "min-w-[20px] h-5 px-1.5 rounded-full",
              "text-xs font-semibold",
              selected
                ? "bg-[var(--secondary-green)] text-white"
                : "bg-[var(--surface-elevated)] text-[var(--text-secondary)] border border-[var(--border-default)]"
            )}
          >
            {count}
          </span>
        )}
      </button>
    );
  }
);
FilterChip.displayName = "FilterChip";

// ════════════════════════════════════════════════════════════════════════════
// NAV ITEM PRIMITIVE
// ════════════════════════════════════════════════════════════════════════════

interface NavItemProps extends React.HTMLAttributes<HTMLElement> {
  active?: boolean;
  as?: React.ElementType;
  children: React.ReactNode;
}

/**
 * NavItem - Default text-secondary, active text-primary + weight 600 + green tint
 * NEVER uses muted/tertiary for nav labels
 */
export const NavItem = React.forwardRef<HTMLElement, NavItemProps>(
  ({ active = false, as: Component = "button", className, children, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          "inline-flex items-center gap-2",
          "px-3 py-1.5 rounded-md",
          "text-base font-medium",
          "transition-all duration-150",
          active
            ? [
                "bg-[var(--nav-active-bg)]",
                "text-[var(--text-primary)]",
                "font-semibold",
              ]
            : [
                "text-[var(--text-secondary)]",
                "hover:bg-[var(--nav-hover-bg)]",
                "hover:text-[var(--text-primary)]",
              ],
          className
        )}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
NavItem.displayName = "NavItem";

// ════════════════════════════════════════════════════════════════════════════
// FORM LABEL PRIMITIVE
// ════════════════════════════════════════════════════════════════════════════

interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  children: React.ReactNode;
}

/**
 * FormLabel - text-secondary, weight 500-600
 * NEVER tertiary/muted
 */
export const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ required, className, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "text-sm font-medium",
          "text-[var(--text-secondary)]",
          className
        )}
        {...props}
      >
        {children}
        {required && <span className="text-[var(--text-danger)] ml-0.5">*</span>}
      </label>
    );
  }
);
FormLabel.displayName = "FormLabel";

/**
 * FormHelpText - text-tertiary (this IS allowed for help text)
 */
interface FormHelpTextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export const FormHelpText = React.forwardRef<HTMLParagraphElement, FormHelpTextProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn(
          "text-xs",
          "text-[var(--text-tertiary)]",
          className
        )}
        {...props}
      >
        {children}
      </p>
    );
  }
);
FormHelpText.displayName = "FormHelpText";

// ════════════════════════════════════════════════════════════════════════════
// TIMESTAMP / META PRIMITIVE
// ════════════════════════════════════════════════════════════════════════════

interface TimestampProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

/**
 * Timestamp - text-tertiary is ALLOWED for timestamps
 */
export const Timestamp = React.forwardRef<HTMLSpanElement, TimestampProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "text-xs",
          "text-[var(--text-tertiary)]",
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);
Timestamp.displayName = "Timestamp";
