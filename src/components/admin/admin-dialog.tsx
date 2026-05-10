/**
 * admin-dialog — drop-in shim replacing @/components/ui/dialog with
 * @atlaskit/modal-dialog primitives.
 *
 * Named exports match shadcn's Dialog exactly so call sites only need
 * an import-path change:
 *
 *   - @/components/ui/dialog  →  @/components/admin/admin-dialog
 *
 * DialogContent uses displayName detection to route its children to the
 * correct Atlaskit slot (ModalHeader / ModalBody / ModalFooter) without
 * any JSX changes at call sites.
 */
import React from 'react';
import { token } from '@atlaskit/tokens';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from '@/components/ads/Modal';

// ── Dialog (root) ────────────────────────────────────────────────────────────

export interface DialogProps {
  open: boolean;
  /** Matches shadcn's onOpenChange(boolean) signature. */
  onOpenChange: (open: boolean) => void;
  children?: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <Modal isOpen={open} onClose={() => onOpenChange(false)}>
      {children}
    </Modal>
  );
}
Dialog.displayName = 'Dialog';

// ── DialogContent ─────────────────────────────────────────────────────────────
// Partitions children by displayName:
//   DialogHeader  → ModalHeader slot (rendered first, outside ModalBody)
//   DialogFooter  → ModalFooter slot (rendered last, outside ModalBody)
//   everything else → ModalBody

export interface DialogContentProps {
  children?: React.ReactNode;
  /** shadcn passes className for max-width hints — ignored in ADS context. */
  className?: string;
}

export function DialogContent({ children }: DialogContentProps) {
  const kids = React.Children.toArray(children);

  const header = kids.find(
    (c) => React.isValidElement(c) && (c.type as { displayName?: string }).displayName === 'DialogHeader',
  );
  const footer = kids.find(
    (c) => React.isValidElement(c) && (c.type as { displayName?: string }).displayName === 'DialogFooter',
  );
  const body = kids.filter(
    (c) => {
      if (!React.isValidElement(c)) return true;
      const dn = (c.type as { displayName?: string }).displayName;
      return dn !== 'DialogHeader' && dn !== 'DialogFooter';
    },
  );

  return (
    <>
      {header}
      <ModalBody>{body}</ModalBody>
      {footer}
    </>
  );
}
DialogContent.displayName = 'DialogContent';

// ── DialogHeader ──────────────────────────────────────────────────────────────

type AnyProps = { children?: React.ReactNode; className?: string; style?: React.CSSProperties; [key: string]: unknown };

export function DialogHeader({ children }: AnyProps) {
  return <ModalHeader>{children}</ModalHeader>;
}
DialogHeader.displayName = 'DialogHeader';

// ── DialogTitle ───────────────────────────────────────────────────────────────

export function DialogTitle({ children }: AnyProps) {
  return <ModalTitle>{children}</ModalTitle>;
}
DialogTitle.displayName = 'DialogTitle';

// ── DialogDescription ─────────────────────────────────────────────────────────

export function DialogDescription({ children }: AnyProps) {
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
DialogDescription.displayName = 'DialogDescription';

// ── DialogFooter ──────────────────────────────────────────────────────────────

export function DialogFooter({ children }: AnyProps) {
  return <ModalFooter>{children}</ModalFooter>;
}
DialogFooter.displayName = 'DialogFooter';
