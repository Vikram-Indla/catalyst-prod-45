/**
 * admin-alert-dialog — drop-in shim replacing @/components/ui/alert-dialog
 * with @atlaskit/modal-dialog + @atlaskit/button.
 *
 * Named exports match shadcn's AlertDialog exactly so call sites only need
 * an import-path change:
 *
 *   - @/components/ui/alert-dialog  →  @/components/admin/admin-alert-dialog
 *
 * Layout rules:
 *   AlertDialogHeader  → ModalHeader (contains title + description)
 *   AlertDialogFooter  → ModalFooter (contains Cancel + Action buttons)
 *   AlertDialogContent → partitions children identical to DialogContent
 */
import React from 'react';
import AkButton from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from '@/components/ads/Modal';

// ── AlertDialog (root) ────────────────────────────────────────────────────────

export interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: React.ReactNode;
}

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
  return (
    <Modal isOpen={open} onClose={() => onOpenChange(false)} width="small">
      {children}
    </Modal>
  );
}
AlertDialog.displayName = 'AlertDialog';

// ── AlertDialogContent ────────────────────────────────────────────────────────

export function AlertDialogContent({ children }: { children?: React.ReactNode }) {
  const kids = React.Children.toArray(children);

  const header = kids.find(
    (c) => React.isValidElement(c) && (c.type as { displayName?: string }).displayName === 'AlertDialogHeader',
  );
  const footer = kids.find(
    (c) => React.isValidElement(c) && (c.type as { displayName?: string }).displayName === 'AlertDialogFooter',
  );
  const body = kids.filter((c) => {
    if (!React.isValidElement(c)) return true;
    const dn = (c.type as { displayName?: string }).displayName;
    return dn !== 'AlertDialogHeader' && dn !== 'AlertDialogFooter';
  });

  return (
    <>
      {header}
      {body.length > 0 && <ModalBody>{body}</ModalBody>}
      {footer}
    </>
  );
}
AlertDialogContent.displayName = 'AlertDialogContent';

// ── AlertDialogHeader ─────────────────────────────────────────────────────────

export function AlertDialogHeader({ children }: { children?: React.ReactNode }) {
  return <ModalHeader>{children}</ModalHeader>;
}
AlertDialogHeader.displayName = 'AlertDialogHeader';

// ── AlertDialogTitle ──────────────────────────────────────────────────────────

export function AlertDialogTitle({ children }: { children?: React.ReactNode; className?: string }) {
  return <ModalTitle>{children}</ModalTitle>;
}
AlertDialogTitle.displayName = 'AlertDialogTitle';

// ── AlertDialogDescription ────────────────────────────────────────────────────

export function AlertDialogDescription({ children }: { children?: React.ReactNode }) {
  return (
    <p
      style={{
        margin: '4px 0 0',
        fontSize: 14,
        lineHeight: '20px',
        color: token('color.text.subtle', '#626F86'),
      }}
    >
      {children}
    </p>
  );
}
AlertDialogDescription.displayName = 'AlertDialogDescription';

// ── AlertDialogFooter ─────────────────────────────────────────────────────────

export function AlertDialogFooter({ children }: { children?: React.ReactNode }) {
  return <ModalFooter>{children}</ModalFooter>;
}
AlertDialogFooter.displayName = 'AlertDialogFooter';

// ── AlertDialogCancel ─────────────────────────────────────────────────────────

export function AlertDialogCancel({
  children,
  onClick,
}: {
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLElement>;
}) {
  return (
    <AkButton appearance="subtle" onClick={onClick}>
      {children ?? 'Cancel'}
    </AkButton>
  );
}
AlertDialogCancel.displayName = 'AlertDialogCancel';

// ── AlertDialogAction ─────────────────────────────────────────────────────────
// Renders as a danger button. Accepts className but ignores it (ADS handles
// styling); onClick is forwarded to the underlying button.

export function AlertDialogAction({
  children,
  onClick,
  disabled,
  className: _className,
}: {
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLElement>;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <AkButton appearance="danger" onClick={onClick} isDisabled={disabled}>
      {children ?? 'Confirm'}
    </AkButton>
  );
}
AlertDialogAction.displayName = 'AlertDialogAction';

// ── AdminAlertDialog (convenience single-component API) ───────────────────────
// For new code that doesn't need the legacy shadcn structure.

export interface AdminAlertDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function AdminAlertDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
}: AdminAlertDialogProps) {
  return (
    <Modal isOpen={open} onClose={onClose} width="small">
      <ModalHeader>
        <ModalTitle>{title}</ModalTitle>
        {description && (
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 14,
              lineHeight: '20px',
              color: token('color.text.subtle', '#626F86'),
            }}
          >
            {description}
          </p>
        )}
      </ModalHeader>
      <ModalFooter>
        <AkButton appearance="subtle" onClick={onClose}>{cancelLabel}</AkButton>
        <AkButton appearance="danger" onClick={onConfirm}>{confirmLabel}</AkButton>
      </ModalFooter>
    </Modal>
  );
}
AdminAlertDialog.displayName = 'AdminAlertDialog';
