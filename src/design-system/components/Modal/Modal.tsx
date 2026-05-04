import * as React from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * Catalyst Design System — Modal
 *
 * Mirrors the Atlaskit Modal Dialog API:
 *   - Composed: <Modal><ModalHeader/><ModalBody/><ModalFooter/></Modal>
 *   - width: "small" | "medium" | "large" | "x-large" | number (px)
 *   - shouldScrollInViewport, shouldCloseOnOverlayClick, shouldCloseOnEscapePress
 *   - isOpen, onClose
 *
 * Built on @radix-ui/react-dialog for focus trap, escape, scroll-lock, ARIA.
 */

const widthMap = {
  small: "max-w-[400px]",
  medium: "max-w-[600px]",
  large: "max-w-[800px]",
  "x-large": "max-w-[968px]",
} as const;

export type ModalWidth = keyof typeof widthMap | number;

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  width?: ModalWidth;
  shouldScrollInViewport?: boolean;
  shouldCloseOnOverlayClick?: boolean;
  shouldCloseOnEscapePress?: boolean;
  /** Aria label for the dialog when there's no visible <ModalHeader/>. */
  "aria-label"?: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  width = "medium",
  shouldScrollInViewport = false,
  shouldCloseOnOverlayClick = true,
  shouldCloseOnEscapePress = true,
  "aria-label": ariaLabel,
  children,
  className,
}) => {
  const widthClass =
    typeof width === "number" ? "" : widthMap[width] ?? widthMap.medium;
  const widthStyle = typeof width === "number" ? { maxWidth: `${width}px` } : undefined;

  return (
    <RadixDialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          )}
          onClick={(e) => {
            if (!shouldCloseOnOverlayClick) e.preventDefault();
          }}
        />
        <RadixDialog.Content
          aria-label={ariaLabel}
          onEscapeKeyDown={(e) => {
            if (!shouldCloseOnEscapePress) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (!shouldCloseOnOverlayClick) e.preventDefault();
          }}
          style={widthStyle}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)]",
            "-translate-x-1/2 -translate-y-1/2",
            widthClass,
            "bg-[var(--ds-elevation-surface-overlay)] text-[var(--ds-color-text)]",
            "rounded-[var(--ds-radius-300)] shadow-[var(--ds-elevation-shadow-overlay)]",
            "border border-[var(--ds-color-border-subtle)]",
            "max-h-[calc(100vh-4rem)]",
            shouldScrollInViewport ? "" : "flex flex-col overflow-hidden",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            className,
          )}
        >
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};

/* ─────────────────────────────────────────────────────────────
   ModalHeader · ModalTitle · ModalBody · ModalFooter
   ───────────────────────────────────────────────────────────── */

export const ModalHeader: React.FC<{
  children: React.ReactNode;
  hasCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
}> = ({ children, hasCloseButton = true, onClose, className }) => (
  <div
    className={cn(
      "flex items-start justify-between gap-[var(--ds-space-200)]",
      "px-[var(--ds-space-300)] pt-[var(--ds-space-300)] pb-[var(--ds-space-200)]",
      "border-b border-[var(--ds-color-border-subtle)]",
      className,
    )}
  >
    <div className="flex-1 min-w-0">{children}</div>
    {hasCloseButton ? (
      <RadixDialog.Close
        onClick={onClose}
        aria-label="Close"
        className={cn(
          "shrink-0 inline-flex items-center justify-center size-7 rounded-[var(--ds-radius-100)]",
          "text-[var(--ds-color-icon-subtle)] hover:bg-[var(--ds-color-background-neutral-subtle-hovered)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-color-border-focused)]/25",
        )}
      >
        <X size={16} />
      </RadixDialog.Close>
    ) : null}
  </div>
);

export const ModalTitle: React.FC<{
  children: React.ReactNode;
  appearance?: "default" | "warning" | "danger" | "discovery";
  className?: string;
}> = ({ children, appearance = "default", className }) => {
  const appearanceColor = {
    default: "text-[var(--ds-color-text)]",
    warning: "text-[var(--ds-color-text-warning)]",
    danger: "text-[var(--ds-color-text-danger)]",
    discovery: "text-[var(--ds-color-text-discovery)]",
  }[appearance];
  return (
    <RadixDialog.Title
      className={cn(
        "text-[length:var(--ds-font-size-500)] leading-[var(--ds-line-height-500)]",
        "font-[number:var(--ds-font-weight-semibold)]",
        appearanceColor,
        className,
      )}
    >
      {children}
    </RadixDialog.Title>
  );
};

export const ModalDescription: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <RadixDialog.Description
    className={cn(
      "mt-[var(--ds-space-100)] text-[length:var(--ds-font-size-200)]",
      "text-[var(--ds-color-text-subtle)]",
      className,
    )}
  >
    {children}
  </RadixDialog.Description>
);

export const ModalBody: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div
    className={cn(
      "flex-1 overflow-y-auto px-[var(--ds-space-300)] py-[var(--ds-space-300)]",
      "text-[length:var(--ds-font-size-200)] text-[var(--ds-color-text)]",
      className,
    )}
  >
    {children}
  </div>
);

export const ModalFooter: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div
    className={cn(
      "flex items-center justify-end gap-[var(--ds-space-100)]",
      "px-[var(--ds-space-300)] py-[var(--ds-space-200)]",
      "border-t border-[var(--ds-color-border-subtle)]",
      className,
    )}
  >
    {children}
  </div>
);

Modal.displayName = "DS.Modal";
