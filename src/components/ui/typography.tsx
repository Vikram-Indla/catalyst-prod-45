/**
 * CATALYST V12 TYPOGRAPHY PRIMITIVES
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * FONT FAMILY ASSIGNMENTS:
 * - Sora:           Headings (pageTitle, sectionTitle, cardTitle, display, kpi)
 * - Inter:          Body, UI (body, label, meta, value, fieldLabel, fieldValue,
 *                   breadcrumb, cta, overline, colHeader, statusText)
 * - JetBrains Mono: Data/code (code, mono)
 *
 * Body emphasis uses font-weight 650 (NOT 700) per design spec.
 * Uppercase is restricted to table headers + sidebar section labels ONLY.
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
  | "display"
  | "kpi"
  | "kpiSmall"
  | "body"
  | "bodyEmphasis"
  | "bodySm"
  | "label"
  | "fieldLabel"
  | "fieldValue"
  | "fieldEmpty"
  | "breadcrumb"
  | "cta"
  | "overline"
  | "colHeader"
  | "statusText"
  | "meta"
  | "value"
  | "link"
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
  // ── Sora headings ──
  pageTitle: "font-heading text-issue-title tracking-tight",                         // Sora 24px/28px w650
  sectionTitle: "font-heading text-section-heading",                                 // Sora 16px/20px w500
  cardTitle: "font-heading text-md font-semibold leading-snug",                      // Sora 15px w600
  display: "font-heading text-4xl font-bold leading-tight tracking-tight",           // Sora 32px w700
  kpi: "font-heading text-kpi font-bold tracking-tight tabular-nums",               // Sora 40px w700
  kpiSmall: "font-heading text-kpi-sm font-semibold tracking-tight tabular-nums",   // Sora 28px w600

  // ── Inter body / UI ──
  body: "font-body text-base font-normal leading-normal",                            // Inter 14px w400
  bodyEmphasis: "font-body text-base leading-normal",                                // Inter 14px w650
  bodySm: "font-body text-sm font-normal",                                           // Inter 13px w400
  label: "font-body text-xs font-semibold uppercase tracking-wide",                  // Inter 12px w600 CAPS
  fieldLabel: "font-body text-field-label",                                          // Inter 14px w500
  fieldValue: "font-body text-field-value",                                          // Inter 14px w400
  fieldEmpty: "font-body text-field-value",                                          // Inter 14px w400 (tertiary tone)
  breadcrumb: "font-body text-breadcrumb",                                           // Inter 12px w400
  cta: "font-body text-cta",                                                         // Inter 14px w500
  overline: "font-body text-overline uppercase",                                     // Inter 12px w600 CAPS
  colHeader: "font-body text-col-header uppercase",                                  // Inter 12px w650 CAPS
  statusText: "font-body text-status-lozenge uppercase",                             // Inter 11px w700 CAPS
  meta: "font-body text-xs font-normal leading-snug",                                // Inter 12px w400
  value: "font-body text-base font-normal leading-normal",                           // Inter 14px w400
  link: "font-body text-base font-normal leading-normal",                            // Inter 14px w400

  // ── JetBrains Mono data ──
  code: "font-mono text-sm font-medium",                                             // JetBrains Mono 13px w500
};

/* bodyEmphasis uses inline style for weight 650 — see render below */

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
  display: "primary",
  kpi: "primary",
  kpiSmall: "primary",
  body: "primary",
  bodyEmphasis: "primary",
  bodySm: "secondary",
  label: "secondary",       // Labels are secondary, NEVER tertiary
  fieldLabel: "secondary",  // Field labels MUST be at least secondary
  fieldValue: "primary",    // Values MUST be primary
  fieldEmpty: "tertiary",   // Empty/none values use tertiary
  breadcrumb: "secondary",
  cta: "primary",
  overline: "secondary",
  colHeader: "secondary",
  statusText: "primary",
  meta: "tertiary",         // Meta/timestamps can be tertiary
  value: "primary",         // Values MUST be primary
  link: "link",
  code: "secondary",
};

const defaultElementForVariant: Record<TextVariant, React.ElementType> = {
  pageTitle: "h1",
  sectionTitle: "h2",
  cardTitle: "h3",
  display: "h1",
  kpi: "span",
  kpiSmall: "span",
  body: "p",
  bodyEmphasis: "p",
  bodySm: "p",
  label: "span",
  fieldLabel: "span",
  fieldValue: "span",
  fieldEmpty: "span",
  breadcrumb: "span",
  cta: "span",
  overline: "span",
  colHeader: "span",
  statusText: "span",
  meta: "span",
  value: "span",
  link: "a",
  code: "code",
};

export const Text = React.forwardRef<HTMLElement, TextProps>(
  ({ variant = "body", tone, as, className, children, ...props }, ref) => {
    const Component = as || defaultElementForVariant[variant];
    const effectiveTone = tone || defaultToneForVariant[variant];

    // bodyEmphasis uses weight 650 which isn't a standard Tailwind class
    const inlineStyle = variant === "bodyEmphasis"
      ? { fontWeight: 650, ...((props as any).style || {}) }
      : (props as any).style;

    return (
      <Component
        ref={ref}
        className={cn(variantStyles[variant], toneStyles[effectiveTone], className)}
        {...props}
        style={inlineStyle}
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
 * TableHeaderCell - Inter font, text-secondary + weight 650
 * NEVER muted, NEVER tertiary. Uppercase ONLY (per CLAUDE.md).
 */
export const TableHeaderCell = React.forwardRef<HTMLTableCellElement, TableHeaderCellProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <th
        ref={ref}
        className={cn(
          "text-left px-4 py-3",
          "font-body text-col-header uppercase",
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
 * TableValueCell - Inter font, text-primary
 * Values MUST be readable
 */
export const TableValueCell = React.forwardRef<HTMLTableCellElement, TableValueCellProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <td
        ref={ref}
        className={cn(
          "px-4 py-3.5",
          "font-body text-base",
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
 * FilterChip - Inter font, text-secondary (NEVER tertiary, NEVER muted)
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
          "font-body text-sm font-medium",
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
 * NavItem - Inter font, default text-secondary, active text-primary + weight 600 + green tint
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
          "font-body text-base font-medium",
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
 * FormLabel - Inter font, text-secondary, weight 500-600
 * NEVER tertiary/muted
 */
export const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ required, className, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "font-body text-sm font-medium",
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
 * FormHelpText - Inter font, text-tertiary (this IS allowed for help text)
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
          "font-body text-xs",
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
 * Timestamp - Inter font, text-tertiary is ALLOWED for timestamps
 */
export const Timestamp = React.forwardRef<HTMLSpanElement, TimestampProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "font-body text-xs",
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
