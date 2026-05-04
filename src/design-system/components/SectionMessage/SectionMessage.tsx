import * as React from "react";
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Sparkles,
  RefreshCcw,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * Catalyst Design System — SectionMessage (Atlaskit's "banner" / "section message")
 *
 * Mirrors the Atlaskit SectionMessage API:
 *   - appearance: "information" | "success" | "warning" | "error" | "discovery" | "change"
 *   - title?: string
 *   - children: body content
 *   - icon?: ReactNode  (custom; defaults to a per-appearance lucide icon)
 *   - actions?: ReactNode[] | ReactNode  (rendered below body)
 *
 * Renders with role="status" or role="alert" based on severity.
 */

export type SectionMessageAppearance =
  | "information"
  | "success"
  | "warning"
  | "error"
  | "discovery"
  | "change";

interface AppearanceSpec {
  Icon: LucideIcon;
  bg: string;
  border: string;
  iconColor: string;
  titleColor: string;
  role: "status" | "alert";
}

const APPEARANCE: Record<SectionMessageAppearance, AppearanceSpec> = {
  information: {
    Icon: Info,
    bg: "bg-[var(--ds-color-background-information)]",
    border: "border-[var(--ds-color-border-information)]",
    iconColor: "text-[var(--ds-color-icon-information)]",
    titleColor: "text-[var(--ds-color-text-information)]",
    role: "status",
  },
  success: {
    Icon: CheckCircle2,
    bg: "bg-[var(--ds-color-background-success)]",
    border: "border-[var(--ds-color-border-success)]",
    iconColor: "text-[var(--ds-color-icon-success)]",
    titleColor: "text-[var(--ds-color-text-success)]",
    role: "status",
  },
  warning: {
    Icon: AlertTriangle,
    bg: "bg-[var(--ds-color-background-warning)]",
    border: "border-[var(--ds-color-border-warning)]",
    iconColor: "text-[var(--ds-color-icon-warning)]",
    titleColor: "text-[var(--ds-color-text-warning)]",
    role: "alert",
  },
  error: {
    Icon: AlertOctagon,
    bg: "bg-[var(--ds-color-background-danger)]",
    border: "border-[var(--ds-color-border-danger)]",
    iconColor: "text-[var(--ds-color-icon-danger)]",
    titleColor: "text-[var(--ds-color-text-danger)]",
    role: "alert",
  },
  discovery: {
    Icon: Sparkles,
    bg: "bg-[var(--ds-color-background-discovery)]",
    border: "border-[var(--ds-color-border-discovery)]",
    iconColor: "text-[var(--ds-color-icon-discovery)]",
    titleColor: "text-[var(--ds-color-text-discovery)]",
    role: "status",
  },
  change: {
    Icon: RefreshCcw,
    bg: "bg-[var(--ds-color-background-accent-teal-subtler)]",
    border: "border-[var(--ds-color-border)]",
    iconColor: "text-[var(--ds-color-text-accent-teal)]",
    titleColor: "text-[var(--ds-color-text-accent-teal)]",
    role: "status",
  },
};

export interface SectionMessageProps {
  appearance?: SectionMessageAppearance;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const SectionMessage: React.FC<SectionMessageProps> = ({
  appearance = "information",
  title,
  icon,
  actions,
  children,
  className,
}) => {
  const spec = APPEARANCE[appearance];
  const IconComp = spec.Icon;
  return (
    <div
      role={spec.role}
      className={cn(
        "flex gap-[var(--ds-space-200)]",
        "rounded-[var(--ds-radius-200)] border",
        "px-[var(--ds-space-200)] py-[var(--ds-space-200)]",
        "font-[var(--ds-font-family-body)]",
        spec.bg,
        spec.border,
        className,
      )}
    >
      <span className={cn("shrink-0 mt-[2px] [&_svg]:size-5", spec.iconColor)} aria-hidden>
        {icon ?? <IconComp />}
      </span>
      <div className="flex-1 min-w-0 flex flex-col gap-[var(--ds-space-050)]">
        {title ? (
          <div
            className={cn(
              "text-[length:var(--ds-font-size-200)] leading-[var(--ds-line-height-300)]",
              "font-[number:var(--ds-font-weight-semibold)]",
              spec.titleColor,
            )}
          >
            {title}
          </div>
        ) : null}
        {children ? (
          <div className="text-[length:var(--ds-font-size-200)] leading-[var(--ds-line-height-300)] text-[var(--ds-color-text)]">
            {children}
          </div>
        ) : null}
        {actions ? (
          <div className="mt-[var(--ds-space-100)] flex flex-wrap items-center gap-[var(--ds-space-150)]">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
};

SectionMessage.displayName = "DS.SectionMessage";
